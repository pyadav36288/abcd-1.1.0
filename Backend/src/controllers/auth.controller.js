import authService from "../services/auth.service.js";
import {
  getRefreshTokenCookieOptions,
} from "../utils/tokenUtils.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import { apiError } from "../utils/apiError.js";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

/**
 * Auth Controller - Handles HTTP requests for authentication
 * 
 * =====================================================
 * TOKEN FLOW & SECURITY:
 * =====================================================
 * 
 * 1. LOGIN FLOW:
 *    - Client sends: loginId (username/userId/email) + password + deviceId
 *    - Server validates, generates accessToken + refreshToken
 *    - refreshToken stored in httpOnly cookie (secure, not accessible by JS)
 *    - accessToken returned in response body (kept in memory/state)
 *    - Client stores: accessToken in memory/context, refreshToken in cookie (automatic)
 * 
 * 2. REQUEST FLOW (Authenticated):
 *    - Client sends accessToken in Authorization header (Bearer token)
 *    - Middleware verifies token - if invalid/expired, return 401
 *    - If token valid, proceed to route
 * 
 * 3. TOKEN REFRESH FLOW (when accessToken expires):
 *    - Client sends POST /refresh with deviceId
 *    - refreshToken auto-sent in cookie
 *    - Server validates refreshToken for device
 *    - Generates new accessToken + new refreshToken
 *    - Returns new accessToken in response + sets new refreshToken cookie
 *    - Client updates accessToken in memory
 * 
 * 4. LOGOUT FLOW:
 *    - Client sends POST /logout with deviceId
 *    - Server logs out device and clears refreshToken cookie
 *    - Client clears accessToken from memory
 * 
 * SECURITY NOTES:
 * - Refresh token: httpOnly cookie (XSRF protected, secure)
 * - Access token: Response body (client stores in memory, included in Authorization header)
 * - Credentials: Never require both tokens in one place
 * - Device tracking: Each device has unique deviceId and separate refresh token
 */

// =====================================================
// LOGIN CONTROLLER
// =====================================================
export const loginController = asyncHandler(async (req, res) => {
  const { loginId, password, deviceId = uuidv4() } = req.body;

  // Validation
  if (!loginId || !password) {
    throw new apiError(400, "Login ID (username/userId/email) and password are required");
  }

  // Get client IP and user agent
  const ipAddress =
    req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  const userAgent = req.get("user-agent");

  // Call service (convert password to string if it's a number)
  const result = await authService.login(
    loginId,
    String(password),
    deviceId,
    ipAddress,
    userAgent
  );

  // Set refresh token in httpOnly cookie
  const refreshTokenCookieOptions = getRefreshTokenCookieOptions();
  res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

  return res.status(200).json(
    new apiResponse(200, {
      user: result.user,
      accessToken: result.accessToken,
      deviceId: result.deviceId,
      forcePasswordChange: result.forcePasswordChange || false,
    }, result.message)
  );
});

// =====================================================
// LOGOUT CONTROLLER
// =====================================================
export const logoutController = asyncHandler(async (req, res) => {
  const { deviceId = uuidv4() } = req.body || {};
  
  // Try to get userId from verified JWT (normal flow)
  let userId = req.user?.id;
  
  // If not available, try to get from refreshToken in cookie
  if (!userId && req.cookies?.refreshToken) {
    try {
      const decoded = jwt.verify(
        req.cookies.refreshToken,
        process.env.REFRESH_TOKEN_SECRET || "REFRESH_TOKEN_DEFAULT"
      );
      userId = decoded.id;
    } catch (error) {
      // Continue without userId, will fail below
    }
  }

  if (!userId) {
    throw new apiError(401, "Unauthorized - Please provide valid access token or refresh token");
  }

  // Call service
  const result = await authService.logout(userId, deviceId);

  // Clear refresh token cookie
  res.clearCookie("refreshToken", { path: "/" });

  return res.status(200).json(new apiResponse(200, null, result.message));
});

