import authService from "../services/auth.service.js";
import {
  getRefreshTokenCookieOptions,
  getAccessTokenMaxAge,
  getRefreshTokenMaxAge,
} from "../utils/tokenUtils.js";

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
export const loginController = async (req, res) => {
  try {
    const { loginId, password, deviceId } = req.body;

    // Validation
    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Login ID (username/userId/email) and password are required",
      });
    }

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Device ID is required",
      });
    }

    // Get client IP and user agent
    const ipAddress =
      req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.get("user-agent");

    // Call service (loginId can be username, userId, or email)
    const result = await authService.login(
      loginId,
      password,
      deviceId,
      ipAddress,
      userAgent
    );

    // Set refresh token in httpOnly cookie
    const refreshTokenCookieOptions = getRefreshTokenCookieOptions();
    res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: result.message,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        deviceId: result.deviceId,
        forcePasswordChange: result.forcePasswordChange || false,
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: error.message || "Login failed",
    });
  }
};

// =====================================================
// LOGOUT CONTROLLER
// =====================================================
export const logoutController = async (req, res) => {
  try {
    const { deviceId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Unauthorized",
      });
    }

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Device ID is required",
      });
    }

    // Call service
    const result = await authService.logout(userId, deviceId);

    // Clear refresh token cookie
    res.clearCookie("refreshToken", {
      path: "/",
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message || "Logout failed",
    });
  }
};

// =====================================================
// LOGOUT ALL DEVICES CONTROLLER
// =====================================================
export const logoutAllDevicesController = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Unauthorized",
      });
    }

    // Call service
    const result = await authService.logoutAllDevices(userId);

    // Clear refresh token cookie
    res.clearCookie("refreshToken", {
      path: "/",
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message || "Logout failed",
    });
  }
};

// =====================================================
// REFRESH TOKEN CONTROLLER
// =====================================================
export const refreshTokenController = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const { deviceId } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Refresh token is required",
      });
    }

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Device ID is required",
      });
    }

    // Call service
    const result = await authService.refreshTokens(refreshToken, deviceId);

    // Set new refresh token in cookie
    const refreshTokenCookieOptions = getRefreshTokenCookieOptions();
    res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: result.message,
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: error.message || "Token refresh failed",
    });
  }
};

// =====================================================
// ACTIVE DEVICES CONTROLLER
// =====================================================
export const getActiveDevicesController = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Unauthorized",
      });
    }

    // Call service
    const result = await authService.getActiveDevices(userId);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Active devices retrieved",
      data: {
        devices: result.devices,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message || "Failed to get devices",
    });
  }
};

// =====================================================
// REVOKE TOKEN CONTROLLER
// =====================================================
export const revokeTokenController = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { token } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Unauthorized",
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Token is required",
      });
    }

    // Call service
    const result = await authService.revokeToken(userId, token);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message || "Failed to revoke token",
    });
  }
};

// =====================================================
// CHANGE PASSWORD CONTROLLER
// =====================================================
export const changePasswordController = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Unauthorized",
      });
    }

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "All password fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "New password and confirm password do not match",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "New password must be at least 8 characters long",
      });
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

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message || "Failed to change password",
    });
  }
};

// =====================================================
// LOCK ACCOUNT CONTROLLER (Admin only)
// =====================================================
export const lockAccountController = async (req, res) => {
  try {
    const { userId, reason } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "User ID is required",
      });
    }

    // Call service
    const result = await authService.lockAccount(userId, reason);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message || "Failed to lock account",
    });
  }
};

// =====================================================
// UNLOCK ACCOUNT CONTROLLER (Admin only)
// =====================================================
export const unlockAccountController = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "User ID is required",
      });
    }

    // Call service
    const result = await authService.unlockAccount(userId);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: result.message,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message || "Failed to unlock account",
    });
  }
};

// =====================================================
// VALIDATE TOKEN CONTROLLER
// =====================================================
export const validateTokenController = async (req, res) => {
  try {
    const token =
      req.headers.authorization?.split(" ")[1] || req.body?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Token is required",
      });
    }

    // Call service
    const result = await authService.validateAccessToken(token);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Token is valid",
      data: result.data,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: error.message || "Invalid token",
    });
  }
};
