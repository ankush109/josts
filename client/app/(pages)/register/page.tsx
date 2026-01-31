
import Image from "next/image"
import { RegisterForm } from "../register/RegisterForm"
import jostLogo from '../../../public/logo.png';
export default function RegisterPage({ params }: { params: { slug: string } }) {
  return (
    <div className="w-full h-screen">
      <div className="">
   
        <RegisterForm />
      </div>
    </div>
  )
}
