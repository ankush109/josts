
import Image from "next/image"

import jostLogo from '../../../public/logo.png';
import {TemplateKit} from "../home/TemplateKitForm";
import Navbar from "@/components/Navbar";
export default function BlogPage({ params }: { params: { slug: string } }) {
  return (
    <div className="w-full h-screen">
     <Navbar/>
      <div className="flex flex-col gap-10 justify-center items-center h-full">
     
     <TemplateKit />
      </div>
    </div>
  )
}
