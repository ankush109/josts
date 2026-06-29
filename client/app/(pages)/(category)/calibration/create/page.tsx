import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import CalibrationReportPage from "../calibration";

export default function HomePage() {
  return (
    <div className="w-full min-h-screen pt-24 flex flex-col items-center">
      <Navbar />
      <div className="w-full mt-10 max-w-7xl sm:px-6 lg:px-8 mb-10">
        <Suspense>
          <CalibrationReportPage />
        </Suspense>
      </div>
    </div>
  );
}
