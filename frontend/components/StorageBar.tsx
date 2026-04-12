import React from "react";

interface Props {
  usedBytes: number;
  limitBytes: number;
}

const formatMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

export const StorageBar: React.FC<Props> = ({ usedBytes, limitBytes }) => {
  const pct = Math.min(100, (usedBytes / limitBytes) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-slate-300">
        <span>Storage</span>
        <span>
          {formatMB(usedBytes)} MB / {formatMB(limitBytes)} MB
        </span>
      </div>
      <div className="h-2.5 bg-slate-900/80 rounded-full overflow-hidden border border-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-400" : "bg-gradient-to-r from-emerald-500 to-cyan-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default StorageBar;

