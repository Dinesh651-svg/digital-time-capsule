"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../../lib/api";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await api.post("/auth/login", values);
      localStorage.setItem("dtc_token", res.data.token);
      toast.success("Logged in");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="text-center space-y-2">
        <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
          <ShieldCheck className="h-3.5 w-3.5" /> Secure sign-in
        </p>
        <h1 className="text-3xl md:text-4xl font-bold">Welcome back</h1>
        <p className="text-sm text-slate-300">Sign in to access your digital memories.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="glass-card space-y-5 p-6 md:p-7">
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/80" />
            <input type="email" className="pl-10" placeholder="you@example.com" {...register("email")} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">Password</label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-300/80" />
            <input type="password" className="pl-10" placeholder="Enter your password" {...register("password")} />
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="premium-button w-full py-2.5 text-sm"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
        <button
          type="button"
          className="w-full text-xs text-slate-300 hover:text-cyan-200"
          onClick={() => router.push("/register")}
        >
          Create an account
        </button>
      </form>
    </div>
  );
}

