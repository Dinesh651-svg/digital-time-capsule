"use client";

import { useEffect, useState } from "react";
import { api, AuthUser, Capsule } from "../../lib/api";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import StorageBar from "../../components/StorageBar";
import Countdown from "../../components/Countdown";
import { BadgeCheck, Lock, Plus, Sparkles, Unlock } from "lucide-react";

const FREE_LIMIT = 524288000;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [capsules, setCapsules] = useState<Capsule[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await api.get("/auth/me");
        setUser(me.data);
        const caps = await api.get("/capsules");
        setCapsules(caps.data);
      } catch {
        router.push("/login");
      }
    };
    load();
  }, [router]);

  const badge = (status: Capsule["status"]) => {
    if (status === "unlocked") {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-300 text-xs">
          <Unlock className="w-3 h-3" /> Unlocked
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-slate-300 text-xs">
        <Lock className="w-3 h-3" /> Locked
      </span>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="glass-card p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Dashboard
          </p>
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2 leading-tight">
            Dashboard
            <BadgeCheck className="w-6 h-6 text-primary" />
          </h1>
          <p className="text-base text-slate-300 mt-1">
            Welcome back{user ? `, ${user.name}` : ""}.
          </p>
        </div>
        <button
          className="text-sm text-slate-300 hover:text-cyan-200 mt-2 md:mt-0"
          onClick={() => {
            localStorage.removeItem("dtc_token");
            toast.success("Signed out");
            router.push("/login");
          }}
        >
          Sign out
        </button>
      </div>

      <div className="glass-card p-6 space-y-4">
        <StorageBar
          usedBytes={user?.totalStorageUsed || 0}
          limitBytes={FREE_LIMIT}
        />
        <button
          className="premium-button mt-2 inline-flex items-center gap-2 px-4 py-2 text-xs"
          onClick={() => router.push("/capsules/create")}
        >
          <Plus className="w-4 h-4" />
          Create new capsule
        </button>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-200">Your capsules</h2>
        {capsules.length === 0 ? (
          <p className="text-sm text-slate-300 glass-card p-4">
            You have no capsules yet. Create your first one.
          </p>
        ) : (
          <div className="space-y-3">
            {capsules.map((c) => (
              <button
                key={c._id}
                onClick={() => router.push(`/capsules/${c._id}`)}
                className="w-full text-left glass-card p-4 md:p-5 hover:border-cyan-300/40 hover:shadow-[0_20px_40px_-30px_rgba(6,182,212,0.8)] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">{c.title}</h3>
                    <p className="text-sm text-slate-300 line-clamp-2">
                      {c.description}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    {badge(c.status)}
                    <Countdown target={c.unlockDate} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

