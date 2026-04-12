import axios from "axios";

// support overriding via either a full URL or just a port number
// NEXT_PUBLIC_API_URL takes precedence. If you just need to change the port
// (the server may fall back to 5001 when 5000 is busy) you can set
// NEXT_PUBLIC_API_PORT=5001 in your frontend environment.
const apiPort = process.env.NEXT_PUBLIC_API_PORT || "5000";
const baseURL =
  process.env.NEXT_PUBLIC_API_URL || `http://localhost:${apiPort}/api`;

export const api = axios.create({
  baseURL
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("dtc_token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  totalStorageUsed?: number;
}

export interface Nominee {
  name?: string;
  email: string;
  status?: "invited" | "otp_sent" | "verified";
}

export interface CapsuleFile {
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
}

// response when the capsule is still locked; used internally by the detail page
export interface LockedResponse {
  locked: true;
  unlockDate: string;
  nominees?: Nominee[]; // available nominees even when locked
}

export interface Capsule {
  _id: string;
  title: string;
  description?: string;
  message: string;
  unlockDate: string;
  visibility: "private" | "nominees" | "public";
  nomineeAccess?: "allow" | "deny";
  status: "locked" | "unlocked";
  files: CapsuleFile[];
  nominees?: Nominee[];
  owner?: {
    _id: string;
    name: string;
    email: string;
  };
  unlocked?: boolean;
  showData?: boolean;
}
