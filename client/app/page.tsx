import Image from "next/image";
import Link from "next/link";
import companyLogo from "../public/logo.png";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src={companyLogo}
                alt="Jost's Engineering Company Logo"
                width={50}
                height={50}
                className="rounded-lg"
              />
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Jost's Engineering
                </h1>
                <p className="text-xs text-slate-600">Since 1907</p>
              </div>
            </div>
            
            <Link
              href="/login"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                117 Years of Excellence
              </div>

              <div className="space-y-4">
                <h2 className="text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                  Engineering
                  <span className="block text-blue-600">Solutions</span>
                  <span className="block text-slate-700">That Move India</span>
                </h2>
                
                <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
                  Leading manufacturer of material handling equipment and 
                  engineering product solutions serving diverse industries 
                  across India since 1907.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="group px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                >
                  Get Started
                  <svg 
                    className="w-5 h-5 group-hover:translate-x-1 transition-transform" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                
                <button className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg border border-slate-200">
                  Learn More
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200">
                <div>
                  <div className="text-3xl font-bold text-slate-900">117+</div>
                  <div className="text-sm text-slate-600">Years Legacy</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">Pan</div>
                  <div className="text-sm text-slate-600">India Presence</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">1907</div>
                  <div className="text-sm text-slate-600">Established</div>
                </div>
              </div>
            </div>

            {/* Right Column - Visual Content */}
            <div className="relative">
              {/* Company Info Card */}
              <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6 border border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Image
                      src={companyLogo}
                      alt="Company Logo"
                      width={80}
                      height={80}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                      Jost's Engineering Company Ltd.
                    </h3>
                    <p className="text-slate-600">
                      Headquartered in Mumbai
                    </p>
                  </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900 text-lg">
                    Our Expertise
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Material Handling Equipment</p>
                        <p className="text-sm text-slate-600">Industry-leading MHE manufacturing</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Engineering Solutions</p>
                        <p className="text-sm text-slate-600">Comprehensive product solutions</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Nationwide Network</p>
                        <p className="text-sm text-slate-600">Strategic manufacturing & service centers</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="bg-gradient-to-r from-blue-50 to-slate-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold text-blue-700">Serving key markets</span> across 
                      diverse industries with strategically located facilities throughout India.
                    </p>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-200 rounded-full blur-3xl opacity-50 -z-10"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-slate-200 rounded-full blur-3xl opacity-50 -z-10"></div>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-24 grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-slate-100">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Quality Assured</h3>
              <p className="text-slate-600">Over a century of engineering excellence and reliability</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-slate-100">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nationwide Reach</h3>
              <p className="text-slate-600">Strategic presence across India with dedicated service centers</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-slate-100">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Innovation Driven</h3>
              <p className="text-slate-600">Cutting-edge solutions for modern industrial challenges</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-600 text-sm">
              © 2024 Jost's Engineering Company Limited. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-slate-600">
              <Link href="/about" className="hover:text-blue-600 transition-colors">About</Link>
              <Link href="/contact" className="hover:text-blue-600 transition-colors">Contact</Link>
              <Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}