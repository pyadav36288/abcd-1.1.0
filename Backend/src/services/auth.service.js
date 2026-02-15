import jwt from "jsonwebtoken";
import { UserLogin } from "../models/userLogin.model.js";
import { User } from "../models/user.model.js";

/**
 * Auth Service - Handles all authentication business logic
 */

// =====================================================
// LOGIN SERVICE
// =====================================================
export const authService = {
  /**
   * Login user with loginId (username/userId/email) and password
   * @param {string} loginId - Username, userId, or email
   * @param {string} password - Plain password
   * @param {string} deviceId - Device identifier
   * @param {string} ipAddress - Client IP address
   * @param {string} userAgent - Client user agent
   * @returns {Promise<Object>} - User data, access token, refresh token, forcePasswordChange flag
   */
  async login(loginId, password, deviceId, ipAddress = null, userAgent = null) {
    try {
      // Find UserLogin by username first (case-insensitive)
      let userLogin = await UserLogin.findOne({ username: loginId.toLowerCase() }).select("+password");
      
      // If not found by username, try to find User by userId or email, then get their UserLogin
      if (!userLogin) {
        const user = await User.findOne({
          $or: [
            { userId: loginId },
            { email: loginId }
          ]
        });
        
        if (user) {
          userLogin = await UserLogin.findOne({ user: user._id }).select("+password");
        }
      }

      if (!userLogin) {
        throw new Error("Invalid login credentials");
      }

      // Check if account is permanently locked
      if (userLogin.isPermanentlyLocked) {
        throw new Error("Account is permanently locked. Contact administrator.");
      }

      // Check if account is temporarily locked
      if (userLogin.lockUntil && new Date() < userLogin.lockUntil) {
        const remainingTime = Math.ceil(
          (userLogin.lockUntil - new Date()) / (1000 * 60)
        );
        throw new Error(
          `Account is locked. Try again in ${remainingTime} minutes.`
        );
      }

      // Verify password
      const isPasswordValid = await userLogin.comparePassword(password);
      if (!isPasswordValid) {
        // Increment failed attempts
        userLogin.failedLoginAttempts = (userLogin.failedLoginAttempts || 0) + 1;

        // Lock account based on failed attempts
        if (userLogin.failedLoginAttempts >= 5) {
          userLogin.lockLevel = 1; // Temporary lock (15 minutes)
          userLogin.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        }

        await userLogin.save();
        throw new Error("Invalid login credentials");
      }

      // Fetch user details and enforce login flags
      const user = await User.findById(userLogin.user);
      if (!user) {
        throw new Error("Associated user not found");
      }

      // Only allow login when canLogin and isActive are true
      if (!user.canLogin || !user.isActive) {
        throw new Error("User is not allowed to login");
      }

      // Reset failed attempts on successful login
      userLogin.failedLoginAttempts = 0;
      userLogin.lockLevel = 0;
      userLogin.lockUntil = null;
      userLogin.isLoggedIn = true;
      userLogin.lastLogin = new Date();

      // Generate tokens
      const accessToken = userLogin.generateAccessToken();
      const refreshToken = await userLogin.generateRefreshToken(
        deviceId,
        ipAddress,
        userAgent
      );

      // Fetch user details for response (exclude sensitive fields)
      const userResponse = await User.findById(userLogin.user).select("-password");

      return {
        success: true,
        user: userResponse,
        accessToken,
        refreshToken,
        forcePasswordChange: !!userLogin.forcePasswordChange,
        deviceId,
        message: "Login successful",
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Logout user from specific device
   * @param {string} userId - User ID from token
   * @param {string} deviceId - Device to logout from
   * @returns {Promise<Boolean>} - Success status
   */
  async logout(userId, deviceId) {
    try {
      const userLogin = await UserLogin.findOne({ user: userId });
      if (!userLogin) {
        throw new Error("User not found");
      }

      // Logout from specific device
      const logoutSuccess = await userLogin.logoutDevice(deviceId);

      if (!logoutSuccess) {
        throw new Error("Device not found");
      }

      // Check if any devices are still active
      const activeDevices = userLogin.loggedInDevices.filter(
        (d) => d.refreshToken !== null
      );
      if (activeDevices.length === 0) {
        userLogin.isLoggedIn = false;
      }

      await userLogin.save();

      return {
        success: true,
        message: "Logout successful",
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Logout from all devices
   * @param {string} userId - User ID from token
   * @returns {Promise<Boolean>} - Success status
   */
  async logoutAllDevices(userId) {
    try {
      const userLogin = await UserLogin.findOne({ user: userId });
      if (!userLogin) {
        throw new Error("User not found");
      }

      await userLogin.logoutAllDevices();
      userLogin.isLoggedIn = false;
      await userLogin.save();

      return {
        success: true,
        message: "Logged out from all devices",
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @param {string} deviceId - Device ID
   * @returns {Promise<Object>} - New access token and refresh token
   */
  async refreshTokens(refreshToken, deviceId) {
    try {
      // Verify refresh token signature
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET || "REFRESH_TOKEN_DEFAULT"
      );

      // Find user
      const userLogin = await UserLogin.findById(decoded.id);
      if (!userLogin) {
        throw new Error("User not found");
      }

      // Verify token belongs to the device
      const isValidToken = userLogin.verifyRefreshTokenForDevice(
        refreshToken,
        deviceId
      );
      if (!isValidToken) {
        throw new Error("Invalid refresh token for this device");
      }

      // Generate new tokens
      const newAccessToken = userLogin.generateAccessToken();
      const newRefreshToken = await userLogin.generateRefreshToken(deviceId);

      return {
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        message: "Tokens refreshed successfully",
      };
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Refresh token has expired. Please login again.");
      }
      throw new Error(error.message);
    }
  },

  /**
   * Get all active devices for a user
   * @param {string} userId - User ID from token
   * @returns {Promise<Array>} - List of active devices
   */
  async getActiveDevices(userId) {
    try {
      const userLogin = await UserLogin.findOne({ user: userId });
      if (!userLogin) {
        throw new Error("User not found");
      }

      return {
        success: true,
        devices: userLogin.getActiveDevices(),
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Revoke refresh token
   * @param {string} userId - User ID from token
   * @param {string} token - Token to revoke
   * @returns {Promise<Boolean>} - Success status
   */
  async revokeToken(userId, token) {
    try {
      const userLogin = await UserLogin.findOne({ user: userId });
      if (!userLogin) {
        throw new Error("User not found");
      }

      const revoked = await userLogin.revokeRefreshToken(token);
      if (!revoked) {
        throw new Error("Token not found");
      }

      return {
        success: true,
        message: "Token revoked successfully",
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Lock user account
   * @param {string} userId - User ID to lock
   * @param {string} reason - Reason for locking
   * @returns {Promise<Boolean>} - Success status
   */
  async lockAccount(userId, reason = "Manual lock by admin") {
    try {
      const userLogin = await UserLogin.findOne({ user: userId });
      if (!userLogin) {
        throw new Error("User not found");
      }

      userLogin.isPermanentlyLocked = true;
      userLogin.isLoggedIn = false;
      await userLogin.logoutAllDevices();
      await userLogin.save();

      return {
        success: true,
        message: `Account locked. Reason: ${reason}`,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Unlock user account
   * @param {string} userId - User ID to unlock
   * @returns {Promise<Boolean>} - Success status
   */
  async unlockAccount(userId) {
    try {
      const userLogin = await UserLogin.findOne({ user: userId });
      if (!userLogin) {
        throw new Error("User not found");
      }

      userLogin.isPermanentlyLocked = false;
      userLogin.failedLoginAttempts = 0;
      userLogin.lockLevel = 0;
      userLogin.lockUntil = null;
      await userLogin.save();

      return {
        success: true,
        message: "Account unlocked successfully",
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Change password
   * @param {string} userId - User ID
   * @param {string} oldPassword - Old password
   * @param {string} newPassword - New password
   * @returns {Promise<Boolean>} - Success status
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      const userLogin = await UserLogin.findOne({ user: userId }).select(
        "+password"
      );
      if (!userLogin) {
        throw new Error("User not found");
      }

      // Verify old password
      const isPasswordValid = await userLogin.comparePassword(oldPassword);
      if (!isPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Update password
      userLogin.password = newPassword;
      await userLogin.save();

      // Logout from all devices after password change (security)
      await userLogin.logoutAllDevices();
      userLogin.isLoggedIn = false;
      await userLogin.save();

      return {
        success: true,
        message:
          "Password changed successfully. Please login again with new password.",
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Validate access token
   * @param {string} token - Access token
   * @returns {Promise<Object>} - Decoded token
   */
  async validateAccessToken(token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET || "ACCESS_TOKEN_DEFAULT"
      );
      return {
        success: true,
        data: decoded,
      };
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Access token has expired");
      }
      throw new Error("Invalid access token");
    }
  },
};

export default authService;
