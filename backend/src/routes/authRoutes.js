import express from "express";
import {
  register,
  login,
  logout,
  getMe,
} from "../controllers/authController.js";
import validate from "../middleware/validateMiddleware.js";
import { registerSchema, loginSchema } from "../validators/authValidator.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

// Protected routes (require authentication)
router.post("/logout", isAuthenticated, logout);
router.get("/me", isAuthenticated, getMe);

export default router;
