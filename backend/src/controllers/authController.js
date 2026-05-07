import bcrypt from "bcrypt";
import passport from "passport";
import pool from "../config/db.js";

// Register a new user
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    // Hash password with bcrypt
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user into database
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, email`,
      [name, email.toLowerCase(), passwordHash],
    );

    const newUser = result.rows[0];

    // Return success response
    return res.status(201).json({
      message: "Registered successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      message: "Internal server error during registration",
    });
  }
};

// Login user using Passport local strategy
const login = (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    // Handle server error
    if (err) {
      console.error("Login authentication error:", err);
      return res.status(500).json({
        message: "Internal server error during login",
      });
    }

    // Handle authentication failure
    if (!user) {
      return res.status(401).json({
        message: info?.message || "Invalid email or password",
      });
    }

    // Log in the user
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error("Login session error:", loginErr);
        return res.status(500).json({
          message: "Error creating session",
        });
      }

      // Return success response
      return res.status(200).json({
        message: "Logged in successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    });
  })(req, res, next);
};

// Logout user and destroy session
const logout = (req, res) => {
  // Check if user is authenticated
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(200).json({
      message: "No active session to log out from",
    });
  }

  // Logout using Passport
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({
        message: "Error during logout",
      });
    }

    // Destroy session
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error("Session destruction error:", sessionErr);
        return res.status(500).json({
          message: "Error destroying session",
        });
      }

      // Clear session cookie
      res.clearCookie("connect.sid");

      // Return success response
      return res.status(200).json({
        message: "Logged out successfully",
      });
    });
  });
};

// Get current authenticated user
const getMe = (req, res) => {
  // Check if user is authenticated
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  // Return user data (already attached by Passport)
  return res.status(200).json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
    },
  });
};

// Export all controller functions
export { register, login, logout, getMe };
