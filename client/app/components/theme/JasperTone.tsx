"use client";

/**
 * JasperTone — mounts a scoped <style> block that repaints any subtree tagged
 * with `data-jz="jasper"` to the landing-page visual tone. Fully supports
 * light + dark via `.dark` prefix. No JSX changes required — just wrap your
 * root element:
 *
 *     <div data-jz="jasper" className="…">
 *       <JasperTone />
 *       …existing content…
 *     </div>
 *
 * Rules apply via attribute-scoped selectors so they don't leak outside the
 * subtree. Uses `!important` to beat Tailwind utility specificity where
 * needed.
 */
export default function JasperTone() {
  return (
    <style>{`
      /* ═══ Design tokens ═══════════════════════════════════════════════════ */
      [data-jz="jasper"] {
        --jz-page: #f6f8fb;
        --jz-card: #ffffff;
        --jz-card-elev: #ffffff;
        --jz-ink: #0b1424;
        --jz-ink-soft: #1f2a3d;
        --jz-muted: #5c6473;
        --jz-faint: #97a1b3;
        --jz-line: #e5e8ee;
        --jz-line-soft: #eef1f5;
        --jz-hover: #f2f4f9;
        --jz-accent: #2f6fed;
        --jz-accent-hover: #1e50c0;
        --jz-accent-soft: #eaf1ff;
        --jz-accent-soft-border: #c7d7f5;
        --jz-ok: #1d7a44;
        --jz-ok-soft: #e6f6ee;
        --jz-ok-border: #bde4cd;
        --jz-warn: #b5651a;
        --jz-warn-soft: #fef4e5;
        --jz-warn-border: #f0d59c;
        --jz-err: #b52c2c;
        --jz-err-soft: #fbeaea;
        --jz-err-border: #f3c6c6;
        --jz-shadow: 0 1px 2px rgba(11,20,36,0.04), 0 12px 32px rgba(11,20,36,0.05);
        --jz-mono: 'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace;
        font-family: Geist, ui-sans-serif, system-ui, -apple-system, sans-serif;
        background: var(--jz-page) !important;
        color: var(--jz-ink);
      }
      .dark [data-jz="jasper"] {
        --jz-page: #070d18;
        --jz-card: #0f1a2e;
        --jz-card-elev: #131f36;
        --jz-ink: #eef2f8;
        --jz-ink-soft: #d4dbe6;
        --jz-muted: #9aa5b7;
        --jz-faint: #6b7689;
        --jz-line: rgba(255,255,255,0.08);
        --jz-line-soft: rgba(255,255,255,0.04);
        --jz-hover: rgba(255,255,255,0.04);
        --jz-accent: #4f8cff;
        --jz-accent-hover: #6ea0ff;
        --jz-accent-soft: rgba(79,140,255,0.14);
        --jz-accent-soft-border: rgba(79,140,255,0.35);
        --jz-ok: #6ee7b7;
        --jz-ok-soft: rgba(52,211,153,0.12);
        --jz-ok-border: rgba(52,211,153,0.35);
        --jz-warn: #ffb454;
        --jz-warn-soft: rgba(255,180,84,0.1);
        --jz-warn-border: rgba(255,180,84,0.3);
        --jz-err: #fca5a5;
        --jz-err-soft: rgba(248,113,113,0.12);
        --jz-err-border: rgba(248,113,113,0.35);
        --jz-shadow: 0 1px 2px rgba(0,0,0,0.4), 0 12px 32px rgba(0,0,0,0.35);
        color: var(--jz-ink);
      }

      /* Mono treatment for uppercase-tracked labels */
      [data-jz="jasper"] .uppercase.tracking-widest,
      [data-jz="jasper"] .uppercase.tracking-wider,
      [data-jz="jasper"] .uppercase.tracking-\\[0\\.2em\\],
      [data-jz="jasper"] .uppercase.tracking-\\[0\\.25em\\],
      [data-jz="jasper"] .uppercase.tracking-\\[0\\.3em\\] {
        font-family: var(--jz-mono) !important;
        letter-spacing: 0.14em !important;
        font-weight: 600 !important;
      }

      /* Selection */
      [data-jz="jasper"] ::selection { background: var(--jz-accent); color: #fff; }

      /* ═══ Shadcn primitives ═══════════════════════════════════════════════ */
      [data-jz="jasper"] { --primary: oklch(0.55 0.22 262); --ring: oklch(0.55 0.22 262); }
      .dark [data-jz="jasper"] { --primary: oklch(0.68 0.18 262); --ring: oklch(0.68 0.18 262); }
      [data-jz="jasper"] button.bg-primary,
      [data-jz="jasper"] [class*=" bg-primary"] {
        background-color: var(--jz-accent) !important;
        color: #fff !important;
        box-shadow: 0 4px 14px rgba(47,111,237,0.28);
        transition: transform .12s ease, box-shadow .18s ease, background-color .15s ease;
      }
      [data-jz="jasper"] button.bg-primary:hover { transform: translateY(-1px); }
      [data-jz="jasper"] .focus-visible\\:ring-ring\\/50:focus-visible {
        --tw-ring-color: color-mix(in oklab, var(--jz-accent), transparent 55%) !important;
      }

      /* ═══ Hardcoded navy (#1e3a5f) → landing accent ═══════════════════════ */
      [data-jz="jasper"] .bg-\\[\\#1e3a5f\\] { background-color: var(--jz-accent) !important; }
      [data-jz="jasper"] .hover\\:bg-\\[\\#162d4a\\]:hover { background-color: var(--jz-accent-hover) !important; }
      [data-jz="jasper"] .text-\\[\\#1e3a5f\\] { color: var(--jz-accent) !important; }
      [data-jz="jasper"] .border-\\[\\#1e3a5f\\] { border-color: var(--jz-accent) !important; }
      [data-jz="jasper"] .from-\\[\\#1e3a5f\\] { --tw-gradient-from: var(--jz-accent) var(--tw-gradient-from-position) !important; --tw-gradient-to: rgb(47 111 237 / 0) var(--tw-gradient-to-position) !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important; }
      [data-jz="jasper"] .to-\\[\\#162d4a\\] { --tw-gradient-to: var(--jz-accent-hover) var(--tw-gradient-to-position) !important; }
      [data-jz="jasper"] .shadow-\\[\\#1e3a5f\\]\\/20 { --tw-shadow-color: rgba(47,111,237,0.25) !important; --tw-shadow: var(--tw-shadow-colored) !important; }

      /* ═══ Tailwind blue-* → accent ═════════════════════════════════════════ */
      [data-jz="jasper"] .text-blue-500,
      [data-jz="jasper"] .text-blue-600 { color: var(--jz-accent) !important; }
      [data-jz="jasper"] .text-blue-700,
      [data-jz="jasper"] .hover\\:text-blue-800:hover { color: var(--jz-accent-hover) !important; }
      [data-jz="jasper"] .bg-blue-500,
      [data-jz="jasper"] .bg-blue-600 { background-color: var(--jz-accent) !important; }
      [data-jz="jasper"] .hover\\:bg-blue-500:hover,
      [data-jz="jasper"] .hover\\:bg-blue-600:hover { background-color: var(--jz-accent-hover) !important; }
      [data-jz="jasper"] .bg-blue-50,
      [data-jz="jasper"] .bg-blue-50\\/60,
      [data-jz="jasper"] .bg-blue-100,
      [data-jz="jasper"] .hover\\:bg-blue-100:hover { background-color: var(--jz-accent-soft) !important; }
      [data-jz="jasper"] .border-blue-100,
      [data-jz="jasper"] .border-blue-200,
      [data-jz="jasper"] .border-blue-300,
      [data-jz="jasper"] .hover\\:border-blue-300:hover { border-color: var(--jz-accent-soft-border) !important; }
      [data-jz="jasper"] .border-blue-500 { border-color: var(--jz-accent) !important; }
      [data-jz="jasper"] .ring-blue-100,
      [data-jz="jasper"] .ring-blue-200 { --tw-ring-color: var(--jz-accent-soft-border) !important; }
      [data-jz="jasper"] .focus\\:border-blue-400:focus { border-color: var(--jz-accent) !important; }
      [data-jz="jasper"] .focus\\:ring-blue-100:focus { --tw-ring-color: var(--jz-accent-soft-border) !important; }

      .dark [data-jz="jasper"] .text-blue-400 { color: var(--jz-accent) !important; }
      .dark [data-jz="jasper"] .text-blue-300 { color: var(--jz-accent-hover) !important; }
      .dark [data-jz="jasper"] .bg-blue-950\\/40,
      .dark [data-jz="jasper"] .bg-blue-950\\/50,
      .dark [data-jz="jasper"] .bg-blue-950\\/20,
      .dark [data-jz="jasper"] .hover\\:bg-blue-950\\/40:hover { background-color: var(--jz-accent-soft) !important; }
      .dark [data-jz="jasper"] .border-blue-800,
      .dark [data-jz="jasper"] .border-blue-800\\/60,
      .dark [data-jz="jasper"] .border-blue-900\\/40,
      .dark [data-jz="jasper"] .border-blue-900\\/60 { border-color: var(--jz-accent-soft-border) !important; }
      .dark [data-jz="jasper"] .ring-blue-900,
      .dark [data-jz="jasper"] .focus\\:ring-blue-900:focus { --tw-ring-color: var(--jz-accent-soft-border) !important; }
      .dark [data-jz="jasper"] .dark\\:bg-blue-600 { background-color: var(--jz-accent) !important; }

      /* ═══ Neutral recolor: slate-* / zinc-* → landing tokens ═════════════ */
      [data-jz="jasper"] .bg-white,
      [data-jz="jasper"] .hover\\:bg-white:hover { background-color: var(--jz-card) !important; }
      [data-jz="jasper"] .border-slate-100,
      [data-jz="jasper"] .border-zinc-100,
      [data-jz="jasper"] .divide-slate-100 > * + *,
      [data-jz="jasper"] .divide-zinc-100 > * + * { border-color: var(--jz-line-soft) !important; }
      [data-jz="jasper"] .border-slate-200,
      [data-jz="jasper"] .border-slate-300,
      [data-jz="jasper"] .border-zinc-200,
      [data-jz="jasper"] .hover\\:border-slate-300:hover,
      [data-jz="jasper"] .divide-slate-200 > * + *,
      [data-jz="jasper"] .divide-zinc-200 > * + * { border-color: var(--jz-line) !important; }
      [data-jz="jasper"] .bg-slate-50,
      [data-jz="jasper"] .bg-zinc-50 { background-color: var(--jz-page) !important; }
      [data-jz="jasper"] .bg-slate-50\\/60,
      [data-jz="jasper"] .bg-zinc-50\\/50,
      [data-jz="jasper"] .bg-zinc-50\\/60,
      [data-jz="jasper"] .bg-zinc-50\\/70,
      [data-jz="jasper"] .bg-zinc-50\\/80,
      [data-jz="jasper"] .bg-slate-100,
      [data-jz="jasper"] .bg-slate-100\\/60,
      [data-jz="jasper"] .bg-zinc-100,
      [data-jz="jasper"] .bg-zinc-100\\/60,
      [data-jz="jasper"] .hover\\:bg-slate-100:hover,
      [data-jz="jasper"] .hover\\:bg-slate-100\\/60:hover,
      [data-jz="jasper"] .hover\\:bg-zinc-100:hover,
      [data-jz="jasper"] .hover\\:bg-zinc-100\\/60:hover { background-color: var(--jz-hover) !important; }
      [data-jz="jasper"] .bg-slate-200,
      [data-jz="jasper"] .bg-zinc-200 { background-color: var(--jz-line) !important; }
      [data-jz="jasper"] .text-slate-300,
      [data-jz="jasper"] .text-zinc-300,
      [data-jz="jasper"] .text-slate-400,
      [data-jz="jasper"] .text-zinc-400 { color: var(--jz-faint) !important; }
      [data-jz="jasper"] .text-slate-500,
      [data-jz="jasper"] .text-zinc-500,
      [data-jz="jasper"] .text-slate-600,
      [data-jz="jasper"] .text-zinc-600 { color: var(--jz-muted) !important; }
      [data-jz="jasper"] .text-slate-700,
      [data-jz="jasper"] .text-zinc-700 { color: var(--jz-ink-soft) !important; }
      [data-jz="jasper"] .text-slate-800,
      [data-jz="jasper"] .text-zinc-800,
      [data-jz="jasper"] .text-slate-900,
      [data-jz="jasper"] .text-zinc-900 { color: var(--jz-ink) !important; }

      .dark [data-jz="jasper"] .dark\\:bg-zinc-900,
      .dark [data-jz="jasper"] .dark\\:bg-zinc-900\\/95 { background-color: var(--jz-card) !important; }
      .dark [data-jz="jasper"] .dark\\:bg-zinc-800,
      .dark [data-jz="jasper"] .dark\\:bg-zinc-800\\/20,
      .dark [data-jz="jasper"] .dark\\:bg-zinc-800\\/30,
      .dark [data-jz="jasper"] .dark\\:bg-zinc-800\\/40,
      .dark [data-jz="jasper"] .dark\\:bg-zinc-800\\/50,
      .dark [data-jz="jasper"] .dark\\:bg-zinc-800\\/60,
      .dark [data-jz="jasper"] .dark\\:hover\\:bg-zinc-800:hover,
      .dark [data-jz="jasper"] .dark\\:hover\\:bg-zinc-800\\/40:hover,
      .dark [data-jz="jasper"] .dark\\:hover\\:bg-zinc-800\\/50:hover { background-color: var(--jz-hover) !important; }
      .dark [data-jz="jasper"] .dark\\:border-zinc-700 { border-color: var(--jz-line) !important; }
      .dark [data-jz="jasper"] .dark\\:border-zinc-800 { border-color: var(--jz-line-soft) !important; }
      .dark [data-jz="jasper"] .dark\\:hover\\:border-zinc-700:hover { border-color: var(--jz-line) !important; }
      .dark [data-jz="jasper"] .dark\\:text-zinc-500,
      .dark [data-jz="jasper"] .dark\\:text-zinc-600 { color: var(--jz-muted) !important; }
      .dark [data-jz="jasper"] .dark\\:text-zinc-400 { color: var(--jz-faint) !important; }
      .dark [data-jz="jasper"] .dark\\:text-zinc-300,
      .dark [data-jz="jasper"] .dark\\:hover\\:text-zinc-200:hover { color: var(--jz-ink-soft) !important; }
      .dark [data-jz="jasper"] .dark\\:text-zinc-200,
      .dark [data-jz="jasper"] .dark\\:text-zinc-100 { color: var(--jz-ink) !important; }
      .dark [data-jz="jasper"] .divide-zinc-800 > * + * { border-color: var(--jz-line-soft) !important; }
      .dark [data-jz="jasper"] .dark\\:bg-zinc-700\\/70 { background-color: var(--jz-hover) !important; }

      /* ═══ Cards / containers ═════════════════════════════════════════════ */
      [data-jz="jasper"] .rounded-2xl.border,
      [data-jz="jasper"] .rounded-xl.border,
      [data-jz="jasper"] .rounded-lg.border {
        background: var(--jz-card) !important;
        border: 1px solid var(--jz-line) !important;
        box-shadow: var(--jz-shadow);
      }
      [data-jz="jasper"] .rounded-2xl.border.border-dashed,
      [data-jz="jasper"] .rounded-xl.border.border-dashed {
        background: transparent !important;
        border-style: dashed !important;
        box-shadow: none !important;
      }
      [data-jz="jasper"] .shadow-sm { box-shadow: var(--jz-shadow) !important; }

      /* ═══ Emerald (ok) ═══════════════════════════════════════════════════ */
      [data-jz="jasper"] .bg-emerald-50,
      [data-jz="jasper"] .hover\\:bg-emerald-50:hover,
      [data-jz="jasper"] .bg-emerald-50\\/60,
      [data-jz="jasper"] .hover\\:bg-emerald-50\\/60:hover { background-color: var(--jz-ok-soft) !important; }
      [data-jz="jasper"] .text-emerald-500,
      [data-jz="jasper"] .text-emerald-600,
      [data-jz="jasper"] .text-emerald-700 { color: var(--jz-ok) !important; }
      [data-jz="jasper"] .border-emerald-200,
      [data-jz="jasper"] .hover\\:border-emerald-300:hover { border-color: var(--jz-ok-border) !important; }
      [data-jz="jasper"] .bg-emerald-500,
      [data-jz="jasper"] .hover\\:bg-emerald-500:hover,
      [data-jz="jasper"] .bg-emerald-500\\/70 { background-color: var(--jz-ok) !important; }
      [data-jz="jasper"] .bg-emerald-600 { background-color: var(--jz-ok) !important; }
      [data-jz="jasper"] .hover\\:bg-emerald-700:hover { filter: brightness(0.92); }
      [data-jz="jasper"] .border-emerald-500,
      [data-jz="jasper"] .hover\\:border-emerald-500:hover { border-color: var(--jz-ok) !important; }
      [data-jz="jasper"] .ring-emerald-200 { --tw-ring-color: var(--jz-ok-border) !important; }
      .dark [data-jz="jasper"] .dark\\:bg-emerald-950\\/20,
      .dark [data-jz="jasper"] .dark\\:bg-emerald-950\\/40,
      .dark [data-jz="jasper"] .dark\\:bg-emerald-950\\/50,
      .dark [data-jz="jasper"] .dark\\:hover\\:bg-emerald-950\\/20:hover,
      .dark [data-jz="jasper"] .dark\\:hover\\:bg-emerald-950\\/40:hover { background-color: var(--jz-ok-soft) !important; }
      .dark [data-jz="jasper"] .dark\\:text-emerald-300,
      .dark [data-jz="jasper"] .dark\\:text-emerald-400,
      .dark [data-jz="jasper"] .dark\\:hover\\:text-emerald-400:hover { color: var(--jz-ok) !important; }
      .dark [data-jz="jasper"] .dark\\:border-emerald-900\\/60,
      .dark [data-jz="jasper"] .dark\\:hover\\:border-emerald-700:hover { border-color: var(--jz-ok-border) !important; }
      .dark [data-jz="jasper"] .dark\\:bg-emerald-400,
      .dark [data-jz="jasper"] .dark\\:border-emerald-400 { color: var(--jz-ok) !important; border-color: var(--jz-ok) !important; }
      .dark [data-jz="jasper"] .dark\\:ring-emerald-900 { --tw-ring-color: var(--jz-ok-border) !important; }
      .dark [data-jz="jasper"] .dark\\:border-l-emerald-500 { border-left-color: var(--jz-ok) !important; }

      /* ═══ Amber (warn) ═══════════════════════════════════════════════════ */
      [data-jz="jasper"] .bg-amber-50,
      [data-jz="jasper"] .bg-amber-100,
      [data-jz="jasper"] .hover\\:bg-amber-50:hover { background-color: var(--jz-warn-soft) !important; }
      [data-jz="jasper"] .text-amber-500,
      [data-jz="jasper"] .text-amber-600,
      [data-jz="jasper"] .text-amber-700,
      [data-jz="jasper"] .text-amber-800,
      [data-jz="jasper"] .hover\\:text-amber-700:hover { color: var(--jz-warn) !important; }
      [data-jz="jasper"] .border-amber-200,
      [data-jz="jasper"] .border-amber-300 { border-color: var(--jz-warn-border) !important; }
      [data-jz="jasper"] .bg-amber-500,
      [data-jz="jasper"] .bg-amber-500\\/70,
      [data-jz="jasper"] .bg-amber-600,
      [data-jz="jasper"] .hover\\:bg-amber-600:hover,
      [data-jz="jasper"] .hover\\:bg-amber-700:hover { background-color: var(--jz-warn) !important; }
      .dark [data-jz="jasper"] .dark\\:bg-amber-950\\/40,
      .dark [data-jz="jasper"] .dark\\:bg-amber-950\\/50 { background-color: var(--jz-warn-soft) !important; }
      .dark [data-jz="jasper"] .dark\\:text-amber-300,
      .dark [data-jz="jasper"] .dark\\:text-amber-400 { color: var(--jz-warn) !important; }
      .dark [data-jz="jasper"] .dark\\:border-amber-700,
      .dark [data-jz="jasper"] .dark\\:border-amber-800,
      .dark [data-jz="jasper"] .dark\\:border-amber-800\\/60,
      .dark [data-jz="jasper"] .dark\\:border-amber-900\\/60 { border-color: var(--jz-warn-border) !important; }

      /* ═══ Red (err) ══════════════════════════════════════════════════════ */
      [data-jz="jasper"] .bg-red-50,
      [data-jz="jasper"] .bg-red-100,
      [data-jz="jasper"] .hover\\:bg-red-50:hover,
      [data-jz="jasper"] .hover\\:bg-red-100:hover { background-color: var(--jz-err-soft) !important; }
      [data-jz="jasper"] .text-red-500,
      [data-jz="jasper"] .text-red-600,
      [data-jz="jasper"] .text-red-700,
      [data-jz="jasper"] .hover\\:text-red-700:hover { color: var(--jz-err) !important; }
      [data-jz="jasper"] .border-red-200,
      [data-jz="jasper"] .border-red-300 { border-color: var(--jz-err-border) !important; }
      [data-jz="jasper"] .bg-red-500,
      [data-jz="jasper"] .bg-red-500\\/70,
      [data-jz="jasper"] .bg-red-600,
      [data-jz="jasper"] .hover\\:bg-red-600:hover,
      [data-jz="jasper"] .hover\\:bg-red-700:hover { background-color: var(--jz-err) !important; }
      .dark [data-jz="jasper"] .dark\\:bg-red-950\\/20,
      .dark [data-jz="jasper"] .dark\\:bg-red-950\\/30,
      .dark [data-jz="jasper"] .dark\\:bg-red-950\\/40,
      .dark [data-jz="jasper"] .dark\\:bg-red-950\\/50,
      .dark [data-jz="jasper"] .dark\\:hover\\:bg-red-900\\/30:hover { background-color: var(--jz-err-soft) !important; }
      .dark [data-jz="jasper"] .dark\\:text-red-100,
      .dark [data-jz="jasper"] .dark\\:text-red-300,
      .dark [data-jz="jasper"] .dark\\:text-red-400,
      .dark [data-jz="jasper"] .dark\\:hover\\:text-red-100:hover { color: var(--jz-err) !important; }
      .dark [data-jz="jasper"] .dark\\:border-red-800,
      .dark [data-jz="jasper"] .dark\\:border-red-900\\/60 { border-color: var(--jz-err-border) !important; }

      /* ═══ Violet → treat as accent ═══════════════════════════════════════ */
      [data-jz="jasper"] .text-violet-700 { color: var(--jz-accent) !important; }
      .dark [data-jz="jasper"] .dark\\:text-violet-400 { color: var(--jz-accent) !important; }
      [data-jz="jasper"] .border-violet-200 { border-color: var(--jz-accent-soft-border) !important; }
      .dark [data-jz="jasper"] .dark\\:border-violet-800 { border-color: var(--jz-accent-soft-border) !important; }
      [data-jz="jasper"] .hover\\:bg-violet-50:hover { background-color: var(--jz-accent-soft) !important; }
      .dark [data-jz="jasper"] .dark\\:hover\\:bg-violet-950\\/40:hover { background-color: var(--jz-accent-soft) !important; }
      [data-jz="jasper"] .hover\\:border-violet-300:hover { border-color: var(--jz-accent) !important; }
      .dark [data-jz="jasper"] .dark\\:hover\\:border-violet-700:hover { border-color: var(--jz-accent) !important; }

      /* ═══ Inputs / Selects / Textareas ═══════════════════════════════════ */
      [data-jz="jasper"] input:not([type="checkbox"]):not([type="radio"]):not([role="combobox"]),
      [data-jz="jasper"] textarea,
      [data-jz="jasper"] [data-slot="select-trigger"],
      [data-jz="jasper"] [data-slot="input"] {
        background: var(--jz-card) !important;
        border: 1px solid var(--jz-line) !important;
        color: var(--jz-ink) !important;
        border-radius: 8px !important;
        transition: border-color .15s ease, box-shadow .15s ease, background .15s ease !important;
      }
      [data-jz="jasper"] input[readonly] {
        background: color-mix(in oklab, var(--jz-page), transparent 40%) !important;
        color: var(--jz-muted) !important;
      }
      [data-jz="jasper"] input:focus-visible,
      [data-jz="jasper"] textarea:focus-visible,
      [data-jz="jasper"] [data-slot="select-trigger"]:focus-visible,
      [data-jz="jasper"] [data-slot="input"]:focus-visible {
        border-color: var(--jz-accent) !important;
        box-shadow: 0 0 0 3px color-mix(in oklab, var(--jz-accent), transparent 78%) !important;
        outline: none !important;
      }
      [data-jz="jasper"] input::placeholder,
      [data-jz="jasper"] textarea::placeholder { color: var(--jz-faint) !important; }

      /* ═══ Outline buttons ═══════════════════════════════════════════════ */
      [data-jz="jasper"] button[data-slot="button"]:not(.bg-primary):not([class*=" bg-primary"]) {
        background: var(--jz-card) !important;
        color: var(--jz-ink) !important;
        border-color: var(--jz-line) !important;
        transition: background .15s ease, border-color .15s ease, transform .12s ease !important;
      }
      [data-jz="jasper"] button[data-slot="button"]:not(.bg-primary):not([class*=" bg-primary"]):hover {
        background: var(--jz-hover) !important;
        border-color: var(--jz-accent-soft-border) !important;
      }

      /* ═══ Scrollbars ═══════════════════════════════════════════════════ */
      [data-jz="jasper"] ::-webkit-scrollbar { width: 10px; height: 10px; }
      [data-jz="jasper"] ::-webkit-scrollbar-thumb { background: color-mix(in oklab, var(--jz-line), transparent 30%); border-radius: 6px; }
      [data-jz="jasper"] ::-webkit-scrollbar-thumb:hover { background: color-mix(in oklab, var(--jz-muted), transparent 60%); }
      [data-jz="jasper"] ::-webkit-scrollbar-track { background: transparent; }

      /* ═══ Table treatment ═══════════════════════════════════════════════ */
      [data-jz="jasper"] table th {
        color: var(--jz-muted) !important;
        letter-spacing: 0.12em;
        font-family: var(--jz-mono);
        font-size: 10.5px;
        font-weight: 600;
        text-transform: uppercase;
      }
      [data-jz="jasper"] table thead tr { border-bottom-color: var(--jz-line) !important; }
      [data-jz="jasper"] table tbody tr { border-bottom-color: var(--jz-line-soft) !important; }
    `}</style>
  );
}
