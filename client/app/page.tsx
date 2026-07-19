"use client";

import Link from "next/link";
import React from "react";
import { useAuth } from "@/app/provider/AuthProvider";
import Wordmark from "@/components/Wordmark";

// ─── constants ────────────────────────────────────────────────────────────────

const INSTRUMENTS = [
  "FLOW METERS",
  "TORQUE WRENCHES",
  "MICROMETERS",
  "DIAL GAUGES",
  "VERNIER CALIPERS",
  "MANOMETERS",
  "LOAD CELLS",
  "THERMOMETERS",
  "MULTIMETERS",
  "PRESSURE GAUGES",
];

type DMMMode = {
  key: string;
  label: string;      // top-left indicator
  fnBadge: string;    // right-side small text (V DC, V AC, Ω, etc.)
  base: number;       // baseline reading
  noise: number;      // ± noise on last digit
  unit: string;
  digits: number;     // total significant digits displayed
  decimals: number;
  max: number;        // for bargraph
  rangeText: string;
};

const DMM_MODES: DMMMode[] = [
  { key: "DCV", label: "DCV", fnBadge: "V DC",  base: 10.0042, noise: 0.0006, unit: "V",  digits: 6, decimals: 4, max: 100, rangeText: "±100 V · AUTO" },
  { key: "ACV", label: "ACV", fnBadge: "V AC",  base: 230.42,  noise: 0.05,   unit: "V",  digits: 6, decimals: 2, max: 600, rangeText: "±600 V · AUTO" },
  { key: "Ω",   label: "Ω",   fnBadge: "kΩ",    base: 4.7326,  noise: 0.0004, unit: "kΩ", digits: 6, decimals: 4, max: 10,  rangeText: "10 kΩ · AUTO"  },
  { key: "DCA", label: "DCA", fnBadge: "A DC",  base: 1.2453,  noise: 0.0005, unit: "A",  digits: 6, decimals: 4, max: 10,  rangeText: "±10 A · AUTO"  },
  { key: "Hz",  label: "Hz",  fnBadge: "Hz",    base: 50.001,  noise: 0.003,  unit: "Hz", digits: 6, decimals: 3, max: 100, rangeText: "100 Hz · AUTO" },
  { key: "°C",  label: "°C",  fnBadge: "°C",    base: 24.6,    noise: 0.15,   unit: "°C", digits: 5, decimals: 1, max: 100, rangeText: "200 °C · AUTO" },
];

// ─── hooks ────────────────────────────────────────────────────────────────────

