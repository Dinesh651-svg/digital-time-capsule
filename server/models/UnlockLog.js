import mongoose from "mongoose";

const unlockLogSchema = new mongoose.Schema(
  {
    capsule: { type: mongoose.Schema.Types.ObjectId, ref: "Capsule", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    nomineeEmail: { type: String },
    method: {
      type: String,
      enum: ["time", "emergency", "nominee"],
      required: true
    }
  },
  { timestamps: true }
);

const UnlockLog = mongoose.model("UnlockLog", unlockLogSchema);
export default UnlockLog;

