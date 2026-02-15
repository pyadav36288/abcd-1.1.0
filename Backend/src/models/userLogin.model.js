// models/userLogin.model.js
import mongoose, { Schema } from "mongoose";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const userLoginSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    refreshTokens: [
      {
        token: { type: String },
        deviceId: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    failedLoginAttempts: { type: Number, default: 0 },
    lockLevel: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    isPermanentlyLocked: { type: Boolean, default: false },
    isLoggedIn: { type: Boolean, default: false },
    lastLogin: { type: Date },
    loggedInDevices: [
      {
        deviceId: { type: String, default: () => uuidv4() },
        ipAddress: String,
        userAgent: String,
        loginCount: { type: Number, default: 0 },
        refreshToken: String,
        loginHistory: [
          {
            loginAt: { type: Date, default: Date.now },
            logoutAt: Date,
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

// Password Hash - Modern mongoose async pre-hook (no next param)
userLoginSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  
  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
  } catch (error) {
    throw new Error(`Password hashing failed: ${error.message}`);
  }
});

// Password Compare
userLoginSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcryptjs.compare(candidatePassword, this.password);
};

// Token Generators
userLoginSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      id: this.user,
      username: this.username,
    },
    process.env.ACCESS_TOKEN_SECRET || "ACCESS_TOKEN_DEFAULT",
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
  );
};

userLoginSchema.methods.generateRefreshToken = async function (deviceId, ipAddress = null, userAgent = null) {
  const token = jwt.sign(
    { id: this.user },
    process.env.REFRESH_TOKEN_SECRET || "REFRESH_TOKEN_DEFAULT",
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
    }
  );

  // Store token in refreshTokens array
  if (!Array.isArray(this.refreshTokens)) {
    this.refreshTokens = [];
  }
  this.refreshTokens.push({
    token,
    deviceId: deviceId || "unknown",
    createdAt: new Date(),
  });

  // Store token on that device - create device if it doesn't exist
  if (deviceId && Array.isArray(this.loggedInDevices)) {
    let device = this.loggedInDevices.find((d) => d.deviceId === deviceId);
    if (device) {
      // Update existing device
      device.refreshToken = token;
      device.loginCount = (device.loginCount || 0) + 1;
      if (ipAddress) device.ipAddress = ipAddress;
      if (userAgent) device.userAgent = userAgent;
      device.loginHistory.push({
        loginAt: new Date(),
        logoutAt: null,
      });
    } else {
      // Create new device entry
      this.loggedInDevices.push({
        deviceId,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        refreshToken: token,
        loginCount: 1,
        loginHistory: [
          {
            loginAt: new Date(),
            logoutAt: null,
          },
        ],
      });
    }
  }

  await this.save();
  return token;
};

// Verify refresh token for specific device
userLoginSchema.methods.verifyRefreshTokenForDevice = function (token, deviceId) {
  if (!deviceId || !Array.isArray(this.loggedInDevices)) {
    return false;
  }

  const device = this.loggedInDevices.find((d) => d.deviceId === deviceId);
  if (!device) {
    return false;
  }

  // Check if token matches the device's refresh token
  return device.refreshToken === token;
};

// Get all active devices for a user
userLoginSchema.methods.getActiveDevices = function () {
  if (!Array.isArray(this.loggedInDevices)) {
    return [];
  }

  return this.loggedInDevices.map((device) => ({
    deviceId: device.deviceId,
    ipAddress: device.ipAddress,
    userAgent: device.userAgent,
    loginCount: device.loginCount,
    lastLogin: device.loginHistory?.[device.loginHistory.length - 1]?.loginAt,
  }));
};

// Logout specific device
userLoginSchema.methods.logoutDevice = async function (deviceId) {
  if (!deviceId || !Array.isArray(this.loggedInDevices)) {
    return false;
  }

  const device = this.loggedInDevices.find((d) => d.deviceId === deviceId);
  if (device) {
    // Mark last login as logged out
    if (device.loginHistory && device.loginHistory.length > 0) {
      const lastLogin = device.loginHistory[device.loginHistory.length - 1];
      if (!lastLogin.logoutAt) {
        lastLogin.logoutAt = new Date();
      }
    }
    // Clear the refresh token
    device.refreshToken = null;
    await this.save();
    return true;
  }

  return false;
};

// Logout all devices
userLoginSchema.methods.logoutAllDevices = async function () {
  if (Array.isArray(this.loggedInDevices)) {
    this.loggedInDevices.forEach((device) => {
      if (device.loginHistory && device.loginHistory.length > 0) {
        const lastLogin = device.loginHistory[device.loginHistory.length - 1];
        if (!lastLogin.logoutAt) {
          lastLogin.logoutAt = new Date();
        }
      }
      device.refreshToken = null;
    });
  }
  this.refreshTokens = [];
  await this.save();
};

// Get all valid refresh tokens
userLoginSchema.methods.getAllRefreshTokens = function () {
  return Array.isArray(this.refreshTokens) ? this.refreshTokens : [];
};

// Revoke specific refresh token
userLoginSchema.methods.revokeRefreshToken = async function (token) {
  if (Array.isArray(this.refreshTokens)) {
    this.refreshTokens = this.refreshTokens.filter((rt) => rt.token !== token);
    await this.save();
    return true;
  }
  return false;
};  

export const UserLogin = mongoose.model("UserLogin", userLoginSchema);