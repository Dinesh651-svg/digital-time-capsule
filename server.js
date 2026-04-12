import dotenv from "dotenv";
import path from "path";

// Load environment variables
// when running from the `server` directory the cwd is already `.../server`
// so resolving "server/.env" produced `server/server/.env` which doesn't exist.
// Simply load the .env file from the current working directory (or let dotenv
// use its default behavior) so our vars (SMTP_USER/SMTP_PASS, MONGO_URI, etc.)
// are available. This fixes the problem where SMTP_USER was undefined and
// `SMTP_PASS exists:` logged false.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import express from "express";
import mongoose from "mongoose";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cors from "cors";
import cron from "node-cron";
import dayjs from "dayjs";
import fs from "fs";

import authRoutes from "./routes/auth.js";
import capsuleRoutes from "./routes/capsules.js";
// fileRoutes removed; static serving of uploads used instead
import Capsule from "./models/Capsule.js";
import UnlockLog from "./models/UnlockLog.js";
import { sendCapsuleUnlockedEmail } from "./services/emailService.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

// -----------------------------
// Security + Middleware
// -----------------------------
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));

// -----------------------------
// Ensure uploads folder exists
// -----------------------------
const uploadsDir = path.join(process.cwd(), "server", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// -----------------------------
// Static file serving
// -----------------------------
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "server", "uploads"))
);

// -----------------------------
// Health check route
// -----------------------------
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// -----------------------------
// API Routes
// -----------------------------
app.use("/api/auth", authRoutes);
app.use("/api/capsules", capsuleRoutes);
// app.use("/api/files", fileRoutes); // no longer needed

// -----------------------------
// Error Handling
// -----------------------------
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// -----------------------------
// Start Server Function
// -----------------------------
const start = async () => {
  try {
    // Connect MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("MongoDB connected");

    console.log("SMTP_USER:", process.env.SMTP_USER);
    console.log("SMTP_PASS exists:", !!process.env.SMTP_PASS);

    // -----------------------------
    // Cron Job for Capsule Unlock
    // -----------------------------
    const schedule = process.env.CRON_SCHEDULE || "*/2 * * * *";

    cron.schedule(schedule, async () => {
      try {
        const now = dayjs().toDate();

        const toUnlock = await Capsule.find({
          status: "locked",
          unlockDate: { $lte: now },
        }).populate("owner");

        for (const capsule of toUnlock) {
          capsule.status = "unlocked";
          capsule.unlockedAt = new Date();
          capsule.unlockedByMethod = "time";

          await capsule.save();

          await UnlockLog.create({
            capsule: capsule._id,
            user: capsule.owner._id,
            method: "time",
          });

          await sendCapsuleUnlockedEmail(
            capsule.owner.email,
            capsule.title,
            "scheduled time"
          );
        }
      } catch (err) {
        console.error("Cron unlock error:", err);
      }
    });

    // -----------------------------
    // Start Express Server
    // -----------------------------
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();