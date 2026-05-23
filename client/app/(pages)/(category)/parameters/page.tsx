import Navbar from "@/components/Navbar";
import ParameterConfig from "./ParameterConfig";

export default function ParametersPage() {
  return (
    <div className="w-full min-h-screen pt-24 flex flex-col items-center bg-background">
      <Navbar />
      <div className="w-full mt-10 max-w-7xl px-4 sm:px-6 lg:px-8 mb-10">
        <ParameterConfig />
      </div>
    </div>
  );
}
