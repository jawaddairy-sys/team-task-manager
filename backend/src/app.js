import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import session from "express-session";
import passport from "passport";
import pgSession from "connect-pg-simple";

import pool from "./config/db.js";
import "./config/passport.js";
import authRoutes from "./routes/authRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";

const app = express();

// ==============================================
// Rate Limiting (Prevent brute force attacks)
// ==============================================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use("/api/", limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 login/register attempts per 15 minutes
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
});

app.use("/api/auth/", authLimiter);

// ==============================================
// Security & Logging Middleware
// ==============================================

// Helmet with custom configuration
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          process.env.FRONTEND_URL || "http://localhost:5173",
          "https://*.vercel.app",
        ],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginEmbedderPolicy: { policy: "credentialless" },
  }),
);

// Compression for better performance
app.use(compression());

// Morgan logging with different formats based on environment
if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined")); // More detailed logging in production
} else {
  app.use(morgan("dev")); // Color-coded development logging
}

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:5173"];
    // Allow *.vercel.app subdomains
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.match(/https:\/\/team-task-manager.*\.vercel\.app$/)
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cookie",
    "X-Requested-With",
  ],
  exposedHeaders: ["Set-Cookie", "X-Total-Count"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

// Body parsing with security limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Trust proxy (for when behind nginx/reverse proxy)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ==============================================
// Session Configuration
// ==============================================

const PgSessionStore = pgSession(session);

// Configure session store based on environment
let sessionStore;
if (process.env.NODE_ENV === "production") {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in production");
  }

  sessionStore = new PgSessionStore({
    pool: pool,
    tableName: "session",
    createTableIfMissing: true,
    ttl: 7 * 24 * 60 * 60, // 7 days
    pruneSessionInterval: 60, // Prune expired sessions every 60 seconds
    errorLog: console.error,
  });

  console.log(" Using PostgreSQL session store (production mode)");
} else {
  // In development, we can still use PostgreSQL but with more logging
  if (process.env.DATABASE_URL) {
    sessionStore = new PgSessionStore({
      pool: pool,
      tableName: "session",
      createTableIfMissing: true,
      ttl: 7 * 24 * 60 * 60,
    });
    console.log(" Using PostgreSQL session store (development mode)");
  } else {
    // Fallback to memory store (for development without database)
    const MemoryStore = (await import("express-session")).MemoryStore;
    sessionStore = new MemoryStore();
    console.log(
      "Using MemoryStore for sessions (not recommended for production)",
    );
  }
}

// Session configuration
const sessionConfig = {
  store: sessionStore,
  secret:
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV === "production"
      ? (() => {
          throw new Error("SESSION_SECRET is required in production");
        })()
      : "dev-secret-key-do-not-use-in-production"),
  resave: false,
  saveUninitialized: false,
  name: "__session", // Custom cookie name for security
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: "lax", // "strict" → "none"
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
    domain: process.env.COOKIE_DOMAIN || undefined,
  },
  rolling: true, // Reset cookie expiration on each request
  proxy: process.env.NODE_ENV === "production",
};

app.use(session(sessionConfig));

// ==============================================
// Passport Authentication
// ==============================================

app.use(passport.initialize());
app.use(passport.session());

// ==============================================
// Request Logging Middleware (Development only)
// ==============================================

if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(` ${req.method} ${req.path} - Session ID: ${req.sessionID}`);
    next();
  });
}

// ==============================================
// API Routes
// ==============================================

// Health check endpoint with detailed info
app.get("/api/health", async (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    authenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    user: req.user ? { id: req.user.id, email: req.user.email } : null,
  };

  // Test database connection
  try {
    const client = await pool.connect();
    const dbTest = await client.query("SELECT NOW() as time");
    client.release();
    health.database = {
      status: "connected",
      time: dbTest.rows[0].time,
    };
  } catch (error) {
    health.database = {
      status: "disconnected",
      error: error.message,
    };
    health.status = "degraded";
  }

  res.status(200).json(health);
});

// API version info
app.get("/api/version", (req, res) => {
  res.status(200).json({
    version: "1.0.0",
    name: "Team Task Manager API",
    description: "REST API for Team Task Management System",
    environment: process.env.NODE_ENV,
  });
});

// Mount route modules
app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/tasks", taskRoutes);

// ==============================================
// 404 Handler for undefined routes
// ==============================================

app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
    timestamp: new Date().toISOString(),
  });
});

// ==============================================
// Global Error Handler
// ==============================================

// Handle specific error types
const handleErrors = {
  // Validation errors
  ValidationError: (err, res) => {
    res.status(400).json({
      success: false,
      name: "ValidationError",
      message: err.message,
      errors: err.details || err.errors,
      timestamp: new Date().toISOString(),
    });
  },

  // Joi validation errors
  JoiValidationError: (err, res) => {
    res.status(400).json({
      success: false,
      name: "ValidationError",
      message: "Request validation failed",
      errors: err.details.map((d) => ({
        field: d.path.join("."),
        message: d.message,
      })),
      timestamp: new Date().toISOString(),
    });
  },

  // Authentication errors
  UnauthorizedError: (err, res) => {
    res.status(401).json({
      success: false,
      name: "UnauthorizedError",
      message: err.message || "Authentication required",
      timestamp: new Date().toISOString(),
    });
  },

  // PostgreSQL unique violation
  23505: (err, res) => {
    res.status(409).json({
      success: false,
      name: "ConflictError",
      message: "Resource already exists",
      detail: err.detail,
      timestamp: new Date().toISOString(),
    });
  },

  // PostgreSQL foreign key violation
  23503: (err, res) => {
    res.status(400).json({
      success: false,
      name: "ForeignKeyError",
      message: "Referenced resource does not exist",
      timestamp: new Date().toISOString(),
    });
  },

  // Default error handler
  default: (err, res) => {
    const statusCode = err.status || err.statusCode || 500;
    const isProduction = process.env.NODE_ENV === "production";

    console.error("Unhandled error:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      name: err.name,
    });

    res.status(statusCode).json({
      success: false,
      name: err.name || "InternalServerError",
      message:
        isProduction && statusCode === 500
          ? "An unexpected error occurred. Please try again later."
          : err.message || "Internal server error",
      ...(process.env.NODE_ENV === "development" && {
        stack: err.stack,
        code: err.code,
      }),
      timestamp: new Date().toISOString(),
    });
  },
};

// Global error handling middleware
app.use((err, req, res, next) => {
  // Log error details
  console.error("Error occurred:", {
    message: err.message,
    stack: err.stack,
    code: err.code,
    name: err.name,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?.id,
  });

  // Handle specific error types
  const handler =
    handleErrors[err.name] || handleErrors[err.code] || handleErrors.default;
  handler(err, res);
});

// Handle unhandled promise rejections (optional but good practice)
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

export default app;
