/**
 * @fileoverview Left-side branding panel for auth pages (login & register).
 *
 * Displays the Josts Technologies logo, a typewriter brand name animation,
 * and a rotating tagline carousel. Extracted from LoginForm / RegisterForm to
 * eliminate copy-paste duplication.
 */

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import jostLogo from "../public/logo2.png";

/** Taglines rotated every 3 seconds on the auth branding panel. */
const TAGLINES = [
  "Advanced engineering solutions since 1907",
  "Built on fair & ethical business practices",
  "Trusted by customers, stakeholders & employees",
  "World-class products for Indian industry",
  "Setting high standards of quality & service",
  "Diverse Technology Integrated Approach",
] as const;

const BRAND_NAME = "Josts Technologies";
const TYPEWRITER_INTERVAL_MS = 80;
const TAGLINE_INTERVAL_MS = 3000;
const TAGLINE_FADE_DURATION_MS = 400;

/**
 * Animated left panel shown on the login and register pages.
 *
 * Renders a navy background with dot-grid texture, the Josts logo,
 * a typewriter brand-name animation, and a fading tagline carousel.
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
          <h1 className="text-4xl font-bold tracking-tight text-white">
            {displayedText}
            {!typewriterDone && (
              <span className="inline-block w-[2px] h-8 bg-white/80 ml-0.5 animate-pulse align-middle" />
            )}
          </h1>
          <div className="mt-3 mx-auto w-12 h-px bg-blue-400" />
        </div>

        {/* Logo card */}
        <div className="bg-white rounded-2xl p-5 shadow-2xl shadow-black/20">
          <Image
            src={jostLogo}
            alt="Josts Technologies"
            width={220}
            height={480}
          />
        </div>

        {/* Est. divider */}
        <div className="w-full flex items-center gap-4">
          <div className="flex-1 h-px bg-blue-400/15" />
          <span className="text-[10px] uppercase tracking-[0.25em] text-blue-300/40 font-medium">
            Est. 1907
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
