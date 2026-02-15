import express from "express";
import {
  loginController,
  logoutController,
  logoutAllDevicesController,
  refreshTokenController,
  getActiveDevicesController,
  revokeTokenController,
  changePasswordController,
  lockAccountController,
  unlockAccountController,
  validateTokenController,
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * PUBLIC ROUTES
 */

// Login
router.post("/login", loginController);

// Refresh token
router.post("/refresh", refreshTokenController);

// Validate token
router.post("/validate", validateTokenController);

/**
 * PROTECTED ROUTES (requires authentication)
 */

// Logout from specific device
router.post("/logout", verifyJWT, logoutController);

// Logout from all devices
router.post("/logout-all", verifyJWT, logoutAllDevicesController);

// Get active devices
router.get("/devices", verifyJWT, getActiveDevicesController);

// Revoke specific token
router.post("/revoke-token", verifyJWT, revokeTokenController);

// Change password
router.post("/change-password", verifyJWT, changePasswordController);

/**
 * ADMIN ROUTES (requires admin/super_admin role)
 */

// Lock account (admin only)
router.post("/lock-account", verifyJWT, lockAccountController);

// Unlock account (admin only)
router.post("/unlock-account", verifyJWT, unlockAccountController);

export default router;
