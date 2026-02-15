import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";

// Load environment variables
dotenv.config();

const app = express();


/* ===============================
   Global Middlewares
================================ */
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
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
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

/* ===============================
   Export App
================================ */
export default app;
