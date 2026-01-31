import Image from "next/image"
import { LoginForm } from "../login/LoginForm"
import jostLogo from '../../../public/logo.png';

export default function BlogPage({ params }: { params: { slug: string } }) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50">
   

      <div className="">
      <Image 
          alt="Josts Technologies Logo" 
          width={160} 
          height={50}  
          src={jostLogo}
          className="h-12 w-auto"
        />
        <LoginForm />
      </div>

      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-sm text-gray-500">
          © 2025 Josts Technologies. All rights reserved.
        </p>
      </div>
    </div>
  )
}