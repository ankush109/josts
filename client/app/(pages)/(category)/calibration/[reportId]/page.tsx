"use client";

import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import CalibrationReportPage from "../calibration";

export default function HomePage() {
  const { reportId } = useParams<{ reportId: string }>();

  return (
    <div className="w-full min-h-screen pt-24 flex flex-col items-center">
      <Navbar />

      <div className="w-full mt-10 max-w-7xl px-4 sm:px-6 lg:px-8 mb-10">
        <CalibrationReportPage reportId={reportId} />
      </div>
    </div>
  );
}