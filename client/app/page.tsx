"use client";

import Link from "next/link";
import React from "react";
import {
  ArrowRight,
  Calculator,
  FileBadge,
  ClipboardList,

  History,
  Wrench,
  ShieldCheck,
  MapPin,
  Mail,
  ChevronDown,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/app/provider/AuthProvider";

// ─── constants ────────────────────────────────────────────────────────────────

const TYPEWRITER_WORDS = [
  "Calibration Reports",
  "PDF Certificates",
  "Instrument Tracking",
  "Audit History",
];

const INSTRUMENTS = [
  "Pressure Gauges",
  "Thermometers",
  "Flow Meters",
  "Torque Wrenches",
  "Micrometers",
  "Dial Gauges",
  "Vernier Calipers",
  "Manometers",
  "Load Cells",
  "Tachometers",
];

// ─── hooks ────────────────────────────────────────────────────────────────────

function useTypewriter(words: string[], speed = 70, pause = 1800) {
  const [displayed, setDisplayed] = React.useState("");
  const [wordIdx, setWordIdx] = React.useState(0);
  const [charIdx, setCharIdx] = React.useState(0);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    const current = words[wordIdx];
    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting) {
      timeout = setTimeout(() => {
        setDisplayed(current.slice(0, charIdx));
        if (charIdx === current.length) setTimeout(() => setDeleting(true), pause);
        else setCharIdx((c) => c + 1);
      }, speed);
    } else {
      timeout = setTimeout(() => {
        setDisplayed(current.slice(0, charIdx));
        if (charIdx === 0) { setDeleting(false); setWordIdx((w) => (w + 1) % words.length); }
        else setCharIdx((c) => c - 1);
      }, speed / 2);
    }
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charIdx, deleting, wordIdx]);

  return displayed;
}

