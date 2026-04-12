"use client";

import React, { useState } from "react";
import { api, Nominee } from "../lib/api";
import toast from "react-hot-toast";
import { Capsule } from "../lib/api";
import { Mail, ShieldCheck } from "lucide-react";

interface Props {
  // when full capsule object is available use it; otherwise pass id/+nominees separately
  capsule?: Capsule;
  capsuleId?: string;
  nominees?: Nominee[];
  onSuccess?: () => void;
}

const NomineeUnlockSection: React.FC<Props> = ({ capsule, capsuleId, nominees, onSuccess }) => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [loading, setLoading] = useState(false);

  const id = capsule ? capsule._id : capsuleId!;

  const requestOtp = async () => {
    setLoading(true);
    try {
      await api.post(`/capsules/${id}/nominee/request-otp`, { email });
      toast.success("OTP sent to nominee email");
      setStep("verify");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    try {
      await api.post(`/capsules/${id}/nominee/verify`, { email, code });
      toast.success("Capsule unlocked via nominee");
      if (onSuccess) onSuccess();
      else window.location.reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  if (step === "request") {
    return (
      <div className="glass-card p-4">
        <p className="text-xs text-slate-200 mb-3 inline-flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
          Nominee? Enter your email to receive an OTP to unlock.
        </p>
        <div className="flex gap-2 flex-col md:flex-row">
          <input
            type="email"
            className="flex-1 text-sm"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            className="premium-button px-4 rounded-xl text-sm disabled:opacity-50"
            disabled={loading || !email}
            onClick={requestOtp}
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <p className="text-xs text-slate-200 mb-3 inline-flex items-center gap-2">
        <Mail className="w-3.5 h-3.5 text-cyan-300" />
        Enter the OTP you received at {email}.
      </p>
      <div className="flex gap-2 flex-col md:flex-row">
        <input
          type="text"
          className="flex-1 text-sm"
          placeholder="OTP code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          className="premium-button px-4 rounded-xl text-sm disabled:opacity-50"
          disabled={loading || !code}
          onClick={verifyOtp}
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
      </div>
    </div>
  );
};

export default NomineeUnlockSection;
