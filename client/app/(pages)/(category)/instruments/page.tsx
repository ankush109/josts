import Navbar from "@/components/Navbar";
import InstrumentTable from "./InstrumentTable";

export default function InstrumentsPage() {
  return (
    <div className="w-full min-h-screen pt-16 bg-slate-50">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <InstrumentTable />
      </div>
    </div>
  );
}
