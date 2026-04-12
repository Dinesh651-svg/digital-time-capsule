"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../../../lib/api";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import FileUploader from "../../../components/FileUploader";
import { CalendarClock, Eye, FileText, PlusCircle, Users } from "lucide-react";

const nomineeSchema = z.object({
  name: z.string().optional(),
  email: z.string().email()
});

const schema = z.object({
  title: z.string()
    .min(5)
    .regex(/^[A-Za-z0-9\s]+$/, {
      message: "Title can only contain letters, numbers and spaces"
    }),
  description: z.string().optional(),
  message: z.string().min(10).regex(/^[A-Za-z0-9\s.,!?'-]+$/, {
    message: "Message contains invalid characters"
  }),
  unlockDate: z.string().min(1),
  visibility: z.enum(["private", "nominees", "public"]),
  nomineeAccess: z.enum(["allow", "deny"]).default("deny"),
  nominees: z.array(nomineeSchema).optional()
});

type FormValues = z.infer<typeof schema>;

export default function CreateCapsulePage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      visibility: "private",
      nomineeAccess: "deny",
      nominees: []
    }
  });

  const nominees = watch("nominees") || [];
  // store files in state so they survive rerenders (was previously a
  // local variable which got reset and prevented multiple selections).
  const [files, setFiles] = useState<File[]>([]);

  const onFilesChange = (f: File[]) => {
    setFiles(f);
  };

  const addNominee = () => {
    if (nominees.length >= 3) {
      toast.error("You can only add up to 3 nominees");
      return;
    }
    const next = [...nominees, { name: "", email: "" }];
    setValue("nominees", next as any);
  };

  const updateNominee = (index: number, field: "name" | "email", value: string) => {
    const updated = nominees.map((n, i) =>
      i === index ? { ...n, [field]: value } : n
    );
    setValue("nominees", updated as any);
  };

  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const onSubmit = async (values: FormValues) => {
    try {
      const formData = new FormData();
      formData.append("title", values.title);
      if (values.description) formData.append("description", values.description);
      formData.append("message", values.message);
      formData.append("unlockDate", values.unlockDate);
      formData.append("visibility", values.visibility);
      formData.append("nomineeAccess", values.nomineeAccess);
      if (values.nominees && values.nominees.length > 0) {
        formData.append("nominees", JSON.stringify(values.nominees));
      }
      files.forEach((f) => formData.append("files", f));
      await api.post("/capsules", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        }
      });
      toast.success("Capsule created");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create capsule");
    } finally {
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="space-y-2">
        <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
          <PlusCircle className="h-3.5 w-3.5" /> New capsule
        </p>
        <h1 className="text-3xl md:text-4xl font-bold">Create capsule</h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="glass-card space-y-6 p-6 md:p-8">
        <div>
          <label className="block text-sm mb-1 text-slate-300">Title</label>
          <div className="relative">
            <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/80" />
            <input type="text" className="w-full pl-10" {...register("title")} />
          </div>
          {formState.errors.title && (
            <p className="text-xs text-red-400 mt-1">
              {formState.errors.title.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm mb-1 text-slate-300">Description</label>
          <textarea className="w-full" rows={2} {...register("description")} />
        </div>
        <div>
          <label className="block text-sm mb-1 text-slate-300">Message</label>
          <textarea className="w-full" rows={4} {...register("message")} />
          {formState.errors.message && (
            <p className="text-xs text-red-400 mt-1">
              {formState.errors.message.message}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs mb-1 text-slate-300">
              Unlock date & time
            </label>
            <div className="relative">
              <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/80" />
              <input type="datetime-local" className="w-full pl-10" {...register("unlockDate")} />
            </div>
            {formState.errors.unlockDate && (
              <p className="text-xs text-red-400 mt-1">
                {formState.errors.unlockDate.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs mb-1 text-slate-300">Visibility</label>
            <div className="relative">
              <Eye className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/80" />
              <select className="w-full pl-10" {...register("visibility")}>
                <option value="private">Private</option>
                <option value="nominees">Owner & nominees</option>
                <option value="public">Public once unlocked</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1 text-slate-300">Nominee access</label>
            <select className="w-full" {...register("nomineeAccess")}>
              <option value="deny">Deny content until unlock date</option>
              <option value="allow">Allow content after nominee unlock</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs text-slate-300">
              <Users className="h-4 w-4 text-cyan-300" /> Nominees
            </label>
            <button
              type="button"
              className="text-xs text-cyan-200 hover:text-cyan-100"
              onClick={addNominee}
            >
              Add nominee
            </button>
          </div>
          {nominees.length === 0 && (
            <p className="text-xs text-slate-400">
              Optionally nominate trusted contacts who can unlock in emergencies.
            </p>
          )}
          {nominees.length > 0 && (
            <div className="space-y-2">
              {nominees.map((n, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-2 gap-2 glass-card p-3"
                >
                  <input
                    placeholder="Name"
                    value={n.name || ""}
                    onChange={(e) => updateNominee(idx, "name", e.target.value)}
                  />
                  <input
                    placeholder="Email"
                    value={n.email}
                    onChange={(e) => updateNominee(idx, "email", e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <FileUploader onFilesChange={onFilesChange} />

        {uploadProgress > 0 && (
          <div className="w-full bg-slate-900 rounded-full h-2.5 mb-2 border border-white/10">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2.5 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="premium-button w-full py-2.5 text-sm"
        >
          {formState.isSubmitting ? "Creating..." : "Create capsule"}
        </button>
      </form>
    </div>
  );
}

