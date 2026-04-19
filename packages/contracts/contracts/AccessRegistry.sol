// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable }       from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AccessRegistry
 * @notice Central role registry for the ChainBoard protocol.
 *         Manages ADMIN, OPERATOR, and REWARD_MANAGER roles
 *         that control RewardVault and ClaimManager operations.
 *
 * Role hierarchy:
 *   DEFAULT_ADMIN_ROLE  → can grant / revoke all roles
 *   OPERATOR_ROLE       → can trigger operational actions (pause, unpause)
 *   REWARD_MANAGER_ROLE → can configure reward vaults and windows
 */
contract AccessRegistry is AccessControl, Pausable {
    // ─────────────────────────────────────── roles ──────────────────────────
    bytes32 public constant OPERATOR_ROLE       = keccak256("OPERATOR_ROLE");
    bytes32 public constant REWARD_MANAGER_ROLE = keccak256("REWARD_MANAGER_ROLE");

    // ─────────────────────────────────────── events ─────────────────────────
    event RegistryInitialized(address indexed admin);
    event EmergencyPaused(address indexed operator);
    event EmergencyUnpaused(address indexed operator);

    // ─────────────────────────────────────── constructor ────────────────────
    /**
     * @param admin Address that receives DEFAULT_ADMIN_ROLE, OPERATOR_ROLE,
     *              and REWARD_MANAGER_ROLE on deployment.
     */
    constructor(address admin) {
        require(admin != address(0), "AccessRegistry: zero admin");

        _grantRole(DEFAULT_ADMIN_ROLE,  admin);
        _grantRole(OPERATOR_ROLE,       admin);
        _grantRole(REWARD_MANAGER_ROLE, admin);

        emit RegistryInitialized(admin);
    }

    // ─────────────────────────────────────── pause ──────────────────────────
    /**
     * @notice Pauses the registry (and downstream contracts that read it).
     */
    function pause() external onlyRole(OPERATOR_ROLE) {
        _pause();
        emit EmergencyPaused(msg.sender);
    }

    /**
     * @notice Unpauses the registry.
     */
    function unpause() external onlyRole(OPERATOR_ROLE) {
        _unpause();
        emit EmergencyUnpaused(msg.sender);
    }

    // ─────────────────────────────────────── view helpers ───────────────────
    function isAdmin(address account)         external view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE,  account);
    }
    function isOperator(address account)      external view returns (bool) {
        return hasRole(OPERATOR_ROLE,       account);
    }
    function isRewardManager(address account) external view returns (bool) {
        return hasRole(REWARD_MANAGER_ROLE, account);
    }
}
