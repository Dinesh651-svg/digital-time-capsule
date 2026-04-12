"use client";

import React, { useState } from "react";
import { api } from "../lib/api";
import toast from "react-hot-toast";
import { AlertTriangle, ShieldAlert } from "lucide-react";

interface Props {
  capsuleId: string;
  onSuccess?: () => void;
}

const EmergencyUnlockModal: React.FC<Props> = ({ capsuleId, onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"request" | "verify">("request");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const requestOTP = async () => {
    setLoading(true);
    try {
      await api.post(`/capsules/${capsuleId}/emergency/request-otp`);
      toast.success("OTP sent to your email");
      setStep("verify");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    try {
      await api.post(`/capsules/${capsuleId}/emergency/verify`, {
        password,
        code
      });
      toast.success("Capsule unlocked via emergency");
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to unlock capsule");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        className="text-xs px-3 py-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20"
        onClick={() => setIsOpen(true)}
      >
        Emergency unlock
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="glass-card p-6 w-full max-w-md space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Emergency unlock</h2>
          <button
            type="button"
            className="text-xs text-slate-400 hover:text-slate-200"
            onClick={() => setIsOpen(false)}
          >
            Close
          </button>
        </div>
        {step === "request" ? (
          <div className="space-y-3 text-sm">
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
              <ShieldAlert className="w-3.5 h-3.5" /> Extra verification required
            </p>
            <p className="text-slate-300 text-sm">
              This will send a one-time password (OTP) to your registered email.
            </p>
            <button
              type="button"
              onClick={requestOTP}
              disabled={loading}
              className="w-full rounded-xl py-2 text-sm font-medium text-slate-900 bg-gradient-to-r from-amber-300 to-orange-300 hover:brightness-105"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
              <AlertTriangle className="w-3.5 h-3.5" /> Confirm identity to continue
            </p>
            <p className="text-slate-300 text-sm">
              Enter your account password and the OTP from your email.
            </p>
            <div className="space-y-2">
              <label className="block text-xs text-slate-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-slate-300">OTP code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full"
              />
            </div>
            <button
              type="button"
              onClick={verify}
              disabled={loading}
              className="premium-button w-full py-2 text-sm"
            >
              {loading ? "Verifying..." : "Unlock now"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyUnlockModal;

