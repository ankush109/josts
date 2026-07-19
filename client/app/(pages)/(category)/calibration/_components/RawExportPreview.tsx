"use client";

/**
 * Preview dialog for raw form-data export.
 * Renders an HTML preview of what the PDF / Excel export will contain,
 * with Download buttons for each format.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { X, Download, FileSpreadsheet, FileType2, Loader2, Printer } from "lucide-react";
import { exportRawExcel, exportRawPdf, getRawPreviewHtml, getExcelPreviewHtml } from "./rawExport";

type Mode = "pdf" | "excel";

export function RawExportPreview({
  report,
  onClose,
  initialMode = "pdf",
}: {
  report: any;
  onClose: () => void;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [downloading, setDownloading] = useState<Mode | null>(null);

  const pdfHtml   = useMemo(() => getRawPreviewHtml(report),   [report]);
  const excelHtml = useMemo(() => getExcelPreviewHtml(report), [report]);
  const html = mode === "pdf" ? pdfHtml : excelHtml;

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleDownload(fmt: Mode) {
    setDownloading(fmt);
    try {
      if (fmt === "excel") await exportRawExcel(report);
      else await exportRawPdf(String(report?._id ?? ""));
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (err as Error)?.message ?? "PDF export failed";
      const { toast } = await import("sonner");
      toast.error(msg);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-2 sm:p-4 md:p-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full h-[92vh] sm:h-[85vh] max-w-4xl rounded-md shadow-xl flex flex-col overflow-hidden border"
        style={{ background: "#ffffff", borderColor: "#d4d4d8" }}
      >
        {/* Toolbar — forced light so buttons/text always read cleanly */}
        <div
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 shrink-0 border-b flex-nowrap overflow-x-auto"
          style={{ background: "#f4f4f5", borderColor: "#e4e4e7", color: "#18181b" }}
        >
          <div
            className="hidden md:block text-xs font-semibold shrink-0"
            style={{ color: "#18181b" }}
          >
            Raw Form Data
          </div>

          {/* Mode switch */}
          <div className="inline-flex rounded overflow-hidden shrink-0" style={{ border: "1px solid #a1a1aa" }}>
            <button
              onClick={() => setMode("pdf")}
              className="px-2 sm:px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1 transition-colors"
              style={{
                background: mode === "pdf" ? "#18181b" : "#ffffff",
                color:      mode === "pdf" ? "#ffffff" : "#18181b",
              }}
              aria-label="PDF preview"
            >
              <FileType2 className="h-3 w-3" />
              PDF
            </button>
            <button
              onClick={() => setMode("excel")}
              className="px-2 sm:px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1 transition-colors"
              style={{
                background:  mode === "excel" ? "#18181b" : "#ffffff",
                color:       mode === "excel" ? "#ffffff" : "#18181b",
                borderLeft:  "1px solid #a1a1aa",
              }}
              aria-label="Excel preview"
            >
              <FileSpreadsheet className="h-3 w-3" />
              Excel
            </button>
          </div>

          <div className="flex-1 min-w-0" />

          <button
            onClick={() => handleDownload("pdf")}
            disabled={downloading !== null}
            className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded disabled:opacity-50 text-[11px] font-semibold shrink-0"
            style={{ background: "#18181b", color: "#ffffff" }}
            title="Download PDF"
            aria-label="Download PDF"
          >
            {downloading === "pdf" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
            <span className="hidden sm:inline">Save PDF</span>
          </button>
          <button
            onClick={() => handleDownload("excel")}
            disabled={downloading !== null}
            className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded disabled:opacity-50 text-[11px] font-semibold shrink-0"
            style={{ background: "#18181b", color: "#ffffff" }}
            title="Download Excel"
            aria-label="Download Excel"
          >
            {downloading === "excel" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            <span className="hidden sm:inline">.xlsx</span>
          </button>

          <button
            onClick={onClose}
            className="ml-0.5 p-1 rounded hover:bg-zinc-200 shrink-0"
            style={{ color: "#52525b" }}
            title="Close preview"
            aria-label="Close preview"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Preview iframe */}
        <div className="flex-1 bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
          <iframe
            title="Raw data preview"
            srcDoc={html}
            className="w-full h-full bg-white"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