function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = React.useRef<T>(null);
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCountUp(target: number, duration = 1400, start = false) {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    if (!start) return;
    let raf: number;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
      else setCount(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return count;
}

function useLiveReading(base: number, noise: number, decimals: number, interval = 900) {
  const [v, setV] = React.useState(base);
  React.useEffect(() => {
    setV(base);
    const id = setInterval(() => {
      const jitter = (Math.random() * 2 - 1) * noise;
      setV(+(base + jitter).toFixed(decimals));
    }, interval);
    return () => clearInterval(id);
  }, [base, noise, decimals, interval]);
  return v;
}

// ─── small pieces ─────────────────────────────────────────────────────────────

const DMM_MONO = "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const LCD_GREEN = "#8afcc4";
const LCD_DIM = "rgba(138,252,196,0.28)";

function DMM() {
  const [modeIdx, setModeIdx] = React.useState(0);
  const [autoCycle, setAutoCycle] = React.useState(true);
  const [hold, setHold] = React.useState(false);
  const [rel, setRel] = React.useState(false);

  React.useEffect(() => {
    if (!autoCycle) return;
    const id = setInterval(() => setModeIdx((i) => (i + 1) % DMM_MODES.length), 3600);
    return () => clearInterval(id);
  }, [autoCycle]);

  const mode = DMM_MODES[modeIdx];
  const liveValue = useLiveReading(mode.base, mode.noise, mode.decimals);
  const displayed = hold ? mode.base : liveValue;

  const digitStr = React.useMemo(() => {
    const totalIntDigits = mode.digits - mode.decimals;
    const [intPart, decPart = ""] = Math.abs(displayed).toFixed(mode.decimals).split(".");
    const padInt = intPart.padStart(totalIntDigits, " ");
    return { padInt, decPart, negative: displayed < 0 };
  }, [displayed, mode.decimals, mode.digits]);

  const pct = Math.min(Math.abs(displayed) / mode.max, 1);
  const barSegments = 30;
  const filled = Math.round(pct * barSegments);

  const handleModeClick = (i: number) => {
    setModeIdx(i);
    setAutoCycle(false);
  };

  return (
    <div style={{
      background: "linear-gradient(180deg,#1a2334,#0f1727)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 22,
      boxShadow: "0 30px 70px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
      overflow: "hidden",
      animation: "jz-float 7s ease-in-out infinite",
      userSelect: "none",
    }}>
      {/* Instrument bezel/header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "linear-gradient(180deg,rgba(255,255,255,0.02),transparent)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "rgba(79,140,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6ea0ff" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 12l4-4" />
              <circle cx="12" cy="12" r="1.5" fill="#6ea0ff" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 640, fontSize: 13, color: "#eef2f8" }}>Digital Multimeter</div>
            <div style={{ fontFamily: DMM_MONO, fontSize: 10.5, color: "#7e8ba0", letterSpacing: "0.02em" }}>JASPER · DMM-6510</div>
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: DMM_MONO, fontSize: 10, letterSpacing: "0.14em",
          color: "#7fe0a3", background: "rgba(46,204,113,0.1)",
          border: "1px solid rgba(46,204,113,0.25)",
          padding: "5px 9px", borderRadius: 6,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2ecc71", animation: "jz-pulse 2s ease-in-out infinite" }} />
          {autoCycle ? "AUTO" : "MAN"}
        </div>
      </div>

      {/* LCD panel */}
      <div style={{ padding: "16px 18px 14px" }}>
        <div style={{
          position: "relative",
          background: "linear-gradient(180deg,#0b1a1a,#081414)",
          border: "1px solid rgba(138,252,196,0.12)",
          borderRadius: 10,
          padding: "12px 16px 14px",
          boxShadow: "inset 0 2px 12px rgba(0,0,0,0.55), inset 0 0 24px rgba(138,252,196,0.05)",
        }}>
          {/* Status row */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontFamily: DMM_MONO, fontSize: 9.5, letterSpacing: "0.12em",
            color: LCD_DIM, marginBottom: 6,
          }}>
            <div style={{ display: "flex", gap: 14 }}>
              <span style={{ color: LCD_GREEN, textShadow: `0 0 6px ${LCD_GREEN}` }}>TRUE-RMS</span>
              <span style={{ color: autoCycle ? LCD_GREEN : LCD_DIM, textShadow: autoCycle ? `0 0 6px ${LCD_GREEN}` : "none" }}>AUTO</span>
              <span style={{ color: rel ? LCD_GREEN : LCD_DIM, textShadow: rel ? `0 0 6px ${LCD_GREEN}` : "none" }}>REL</span>
              <span style={{ color: hold ? "#ffb454" : LCD_DIM, textShadow: hold ? "0 0 6px #ffb454" : "none" }}>HOLD</span>
            </div>
            <span style={{ color: LCD_GREEN, textShadow: `0 0 6px ${LCD_GREEN}` }}>{mode.label}</span>
          </div>

          {/* Big segmented reading */}
          <div style={{
            display: "flex", alignItems: "baseline", justifyContent: "space-between",
            gap: 8, marginTop: 2,
          }}>
            <div style={{
              fontFamily: DMM_MONO,
              fontSize: 44, fontWeight: 500,
              color: LCD_GREEN,
              textShadow: `0 0 8px ${LCD_GREEN}, 0 0 20px rgba(138,252,196,0.35)`,
              letterSpacing: "0.02em",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
              whiteSpace: "pre",
            }}>
              {digitStr.negative ? "-" : " "}{digitStr.padInt}.{digitStr.decPart}
            </div>
            <div style={{
              fontFamily: DMM_MONO,
              fontSize: 14, fontWeight: 500,
              color: LCD_GREEN,
              textShadow: `0 0 6px ${LCD_GREEN}`,
              letterSpacing: "0.06em",
              paddingBottom: 4,
            }}>
              {mode.fnBadge}
            </div>
          </div>

          {/* Bargraph */}
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 10 }}>
              {Array.from({ length: barSegments }).map((_, i) => {
                const active = i < filled;
                const isMajor = i % 5 === 0;
                return (
                  <div key={i} style={{
                    flex: 1,
                    height: isMajor ? "100%" : "70%",
                    background: active ? LCD_GREEN : "rgba(138,252,196,0.08)",
                    boxShadow: active ? `0 0 4px ${LCD_GREEN}` : "none",
                    borderRadius: 1,
                    transition: "background .2s",
                  }} />
                );
              })}
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              marginTop: 4, fontFamily: DMM_MONO,
              fontSize: 8.5, letterSpacing: "0.1em", color: LCD_DIM,
            }}>
              <span>0</span><span>25</span><span>50</span><span>75</span><span>{mode.max}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Function buttons */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(6,1fr)",
        gap: 6, padding: "4px 18px 14px",
      }}>
        {DMM_MODES.map((m, i) => {
          const active = i === modeIdx;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => handleModeClick(i)}
              style={{
                padding: "9px 0",
                textAlign: "center",
                borderRadius: 7,
                fontFamily: DMM_MONO,
                fontSize: 11, fontWeight: 600,
                letterSpacing: "0.08em",
                background: active
                  ? "linear-gradient(180deg,rgba(79,140,255,0.32),rgba(79,140,255,0.14))"
                  : "linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
                border: `1px solid ${active ? "rgba(79,140,255,0.55)" : "rgba(255,255,255,0.06)"}`,
                color: active ? "#eef2f8" : "#8895aa",
                cursor: "pointer",
                boxShadow: active
                  ? "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 12px rgba(79,140,255,0.35)"
                  : "inset 0 1px 0 rgba(255,255,255,0.04)",
                transition: "all .18s ease",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))";
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Secondary buttons (HOLD / REL / RANGE) */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: 6, padding: "0 18px 14px",
      }}>
        {[
          { label: "HOLD",  active: hold,  onClick: () => setHold((v) => !v) },
          { label: "REL",   active: rel,   onClick: () => setRel((v) => !v) },
          { label: "RANGE", active: false, onClick: () => setAutoCycle((v) => !v) },
        ].map((b) => (
          <button
            key={b.label}
            type="button"
            onClick={b.onClick}
            style={{
              padding: "7px 0",
              textAlign: "center",
              borderRadius: 6,
              fontFamily: DMM_MONO,
              fontSize: 10, fontWeight: 600,
              letterSpacing: "0.14em",
              background: b.active
                ? "linear-gradient(180deg,rgba(255,180,84,0.28),rgba(255,180,84,0.1))"
                : "linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.005))",
              border: `1px solid ${b.active ? "rgba(255,180,84,0.5)" : "rgba(255,255,255,0.05)"}`,
              color: b.active ? "#ffd499" : "#6b7689",
              cursor: "pointer",
              transition: "all .18s ease",
            }}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Range / input jacks footer */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 18px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.15)",
        fontFamily: DMM_MONO, fontSize: 10, letterSpacing: "0.08em", color: "#8b97ab",
      }}>
        <span>RANGE · {mode.rangeText}</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {[
            { label: "VΩ",  color: "#4f8cff" },
            { label: "mA",  color: "#ffb454" },
            { label: "COM", color: "#eef2f8" },
          ].map((j) => (
            <div key={j.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: `radial-gradient(circle at 30% 30%, ${j.color}, ${j.color}88 60%, ${j.color}22 100%)`,
                boxShadow: `0 0 4px ${j.color}66, inset 0 0 2px rgba(0,0,0,0.4)`,
              }} />
              <span style={{ fontSize: 9, color: "#6b7689" }}>{j.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── feature icon svgs ────────────────────────────────────────────────────────

const FEATURE_ICONS = [
  <svg key="1" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>,
  <svg key="2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9"><path d="M14 3v5h5" /><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" /><path d="M9 13l2 2 4-4" /></svg>,
  <svg key="3" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9"><path d="M14.7 6.3a4 4 0 00-5.4 5.4l-6 6a1.4 1.4 0 002 2l6-6a4 4 0 005.4-5.4l-2.5 2.5-2-2z" /></svg>,
  <svg key="4" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 9h16M9 4v16" /></svg>,
  <svg key="5" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9"><path d="M3 12a9 9 0 109-9" /><path d="M3 4v5h5" /><path d="M12 8v4l3 2" /></svg>,
  <svg key="6" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6ea0ff" strokeWidth="1.9"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></svg>,
];

const FEATURES = [
  { title: "Calibration Reports",     desc: "Create and manage calibration reports for every instrument, with structured, validated data entry." },
  { title: "PDF Certificates",        desc: "Watermarked, branded calibration certificates — auto-generated and ready to download instantly." },
  { title: "Multi-Instrument Support",desc: "Pressure gauges, thermometers, flow meters and more — each with its own parameter set." },
  { title: "Instrument Tracking",     desc: "Track every instrument's calibration status, due dates and full measurement history." },
  { title: "Audit History",           desc: "Full audit trail for every calibration record — see who changed what, and when." },
  { title: "ISO-Ready Compliance",    desc: "Reports and certificates structured to satisfy ISO calibration and documentation requirements." },
];

const FAQ = [
  {
    q: "Is Jasper compliant with ISO/IEC 17025?",
    a: "Every report and certificate is structured to satisfy ISO/IEC 17025 documentation requirements — traceable reference standards, uncertainty fields, environmental conditions, and authorized signatories are captured on each record.",
  },
  {
    q: "Does Jasper work offline in the field?",
    a: "Yes — Jasper is offline-first. Record measurements on-site with no connection, and everything syncs automatically the moment your device is back online. No readings are ever lost.",
  },
  {
    q: "How long is calibration data retained?",
    a: "Records and generated certificates are retained for the full life of the instrument, with a complete, immutable audit trail. Retention windows can be configured to match your organization's compliance policy.",
  },
  {
    q: "Who can edit or approve records?",
    a: "Role-based access controls determine who can create, edit, review, and sign off records. Every change is logged with the user, timestamp, and the previous value — nothing is overwritten silently.",
  },
  {
    q: "How are certificates generated and verified?",
    a: "On save, Jasper auto-generates a watermarked, branded PDF certificate with a unique hash. That hash lets anyone verify a certificate's authenticity against the original record — no tampering, no ambiguity.",
  },
];

// ─── component ────────────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth();
  const isAuthed = !!user;
  const ctaHref = isAuthed ? "/dashboard" : "/login";
  const heroLabel = isAuthed ? "Open Dashboard" : "Get Started";
  const navLabel = isAuthed ? "Dashboard" : "Sign In";
  const footerLabel = isAuthed ? "Go to Dashboard" : "Sign In to Portal";

  const statsRef = useInView<HTMLDivElement>();
  const yearsCount = useCountUp(117, 1400, statsRef.inView);
  const reportsCount = useCountUp(2854, 1600, statsRef.inView);

  return (
    <>
      <style>{`
        @keyframes jz-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes jz-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.35; transform:scale(.82); } }
        @keyframes jz-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
        @keyframes jz-drift { 0%,100% { transform: translate(0,0); opacity:.85; } 50% { transform: translate(-26px,22px); opacity:1; } }
        @keyframes jz-fade-up { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }

        .jz-reveal { opacity: 0; transform: translateY(20px); transition: opacity .7s ease, transform .7s cubic-bezier(.22,.61,.36,1); }
        .jz-reveal.jz-in { opacity: 1; transform: none; }

        .jz-page a { color: #2f6fed; text-decoration: none; }
        .jz-page a:hover { color: #1e50c0; }
        .jz-page ::selection { background: #4f8cff; color: #fff; }

        .jz-feat-card { transition: transform .18s ease, box-shadow .18s ease; }
        .jz-feat-card:hover { transform: translateY(-4px); box-shadow: 0 18px 40px rgba(11,20,36,0.08); }

        .jz-faq summary { list-style: none; cursor: pointer; }
        .jz-faq summary::-webkit-details-marker { display: none; }
        .jz-faq .jz-ic { transition: transform .25s ease; }
        .jz-faq[open] .jz-ic { transform: rotate(45deg); }
        .jz-faq .jz-a { overflow: hidden; max-height: 0; opacity: 0; transition: max-height .3s ease, opacity .3s ease, padding .3s ease; }
        .jz-faq[open] .jz-a { max-height: 320px; opacity: 1; }

        @media (prefers-reduced-motion: reduce) { .jz-page * { animation: none !important; } }

        @media (max-width: 960px) {
          .jz-hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; padding-top: 104px !important; padding-bottom: 72px !important; }
          .jz-about { grid-template-columns: 1fr !important; gap: 48px !important; }
          .jz-feat-grid { grid-template-columns: repeat(2,1fr) !important; }
          .jz-flow-grid { grid-template-columns: repeat(2,1fr) !important; row-gap: 48px !important; }
          .jz-flow-line { display: none !important; }
          .jz-foot-grid { grid-template-columns: 1fr 1fr !important; }
          .jz-h1 { font-size: 50px !important; }
        }
        @media (max-width: 640px) {
          .jz-nav-links { display: none !important; }
          .jz-ledger { grid-template-columns: 1fr 1fr !important; }
          .jz-ledger > div { border-right: none !important; border-bottom: 1px solid var(--jz-line); }
          .jz-feat-grid { grid-template-columns: 1fr !important; }
          .jz-flow-grid { grid-template-columns: 1fr !important; }
          .jz-foot-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .jz-h1 { font-size: 40px !important; }
          .jz-sec-title { font-size: 32px !important; }
          .jz-pad { padding-left: 20px !important; padding-right: 20px !important; }
          .jz-hero-grid { padding-top: 128px !important; padding-bottom: 56px !important; gap: 40px !important; }
          .jz-hero-tags { gap: 10px 14px !important; }
          .jz-hero-tags .jz-hero-sep { display: none !important; }
          .jz-hero-cta { width: 100% !important; justify-content: center !important; }
          .jz-hero-cta-row { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
          .jz-hero-cta-row a { justify-content: center !important; }
        }
        @media (max-width: 460px) {
          .jz-h1 { font-size: 34px !important; letter-spacing: -0.03em !important; }
          .jz-sec-title { font-size: 26px !important; }
          .jz-pad { padding-left: 16px !important; padding-right: 16px !important; }
          .jz-hero-grid { padding-top: 116px !important; padding-bottom: 48px !important; gap: 32px !important; }
        }
      `}</style>

      <div
        className="jz-page force-light"
        style={{
          // @ts-expect-error css vars
          "--jz-accent": "#2f6fed",
          "--jz-ink": "#0b1424",
          "--jz-line": "#e6e8ec",
          "--jz-panel": "#f6f7f9",
          "--jz-muted": "#616b7a",
          maxWidth: "100%",
          overflowX: "hidden",
          background: "#fff",
          color: "#0b1424",
          fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {/* ============ NAV ============ */}
        <header style={{
          position: "sticky", top: 16, zIndex: 50,
          display: "flex", justifyContent: "center",
          padding: "0 20px", marginBottom: -76, pointerEvents: "none",
        }}>
          <div style={{
            pointerEvents: "auto", width: "100%", maxWidth: 1080,
            padding: "0 14px 0 20px", height: 60,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(11,20,36,0.72)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          }}>
            <Link
              href="/"
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                color: "#fff", textDecoration: "none",
              }}
            >
              <Wordmark size="md" markOnly />
              <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em", color: "#fff" }}>
                Jasper
              </span>
            </Link>
            <nav style={{ display: "flex", alignItems: "center", gap: 34 }}>
              <div className="jz-nav-links" style={{ display: "flex", gap: 28, fontSize: 14, color: "#c3ccdb" }}>
                <a href="#platform" style={{ color: "#c3ccdb" }}>Platform</a>
                <a href="#features" style={{ color: "#c3ccdb" }}>Features</a>
                <a href="#workflow" style={{ color: "#c3ccdb" }}>Workflow</a>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <div className="jz-nav-links" style={{
                  display: "flex", alignItems: "center", gap: 7,
                  fontFamily: "'Geist Mono', ui-monospace, monospace",
                  fontSize: 10.5, letterSpacing: "0.1em", color: "#8fe3ac",
                  border: "1px solid rgba(46,204,113,0.28)",
                  background: "rgba(46,204,113,0.08)",
                  borderRadius: 100, padding: "6px 12px",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2ecc71", animation: "jz-pulse 2s ease-in-out infinite" }} />
                  OPERATIONAL
                </div>
                <Link href={ctaHref} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "var(--jz-accent)", color: "#fff",
                  fontWeight: 600, fontSize: 14,
                  padding: "10px 18px", borderRadius: 9,
                  boxShadow: "0 4px 14px rgba(47,111,237,0.32)",
                }}>
                  {navLabel}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>
            </nav>
          </div>
        </header>

        {/* ============ HERO ============ */}
        <section style={{ position: "relative", background: "#0b1424", color: "#eef2f8", overflow: "hidden" }}>
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(rgba(255,255,255,0.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.045) 1px,transparent 1px)",
            backgroundSize: "64px 64px",
            WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 30% 20%,#000 40%,transparent 100%)",
            maskImage: "radial-gradient(ellipse 90% 70% at 30% 20%,#000 40%,transparent 100%)",
          }} />
          <div style={{
            position: "absolute", top: -160, right: -120,
            width: 560, height: 560,
            background: "radial-gradient(circle,rgba(79,140,255,0.22),transparent 65%)",
            pointerEvents: "none", animation: "jz-drift 13s ease-in-out infinite",
          }} />
          <div className="jz-hero-grid jz-pad" style={{
            position: "relative", maxWidth: 1240, margin: "0 auto",
            padding: "150px 32px 96px",
            display: "grid", gridTemplateColumns: "1.05fr 0.95fr",
            gap: 64, alignItems: "center",
          }}>
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                fontFamily: "'Geist Mono', ui-monospace, monospace",
                fontSize: 11, letterSpacing: "0.16em", color: "#9db4de",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 100, padding: "7px 14px",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--jz-accent)" }} />
                CALIBRATION MANAGEMENT PORTAL
              </div>
              <h1 className="jz-h1" style={{
                margin: "26px 0 0", fontSize: 66, lineHeight: 1.02,
                letterSpacing: "-0.035em", fontWeight: 640,
              }}>
                Certified<br />calibration,<br />
                <span style={{ color: "#6ea0ff" }}>measured to spec.</span>
              </h1>
              <p style={{
                margin: "26px 0 0", fontSize: 18, lineHeight: 1.6,
                color: "#a9b5c8", maxWidth: 490,
              }}>
                One structured system to record measurements, generate ISO-compliant certificates, and trace every instrument — from the bench to the field.
              </p>
              <div className="jz-hero-cta-row" style={{ marginTop: 34, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                <Link href={ctaHref} className="jz-hero-cta" style={{
                  display: "inline-flex", alignItems: "center", gap: 9,
                  background: "var(--jz-accent)", color: "#fff",
                  fontWeight: 640, fontSize: 15, padding: "14px 24px",
                  borderRadius: 10, boxShadow: "0 8px 24px rgba(47,111,237,0.35)",
                }}>
                  {heroLabel}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <a href="#features" style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  color: "#c3ccdb", fontWeight: 560, fontSize: 15,
                }}>
                  See how it works
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </a>
              </div>
              <div className="jz-hero-tags" style={{
                marginTop: 38, display: "flex", gap: 26, flexWrap: "wrap",
                fontFamily: "'Geist Mono', ui-monospace, monospace",
                fontSize: 11, letterSpacing: "0.12em", color: "#7e8ba0",
              }}>
                <span>ISO&nbsp;17025-READY</span>
                <span className="jz-hero-sep" style={{ color: "#39435a" }}>/</span>
                <span>OFFLINE-FIRST</span>
                <span className="jz-hero-sep" style={{ color: "#39435a" }}>/</span>
                <span>BUILT FOR ENGINEERS</span>
              </div>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute", top: -14, left: -14,
                fontFamily: "'Geist Mono', ui-monospace, monospace",
                fontSize: 10, color: "#5e6b82", letterSpacing: "0.1em",
              }}>REC — 0042</div>
              <DMM />
              <div style={{
                position: "absolute", bottom: -14, right: -14,
                fontFamily: "'Geist Mono', ui-monospace, monospace",
                fontSize: 10, color: "#5e6b82", letterSpacing: "0.1em",
              }}>◦ TRUE-RMS</div>
            </div>
          </div>
        </section>

        {/* ============ TRUST LEDGER ============ */}
        <section style={{ borderBottom: "1px solid var(--jz-line)" }} ref={statsRef.ref}>
          <div className="jz-ledger jz-pad" style={{
            maxWidth: 1240, margin: "0 auto", padding: "0 32px",
            display: "grid", gridTemplateColumns: "repeat(4,1fr)",
          }}>
            <div style={{ padding: "34px 28px", borderRight: "1px solid var(--jz-line)" }}>
              <div style={{ fontSize: 34, fontWeight: 680, letterSpacing: "-0.02em" }}>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{yearsCount}</span>
                <span style={{ color: "var(--jz-accent)" }}>+</span>
              </div>
              <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: "0.1em", color: "var(--jz-muted)", marginTop: 6 }}>
                YEARS OF EXCELLENCE
              </div>
            </div>
            <div style={{ padding: "34px 28px", borderRight: "1px solid var(--jz-line)" }}>
              <div style={{ fontSize: 34, fontWeight: 680, letterSpacing: "-0.02em" }}>Pan-India</div>
              <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: "0.1em", color: "var(--jz-muted)", marginTop: 6 }}>
                SERVICE PRESENCE
              </div>
            </div>
            <div style={{ padding: "34px 28px", borderRight: "1px solid var(--jz-line)" }}>
              <div style={{ fontSize: 34, fontWeight: 680, letterSpacing: "-0.02em" }}>ISO</div>
              <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: "0.1em", color: "var(--jz-muted)", marginTop: 6 }}>
                17025 CERTIFIED
              </div>
            </div>
            <div style={{ padding: "34px 28px" }}>
              <div style={{ fontSize: 34, fontWeight: 680, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{reportsCount.toLocaleString()}</span>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2ecc71", animation: "jz-pulse 2s ease-in-out infinite" }} />
              </div>
              <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: "0.1em", color: "var(--jz-muted)", marginTop: 6 }}>
                REPORTS GENERATED
              </div>
            </div>
          </div>
        </section>

        {/* ============ INSTRUMENT TICKER ============ */}
        <section style={{ background: "var(--jz-panel)", borderBottom: "1px solid var(--jz-line)", overflow: "hidden", padding: "16px 0" }}>
          <div style={{ display: "flex", width: "max-content", animation: "jz-marquee 32s linear infinite" }}>
            {[0, 1].map((k) => (
              <div key={k} style={{
                display: "flex", gap: 44, paddingRight: 44,
                fontFamily: "'Geist Mono', ui-monospace, monospace",
                fontSize: 12, letterSpacing: "0.1em", color: "#7a8494",
              }} aria-hidden={k === 1}>
                {INSTRUMENTS.map((name) => (
                  <span key={name}>◦ {name}</span>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ============ PLATFORM / ABOUT ============ */}
        <section id="platform" style={{ maxWidth: 1240, margin: "0 auto", padding: "104px 32px" }}>
          <div className="jz-about" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
            <div>
              <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: "0.16em", color: "var(--jz-accent)" }}>
                § 01 — THE PLATFORM
              </div>
              <h2 className="jz-sec-title" style={{ margin: "16px 0 0", fontSize: 44, lineHeight: 1.08, letterSpacing: "-0.03em", fontWeight: 660 }}>
                Built for precision.<br />Designed for teams.
              </h2>
              <p style={{ margin: "24px 0 0", fontSize: 17, lineHeight: 1.65, color: "#3a4453", maxWidth: 460 }}>
                Jasper is a modern calibration suite — purpose-built to eliminate paper workflows and give engineers a fast, reliable way to produce calibration records, even from the field.
              </p>
              <p style={{ margin: "16px 0 0", fontSize: 17, lineHeight: 1.65, color: "#3a4453", maxWidth: 460 }}>
                From pressure gauges to flow meters, every instrument type carries its own structured form with pre-defined parameters — so each report is consistent, complete, and traceable from day one.
              </p>
              <div style={{ marginTop: 30, display: "grid", gap: 2 }}>
                {[
                  "100% digital — no paper forms",
                  "Automatic PDF certificate generation",
                  "Live audit trail on every record",
                  "Role-based access for your team",
                ].map((point, i, arr) => (
                  <div key={point} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 0",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--jz-line)" : "none",
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--jz-accent)" strokeWidth="2.4">
                      <circle cx="12" cy="12" r="10" stroke="rgba(47,111,237,0.25)" />
                      <path d="M8 12l3 3 5-5" />
                    </svg>
                    <span style={{ fontSize: 15, fontWeight: 520 }}>{point}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { n: "01", stat: "100%", detail: "Digital workflow — no paper", dark: false },
                { n: "02", stat: "Auto", detail: "PDF certificate generation", dark: false },
                { n: "03", stat: "Live", detail: "Audit trail on every record", dark: false },
                { n: "04", stat: "Multi", detail: "Instrument type support", dark: true },
              ].map(({ n, stat, detail, dark }) => (
                <div key={n} style={{
                  border: `1px solid ${dark ? "var(--jz-ink)" : "var(--jz-line)"}`,
                  borderRadius: 14, padding: 26,
                  background: dark ? "var(--jz-ink)" : "#fff",
                  color: dark ? "#fff" : "inherit",
                  position: "relative",
                }}>
                  <div style={{
                    position: "absolute", top: 14, right: 16,
                    fontFamily: "'Geist Mono', ui-monospace, monospace",
                    fontSize: 10, color: dark ? "#4a5875" : "#c3c9d2",
                  }}>{n}</div>
                  <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.03em" }}>{stat}</div>
                  <div style={{ marginTop: 8, fontSize: 14, color: dark ? "#93a1b8" : "var(--jz-muted)", lineHeight: 1.5 }}>
                    {detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ FEATURES ============ */}
        <section id="features" style={{ background: "var(--jz-panel)", borderTop: "1px solid var(--jz-line)", borderBottom: "1px solid var(--jz-line)" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto", padding: "104px 32px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
              <div>
                <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: "0.16em", color: "var(--jz-accent)" }}>
                  § 02 — CAPABILITIES
                </div>
                <h2 className="jz-sec-title" style={{ margin: "16px 0 0", fontSize: 44, lineHeight: 1.08, letterSpacing: "-0.03em", fontWeight: 660 }}>
                  Everything you need
                </h2>
              </div>
              <p style={{ fontSize: 16, color: "#3a4453", maxWidth: 360, lineHeight: 1.6, margin: 0 }}>
                A complete platform for managing instrument calibration — from first measurement to final certificate.
              </p>
            </div>
            <div className="jz-feat-grid" style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {FEATURES.map((f, i) => {
                const dark = i === 5;
                return (
                  <div key={f.title} className="jz-feat-card" style={{
                    background: dark ? "var(--jz-ink)" : "#fff",
                    border: `1px solid ${dark ? "var(--jz-ink)" : "var(--jz-line)"}`,
                    borderRadius: 16, padding: 30, position: "relative",
                    color: dark ? "#fff" : "inherit",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 11,
                        background: dark ? "rgba(255,255,255,0.1)" : "var(--jz-ink)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {FEATURE_ICONS[i]}
                      </div>
                      <span style={{
                        fontFamily: "'Geist Mono', ui-monospace, monospace",
                        fontSize: 11, color: dark ? "#4a5875" : "#c3c9d2",
                      }}>{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <h3 style={{ margin: "20px 0 0", fontSize: 19, fontWeight: 640, letterSpacing: "-0.01em" }}>
                      {f.title}
                    </h3>
                    <p style={{ margin: "10px 0 0", fontSize: 14.5, lineHeight: 1.6, color: dark ? "#93a1b8" : "var(--jz-muted)" }}>
                      {f.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============ WORKFLOW ============ */}
        <section id="workflow" style={{ maxWidth: 1240, margin: "0 auto", padding: "104px 32px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: "0.16em", color: "var(--jz-accent)" }}>
              § 03 — WORKFLOW
            </div>
            <h2 className="jz-sec-title" style={{ margin: "16px 0 0", fontSize: 44, lineHeight: 1.08, letterSpacing: "-0.03em", fontWeight: 660 }}>
              How it works
            </h2>
            <p style={{ margin: "14px auto 0", fontSize: 17, color: "#3a4453", maxWidth: 440, lineHeight: 1.6 }}>
              From instrument selection to certified PDF — the whole process in four steps.
            </p>
          </div>
          <div className="jz-flow-grid" style={{ marginTop: 56, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, position: "relative" }}>
            <div className="jz-flow-line" style={{ position: "absolute", top: 26, left: "12%", right: "12%", height: 1, background: "var(--jz-line)" }} />
            {[
              { step: "01", title: "Select Instrument",   desc: "Choose the instrument type and fill in identification details." },
              { step: "02", title: "Enter Measurements", desc: "Record calibration readings for each parameter." },
              { step: "03", title: "Review & Save",       desc: "Review the report and save it with a timestamp and author." },
              { step: "04", title: "Download Certificate",desc: "Generate a watermarked PDF certificate, ready to share." },
            ].map(({ step, title, desc }, i) => (
              <div key={step} style={{ position: "relative", padding: "0 20px", textAlign: "center" }}>
                <div style={{
                  width: 54, height: 54, margin: "0 auto", borderRadius: 13,
                  background: i === 3 ? "var(--jz-accent)" : "var(--jz-ink)",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Geist Mono', ui-monospace, monospace",
                  fontWeight: 600, fontSize: 18, position: "relative", zIndex: 1,
                }}>{step}</div>
                <h3 style={{ margin: "20px 0 0", fontSize: 17, fontWeight: 640 }}>{title}</h3>
                <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--jz-muted)", lineHeight: 1.55 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section id="faq" style={{ background: "var(--jz-panel)", borderTop: "1px solid var(--jz-line)", borderBottom: "1px solid var(--jz-line)" }}>
          <div className="jz-pad" style={{ maxWidth: 840, margin: "0 auto", padding: "104px 32px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: "0.16em", color: "var(--jz-accent)" }}>
                § 04 — QUESTIONS
              </div>
              <h2 className="jz-sec-title" style={{ margin: "16px 0 0", fontSize: 44, lineHeight: 1.08, letterSpacing: "-0.03em", fontWeight: 660 }}>
                Compliance, answered
              </h2>
              <p style={{ margin: "14px auto 0", fontSize: 17, color: "#3a4453", maxWidth: 460, lineHeight: 1.6 }}>
                The details engineering and quality teams ask before rolling Jasper out.
              </p>
            </div>
            <div style={{ marginTop: 48 }}>
              {FAQ.map((f, i) => (
                <details key={f.q} className="jz-faq" open={i === 0} style={{
                  background: "#fff", border: "1px solid var(--jz-line)",
                  borderRadius: 14, marginBottom: 12, padding: "0 24px",
                }}>
                  <summary style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 16, padding: "22px 0",
                  }}>
                    <span style={{ fontSize: 17, fontWeight: 600, color: "#0b1424" }}>{f.q}</span>
                    <span className="jz-ic" style={{
                      flexShrink: 0, color: "var(--jz-accent)",
                      fontSize: 22, fontWeight: 400, lineHeight: 1,
                    }}>+</span>
                  </summary>
                  <div className="jz-a">
                    <p style={{ margin: 0, padding: "0 0 22px", fontSize: 15, lineHeight: 1.7, color: "var(--jz-muted)" }}>
                      {f.a}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ============ CTA ============ */}
        <section style={{ background: "#0b1424", color: "#eef2f8", position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(rgba(255,255,255,0.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.045) 1px,transparent 1px)",
            backgroundSize: "56px 56px",
            WebkitMaskImage: "radial-gradient(ellipse 70% 90% at 50% 0%,#000 30%,transparent 100%)",
            maskImage: "radial-gradient(ellipse 70% 90% at 50% 0%,#000 30%,transparent 100%)",
          }} />
          <div className="jz-pad" style={{ position: "relative", maxWidth: 820, margin: "0 auto", padding: "100px 32px", textAlign: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              fontFamily: "'Geist Mono', ui-monospace, monospace",
              fontSize: 11, letterSpacing: "0.16em", color: "#9db4de",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 100, padding: "7px 14px",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2ecc71" }} />
              GET STARTED TODAY
            </div>
            <h2 style={{ margin: "26px 0 0", fontSize: 52, lineHeight: 1.05, letterSpacing: "-0.03em", fontWeight: 660 }}>
              Ready to go paperless?
            </h2>
            <p style={{ margin: "20px auto 0", fontSize: 18, color: "#a9b5c8", maxWidth: 520, lineHeight: 1.6 }}>
              Sign in to the portal and start generating digital calibration records today. Your team can be up and running in minutes — no setup required.
            </p>
            <div style={{ marginTop: 34 }}>
              <Link href={ctaHref} style={{
                display: "inline-flex", alignItems: "center", gap: 9,
                background: "var(--jz-accent)", color: "#fff",
                fontWeight: 640, fontSize: 16, padding: "15px 28px",
                borderRadius: 11, boxShadow: "0 8px 24px rgba(47,111,237,0.35)",
              }}>
                {footerLabel}
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
            <div style={{
              marginTop: 32, display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap",
              fontFamily: "'Geist Mono', ui-monospace, monospace",
              fontSize: 11, letterSpacing: "0.1em", color: "#7e8ba0",
            }}>
              <span>✓ NO SETUP REQUIRED</span>
              <span>✓ ISO-READY CERTIFICATES</span>
              <span>✓ INSTANT PDF DOWNLOAD</span>
            </div>
          </div>
        </section>

        {/* ============ FOOTER ============ */}
        <footer style={{ background: "#070d18", color: "#8b97ab", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="jz-foot-grid jz-pad" style={{
            maxWidth: 1240, margin: "0 auto", padding: "64px 32px 0",
            display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 40,
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: "var(--jz-accent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
                    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" /><circle cx="12" cy="12" r="5" />
                  </svg>
                </div>
                <span style={{ fontWeight: 700, fontSize: 17, color: "#fff" }}>Jasper</span>
              </div>
              <p style={{ margin: "18px 0 0", fontSize: 14, lineHeight: 1.65, maxWidth: 300 }}>
                A modern calibration suite for measurement teams — offline-first, ISO-compliant, and engineered for the field.
              </p>
              <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["ISO CERTIFIED", "OFFLINE-FIRST"].map((b) => (
                  <span key={b} style={{
                    fontFamily: "'Geist Mono', ui-monospace, monospace",
                    fontSize: 10, letterSpacing: "0.1em",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 6, padding: "6px 10px",
                  }}>{b}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: "0.14em", color: "#5c6a82", margin: "0 0 16px" }}>PLATFORM</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {["Calibration Reports", "PDF Certificates", "Instrument Tracking", "Audit History"].map((item) => (
                  <li key={item}>
                    <Link href={ctaHref} style={{ fontSize: 14, color: "#8b97ab" }}>{item}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: "0.14em", color: "#5c6a82", margin: "0 0 16px" }}>COMPANY</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {["About", "Compliance", "Contact"].map((item) => (
                  <li key={item}>
                    <a href="#" style={{ fontSize: 14, color: "#8b97ab" }}>{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: "0.14em", color: "#5c6a82", margin: "0 0 16px" }}>CONTACT</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
                <li>support@jasper.app</li>
                <li>India</li>
              </ul>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 48, padding: "22px 32px" }}>
            <div style={{
              maxWidth: 1240, margin: "0 auto",
              display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
              fontFamily: "'Geist Mono', ui-monospace, monospace",
              fontSize: 11, letterSpacing: "0.08em", color: "#5c6a82",
            }}>
              <span>© {new Date().getFullYear()} JASPER · JOSTS ELECTRIC</span>
              <span>ISO-CERTIFIED CALIBRATION PORTAL</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
