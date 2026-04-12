"use client";

import React, { useState } from "react";
import { UploadCloud } from "lucide-react";
import toast from "react-hot-toast";

const allowedTypes = [
  "image/png",
  "image/jpeg",
  "video/mp4",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

interface Props {
  onFilesChange: (files: File[]) => void;
}

const FileUploader: React.FC<Props> = ({ onFilesChange }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [totalSize, setTotalSize] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);

    // merge with existing files, avoid duplicates based on name+size
    const combined = [...files];
    for (const f of selected) {
      if (combined.find((x) => x.name === f.name && x.size === f.size)) {
        continue; // skip duplicates
      }
      combined.push(f);
    }

    if (combined.length > 20) {
      toast.error("You can select up to 20 files");
      combined.splice(20);
    }

    const valid: File[] = [];
    let size = 0;
    for (const f of combined) {
      if (!allowedTypes.includes(f.type)) {
        toast.error(`Unsupported file: ${f.name}`);
        continue;
      }
      if (f.size > 100 * 1024 * 1024) {
        toast.error(`File too large (max 100MB): ${f.name}`);
        continue;
      }
      valid.push(f);
      size += f.size;
    }
    setFiles(valid);
    setTotalSize(size);
    onFilesChange(valid);
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-slate-200 mb-1">
        Attach files (PNG, JPG, MP4, PDF, DOC)
      </label>
      <label className="relative overflow-hidden border border-dashed border-cyan-300/30 bg-gradient-to-br from-cyan-400/10 to-emerald-400/10 rounded-xl px-4 py-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-cyan-300/60 hover:shadow-[0_18px_35px_-30px_rgba(6,182,212,0.9)] transition-all">
        <UploadCloud className="w-7 h-7 text-cyan-300" />
        <span className="text-xs text-slate-200">
          Click to select up to 20 files (max 100MB each)
        </span>
        <span className="text-[11px] text-slate-300/80">Drag & drop look with instant validation</span>
        <input
          type="file"
          className="hidden"
          multiple
          accept="image/png,image/jpeg,image/jpg,video/mp4,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleChange}
        />
      </label>
      {files.length > 0 && (
        <div className="glass-card p-3 space-y-1 text-xs text-slate-200">
          <div className="flex justify-between">
            <span>{files.length} files selected</span>
            <span>{(totalSize / (1024 * 1024)).toFixed(1)} MB total</span>
          </div>
          <ul className="max-h-28 overflow-y-auto space-y-1">
            {files.map((f) => (
              <li
                key={f.name + f.size}
                className="flex justify-between text-slate-300/90"
              >
                <span className="truncate max-w-[60%]">{f.name}</span>
                <span>{(f.size / (1024 * 1024)).toFixed(1)} MB</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUploader;

