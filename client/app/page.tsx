"use client";

import Link from "next/link";
import React from "react";
import { ArrowRight, FileText, Calculator, FileBadge } from "lucide-react";

const TYPEWRITER_WORDS = [
  "Calibration Reports",
  "Uncertainty Budgets",
  "PDF Certificates",
  "Instrument Tracking",
];

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
        if (charIdx === current.length) {
          setTimeout(() => setDeleting(true), pause);
        } else {
          setCharIdx((c) => c + 1);
        }
      }, speed);
    } else {
      timeout = setTimeout(() => {
        setDisplayed(current.slice(0, charIdx));
        if (charIdx === 0) {
          setDeleting(false);
          setWordIdx((w) => (w + 1) % words.length);
        } else {
          setCharIdx((c) => c - 1);
        }
      }, speed / 2);
    }

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charIdx, deleting, wordIdx]);

  return displayed;
}

export default function Home() {
  const typed = useTypewriter(TYPEWRITER_WORDS);

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Navbar — blends into hero ── */}
      <header style={{ backgroundColor: "#1e3a5f" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-white tracking-tight">Josts</span>
          <Link
            href="/login"
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg border border-white/20 text-white/90 hover:bg-white/10 transition-colors"
          >
            Sign In <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6 py-28 overflow-hidden"
        style={{ backgroundColor: "#1e3a5f" }}
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-64 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-7">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-400/20 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-300/60">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Calibration Management Portal
          </div>

          <div>
            <h1 className="text-5xl sm:text-6xl font-bold text-white tracking-tight leading-tight">
              Manage Your
            </h1>
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mt-1" style={{ color: "#93c5fd" }}>
              {typed || "\u00A0"}
              <span
                className="inline-block w-[3px] h-12 sm:h-14 ml-1.5 align-middle animate-pulse rounded-sm"
                style={{ backgroundColor: "#93c5fd" }}
              />
            </h1>
          </div>

          <p className="text-lg text-blue-200/55 max-w-xl mx-auto leading-relaxed">
            End-to-end calibration workflow — create reports, compute uncertainty budgets,
            and generate branded PDF certificates in minutes.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              href="/login"
              className="group flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-white rounded-xl shadow-xl transition-all hover:scale-105 active:scale-100"
              style={{ backgroundColor: "#2563eb" }}
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

      </section>

      {/* ── Stats bar ── */}
      <section className="bg-white py-10 px-6 border-b border-slate-100">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-6 text-center">
          {[
            { value: "117+", label: "Years of Excellence" },
            { value: "Pan‑India", label: "Presence" },
            { value: "ISO", label: "Certified" },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-2xl font-bold text-slate-900">{value}</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Everything you need</h2>
            <p className="text-slate-500 mt-3 text-sm max-w-md mx-auto">
              A complete platform for managing instrument calibration from start to certificate.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                Icon: FileText,
                title: "Calibration Reports",
                desc: "Create structured multi-instrument reports with draft and submit workflows. All data in one place.",
              },
              {
                Icon: Calculator,
                title: "Uncertainty Computation",
                desc: "Preview uncertainty budgets per instrument live — before saving. No surprises on submission.",
              },
              {
                Icon: FileBadge,
                title: "PDF Certificates",
                desc: "Watermarked, branded calibration certificates auto-generated and ready to download.",
              },
            ].map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-7 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col gap-5"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: "#1e3a5f" }}
                >
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

      {/* ── CTA Banner ── */}
      <section className="py-16 px-6" style={{ backgroundColor: "#1e3a5f" }}>
        <div className="max-w-2xl mx-auto text-center space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Ready to streamline your calibration workflow?
          </h2>
          <p className="text-blue-200/55 text-sm">
            Sign in to access the portal and start managing calibration reports.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-white rounded-xl transition-all hover:scale-105 active:scale-100 shadow-xl"
            style={{ backgroundColor: "#2563eb" }}
          >
            Sign In to Portal <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-slate-100 py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Josts Technologies. All rights reserved.
          </p>
          <span className="text-sm font-bold text-slate-300 opacity-40 tracking-tight">Josts</span>
        </div>
      </footer>
    </div>
  );
}
