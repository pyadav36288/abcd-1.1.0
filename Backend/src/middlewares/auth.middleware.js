import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

/**
 * Auth Middleware - Verify JWT token and attach user to request
 */

export const verifyJWT = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookies
    const token =
      req.headers.authorization?.split(" ")[1] ||
      req.cookies?.accessToken ||
      req.body?.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Access token is missing",
      });
    }

    // Verify token
    if (!process.env.ACCESS_TOKEN_SECRET) {
      throw new Error("ACCESS_TOKEN_SECRET is not configured");
    }
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );

    // Fetch user details
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "User not found",
      });
    }

    if (!user.canLogin) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "User login is disabled",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "User account is blocked",
      });
    }

    // Attach user to request
    req.user = {
      id: decoded.id,
      username: decoded.username,
      ...user.toObject(),
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Access token has expired",
      });
    }

    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: error.message || "Invalid access token",
    });
  }
};

/**
 * Admin verification middleware
 */
export const verifyAdmin = (req, res, next) => {
  if (!req.user?.role || !["admin", "super_admin", "enterprise_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      statusCode: 403,
      message: "Admin access required",
    });
  }
  next();
};

/**
 * Super Admin verification middleware
 */
export const verifySuperAdmin = (req, res, next) => {
  if (!req.user?.role || !["super_admin", "enterprise_admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      statusCode: 403,
      message: "Super Admin access required",
    });
  }
  next();
};

/**
 * Enterprise Admin verification middleware
 */
export const verifyEnterpriseAdmin = (req, res, next) => {
  if (req.user?.role !== "enterprise_admin") {
    return res.status(403).json({
      success: false,
      statusCode: 403,
      message: "Enterprise Admin access required",
    });
  }
  next();
};
