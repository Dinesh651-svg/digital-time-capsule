import "./globals.css"
import type { ReactNode } from "react";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "Digital Time Capsule",
  description: "Create and share digital time capsules"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="text-slate-50 antialiased selection:bg-cyan-400/30">
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
              <span className="text-lg md:text-xl font-semibold tracking-tight">
                Digital <span className="text-cyan-300">Time Capsule</span>
              </span>
            </div>
          </header>
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-10">{children}</main>
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