function useInView(threshold = 0.12) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// Counts up from 0 → target when `start` flips to true
function useCountUp(target: number, duration = 1400, start = false) {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    if (!start) return;
    let raf: number;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out-cubic
      setCount(Math.floor(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
      else setCount(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return count;
}

// Returns true once the page has scrolled past `threshold` px
function useScrolled(threshold = 60) {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

// Starts at `base`, ticks up by 1 every `interval` ms
function useLiveCount(base: number, interval = 4000) {
  const [count, setCount] = React.useState(base);
  React.useEffect(() => {
    const id = setInterval(() => setCount((c) => c + 1), interval);
    return () => clearInterval(id);
  }, [interval]);
  return count;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function Home() {
  const { user }    = useAuth();
  const isAuthed    = !!user;
  const ctaHref     = isAuthed ? "/dashboard" : "/login";
  const navLabel    = isAuthed ? "Dashboard"  : "Sign In";
  const heroLabel   = isAuthed ? "Open Dashboard" : "Get Started";
  const footerLabel = isAuthed ? "Go to Dashboard" : "Sign In to Portal";
  const typed       = useTypewriter(TYPEWRITER_WORDS);
  const scrolled    = useScrolled(60);
  const statsRef    = useInView();
  const aboutRef    = useInView();
  const featuresRef = useInView();
  const howRef      = useInView();
  const ctaRef      = useInView();

  const yearsCount  = useCountUp(117, 1400, statsRef.inView);
  const reportCount = useLiveCount(2847);

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes lineGrow {
          from { width: 0%; }
          to   { width: 75%; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        .anim-fade-up  { animation: fadeInUp 0.55s ease both; }
        .anim-fade-in  { animation: fadeIn   0.55s ease both; }
        .hero-enter    { animation: fadeInUp 0.7s  ease both; }

        .marquee-track { animation: marquee 28s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }

        .line-grow-anim { animation: lineGrow 1s ease both; }

        .card-accent { position: relative; overflow: hidden; }
        .card-accent::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #1e3a5f, #3b82f6);
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.3s ease; border-radius: 999px;
        }
        .card-accent:hover::before { transform: scaleX(1); }

        .shimmer-btn {
          background-size: 200% auto;
          background-image: linear-gradient(90deg, #2563eb 0%, #3b82f6 40%, #2563eb 100%);
          animation: shimmer 3s linear infinite;
        }

      `}</style>

      <div className="force-light min-h-screen bg-white flex flex-col">

        {/* ── Navbar ── */}
        <header
          className={`sticky top-0 z-50 transition-all duration-300 ${
            scrolled
              ? "shadow-lg backdrop-blur-md border-b border-white/5"
              : ""
          }`}
          style={{
            backgroundColor: scrolled ? "rgba(30,58,95,0.85)" : "#1e3a5f",
          }}
        >
          <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#2563eb" }}>
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <span
                className="text-2xl font-extrabold italic tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-blue-200 to-violet-300"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              >
                Jasper
              </span>
            </div>
            <Link
              href={ctaHref}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg border border-white/20 text-white/90 hover:bg-white/10 transition-colors"
            >
              {isAuthed && <LayoutDashboard className="h-4 w-4" />}
              {navLabel} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* ── Hero ── */}
        <section
          className="relative flex flex-col items-center justify-center text-center px-5 py-24 sm:py-36 overflow-hidden"
          style={{ backgroundColor: "#1e3a5f" }}
        >
          {/* Backgrounds */}
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Main content */}
          <div className="relative z-10 max-w-3xl mx-auto space-y-7 hero-enter">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-400/20 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-300/60">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Calibration Management Portal
            </div>

            <div>
              <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight leading-tight">
                Manage Your
              </h1>
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight mt-1 min-h-[1.2em]" style={{ color: "#93c5fd" }}>
                {typed || "\u00A0"}
                <span className="inline-block w-[3px] h-10 sm:h-14 ml-1.5 align-middle animate-pulse rounded-sm" style={{ backgroundColor: "#93c5fd" }} />
              </h1>
            </div>

            <p className="text-base sm:text-lg text-blue-200/60 max-w-xl mx-auto leading-relaxed">
              Jasper gives your team a single, structured place to record measurements, generate ISO-compliant certificates, and track every instrument — end to end.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href={ctaHref}
                className="shimmer-btn group flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-white rounded-xl shadow-xl transition-all hover:scale-105 active:scale-100 w-full sm:w-auto justify-center"
              >
                {heroLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="#features" className="flex items-center gap-2 px-6 py-3.5 text-sm font-medium text-blue-200/60 hover:text-white transition-colors w-full sm:w-auto justify-center">
                See features →
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              {["ISO Certified", "Offline-First", "Built for Engineers"].map((t) => (
                <span key={t} className="text-[11px] px-3 py-1 rounded-full border border-white/10 text-white/30 tracking-wide">{t}</span>
              ))}
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-30 pointer-events-none">
            <span className="text-[9px] text-white uppercase tracking-[0.2em]">Scroll</span>
            <ChevronDown className="h-4 w-4 text-white animate-bounce" />
          </div>
        </section>

        {/* ── Wave divider ── */}
        <div className="relative h-10 bg-white overflow-hidden -mt-px">
          <svg viewBox="0 0 1440 40" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" style={{ fill: "#1e3a5f" }}>
            <path d="M0,0 C360,40 1080,0 1440,32 L1440,0 Z" />
          </svg>
        </div>

        {/* ── Stats ── */}
        <section className="bg-white pb-10 px-5 border-b border-slate-100" ref={statsRef.ref}>
          <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-center divide-x divide-slate-100">
            {[
              { display: `${yearsCount}+`, label: "Years of Excellence" },
              { display: "Pan‑India",      label: "Presence" },
              { display: "ISO",            label: "Certified" },
              {
                display: (
                  <span className="inline-flex items-center gap-1.5">
                    {reportCount.toLocaleString()}
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  </span>
                ),
                label: "Reports Generated",
              },
            ].map(({ display, label }, i) => (
              <div
                key={label}
                className={`${statsRef.inView ? "anim-fade-up" : "opacity-0"} px-4`}
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">{display}</div>
                <div className="text-[10px] sm:text-xs text-slate-400 mt-1 uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Instrument ticker ── */}
        <section className="bg-slate-50 border-b border-slate-100 py-4 overflow-hidden select-none">
          <div className="flex whitespace-nowrap marquee-track">
            {[...INSTRUMENTS, ...INSTRUMENTS].map((name, i) => (
              <span key={i} className="inline-flex items-center gap-3 mx-6 text-xs font-medium text-slate-400 uppercase tracking-widest">
                <span className="w-1 h-1 rounded-full bg-slate-300 inline-block" />
                {name}
              </span>
            ))}
          </div>
        </section>

        {/* ── About ── */}
        <section className="py-20 px-5 bg-white" ref={aboutRef.ref}>
          <div className="max-w-5xl mx-auto">
            <div className={`grid sm:grid-cols-2 gap-12 items-center ${aboutRef.inView ? "anim-fade-up" : "opacity-0"}`}>
              <div className="space-y-5">
                <span className="text-xs font-semibold uppercase tracking-widest text-blue-500">About the Platform</span>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-snug">
                  Built for precision.<br />Designed for teams.
                </h2>
                <p className="text-slate-500 leading-relaxed">
                  Jasper is a modern calibration suite — purpose-built to eliminate paper-based workflows and give engineers a fast, reliable way to produce calibration records, even from the field.
                </p>
                <p className="text-slate-500 leading-relaxed">
                  From pressure gauges to flow meters, each instrument type has its own structured form with pre-defined parameters, ensuring every report is consistent, complete, and traceable from day one.
                </p>
                <div className="flex flex-col gap-2.5 pt-2">
                  {[
                    "100% digital — no paper forms",
                    "Automatic PDF certificate generation",
                    "Live audit trail on every record",
                    "Role-based access for your team",
                  ].map((point) => (
                    <div key={point} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#1e3a5f" }}>
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      {point}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { stat: "100%", detail: "Digital workflow — no paper" },
                  { stat: "Auto", detail: "PDF certificate generation" },
                  { stat: "Live",  detail: "Audit trail on every record" },
                  { stat: "Multi", detail: "Instrument type support" },
                ].map(({ stat, detail }, i) => (
                  <div
                    key={detail}
                    className={`group bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-blue-100 hover:shadow-sm hover:bg-blue-50/30 transition-all cursor-default ${aboutRef.inView ? "anim-fade-up" : "opacity-0"}`}
                    style={{ animationDelay: `${120 + i * 80}ms` }}
                  >
                    <div className="text-2xl font-bold group-hover:text-blue-700 transition-colors" style={{ color: "#1e3a5f" }}>{stat}</div>
                    <div className="text-xs text-slate-500 mt-1 leading-snug">{detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>


        {/* ── Features ── */}
        <section id="features" className="py-20 px-5 bg-white" ref={featuresRef.ref}>
          <div className="max-w-5xl mx-auto">
            <div className={`text-center mb-14 ${featuresRef.inView ? "anim-fade-up" : "opacity-0"}`}>
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-500">Features</span>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight mt-2">Everything you need</h2>
              <p className="text-slate-500 mt-3 text-sm max-w-md mx-auto leading-relaxed">
                A complete platform for managing instrument calibration — from first measurement to final certificate.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { Icon: Calculator,   title: "Calibration Reports",     desc: "Create and manage calibration reports for all your instruments with structured, validated data entry." },
                { Icon: FileBadge,    title: "PDF Certificates",        desc: "Watermarked, branded calibration certificates auto-generated and ready to download instantly." },
                { Icon: Wrench,       title: "Multi-Instrument Support", desc: "Pressure gauges, thermometers, flow meters, and more — each with its own parameter set." },
                { Icon: ClipboardList,title: "Instrument Tracking",     desc: "Track every instrument's calibration status, due dates, and full measurement history." },
                { Icon: History,      title: "Audit History",           desc: "Full audit trail for every calibration record — see who changed what, and when." },
                { Icon: ShieldCheck,  title: "ISO-Ready Compliance",    desc: "Reports and certificates structured to satisfy ISO calibration and documentation requirements." },
              ].map(({ Icon, title, desc }, i) => (
                <div
                  key={title}
                  className={`card-accent bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 ${featuresRef.inView ? "anim-fade-up" : "opacity-0"}`}
                  style={{ animationDelay: `${i * 75}ms` }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: "#1e3a5f" }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{title}</h3>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="py-20 px-5 bg-slate-50" ref={howRef.ref}>
          <div className="max-w-4xl mx-auto">
            <div className={`text-center mb-14 ${howRef.inView ? "anim-fade-up" : "opacity-0"}`}>
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-500">Workflow</span>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight mt-2">How it works</h2>
              <p className="text-slate-500 mt-3 text-sm max-w-sm mx-auto">
                From instrument selection to certified PDF — the whole process in four steps.
              </p>
            </div>

            <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-4">
              {/* Animated connector line */}
              <div className="hidden sm:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-slate-200 z-0">
                <div
                  className={`h-full bg-gradient-to-r from-blue-400 to-blue-200 ${howRef.inView ? "line-grow-anim" : "w-0"}`}
                  style={{ animationDelay: "400ms" }}
                />
              </div>

              {[
                { step: "01", title: "Select Instrument", desc: "Choose the instrument type and fill in identification details." },
                { step: "02", title: "Enter Measurements", desc: "Record calibration readings for each parameter." },
                { step: "03", title: "Review & Save",      desc: "Review the report and save it with a timestamp and author." },
                { step: "04", title: "Download Certificate", desc: "Generate a watermarked PDF certificate, ready to share." },
              ].map(({ step, title, desc }, i) => (
                <div
                  key={step}
                  className={`relative z-10 flex flex-col items-center text-center gap-3 ${howRef.inView ? "anim-fade-up" : "opacity-0"}`}
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-md ring-4 ring-slate-50"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    {step}
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative py-24 px-5 overflow-hidden" style={{ backgroundColor: "#1e3a5f" }} ref={ctaRef.ref}>
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className={`relative z-10 max-w-2xl mx-auto text-center space-y-6 ${ctaRef.inView ? "anim-fade-up" : "opacity-0"}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-400/20 text-[10px] font-semibold uppercase tracking-widest text-blue-300/50">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Get started today
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Ready to go paperless?
            </h2>
            <p className="text-blue-200/60 text-sm max-w-md mx-auto leading-relaxed">
              Sign in to the portal and start generating digital calibration records for your instruments today. Your team can be up and running in minutes — no setup required.
            </p>
            <Link
              href={ctaHref}
              className="shimmer-btn inline-flex items-center gap-2 px-9 py-4 text-sm font-semibold text-white rounded-xl transition-all hover:scale-105 active:scale-100 shadow-2xl"
            >
              {footerLabel} <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
              {["No setup required", "ISO-ready certificates", "Instant PDF download"].map((t) => (
                <span key={t} className="text-[11px] text-blue-200/40 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-blue-400/40 inline-block" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{ backgroundColor: "#0f172a" }}>
          <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, #1e3a5f 30%, #2563eb 50%, #1e3a5f 70%, transparent)" }} />

          <div className="max-w-6xl mx-auto px-5 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1e3a5f" }}>
                  <ShieldCheck className="h-4 w-4 text-blue-400" />
                </div>
                <span
                  className="text-2xl font-extrabold italic tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-blue-200 to-violet-300"
                  style={{ fontFamily: '"Times New Roman", Times, serif' }}
                >
                  Jasper
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                A modern calibration suite for measurement teams — offline-first, ISO-compliant, and engineered for the field.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {["ISO Certified", "Offline-First"].map((badge) => (
                  <span key={badge} className="text-[10px] px-2.5 py-1 rounded-full border border-white/10 text-slate-500 tracking-wide">{badge}</span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Platform</h4>
              <ul className="space-y-2.5">
                {["Calibration Reports", "PDF Certificates", "Instrument Tracking", "Audit History"].map((item) => (
                  <li key={item}>
                    <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group">
                      <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Resources</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 mt-0.5 shrink-0 text-slate-500" />
                  <span>support@jasper.app</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-slate-500" />
                  <span>India</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 py-5 px-5">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
              <p>© {new Date().getFullYear()} Jasper. All rights reserved.</p>
              <p>ISO-Certified Calibration Portal</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
