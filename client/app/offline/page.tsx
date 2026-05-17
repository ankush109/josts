"use client";

import Link from "next/link";
import { CloudOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-amber-100 dark:bg-amber-900/40">
            <CloudOff className="h-5 w-5 text-amber-800 dark:text-amber-300" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">You're offline</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              The page you requested isn't cached on this device.
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-zinc-300 mb-4">
          You can still create or edit calibration drafts — they'll save on this device and sync
          automatically when you're back online.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/calibration"
            className="inline-flex items-center justify-center h-9 px-3 rounded-md text-sm font-semibold bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Go to reports
          </Link>
          <Link
            href="/calibration/create"
            className="inline-flex items-center justify-center h-9 px-3 rounded-md text-sm font-semibold border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-200"
          >
            New report
          </Link>
        </div>
      </div>
    </div>
  );
}
