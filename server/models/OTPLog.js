import mongoose from "mongoose";

const otpLogSchema = new mongoose.Schema(
  {
    // user is optional for nominee unlocks where the nominee may not have an account
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    capsule: { type: mongoose.Schema.Types.ObjectId, ref: "Capsule" },
    email: { type: String, required: true },
    /**
     * The OTP is stored hashed for security. We use bcrypt to compare on verification.
     * The raw code is never persisted. `attempts` tracks failed verification attempts.
     */
    code: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    type: {
      type: String,
      enum: ["forgot_password", "emergency_unlock", "nominee_unlock"],
      required: true
    },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false }
  },
  { timestamps: true }
);

otpLogSchema.index({ email: 1, type: 1, createdAt: -1 });

const OTPLog = mongoose.model("OTPLog", otpLogSchema);
export default OTPLog;

