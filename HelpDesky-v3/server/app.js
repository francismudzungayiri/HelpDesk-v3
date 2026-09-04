const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

dotenv.config();

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!process.env.JWT_SECRET) {
  throw new Error("Missing required environment variable: JWT_SECRET");
}

// Behind nginx (see deploy.sh) req.ip is the proxy's address unless we say how
// many proxies to trust. Without this every client shares one rate-limit bucket.
const trustProxy = Number.parseInt(process.env.TRUST_PROXY ?? "1", 10);
app.set("trust proxy", Number.isNaN(trustProxy) ? 1 : trustProxy);

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again after 15 minutes",
  },
  // The suite fires many requests from one address on purpose.
  skip: () => process.env.NODE_ENV === "test",
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/tickets");
const userRoutes = require("./routes/users");
const statsRoutes = require("./routes/stats");
const ticketMetaRoutes = require("./routes/ticketMeta");
const eventsRoutes = require("./routes/events");

app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/ticket-meta", ticketMetaRoutes);
app.use("/api/events", eventsRoutes);

app.get("/", (req, res) => {
  res.send("HelpDesky API v1.0 is running");
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ message: "Internal server error" });
});

module.exports = app;
