// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Pausable }        from "@openzeppelin/contracts/utils/Pausable.sol";
import { AccessRegistry }  from "./AccessRegistry.sol";
import { RewardVault }     from "./RewardVault.sol";

/**
 * @title ClaimManager
 * @notice Manages reward claim execution for the ChainBoard protocol.
 *
 *  Flow:
 *    1. Backend generates a claim authorisation (nonce + amount) signed by
 *       the OPERATOR signer off-chain.
 *    2. User calls {claim} with the signed payload.
 *    3. ClaimManager validates the signature, records the claim, and pulls
 *       funds from RewardVault to the user's address.
 *
 * Security:
 *   - Nonce per wallet prevents replay attacks.
 *   - All payloads are EIP-712 typed-data signed.
 *   - Only addresses marked as operators in AccessRegistry can produce
 *     valid authorisation signatures.
 *   - Reentrancy guard + vault-level reentrancy guard double-protect funds.
 */
contract ClaimManager is ReentrancyGuard, Pausable {
    // ─────────────────────────────────────── EIP-712 ────────────────────────
    bytes32 public constant DOMAIN_TYPE_HASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    bytes32 public constant CLAIM_TYPE_HASH =
        keccak256("ClaimPayload(address recipient,uint256 amount,uint256 nonce,uint256 deadline)");

    bytes32 public immutable DOMAIN_SEPARATOR;

    // ─────────────────────────────────────── state ──────────────────────────
    AccessRegistry public immutable registry;
    RewardVault    public immutable vault;

    /// @notice Tracks the next expected nonce for each wallet.
    mapping(address => uint256) public nonces;

    /// @notice Total lifetime tokens claimed by each wallet.
    mapping(address => uint256) public totalClaimed;

    // ─────────────────────────────────────── events ─────────────────────────
    event Claimed(
        address indexed recipient,
        uint256 amount,
        uint256 nonce,
        bytes32 indexed payloadHash
    );

    // ─────────────────────────────────────── errors ─────────────────────────
    error Unauthorized();
    error InvalidSignature();
    error ExpiredDeadline(uint256 deadline, uint256 blockTimestamp);
    error InvalidNonce(uint256 expected, uint256 provided);
    error ZeroAmount();
    error ZeroAddress();

    // ─────────────────────────────────────── modifiers ──────────────────────
    modifier onlyAdmin() {
        if (!registry.isAdmin(msg.sender)) revert Unauthorized();
        _;
    }

    // ─────────────────────────────────────── constructor ────────────────────
    constructor(address _registry, address _vault) {
        if (_registry == address(0) || _vault == address(0)) revert ZeroAddress();
        registry = AccessRegistry(_registry);
        vault    = RewardVault(_vault);

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPE_HASH,
                keccak256(bytes("ChainBoard")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    // ─────────────────────────────────────── core ───────────────────────────
    /**
     * @notice Execute a reward claim.
     * @param recipient  Wallet receiving the reward tokens.
     * @param amount     Token amount (in wei) to be transferred.
     * @param nonce      Monotonically increasing nonce (must match {nonces[recipient]}).
     * @param deadline   Unix timestamp after which the signature is invalid.
     * @param signature  EIP-712 signature produced by an OPERATOR key.
     */
    function claim(
        address recipient,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount   == 0)           revert ZeroAmount();

        // ── deadline ──────────────────────────────────────────────────────
        if (block.timestamp > deadline)
            revert ExpiredDeadline(deadline, block.timestamp);

        // ── nonce ─────────────────────────────────────────────────────────
        uint256 expectedNonce = nonces[recipient];
        if (nonce != expectedNonce)
            revert InvalidNonce(expectedNonce, nonce);

        // ── EIP-712 signature verification ────────────────────────────────
        bytes32 payloadHash = _hashPayload(recipient, amount, nonce, deadline);
        address signer      = _recoverSigner(payloadHash, signature);
        if (!registry.isOperator(signer)) revert InvalidSignature();

        // ── state update ──────────────────────────────────────────────────
        unchecked { nonces[recipient]++; }
        totalClaimed[recipient] += amount;

        // ── fund release ──────────────────────────────────────────────────
        vault.release(recipient, amount);

        emit Claimed(recipient, amount, nonce, payloadHash);
    }

    // ─────────────────────────────────────── pause ──────────────────────────
    function pause()   external onlyAdmin { _pause(); }
    function unpause() external onlyAdmin { _unpause(); }

    // ─────────────────────────────────────── view ───────────────────────────
    /**
     * @notice Returns the EIP-712 struct hash for a given payload.
     *         Useful for off-chain signature construction.
     */
    function hashPayload(
        address recipient,
        uint256 amount,
        uint256 nonce,
        uint256 deadline
    ) external pure returns (bytes32) {
        return _hashPayload(recipient, amount, nonce, deadline);
    }

    /**
     * @notice Returns the full EIP-712 digest (domain + payload).
     */
    function claimDigest(
        address recipient,
        uint256 amount,
        uint256 nonce,
        uint256 deadline
    ) external view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                _hashPayload(recipient, amount, nonce, deadline)
            )
        );
    }

    // ─────────────────────────────────────── internal ───────────────────────
    function _hashPayload(
        address recipient,
        uint256 amount,
        uint256 nonce,
        uint256 deadline
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(CLAIM_TYPE_HASH, recipient, amount, nonce, deadline)
        );
    }

    function _recoverSigner(bytes32 payloadHash, bytes calldata signature)
        internal
        view
        returns (address)
    {
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, payloadHash)
        );
        return _ecrecover(digest, signature);
    }

    function _ecrecover(bytes32 digest, bytes calldata sig)
        internal
        pure
        returns (address)
    {
        if (sig.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8   v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);
        return ecrecover(digest, v, r, s);
    }
}
