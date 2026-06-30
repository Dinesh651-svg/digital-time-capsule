import mongoose from "mongoose";

const nomineeSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true },
    status: {
      type: String,
      enum: ["invited", "otp_sent", "verified"],
      default: "invited"
    }
  },
  { _id: false }
);

const capsuleSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String },
    message: { type: String, required: true },
    unlockDate: { type: Date, required: true },
    visibility: {
      type: String,
      enum: ["private", "nominees", "public"],
      default: "private"
    },
    nomineeAccess: {
      type: String,
      enum: ["allow", "deny"],
      default: "deny"
    },
    status: {
      type: String,
      enum: ["locked", "unlocked"],
      default: "locked"
    },
    unlockedAt: { type: Date },
    unlockedByMethod: {
      type: String,
      enum: ["time", "emergency", "nominee", null],
      default: null
    },
    files: [
      {
        filename: { type: String, required: true },
        filepath: { type: String, required: true },
        mimetype: { type: String, required: true },
        size: { type: Number, required: true }
      }
    ],
    nominees: {
      type: [nomineeSchema],
      validate: [(arr) => arr.length <= 3, "Maximum of 3 nominees allowed"]
    }
  },
  { timestamps: true }
);

const Capsule = mongoose.model("Capsule", capsuleSchema);
export default Capsule;

