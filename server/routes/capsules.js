import express from "express";
import dayjs from "dayjs";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import Capsule from "../models/Capsule.js";
import OTPLog from "../models/OTPLog.js";
import UnlockLog from "../models/UnlockLog.js";
import { authRequired } from "../middleware/auth.js";
import {
  sendCapsuleUnlockedEmail,
  sendNomineeInviteEmail,
  sendNomineeVerifiedEmail,
  sendOTPEmail
} from "../services/emailService.js";
import { otpRateLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

const uploadDir = path.join(process.cwd(), "server", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedMime = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "video/mp4",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (allowedMime.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported file type"));
  }
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

router.get("/", authRequired, async (req, res, next) => {
  try {
    const capsules = await Capsule.find({ owner: req.user._id });
    res.json(capsules);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  authRequired,
  upload.array("files", 20), // allow up to 20 files per requirements
  async (req, res, next) => {
    try {
      const {
        title,
        description,
        message,
        unlockDate,
        visibility,
        nomineeAccess,
        nominees: nomineesRaw
      } = req.body;

      if (!title || title.length < 5) {
        return res.status(400).json({ message: "Title must be at least 5 characters" });
      }
      if (!message || message.length < 10) {
        return res.status(400).json({ message: "Message must be at least 10 characters" });
      }
      const unlock = dayjs(unlockDate);
      if (!unlock.isValid() || unlock.isBefore(dayjs())) {
        return res.status(400).json({ message: "Unlock date must be in the future" });
      }

      const freeBytes = Number(process.env.FREE_STORAGE_BYTES || 524288000);
      const newFilesSize = (req.files || []).reduce((acc, f) => acc + f.size, 0);
      if (req.user.totalStorageUsed + newFilesSize > freeBytes) {
        return res.status(400).json({ message: "Storage limit exceeded (500MB free tier)" });
      }
      if ((req.files || []).length > 20) {
        return res.status(400).json({ message: "Cannot upload more than 20 files" });
      }

      // map uploaded files to metadata
      const fileMeta = (req.files || []).map((file) => ({
        filename: file.filename,
        filepath: `/uploads/${file.filename}`,
        mimetype: file.mimetype,
        size: file.size
      }));

      let nominees = [];
      if (nomineesRaw) {
        try {
          nominees = JSON.parse(nomineesRaw);
        } catch {
          nominees = Array.isArray(nomineesRaw) ? nomineesRaw : [];
        }
      }
      if (nominees.length > 3) {
        return res.status(400).json({ message: "Maximum of 3 nominees allowed" });
      }

      const capsule = await Capsule.create({
        owner: req.user._id,
        title,
        description,
        message,
        unlockDate: unlock.toDate(),
        visibility: visibility || "private",
        nomineeAccess: nomineeAccess === "allow" ? "allow" : "deny",
        files: fileMeta,
        nominees: nominees.map((n) => ({
          name: n.name,
          email: n.email,
          status: "invited"
        }))
      });

      req.user.totalStorageUsed += newFilesSize;
      await req.user.save();

      for (const nominee of capsule.nominees) {
        await sendNomineeInviteEmail(
          nominee.email,
          req.user.name,
          capsule.title
        );
      }

      res.status(201).json(capsule);
    } catch (err) {
      next(err);
    }
  }
);

// route that returns only the stored message (useful for clients that
// just want the text without pulling the full capsule).  mirrors the same
// unlock/visibility rules as the main GET endpoint.
router.get("/:id/message", authRequired, async (req, res, next) => {
  try {
    const capsule = await Capsule.findById(req.params.id);
    if (!capsule) return res.status(404).json({ message: "Capsule not found" });

    const unlocked =
      Date.now() >= new Date(capsule.unlockDate).getTime() ||
      capsule.status === "unlocked";
    if (!unlocked) {
      return res.status(403).json({ message: "Capsule not yet unlocked" });
    }

    const isOwner = capsule.owner.equals(req.user._id);
    const isNominee = capsule.nominees.some((n) => n.email === req.user.email);
    const isBeforeUnlockDate = Date.now() < new Date(capsule.unlockDate).getTime();
    if (!isOwner && capsule.visibility === "private") {
      return res.status(403).json({ message: "Capsule locked" });
    }
    if (!isOwner && capsule.visibility === "nominees" && !isNominee) {
      return res.status(403).json({ message: "Capsule locked" });
    }
    if (isNominee && capsule.nomineeAccess === "deny" && isBeforeUnlockDate) {
      return res.status(403).json({ message: "Capsule content hidden until unlock date" });
    }

    res.json({ message: capsule.message });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", authRequired, async (req, res, next) => {
  try {
    const capsule = await Capsule.findById(req.params.id);
    if (!capsule) return res.status(404).json({ message: "Capsule not found" });

    const unlockTime = new Date(capsule.unlockDate).getTime();
    const currentTime = Date.now();
    const isTimeUnlocked = currentTime >= unlockTime;
    const isUnlocked = isTimeUnlocked || capsule.status === "unlocked";

    if (!isUnlocked) {
      // always return minimal info so clients can render a countdown
      // but still give nominee list so early unlock options can appear
      const out = { locked: true, unlockDate: capsule.unlockDate };
      if (capsule.nominees && capsule.nominees.length > 0) {
        // send only email+name/status; no message/content
        out.nominees = capsule.nominees.map((n) => ({
          name: n.name,
          email: n.email,
          status: n.status
        }));
      }
      return res.json(out);
    }

    // Hard rule: if nominee unlocked with deny before unlock date, hide all content.
    if (
      capsule.unlockedByMethod === "nominee" &&
      capsule.nomineeAccess === "deny" &&
      currentTime < unlockTime
    ) {
      return res.json({
        unlocked: true,
        showData: false
      });
    }

    const isOwner = capsule.owner.equals(req.user._id);
    const isNominee = capsule.nominees.some((n) => n.email === req.user.email);

    if (!isOwner && capsule.visibility === "private") {
      return res.status(403).json({ message: "Capsule locked" });
    }
    if (!isOwner && capsule.visibility === "nominees" && !isNominee) {
      return res.status(403).json({ message: "Capsule locked" });
    }

    // Owner should always see full data.
    if (isOwner) {
      return res.json({ ...capsule.toObject(), unlocked: true, showData: true });
    }

    // Time-based unlock should expose full data for everyone with access.
    if (isTimeUnlocked) {
      return res.json({ ...capsule.toObject(), unlocked: true, showData: true });
    }

    // Grant full data in all other unlocked scenarios with allowed access.
    res.json({ ...capsule.toObject(), unlocked: true, showData: true });
  } catch (err) {
    next(err);
  }
});

// download an individual file with original filename
router.get("/:id/download/:index", authRequired, async (req, res, next) => {
  try {
    const { id, index } = req.params;
    const capsule = await Capsule.findById(id);
    if (!capsule) {
      console.log("download: capsule not found", id);
      return res.status(404).json({ message: "Capsule not found" });
    }

    // unlock check with logging
    const now = Date.now();
    const unlockTime = new Date(capsule.unlockDate).getTime();
    console.log("download: unlockDate", capsule.unlockDate, "now", new Date(now).toISOString());
    const unlocked = now >= unlockTime || capsule.status === "unlocked";
    if (!unlocked) {
      return res.status(403).json({ message: "Capsule not yet unlocked." });
    }
    const isOwner = capsule.owner.equals(req.user._id);
    const isNominee = capsule.nominees.some((n) => n.email === req.user.email);
    const isBeforeUnlockDate = now < unlockTime;
    if (isNominee && !isOwner && capsule.nomineeAccess === "deny" && isBeforeUnlockDate) {
      return res.status(403).json({ message: "Capsule content hidden until unlock date." });
    }

    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0 || idx >= capsule.files.length) {
      return res.status(400).json({ message: "Invalid file index" });
    }
    const file = capsule.files[idx];
    // `uploadDir` is defined at module top; earlier typo referenced `uploadsDir` which
    // caused a ReferenceError and resulted in a 500.
    const filePath = path.join(uploadDir, path.basename(file.filepath));
    console.log("download: filePath", filePath);
    if (!fs.existsSync(filePath)) {
      console.error("download: file missing", filePath);
      return res.status(404).json({ message: "File not found." });
    }

    // stream as attachment
    res.download(filePath, file.filename, (err) => {
      if (err) {
        console.error("download error", err);
        next(err);
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/emergency/request-otp", authRequired, otpRateLimiter, async (req, res, next) => {
  try {
    const capsule = await Capsule.findById(req.params.id);
    if (!capsule) return res.status(404).json({ message: "Capsule not found" });
    if (!capsule.owner.equals(req.user._id)) {
      return res.status(403).json({ message: "Not capsule owner" });
    }
    if (capsule.status === "unlocked") {
      return res.status(400).json({ message: "Capsule already unlocked" });
    }
    // gather owner + nominee emails (unique)
    const emails = new Set([req.user.email]);
    capsule.nominees.forEach((n) => emails.add(n.email));
    const code = generateOTP();
    const hashed = await bcrypt.hash(code, 10);
    const expiresAt = dayjs().add(5, "minute").toDate();
    const emailResults = [];
    for (const email of emails) {
      await OTPLog.create({
        user: req.user._id,
        capsule: capsule._id,
        email,
        code: hashed,
        type: "emergency_unlock",
        expiresAt
      });
      const r = await sendOTPEmail(email, code, "emergency unlock");
      emailResults.push({ email, ...r });
    }
    // in development, if email delivery is not configured, return the code for testing
    const anyFailed = emailResults.some((r) => !r.sent);
    if (anyFailed && process.env.NODE_ENV !== "production") {
      return res.json({ message: "OTP sent to owner and nominees (email failed)", debugCode: code });
    }
    res.json({ message: "OTP sent to owner and nominees" });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/emergency/verify", authRequired, async (req, res, next) => {
  try {
    const { password, code } = req.body;
    const capsule = await Capsule.findById(req.params.id);
    if (!capsule) return res.status(404).json({ message: "Capsule not found" });
    if (!capsule.owner.equals(req.user._id)) {
      return res.status(403).json({ message: "Not capsule owner" });
    }
    if (!(await req.user.comparePassword(password))) {
      return res.status(400).json({ message: "Invalid password" });
    }
    const otp = await OTPLog.findOne({
      user: req.user._id,
      capsule: capsule._id,
      email: req.user.email,
      type: "emergency_unlock",
      used: false
    }).sort({ createdAt: -1 });
    if (!otp || dayjs().isAfter(otp.expiresAt)) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    const match = await bcrypt.compare(code, otp.code);
    if (!match) {
      otp.attempts += 1;
      if (otp.attempts >= 3) otp.used = true;
      await otp.save();
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    otp.used = true;
    await otp.save();
    capsule.status = "unlocked";
    capsule.unlockedAt = new Date();
    capsule.unlockedByMethod = "emergency";
    await capsule.save();
    await UnlockLog.create({
      capsule: capsule._id,
      user: req.user._id,
      method: "emergency"
    });
    await sendCapsuleUnlockedEmail(req.user.email, capsule.title, "emergency unlock");
    res.json({ message: "Capsule unlocked via emergency", capsule });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/nominee/request-otp", otpRateLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    const capsule = await Capsule.findById(req.params.id).populate("owner");
    if (!capsule) return res.status(404).json({ message: "Capsule not found" });
    if (capsule.status === "unlocked") {
      return res.status(400).json({ message: "Capsule already unlocked" });
    }
    const nominee = capsule.nominees.find((n) => n.email === email);
    if (!nominee) {
      return res.status(400).json({ message: "Not a nominee for this capsule" });
    }
    const code = generateOTP();
    const hashed = await bcrypt.hash(code, 10);
    const expiresAt = dayjs().add(5, "minute").toDate();
    await OTPLog.create({
      capsule: capsule._id,
      email,
      code: hashed,
      type: "nominee_unlock",
      expiresAt
    });
    const emailResult = await sendOTPEmail(email, code, "nominee unlock");
    nominee.status = "otp_sent";
    await capsule.save();
    if (!emailResult.sent && process.env.NODE_ENV !== "production") {
      return res.json({ message: "OTP sent to nominee email (email failed)", debugCode: code });
    }
    res.json({ message: "OTP sent to nominee email" });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/nominee/verify", async (req, res, next) => {
  try {
    const { email, code } = req.body;
    const capsule = await Capsule.findById(req.params.id).populate("owner");
    if (!capsule) return res.status(404).json({ message: "Capsule not found" });
    if (capsule.status === "unlocked") {
      return res.status(400).json({ message: "Capsule already unlocked" });
    }
    const nominee = capsule.nominees.find((n) => n.email === email);
    if (!nominee) {
      return res.status(400).json({ message: "Not a nominee for this capsule" });
    }
    const otp = await OTPLog.findOne({
      capsule: capsule._id,
      email,
      type: "nominee_unlock",
      used: false
    }).sort({ createdAt: -1 });
    if (!otp || dayjs().isAfter(otp.expiresAt)) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    const match = await bcrypt.compare(code, otp.code);
    if (!match) {
      otp.attempts += 1;
      if (otp.attempts >= 3) otp.used = true;
      await otp.save();
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    otp.used = true;
    await otp.save();
    nominee.status = "verified";
    capsule.status = "unlocked";
    capsule.unlockedAt = new Date();
    capsule.unlockedByMethod = "nominee";
    await capsule.save();
    await UnlockLog.create({
      capsule: capsule._id,
      nomineeEmail: email,
      method: "nominee"
    });
    await sendNomineeVerifiedEmail(email, capsule.title);
    await sendCapsuleUnlockedEmail(
      capsule.owner.email,
      capsule.title,
      "nominee unlock"
    );

    if (capsule.nomineeAccess === "deny") {
      return res.json({
        unlocked: true,
        showData: false,
        unlockDate: capsule.unlockDate,
        message: "Capsule unlocked; content hidden until unlock date"
      });
    }

    res.json({
      unlocked: true,
      showData: true,
      capsule
    });
  } catch (err) {
    next(err);
  }
});

export default router;