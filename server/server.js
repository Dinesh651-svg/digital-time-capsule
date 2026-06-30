import dotenv from "dotenv";
dotenv.config(); // ✅ simpler and correct for Render

import express from "express";
import mongoose from "mongoose";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cors from "cors";
import cron from "node-cron";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";

import authRoutes from "./routes/auth.js";
import capsuleRoutes from "./routes/capsules.js";
import Capsule from "./models/Capsule.js";
import UnlockLog from "./models/UnlockLog.js";
import { sendCapsuleUnlockedEmail } from "./services/emailService.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

// -----------------------------
// Middleware
// -----------------------------
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*", // ✅ avoid blocking
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));

// -----------------------------
// Uploads folder (FIXED PATH)
// -----------------------------
const uploadsDir = path.join(process.cwd(), "uploads"); // ✅ FIXED

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// -----------------------------
// Static files
// -----------------------------
app.use("/uploads", express.static(uploadsDir));

// -----------------------------
// Health Route
// -----------------------------
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// -----------------------------
// Routes
// -----------------------------
app.use("/api/auth", authRoutes);
app.use("/api/capsules", capsuleRoutes);

// -----------------------------
// Error Handling
// -----------------------------
app.use(notFound);
app.use(errorHandler);

// -----------------------------
// PORT (IMPORTANT)
// -----------------------------
const PORT = process.env.PORT || 5000;

// -----------------------------
// Start Server
// -----------------------------
const start = async () => {
  try {
    // ✅ MongoDB Connection (SAFE)
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not found");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB connected");

    // -----------------------------
    // Cron Job
    // -----------------------------
    const schedule = process.env.CRON_SCHEDULE || "*/2 * * * *";

    cron.schedule(schedule, async () => {
      try {
        const now = new Date();

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
        console.error("Cron error:", err);
      }
    });

    // -----------------------------
    // Start Server
    // -----------------------------
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ Server start failed:", err.message);
    process.exit(1);
  }
};

start();