// =====================================================
// LOGOUT ALL DEVICES CONTROLLER
// =====================================================
export const logoutAllDevicesController = asyncHandler(async (req, res) => {
  // Try to get userId from verified JWT (normal flow)
  let userId = req.user?.id;

  // If not available, try to get from refreshToken in cookie
  if (!userId && req.cookies?.refreshToken) {
    try {
      const decoded = jwt.verify(
        req.cookies.refreshToken,
        process.env.REFRESH_TOKEN_SECRET || "REFRESH_TOKEN_DEFAULT"
      );
      userId = decoded.id;
    } catch (error) {
      // Continue without userId, will fail below
    }
  }

  if (!userId) {
    throw new apiError(401, "Unauthorized - Please provide valid access token or refresh token");
  }

  // Call service
  const result = await authService.logoutAllDevices(userId);

  // Clear refresh token cookie
  res.clearCookie("refreshToken", { path: "/" });

  return res.status(200).json(new apiResponse(200, null, result.message));
});

// =====================================================
// REFRESH TOKEN CONTROLLER
// =====================================================
export const refreshTokenController = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  const { deviceId = uuidv4() } = req.body;

  if (!refreshToken) {
    throw new apiError(401, "Refresh token is required");
  }

  // Call service (deviceId is optional, will auto-generate if not provided)
  const result = await authService.refreshTokens(refreshToken, deviceId);

  // Set new refresh token in cookie
  const refreshTokenCookieOptions = getRefreshTokenCookieOptions();
  res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

  return res.status(200).json(new apiResponse(200, {
    accessToken: result.accessToken,
  }, result.message));
});

// =====================================================
// ACTIVE DEVICES CONTROLLER
// =====================================================
export const getActiveDevicesController = asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new apiError(401, "Unauthorized");
  }

  // Call service
  const result = await authService.getActiveDevices(userId);

  return res.status(200).json(new apiResponse(200, {
    devices: result.devices,
  }, "Active devices retrieved"));
});

// =====================================================
// REVOKE TOKEN CONTROLLER
// =====================================================
export const revokeTokenController = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { token } = req.body;

  if (!userId) {
    throw new apiError(401, "Unauthorized");
  }

  if (!token) {
    throw new apiError(400, "Token is required");
  }

  // Call service
  const result = await authService.revokeToken(userId, token);

  return res.status(200).json(new apiResponse(200, null, result.message));
});

// =====================================================
// CHANGE PASSWORD CONTROLLER
// =====================================================
export const changePasswordController = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!userId) {
    throw new apiError(401, "Unauthorized");
  }

  // Validation
  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new apiError(400, "All password fields are required");
  }

  if (newPassword !== confirmPassword) {
    throw new apiError(400, "New password and confirm password do not match");
  }

  if (newPassword.length < 8) {
    throw new apiError(400, "New password must be at least 8 characters long");
  }

  // Call service
  const result = await authService.changePassword(
    userId,
    oldPassword,
    newPassword
  );

  // Clear refresh token cookie
  res.clearCookie("refreshToken", {
    path: "/",
  });

  return res.status(200).json(new apiResponse(200, null, result.message));
});

// =====================================================
// LOCK ACCOUNT CONTROLLER (Admin only)
// =====================================================
export const lockAccountController = asyncHandler(async (req, res) => {
  const { userId, reason } = req.body;

  if (!userId) {
    throw new apiError(400, "User ID is required");
  }

  // Call service
  const result = await authService.lockAccount(userId, reason);

  return res.status(200).json(new apiResponse(200, null, result.message));
});

// =====================================================
// UNLOCK ACCOUNT CONTROLLER (Admin only)
// =====================================================
export const unlockAccountController = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    throw new apiError(400, "User ID is required");
  }

  // Call service
  const result = await authService.unlockAccount(userId);

  return res.status(200).json(new apiResponse(200, null, result.message));
});

// =====================================================
// VALIDATE TOKEN CONTROLLER
// =====================================================
export const validateTokenController = asyncHandler(async (req, res) => {
  const token =
    req.headers.authorization?.split(" ")[1] || req.body?.token;

  if (!token) {
    throw new apiError(401, "Token is required");
  }

  // Call service
  const result = await authService.validateAccessToken(token);

  return res.status(200).json(new apiResponse(200, result.data, "Token is valid"));
});
