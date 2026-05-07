import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import pool from "./db.js";

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: false,
      session: true,
    },
    async (email, password, done) => {
      try {
        const result = await pool.query(
          "SELECT id, email, password_hash, created_at FROM users WHERE LOWER(email) = LOWER($1)",
          [email],
        );

        if (result.rows.length === 0)
          return done(null, false, { message: "Invalid email or password" });

        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid)
          return done(null, false, { message: "Invalid email or password" });

        return done(null, {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        });
      } catch (error) {
        return done(error);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query(
      "SELECT id, email, created_at FROM users WHERE id = $1",
      [id],
    );
    if (result.rows.length === 0) return done(null, false);
    return done(null, result.rows[0]);
  } catch (error) {
    return done(error);
  }
});

export default passport;
