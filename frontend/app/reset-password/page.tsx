"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../../lib/api";
import toast from "react-hot-toast";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";

const schema = z.object({
  email: z.string().email(),
  code: z.string().min(4),
  newPassword: z.string().min(6)
});

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post("/auth/reset-password", values);
      toast.success("Password reset. You can now sign in.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Reset failed");
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-3xl font-semibold">Reset password</h1>
      <p className="text-sm text-slate-300">
        Enter the OTP sent to your email along with your new password.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="glass-card space-y-4 p-6">
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200 inline-flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Your account stays protected
        </div>
        <div className="space-y-2">
          <label className="block text-xs mb-1 text-slate-300">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/80" />
            <input type="email" className="pl-10" {...register("email")} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-xs mb-1 text-slate-300">OTP code</label>
          <input type="text" className="tracking-[0.2em]" {...register("code")} />
        </div>
        <div className="space-y-2">
          <label className="block text-xs mb-1 text-slate-300">
            New password
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300/80" />
            <input
              type="password"
              className="pl-10"
              {...register("newPassword")}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="premium-button w-full py-2.5 text-sm"
        >
          {isSubmitting ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </div>
  );
}

