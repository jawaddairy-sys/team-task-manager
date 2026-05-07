import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import pool from "./db.js";

// Helper function to handle database errors
const handleDatabaseError = (error, done) => {
  console.error("Database error in passport strategy:", error);

  // Check for specific PostgreSQL error codes
  if (error.code === "ECONNREFUSED") {
    return done(new Error("Database connection failed"));
  }
  if (error.code === "42P01") {
    return done(new Error("Users table not found"));
  }

  return done(error);
};

// Local Strategy configuration
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: false, // Don't pass request to callback
      session: true, // Use session
    },
    async (email, password, done) => {
      // Input validation
      if (!email || !password) {
        return done(null, false, {
          message: "Email and password are required",
        });
      }

      try {
        // Query user by email (case-insensitive)
        const result = await pool.query(
          `SELECT 
          id, 
          email, 
          password_hash,
          created_at 
         FROM users 
         WHERE LOWER(email) = LOWER($1)`,
          [email],
        );

        // User not found
        if (result.rows.length === 0) {
          // Use vague message for security (don't reveal if email exists)
          return done(null, false, {
            message: "Invalid email or password",
          });
        }

        const user = result.rows[0];

        // Check if user has password_hash (should always have, but just in case)
        if (!user.password_hash) {
          console.error(`User ${user.id} has no password_hash`);
          return done(null, false, {
            message: "Invalid credentials",
          });
        }

        // Compare password
        const isValidPassword = await bcrypt.compare(
          password,
          user.password_hash,
        );

        if (!isValidPassword) {
          // Optional: Add login attempt logging here
          return done(null, false, {
            message: "Invalid email or password",
          });
        }

        // Create safe user object (exclude sensitive data)
        const safeUser = {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        };

        // Log successful login (optional)
        console.log(`✅ User logged in: ${user.email} (ID: ${user.id})`);

        return done(null, safeUser);
      } catch (error) {
        return handleDatabaseError(error, done);
      }
    },
  ),
);

// Serialize user - store minimal info in session
passport.serializeUser((user, done) => {
  // Store only the user ID in the session
  // This keeps the session small and secure
  done(null, user.id);
});

// Deserialize user - fetch fresh user data on each request
passport.deserializeUser(async (id, done) => {
  try {
    // Validate ID
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return done(null, false, { message: "Invalid user ID" });
    }

    // Fetch user from database
    const result = await pool.query(
      `SELECT 
        id, 
        email,
        created_at 
       FROM users 
       WHERE id = $1`,
      [userId],
    );

    // User not found (might have been deleted)
    if (result.rows.length === 0) {
      console.warn(`User ${userId} not found during deserialization`);
      return done(null, false, { message: "User not found" });
    }

    const user = result.rows[0];

    // Optional: Add last active timestamp update
    // await pool.query('UPDATE users SET last_active = NOW() WHERE id = $1', [userId]);

    return done(null, user);
  } catch (error) {
    console.error("Error in deserializeUser:", error);
    return done(error);
  }
});

// Export passport instance
export default passport;
