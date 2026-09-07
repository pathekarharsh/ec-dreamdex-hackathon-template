// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISentinelPool {
    function cancelOrder(uint128 orderId) external;
}

/// @title SentinelSafetyNet
/// @notice Small, independently auditable circuit breaker for DreamDEX orders.
/// @dev Deploy only after verifying the pool ABI and callback permissions on Shannon.
contract SentinelSafetyNet {
    address public immutable owner;
    address public guardian;
    bool public armed;
    uint256 public nonce;

    mapping(address => bool) public approvedPools;
    mapping(address => mapping(uint128 => bool)) public trackedOrders;

    event GuardianUpdated(address indexed guardian);
    event PoolApprovalUpdated(address indexed pool, bool approved);
    event Armed(bool value);
    event OrderTracked(address indexed pool, uint128 indexed orderId);
    event OrderCancelled(address indexed pool, uint128 indexed orderId, address indexed caller);

    error NotAuthorized();
    error InvalidAddress();
    error NotApprovedPool();
    error OrderNotTracked();

    constructor(address initialGuardian) {
        if (initialGuardian == address(0)) revert InvalidAddress();
        owner = msg.sender;
        guardian = initialGuardian;
        armed = true;
    }

    modifier onlyAuthorized() {
        if (msg.sender != owner && msg.sender != guardian) revert NotAuthorized();
        _;
    }

    function setGuardian(address nextGuardian) external onlyAuthorized {
        if (nextGuardian == address(0)) revert InvalidAddress();
        guardian = nextGuardian;
        emit GuardianUpdated(nextGuardian);
    }

    function setPool(address pool, bool approved) external onlyAuthorized {
        if (pool == address(0)) revert InvalidAddress();
        approvedPools[pool] = approved;
        emit PoolApprovalUpdated(pool, approved);
    }

    function setArmed(bool value) external onlyAuthorized {
        armed = value;
        emit Armed(value);
    }

    function trackOrder(address pool, uint128 orderId) external onlyAuthorized {
        if (!approvedPools[pool]) revert NotApprovedPool();
        trackedOrders[pool][orderId] = true;
        emit OrderTracked(pool, orderId);
    }

    /// @notice Cancels a tracked order when the off-chain agent or guardian trips the breaker.
    function cancelTrackedOrder(address pool, uint128 orderId) external onlyAuthorized {
        if (!approvedPools[pool]) revert NotApprovedPool();
        if (!armed) revert NotAuthorized();
        if (!trackedOrders[pool][orderId]) revert OrderNotTracked();
        ISentinelPool(pool).cancelOrder(orderId);
        trackedOrders[pool][orderId] = false;
        nonce++;
        emit OrderCancelled(pool, orderId, msg.sender);
    }
}
