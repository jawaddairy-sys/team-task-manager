import bcrypt from "bcrypt";
import passport from "passport";
import pool from "../config/db.js";

// Register a new user
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);

    if (existing.rows.length > 0)
      return res.status(409).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email.toLowerCase(), passwordHash],
    );

    return res
      .status(201)
      .json({ message: "Registered successfully", user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Login a user
const login = (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (!user)
      return res
        .status(401)
        .json({ message: info?.message || "Invalid credentials" });

    req.logIn(user, (loginErr) => {
      if (loginErr) return res.status(500).json({ message: "Session error" });
      return res.status(200).json({
        message: "Logged in",
        user: { id: user.id, name: user.name, email: user.email },
      });
    });
  })(req, res, next);
};

// Logout a user
const logout = (req, res) => {
  if (!req.isAuthenticated?.())
    return res.status(200).json({ message: "No active session" });

  req.logout((err) => {
    if (err) return res.status(500).json({ message: "Logout error" });

    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Logged out successfully" });
    });
  });
};

// Get current authenticated user
const getMe = (req, res) => {
  if (!req.isAuthenticated?.())
    return res.status(401).json({ message: "Not authenticated" });

  return res.status(200).json({
    user: { id: req.user.id, name: req.user.name, email: req.user.email },
  });
};

export { register, login, logout, getMe };
