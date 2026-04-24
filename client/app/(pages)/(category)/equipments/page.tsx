import Navbar from "@/components/Navbar";
import ReportList from "./EquipmentTable";


export default function HomePage() {
  return (
    <div className="w-full min-h-screen pt-24 flex flex-col items-center ">
      <Navbar />

      <div className="">
     <ReportList/>
       
      </div>
    </div>
  );
}