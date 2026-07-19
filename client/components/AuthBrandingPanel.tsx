"use client";

import { useEffect, useState } from "react";
import Wordmark from "@/components/Wordmark";

const TAGLINES = [
  "Calibration reports that work offline, anywhere.",
  "Built for engineers, not paperwork.",
  "Uncertainty budgets — computed, not crunched.",
  "From reading to certificate in minutes.",
  "Audit trails that survive every revision.",
  "Field-ready. Lab-grade.",
] as const;

const INSTRUMENTS = [
  "FLOW METERS", "TORQUE WRENCHES", "MICROMETERS", "DIAL GAUGES",
  "VERNIER CALIPERS", "MANOMETERS", "LOAD CELLS", "THERMOMETERS",
  "MULTIMETERS", "PRESSURE GAUGES",
];

const MONO = "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const SANS = "Geist, ui-sans-serif, system-ui, -apple-system, sans-serif";

export function AuthBrandingPanel() {
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [taglineFade, setTaglineFade] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTaglineFade(false);
      setTimeout(() => {
        setTaglineIndex((i) => (i + 1) % TAGLINES.length);
        setTaglineFade(true);
      }, 400);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1200);
    return () => clearInterval(id);
  }, []);

  const liveValue = (10.0042 + Math.sin(tick * 0.7) * 0.0008).toFixed(4);

  return (
    <div
      className="hidden lg:flex relative overflow-hidden"
      style={{
        background: "#0b1424",
        color: "#eef2f8",
        fontFamily: SANS,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{`
        @keyframes jz-auth-drift { 0%,100% { transform: translate(0,0); opacity:.85; } 50% { transform: translate(-26px,22px); opacity:1; } }
        @keyframes jz-auth-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.35; transform:scale(.82); } }
        @keyframes jz-auth-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>

      {/* Grid overlay with radial mask */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.045) 1px,transparent 1px)",
        backgroundSize: "64px 64px",
        WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 25% 25%,#000 40%,transparent 100%)",
        maskImage: "radial-gradient(ellipse 90% 70% at 25% 25%,#000 40%,transparent 100%)",
      }} />

      {/* Drifting glow */}
      <div style={{
        position: "absolute", top: -160, right: -120,
        width: 560, height: 560,
        background: "radial-gradient(circle,rgba(79,140,255,0.22),transparent 65%)",
        pointerEvents: "none",
        animation: "jz-auth-drift 13s ease-in-out infinite",
      }} />

      {/* Content column */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column",
        width: "100%", padding: "44px 56px",
      }}>
        {/* Top row: wordmark + status pill */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Wordmark size="md" markOnly />
            <span style={{ fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em", color: "#fff" }}>
              Jasper
            </span>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em", color: "#8fe3ac",
            border: "1px solid rgba(46,204,113,0.28)",
            background: "rgba(46,204,113,0.08)",
            borderRadius: 100, padding: "6px 12px",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2ecc71", animation: "jz-auth-pulse 2s ease-in-out infinite" }} />
            OPERATIONAL
          </div>
        </div>

        {/* Main text block */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", marginTop: 40, marginBottom: 40 }}>
          <div style={{
            display: "inline-flex", alignSelf: "flex-start",
            alignItems: "center", gap: 10,
            fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", color: "#9db4de",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 100, padding: "7px 14px",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2f6fed" }} />
            CALIBRATION MANAGEMENT PORTAL
          </div>

          <h1 style={{
            margin: "26px 0 0",
            fontSize: 52, lineHeight: 1.02,
            letterSpacing: "-0.035em", fontWeight: 640,
            fontFamily: SANS,
          }}>
            Certified<br />calibration,<br />
            <span style={{ color: "#6ea0ff" }}>measured to spec.</span>
          </h1>

          <p style={{
            margin: "24px 0 0", fontSize: 16, lineHeight: 1.6,
            color: "#a9b5c8", maxWidth: 440,
            minHeight: 48,
            opacity: taglineFade ? 1 : 0,
            transform: taglineFade ? "translateY(0)" : "translateY(6px)",
            transition: "opacity .4s ease, transform .4s ease",
          }}>
            {TAGLINES[taglineIndex]}
          </p>

          {/* Live micro-readout card */}
          <div style={{
            marginTop: 36, maxWidth: 320,
            display: "flex", alignItems: "center", gap: 14,
            padding: "14px 16px",
            background: "linear-gradient(180deg,#101c31,#0c1626)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(79,140,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6ea0ff" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 12l4-4" />
                <circle cx="12" cy="12" r="1.5" fill="#6ea0ff" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.14em", color: "#7e8ba0" }}>DC VOLTAGE · LIVE</div>
              <div style={{
                fontFamily: MONO, fontSize: 20, fontWeight: 500,
                color: "#8afcc4",
                textShadow: "0 0 8px #8afcc4, 0 0 20px rgba(138,252,196,0.35)",
                letterSpacing: "0.02em",
                fontVariantNumeric: "tabular-nums",
                marginTop: 2,
              }}>
                {liveValue} <span style={{ fontSize: 14 }}>V</span>
              </div>
            </div>
            <div style={{
              fontFamily: MONO, fontSize: 9, letterSpacing: "0.12em",
              color: "#7fe0a3",
              background: "rgba(46,204,113,0.1)",
              border: "1px solid rgba(46,204,113,0.25)",
              padding: "4px 7px", borderRadius: 5,
            }}>
              PASS
            </div>
          </div>
        </div>

        {/* Bottom row: mono tags + instrument ticker */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{
            display: "flex", gap: 16, flexWrap: "wrap",
            fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em", color: "#7e8ba0",
          }}>
            <span>ISO&nbsp;17025-READY</span>
            <span style={{ color: "#39435a" }}>/</span>
            <span>OFFLINE-FIRST</span>
            <span style={{ color: "#39435a" }}>/</span>
            <span>BUILT FOR ENGINEERS</span>
          </div>

          <div style={{
            overflow: "hidden",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 16,
            margin: "0 -56px",
          }}>
            <div style={{ display: "flex", width: "max-content", animation: "jz-auth-marquee 32s linear infinite", paddingLeft: 56 }}>
              {[0, 1].map((k) => (
                <div key={k} style={{
                  display: "flex", gap: 32, paddingRight: 32,
                  fontFamily: MONO, fontSize: 11, letterSpacing: "0.12em", color: "#5e6b82",
                }} aria-hidden={k === 1}>
                  {INSTRUMENTS.map((n) => <span key={n}>◦ {n}</span>)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
