"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, Capsule } from "../../../lib/api";
import toast from "react-hot-toast";
import Countdown from "../../../components/Countdown";
import EmergencyUnlockModal from "../../../components/EmergencyUnlockModal";
import NomineeUnlockSection from "../../../components/NomineeUnlockSection";
import { FileText, Lock, Unlock } from "lucide-react";

export default function CapsuleDetailPage() {
  const params = useParams() as { id: string };
  const router = useRouter();

  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [locked, setLocked] = useState(false);
  const [showData, setShowData] = useState(true);
  const [unlockDate, setUnlockDate] = useState<string | null>(null);
  const [nominees, setNominees] = useState<import("../../../lib/api").Nominee[]|null>(null);

  const load = async () => {
    try {
      // Clear stale sensitive state before loading fresh server response.
      setCapsule(null);
      const res = await api.get(`/capsules/${params.id}`, {
        params: { t: Date.now() }
      });
      if (res.data.locked) {
        setLocked(true);
        setShowData(true);
        setUnlockDate(res.data.unlockDate);
        if (res.data.nominees) setNominees(res.data.nominees);
      } else if (res.data.unlocked === true && res.data.showData === false) {
        setLocked(false);
        setShowData(false);
        setUnlockDate(null);
        setNominees(null);
        setCapsule(null);
      } else {
        const capsuleData = res.data.capsule || res.data;
        setLocked(false);
        setShowData(true);
        setNominees(null);
        setCapsule(capsuleData);
        setUnlockDate(capsuleData.unlockDate);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load capsule");
      router.push("/dashboard");
    }
  };

  useEffect(() => {
    load();
  }, [params.id]);

  // countdown until unlock, then reload
  useEffect(() => {
    if (!locked || !unlockDate) return;
    const timer = setInterval(() => {
      if (new Date() >= new Date(unlockDate)) {
        clearInterval(timer);
        load();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [locked, unlockDate]);

  const isUnlocked = !locked && capsule !== null;

  if (locked && unlockDate) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center glass-card p-8 md:p-12 rounded-3xl max-w-lg w-full space-y-6">
          <Lock className="w-16 h-16 mx-auto text-emerald-400 animate-pulse" />
          <h1 className="text-2xl font-bold">This Capsule is Locked</h1>
          <div className="space-y-2">
            <div className="text-sm text-slate-300">Unlocks In</div>
            <Countdown target={unlockDate} />
          </div>
          <div className="text-xs text-slate-400">
            Unlock Date<br />{new Date(unlockDate).toLocaleString()}
          </div>
          <p className="text-sm text-slate-300">
            The contents of this capsule will be revealed when the time arrives.
          </p>

          {/* unlock options available even while locked */}
          <div className="mt-6 space-y-4">
            <EmergencyUnlockModal capsuleId={params.id} onSuccess={load} />
            {/** only render nominee UI if we know there are nominees **/}
            {nominees && nominees.length > 0 && (
              <NomineeUnlockSection
                capsuleId={params.id}
                nominees={nominees}
                onSuccess={load}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!locked && !showData) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center glass-card p-12 rounded-3xl max-w-md w-full space-y-6">
          <Unlock className="w-16 h-16 mx-auto text-emerald-400 animate-pulse" />
          <h1 className="text-2xl font-bold">Capsule unlocked</h1>
          <p className="text-sm text-slate-300">
            Capsule unlocked but content is hidden until unlock date.
          </p>
        </div>
      </div>
    );
  }

  if (!capsule) {
    return <p className="text-sm text-slate-400">Loading capsule...</p>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {showData && (
        <>
          <div className="glass-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                {capsule.title}
                <Unlock className="w-4 h-4 text-emerald-400" />
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Unlocks at {new Date(capsule.unlockDate).toLocaleString()}
              </p>
            </div>
          </div>

          {capsule.description && (
            <div className="glass-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">Description</h2>
              <p className="text-sm text-slate-100 whitespace-pre-wrap">
                {capsule.description}
              </p>
            </div>
          )}

          <div className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">Message</h2>
            <p className="text-sm text-slate-100 whitespace-pre-wrap">
              {capsule.message}
            </p>
          </div>

          <div className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" /> Files
            </h2>
            {capsule.files.length === 0 ? (
              <p className="text-xs text-slate-400">No files attached.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {capsule.files.map((f: any, idx: number) => {
                  // NEXT_PUBLIC_API_URL is expected to include the /api prefix
                  // (e.g. "http://localhost:5000/api").
                  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
                  const url = `${apiBase}${f.filepath}`;
                  const isImage = f.mimetype.startsWith("image/");
                  const isVideo = f.mimetype.startsWith("video/");
                  const isDoc = !isImage && !isVideo;
                  return (
                    <div key={idx} className="rounded-xl border border-white/10 bg-slate-900/65 p-3 flex flex-col hover:border-cyan-300/40 transition-colors">
                      <p className="text-sm text-slate-200 truncate mb-1">{f.filename}</p>
                      {isImage && <img src={url} alt={f.filename} className="max-w-full rounded" />}
                      {isVideo && (
                        <video controls className="max-w-full rounded">
                          <source src={url} type={f.mimetype} />
                          Your browser does not support the video tag.
                        </video>
                      )}
                      {isDoc && (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                          Open / download
                        </a>
                      )}
                      {/* use fetch+blob to force download; avoids cross-origin anchor limitations */}
                      <button
                        onClick={async () => {
                          try {
                            // use the shared axios instance so the stored JWT is sent
                            const resp = await api.get(
                              `/capsules/${capsule._id}/download/${idx}`,
                              { responseType: "blob" }
                            );

                            const blob = resp.data as Blob;
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = blobUrl;
                            a.download = f.filename;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(blobUrl);
                          } catch (err: any) {
                            toast.error(err?.response?.data?.message || err?.message || "Download failed");
                          }
                        }}
                        className="premium-button px-3 py-1.5 rounded-lg mt-2 inline-block text-center text-xs"
                      >
                        Download
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
      {!isUnlocked && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Need earlier access? Use emergency unlock with password + email OTP.
            </p>
            <EmergencyUnlockModal
              capsuleId={capsule._id}
              onSuccess={() => {
                load();
              }}
            />
          </div>
          {capsule.nominees && capsule.nominees.length > 0 && (
            <NomineeUnlockSection
              capsule={capsule}
              onSuccess={() => {
                load();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
