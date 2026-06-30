import express from "express";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import OTPLog from "../models/OTPLog.js";
import { otpRateLimiter } from "../middleware/rateLimit.js";
import { sendOTPEmail, sendRegistrationEmail } from "../services/emailService.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

const generateToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    console.log("POST /api/auth/register -> body:", { name, email });
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already in use" });
    }
    const user = await User.create({ name, email, password });
    console.log("User created:", { id: user._id, email: user.email });
    const emailResult = await sendRegistrationEmail(user.email, user.name);

    if (!emailResult.sent) {
      console.warn(`Registration email skipped for ${emailResult.reason || "unknown"}`);
    }

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const token = generateToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    next(err);
  }
});

router.get("/me", authRequired, async (req, res) => {
  const user = req.user;
  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    totalStorageUsed: user.totalStorageUsed
  });
});

router.post("/forgot-password", otpRateLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      // don't leak existence
      return res.status(200).json({ message: "If that email exists, OTP sent" });
    }
    const code = generateOTP();
    const hashed = await bcrypt.hash(code, 10);
    const expiresAt = dayjs().add(5, "minute").toDate();
    await OTPLog.create({
      user: user._id,
      email,
      code: hashed,
      type: "forgot_password",
      expiresAt
    });
    const emailResult = await sendOTPEmail(email, code, "password reset");
    if (!emailResult.sent && process.env.NODE_ENV !== "production") {
      // include code in response for local development when email not configured
      return res.json({ message: "OTP sent if email exists", debugCode: code });
    }
    res.json({ message: "OTP sent if email exists" });
  } catch (err) {
    next(err);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;
    const otp = await OTPLog.findOne({
      email,
      type: "forgot_password",
      used: false
    }).sort({ createdAt: -1 });
    if (!otp || dayjs().isAfter(otp.expiresAt)) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    const match = await bcrypt.compare(code, otp.code);
    if (!match) {
      otp.attempts += 1;
      if (otp.attempts >= 3) {
        otp.used = true; // lock out after 3 failures
      }
      await otp.save();
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    user.password = newPassword;
    await user.save();
    otp.used = true;
    await otp.save();
    res.json({ message: "Password reset successful" });
  } catch (err) {
    next(err);
  }
});

export default router;

