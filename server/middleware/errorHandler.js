export const notFound = (req, res, next) => {
  const info = `${req.method} ${req.originalUrl}`;
  res.status(404).json({ message: "Route not found", route: info });
};

export const errorHandler = (err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Internal server error"
  });
};

