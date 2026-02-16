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

/**
 * LOGIN ENDPOINT
 * POST /auth/login
 * 
 * Required Data (in request body):
 * {
 *   "loginId": "username or userId or email",  // Required - can be username, userId, or email
 *   "password": "user_password",                // Required - plain text (will be hashed)
 *   "deviceId": "unique-device-id"             // Optional - UUID of the device (auto-generated if not provided)
 * }
 * 
 * Response:
 * {
 *   "user": { user object },
 *   "accessToken": "jwt_token",
 *   "deviceId": "device-id",
 *   "forcePasswordChange": false
 * }
 */
router.post("/login", loginController);

/**
 * REFRESH TOKEN ENDPOINT
 * POST /auth/refresh
 * 
 * Required Data:
 * - Headers: Cookie with "refreshToken" (auto-sent by browser)
 * OR in request body:
 * {
 *   "refreshToken": "refresh_token_value",     // Optional - if not in cookie
 *   "deviceId": "device-id"                    // Optional - UUID of the device
 * }
 * 
 * Response:
 * {
 *   "accessToken": "new_jwt_token",
 *   "refreshToken": "new_refresh_token"
 * }
 */
router.post("/refresh", refreshTokenController);

/**
 * VALIDATE TOKEN ENDPOINT
 * POST /auth/validate
 * 
 * Required Data (in request body):
 * {
 *   "token": "access_token_to_validate"        // Optional - if not provided, uses Authorization header
 * }
 * 
 * Response:
 * {
 *   "valid": true/false,
 *   "decoded": { decoded token data }
 * }
 */
router.post("/validate", validateTokenController);

/**
 * PROTECTED ROUTES (requires authentication)
 * Pass accessToken in Authorization header: "Authorization: Bearer {accessToken}"
 */

/**
 * LOGOUT FROM SPECIFIC DEVICE ENDPOINT
 * POST /auth/logout
 * 
 * Required:
 * - Headers: "Authorization: Bearer {accessToken}"
 * 
 * Optional Data (in request body):
 * {
 *   "deviceId": "device-id"                    // Optional - logout from specific device, else logout all
 * }
 * 
 * Response:
 * {
 *   "message": "Logout successful"
 * }
 */
router.post("/logout", verifyJWT, logoutController);

/**
 * LOGOUT FROM ALL DEVICES ENDPOINT
 * POST /auth/logout-all
 * 
 * Required:
 * - Headers: "Authorization: Bearer {accessToken}" OR Cookie with "refreshToken"
 * 
 * Response:
 * {
 *   "message": "Logged out from all devices"
 * }
 */
router.post("/logout-all", verifyJWT, logoutAllDevicesController);

/**
 * GET ACTIVE DEVICES ENDPOINT
 * GET /auth/devices
 * 
 * Required:
 * - Headers: "Authorization: Bearer {accessToken}"
 * 
 * Response:
 * [
 *   {
 *     "deviceId": "device-id",
 *     "ipAddress": "192.168.1.1",
 *     "userAgent": "Mozilla/5.0...",
 *     "loginCount": 5,
 *     "lastLogin": "2025-02-16T10:30:00Z"
 *   }
 * ]
 */
router.get("/devices", verifyJWT, getActiveDevicesController);

/**
 * REVOKE SPECIFIC TOKEN ENDPOINT
 * POST /auth/revoke-token
 * 
 * Required:
 * - Headers: "Authorization: Bearer {accessToken}"
 * - Request body:
 * {
 *   "refreshToken": "token_to_revoke",        // Required - refresh token to revoke
 *   "deviceId": "device-id"                   // Optional - associated device ID
 * }
 * 
 * Response:
 * {
 *   "message": "Token revoked successfully"
 * }
 */
router.post("/revoke-token", verifyJWT, revokeTokenController);

/**
 * CHANGE PASSWORD ENDPOINT
 * POST /auth/change-password
 * 
 * Required:
 * - Headers: "Authorization: Bearer {accessToken}"
 * - Request body:
 * {
 *   "currentPassword": "current_password",    // Required - current password for verification
 *   "newPassword": "new_password"             // Required - new password (must be different)
 * }
 * 
 * Response:
 * {
 *   "message": "Password changed successfully"
 * }
 */
router.post("/change-password", verifyJWT, changePasswordController);

/**
 * ADMIN ROUTES (requires admin/super_admin role)
 * Pass accessToken in Authorization header: "Authorization: Bearer {accessToken}"
 */

/**
 * LOCK ACCOUNT ENDPOINT (ADMIN ONLY)
 * POST /auth/lock-account
 * 
 * Required:
 * - Headers: "Authorization: Bearer {accessToken}" (must be admin/super_admin)
 * - Request body:
 * {
 *   "userId": "user_id_to_lock",              // Required - UUID/ID of user to lock
 *   "reason": "violation reason"              // Required - reason for locking
 * }
 * 
 * Response:
 * {
 *   "message": "Account locked successfully"
 * }
 */
router.post("/lock-account", verifyJWT, lockAccountController);

/**
 * UNLOCK ACCOUNT ENDPOINT (ADMIN ONLY)
 * POST /auth/unlock-account
 * 
 * Required:
 * - Headers: "Authorization: Bearer {accessToken}" (must be admin/super_admin)
 * - Request body:
 * {
 *   "userId": "user_id_to_unlock"             // Required - UUID/ID of user to unlock
 * }
 * 
 * Response:
 * {
 *   "message": "Account unlocked successfully"
 * }
 */
router.post("/unlock-account", verifyJWT, unlockAccountController);

export default router;
