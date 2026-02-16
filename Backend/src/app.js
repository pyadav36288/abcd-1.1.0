import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import { apiError } from "./utils/apiError.js";

// Load environment variables
dotenv.config();

const app = express();


/* ===============================
   Global Middlewares
================================ */
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ["http://localhost:3000", "http://localhost:5173"],
  credentials: true,
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

/* ===============================
   Health Check
================================ */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend server is running 🚀",
  });
});

/* ===============================
   Routes
================================ */
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);

/* ===============================
   Global Error Handler
================================ */
app.use((err, req, res, next) => {
  // If error is an instance of apiError, use its properties
  if (err instanceof apiError) {
    return res.status(err.statusCode).json({
      statusCode: err.statusCode,
      success: err.success,
      message: err.message,
      errors: err.errors || [],
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }

  // For generic Error objects or other errors
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: [],
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

/* ===============================
   Export App
================================ */
export default app;
