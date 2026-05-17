/**
 * @fileoverview Left-side branding panel for auth pages (login & register).
 *
 * Displays the Jasper wordmark with a typewriter animation and a rotating
 * tagline carousel.
 */

"use client";

import { useState, useEffect } from "react";

/** Taglines rotated every 3 seconds on the auth branding panel. */
const TAGLINES = [
  "Calibration reports that work offline, anywhere.",
  "Built for engineers, not paperwork.",
  "Uncertainty budgets — computed, not crunched.",
  "From reading to certificate in minutes.",
  "Audit trails that survive every revision.",
  "Field-ready. Lab-grade.",
] as const;

const BRAND_NAME = "Jasper";
const SUB_BRAND = "Calibration Suite";
const TYPEWRITER_INTERVAL_MS = 80;
const TAGLINE_INTERVAL_MS = 3000;
const TAGLINE_FADE_DURATION_MS = 400;

/**
 * Animated left panel shown on the login and register pages.
 *
 * Renders a navy background with dot-grid texture, a typewriter Jasper
 * wordmark, and a fading tagline carousel.
 *
 * Only visible on `lg` screens and above (hidden on mobile).
 */
export function AuthBrandingPanel() {
  // ── Typewriter ─────────────────────────────────────────────────────────
  const [displayedText, setDisplayedText] = useState("");
  const [typewriterDone, setTypewriterDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      setDisplayedText(BRAND_NAME.slice(0, i + 1));
      i++;
      if (i >= BRAND_NAME.length) {
        clearInterval(id);
        setTimeout(() => setTypewriterDone(true), 600);
      }
    }, TYPEWRITER_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // ── Tagline carousel ───────────────────────────────────────────────────
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [taglineFade, setTaglineFade] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setTaglineFade(false);
      setTimeout(() => {
        setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
        setTaglineFade(true);
      }, TAGLINE_FADE_DURATION_MS);
    }, TAGLINE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="hidden lg:flex flex-col items-center justify-center p-16 relative overflow-hidden"
      style={{ backgroundColor: "#1e3a5f" }}
    >
      {/* Dot grid texture */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Geometric accents */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />
      <div className="absolute top-12 right-12 w-24 h-24 border border-blue-400/[0.08] rounded-full" />
      <div className="absolute bottom-16 left-10 w-32 h-32 border border-blue-400/[0.06] rounded-full" />

      <div className="relative z-10 flex flex-col items-center text-center gap-10 max-w-sm">
        {/* Typewriter brand name */}
        <div>
          <h1
            className="text-6xl font-extrabold tracking-tight italic bg-clip-text text-transparent bg-gradient-to-br from-white via-blue-200 to-violet-300"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            {displayedText}
            {!typewriterDone && (
              <span className="inline-block w-[3px] h-12 bg-white/80 ml-1 animate-pulse align-middle" />
            )}
          </h1>
          <div className="mt-3 mx-auto w-12 h-px bg-blue-400" />
          {typewriterDone && (
            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-blue-200/60 font-medium animate-in fade-in duration-700">
              {SUB_BRAND}
            </p>
          )}
        </div>

        {/* Decorative monogram */}
        <div className="relative">
          <div className="h-32 w-32 rounded-3xl bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-violet-500/20 border border-white/10 backdrop-blur-sm shadow-2xl shadow-black/30 flex items-center justify-center">
            <span
              className="text-7xl font-extrabold italic bg-clip-text text-transparent bg-gradient-to-br from-white via-blue-200 to-violet-300"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              J
            </span>
          </div>
          <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 ring-4 ring-[#1e3a5f]" />
        </div>

        {/* Divider */}
        <div className="w-full flex items-center gap-4">
          <div className="flex-1 h-px bg-blue-400/15" />
          <span className="text-[10px] uppercase tracking-[0.25em] text-blue-300/40 font-medium">
            Precision · Reliability · Trust
          </span>
          <div className="flex-1 h-px bg-blue-400/15" />
        </div>

        {/* Rotating tagline */}
        <p
          className="text-sm text-blue-200/50 h-6 transition-all duration-400 ease-in-out"
          style={{
            opacity: taglineFade ? 1 : 0,
            transform: taglineFade ? "translateY(0)" : "translateY(6px)",
          }}
        >
          {TAGLINES[taglineIndex]}
        </p>
      </div>
    </div>
  );
}
