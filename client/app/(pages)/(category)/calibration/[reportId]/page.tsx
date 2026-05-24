"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import CalibrationReportPage from "../calibration";

// Derive the id from the live pathname rather than `useParams()`. When the
// service worker serves a cached `[reportId]` shell for an offline navigation
// (see `app/sw.ts`), the RSC payload baked into that HTML has a placeholder
// id — but the browser URL holds the real one.
const OFFLINE_SHELL_ID = "__offline_shell__";

export default function HomePage() {
  const pathname = usePathname();
  const reportIdFromPath = pathname?.split("/")[2] ?? "";
  const reportId = reportIdFromPath === OFFLINE_SHELL_ID ? "" : reportIdFromPath;

  return (
    <div className="w-full min-h-screen pt-24 flex flex-col items-center">
      <Navbar />

      <div className="w-full mt-10 max-w-7xl sm:px-6 lg:px-8 mb-10">
        <CalibrationReportPage reportId={reportId} />
      </div>
    </div>
  );
}