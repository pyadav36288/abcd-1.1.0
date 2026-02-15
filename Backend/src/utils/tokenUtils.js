/**
 * Token Utility - Convert token expiry strings to milliseconds
 */

/**
 * Convert expiry string to milliseconds
 * Supports formats: "15m", "7d", "1h", etc.
 * @param {string} expiryStr - Expiry string (e.g., "10d", "15m", "2h")
 * @returns {number} - Milliseconds
 */
export const convertExpiryToMs = (expiryStr) => {
  if (!expiryStr || typeof expiryStr !== "string") {
    return null;
  }

  const match = expiryStr.match(/^(\d+)([mhd])$/i);
  if (!match) {
    console.warn(`Invalid expiry format: ${expiryStr}. Using default 7d`);
    return 7 * 24 * 60 * 60 * 1000; // Default 7 days
  }

  const [, value, unit] = match;
  const numValue = parseInt(value, 10);

  switch (unit.toLowerCase()) {
    case "m": // minutes
      return numValue * 60 * 1000;
    case "h": // hours
      return numValue * 60 * 60 * 1000;
    case "d": // days
      return numValue * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
};

/**
 * Get token cookie options based on environment
 * @param {number} expiryMs - Expiry in milliseconds
 * @returns {object} - Cookie options
 */
export const getTokenCookieOptions = (expiryMs) => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: expiryMs,
    path: "/",
  };
};

/**
 * Get refresh token cookie options from env
 * @returns {object} - Cookie options
 */
export const getRefreshTokenCookieOptions = () => {
  const expiryStr = process.env.REFRESH_TOKEN_EXPIRY || "10d";
  const expiryMs = convertExpiryToMs(expiryStr);
  return getTokenCookieOptions(expiryMs);
};

/**
 * Get access token maxAge from env (in milliseconds)
 * @returns {number} - maxAge in milliseconds
 */
export const getAccessTokenMaxAge = () => {
  const expiryStr = process.env.ACCESS_TOKEN_EXPIRY || "15m";
  return convertExpiryToMs(expiryStr);
};

/**
 * Get refresh token maxAge from env (in milliseconds)
 * @returns {number} - maxAge in milliseconds
 */
export const getRefreshTokenMaxAge = () => {
  const expiryStr = process.env.REFRESH_TOKEN_EXPIRY || "10d";
  return convertExpiryToMs(expiryStr);
};

export default {
  convertExpiryToMs,
  getTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getAccessTokenMaxAge,
  getRefreshTokenMaxAge,
};
