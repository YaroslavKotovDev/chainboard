// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Pausable }        from "@openzeppelin/contracts/utils/Pausable.sol";
import { IERC20 }          from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 }       from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { AccessRegistry }  from "./AccessRegistry.sol";

/**
 * @title RewardVault
 * @notice Custodial vault that holds ERC-20 reward tokens on behalf of the
 *         ChainBoard protocol.  Only the designated ClaimManager contract may
 *         pull funds out via {release}.  Admins may deposit and withdraw
 *         (emergency only).
 *
 * Design decisions:
 * - Single token per vault for simplicity and auditability.
 * - All disbursements go through ClaimManager — RewardVault is dumb storage.
 * - Uses SafeERC20 to handle non-compliant ERC-20s (no-return-value tokens).
 */
contract RewardVault is ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────── state ──────────────────────────
    AccessRegistry public immutable registry;
    IERC20         public immutable token;

    address public claimManager;        // mutable — set once after deployment

    // ─────────────────────────────────────── events ─────────────────────────
    event Deposited(address indexed sender,       uint256 amount, uint256 newBalance);
    event Released( address indexed recipient,    uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed admin,        uint256 amount);
    event ClaimManagerSet(address indexed claimManager);

    // ─────────────────────────────────────── errors ─────────────────────────
    error Unauthorized();
    error ClaimManagerAlreadySet();
    error InsufficientBalance(uint256 requested, uint256 available);
    error ZeroAmount();
    error ZeroAddress();

    // ─────────────────────────────────────── modifiers ──────────────────────
    modifier onlyAdmin() {
        if (!registry.isAdmin(msg.sender)) revert Unauthorized();
        _;
    }

    modifier onlyClaimManager() {
        if (msg.sender != claimManager) revert Unauthorized();
        _;
    }

    // ─────────────────────────────────────── constructor ────────────────────
    constructor(address _registry, address _token) {
        if (_registry == address(0) || _token == address(0)) revert ZeroAddress();
        registry = AccessRegistry(_registry);
        token    = IERC20(_token);
    }

    // ─────────────────────────────────────── setup ──────────────────────────
    /**
     * @notice Binds the ClaimManager address. Can only be called once.
     */
    function setClaimManager(address _claimManager) external onlyAdmin {
        if (claimManager != address(0)) revert ClaimManagerAlreadySet();
        if (_claimManager == address(0)) revert ZeroAddress();
        claimManager = _claimManager;
        emit ClaimManagerSet(_claimManager);
    }

    // ─────────────────────────────────────── core ───────────────────────────
    /**
     * @notice Deposit tokens into the vault.
     * @dev Caller must have approved this contract for `amount` first.
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount, vaultBalance());
    }

    /**
     * @notice Release tokens to a recipient.  Only callable by ClaimManager.
     */
    function release(address recipient, uint256 amount)
        external
        nonReentrant
        whenNotPaused
        onlyClaimManager
    {
        if (amount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroAddress();
        uint256 balance = vaultBalance();
        if (amount > balance) revert InsufficientBalance(amount, balance);

        token.safeTransfer(recipient, amount);
        emit Released(recipient, amount, vaultBalance());
    }

    /**
     * @notice Emergency withdrawal for admin. Bypasses pause check intentionally.
     */
    function emergencyWithdraw(uint256 amount) external onlyAdmin nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 balance = vaultBalance();
        if (amount > balance) revert InsufficientBalance(amount, balance);
        token.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    // ─────────────────────────────────────── pause ──────────────────────────
    function pause()   external onlyAdmin { _pause(); }
    function unpause() external onlyAdmin { _unpause(); }

    // ─────────────────────────────────────── view ───────────────────────────
    function vaultBalance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
