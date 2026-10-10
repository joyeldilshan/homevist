require("dotenv").config();
const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const mongoose   = require("mongoose");
const cors       = require("cors");
const morgan     = require("morgan");
const path       = require("path");

const authRoutes         = require("./routes/auth.routes");
const bookingRoutes      = require("./routes/booking.routes");
const phlebotomistRoutes = require("./routes/phlebotomist.routes");
const testTypeRoutes      = require("./routes/testType.routes");
const planRoutes          = require("./routes/plan.routes");
const subscriptionRoutes  = require("./routes/subscription.routes");
const { errorHandler }   = require("./middleware/error.middleware");
const { securityHeaders } = require("./middleware/security.middleware");
const { startSubscriptionScheduler } = require("./jobs/subscriptionScheduler");
const logger = require("./utils/logger");

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin:  process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

/*
 * Render, Vercel and most PaaS hosts sit behind a reverse proxy. Without
 * this, req.ip is the proxy's address, so the rate limiters would treat
 * every visitor as one client and a single abuser would lock out everyone.
 * 1 = trust exactly one proxy hop, which is what Render provides.
 */
app.set("trust proxy", 1);

app.set("etag", false);

app.use((req, _res, next) => { req.io = io; next(); });

io.on("connection", (socket) => {
  logger.debug("Socket connected:", socket.id);
  socket.on("join_booking", (bookingId) => socket.join(bookingId));
  socket.on("join_admin",   ()          => socket.join("admin_room"));
  socket.on("disconnect",   ()          => logger.debug("Socket disconnected:", socket.id));
});

app.use(securityHeaders());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth",          authRoutes);
app.use("/api/bookings",      bookingRoutes);
app.use("/api/phlebotomists", phlebotomistRoutes);
app.use("/api/test-types",    testTypeRoutes);
app.use("/api/plans",         planRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/samples", require("./routes/sample.routes"));
app.use("/api/reports", require("./routes/labReport.routes"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "OK", project: "Home Visit", version: "1.0.0" });
});

app.use(errorHandler);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    logger.startup("Connected to MongoDB");
    startSubscriptionScheduler(io);
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      logger.startup("Home Visit API running on port " + PORT);
    });
  })
  .catch((err) => {
    logger.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });

module.exports = { app, io };