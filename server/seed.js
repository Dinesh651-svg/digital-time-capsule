import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Capsule from "./models/Capsule.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });

    const existing = await User.findOne({ email: "demo@timecapsule.local" });
    if (existing) {
      console.log("Demo user already exists");
      process.exit(0);
    }

    const user = await User.create({
      name: "Demo User",
      email: "demo@timecapsule.local",
      password: "Password123!"
    });

    const capsule = await Capsule.create({
      owner: user._id,
      title: "Welcome Capsule",
      description: "Sample capsule created by seed script",
      message: "This is a demo capsule that unlocks in the future.",
      unlockDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      visibility: "private"
    });

    console.log("Seed complete");
    console.log("Demo credentials: demo@timecapsule.local / Password123!");
    console.log("Sample capsule id:", capsule._id.toString());
    process.exit(0);
  } catch (err) {
    console.error("Seed error", err);
    process.exit(1);
  }
};

run();

