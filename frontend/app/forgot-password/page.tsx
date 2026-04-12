"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../../lib/api";
import toast from "react-hot-toast";
import { Mail, ShieldAlert } from "lucide-react";

const schema = z.object({
  email: z.string().email()
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post("/auth/forgot-password", values);
      toast.success("If that email exists, an OTP was sent");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Request failed");
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      <h1 className="text-3xl font-bold">Forgot password</h1>
      <p className="text-sm text-slate-300">
        Enter your email and we will send you a one-time password (OTP) to reset
        your account.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="glass-card space-y-4 p-6">
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-200 inline-flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> OTP valid for a short time
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/80" />
            <input type="email" className="pl-10" {...register("email")} />
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="premium-button w-full py-2.5 text-sm"
        >
          {isSubmitting ? "Sending..." : "Send OTP"}
        </button>
      </form>
    </div>
  );
}

