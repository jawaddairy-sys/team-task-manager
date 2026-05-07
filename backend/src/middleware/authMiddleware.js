// Authentication middleware to protect routes
const isAuthenticated = (req, res, next) => {
  // Check if user is authenticated via Passport
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // Return 401 Unauthorized if not authenticated
  return res.status(401).json({
    message: "Unauthorized. Please login.",
  });
};

export { isAuthenticated };
