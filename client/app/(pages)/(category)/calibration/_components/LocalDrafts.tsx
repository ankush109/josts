"use client";

import * as React from "react";
import {
  CloudOff, RefreshCw, Trash2, Loader2, AlertCircle, FlaskConical, Layers,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MONO_FF, type ThemeTokens } from "./theme";
import { GhostButton } from "./ui";
import { useRouter } from "next/navigation";

export interface LocalDraftItem {
  _id: string;
  formatNo: string;
  customerName?: string;
  instrumentCount: number;
  updatedAt: string;
  __syncError?: string | null;
}

export function LocalDraftsStrip({
  items, online, syncRunning, retryingId,
  onSyncNow, onRetry, onDiscard,
  t,
}: {
  items: LocalDraftItem[];
  online: boolean;
  syncRunning: boolean;
  retryingId: string | null;
  onSyncNow: () => void;
  onRetry: (e: React.MouseEvent, id: string) => void;
  onDiscard: (id: string) => void;
  t: ThemeTokens;
}) {
  const router = useRouter();
  if (items.length === 0) return null;

  return (
    <div style={{
      background: t.warnBg, border: `1px solid ${t.warnBorder}`,
      borderRadius: 12, overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, padding: "12px 16px",
        borderBottom: `1px solid ${t.warnBorder}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CloudOff size={16} color={t.warnFg} />
          <div>
            <p style={{
              margin: 0, fontFamily: MONO_FF, fontSize: 11, letterSpacing: "0.12em",
              fontWeight: 700, color: t.warnFg,
            }}>
              NOT SYNCED YET · {items.length}
            </p>
            <p style={{
              margin: "2px 0 0", fontSize: 11.5, color: t.warnFg, opacity: 0.8,
            }}>
              Saved on this device. Will upload when online.
            </p>
          </div>
        </div>
        <GhostButton
          t={t}
          onClick={onSyncNow}
          disabled={!online || syncRunning}
          title={!online ? "Connect to the internet to sync" : undefined}
          icon={
            syncRunning
              ? <Loader2 size={13} className="animate-spin" />
              : <RefreshCw size={13} />
          }
          style={{ borderColor: t.warnBorder, color: t.warnFg }}
        >
          {syncRunning ? "SYNCING…" : "SYNC NOW"}
        </GhostButton>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
          <thead>
            <tr>
              {["FORMAT NO", "CUSTOMER", "INSTRUMENTS", "LAST EDITED", "STATUS", ""].map((h, i, arr) => (
                <th key={i} style={{
                  textAlign: i === arr.length - 2 ? "right" : "left",
                  padding: "10px 14px",
                  paddingLeft: i === 0 ? 18 : 14,
                  paddingRight: i === arr.length - 1 ? 18 : 14,
                  fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.14em",
                  color: t.warnFg, fontWeight: 700,
                  borderBottom: `1px solid ${t.warnBorder}`,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr
                key={r._id}
                onClick={() => router.push(`/calibration/${r._id}`)}
                style={{ cursor: "pointer", transition: "background .12s ease" }}
                onMouseEnter={(e) => e.currentTarget.style.background = t.warnBg}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ padding: "12px 14px", paddingLeft: 18, verticalAlign: "middle" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: r.__syncError ? t.rejectBg : t.warnBg,
                      border: `1px solid ${r.__syncError ? t.rejectBorder : t.warnBorder}`,
                      flexShrink: 0,
                    }}>
                      <FlaskConical size={13} color={r.__syncError ? t.rejectFg : t.warnFg} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontFamily: MONO_FF, fontSize: 12, fontWeight: 700, color: t.ink }}>
                        {r.formatNo}
                      </p>
                      {r.__syncError ? (
                        <p style={{
                          margin: "2px 0 0", display: "flex", alignItems: "center", gap: 4,
                          fontSize: 10.5, color: t.rejectFg,
                        }}>
                          <AlertCircle size={10} style={{ flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }} title={r.__syncError}>
                            {r.__syncError}
                          </span>
                        </p>
                      ) : (
                        <p style={{ margin: "2px 0 0", fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.06em", color: t.warnFg, opacity: 0.75 }}>
                          SAVED ON THIS DEVICE
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                  {r.customerName
                    ? <span style={{ fontSize: 12.5, color: t.ink }}>{r.customerName}</span>
                    : <span style={{ fontFamily: MONO_FF, color: t.faint, fontSize: 11 }}>—</span>}
                </td>
                <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 8px", borderRadius: 6,
                    background: t.warnBg, color: t.warnFg,
                    border: `1px solid ${t.warnBorder}`,
                    fontFamily: MONO_FF, fontSize: 11, fontWeight: 700,
                  }}>
                    <Layers size={11} />
                    {r.instrumentCount}
                  </span>
                </td>
                <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 12.5, color: t.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      {new Date(r.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <p style={{ margin: "2px 0 0", fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.06em", color: t.faint }}>
                      {new Date(r.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </p>
                  </div>
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right", verticalAlign: "middle" }} onClick={(e) => e.stopPropagation()}>
                  {r.__syncError ? (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "3px 7px", borderRadius: 5,
                            background: t.rejectBg, color: t.rejectFg,
                            border: `1px solid ${t.rejectBorder}`,
                            fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.08em", fontWeight: 700,
                          }}>
                            <AlertCircle size={10} /> SYNC FAILED
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="left">{r.__syncError}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => onRetry(e, r._id)}
                            disabled={!online || retryingId === r._id}
                            style={{
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              width: 26, height: 26, borderRadius: 6,
                              border: `1px solid ${t.rejectBorder}`, background: "transparent",
                              color: t.rejectFg, cursor: (!online || retryingId === r._id) ? "not-allowed" : "pointer",
                              opacity: (!online || retryingId === r._id) ? 0.5 : 1,
                            }}
                          >
                            {retryingId === r._id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          {!online ? "Connect to internet to retry" : "Retry sync"}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ) : (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "2px 7px", borderRadius: 4,
                      background: t.warnBg, color: t.warnFg,
                      border: `1px solid ${t.warnBorder}`,
                      fontFamily: MONO_FF, fontSize: 9.5, letterSpacing: "0.14em", fontWeight: 700,
                    }}>
                      LOCAL
                    </span>
                  )}
                </td>
                <td style={{ padding: "12px 14px", paddingRight: 18, verticalAlign: "middle", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onDiscard(r._id)}
                        style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 26, height: 26, borderRadius: 6,
                          background: "transparent", border: "none",
                          color: t.warnFg, cursor: "pointer",
                          transition: "background .12s ease, color .12s ease",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = t.rejectBg; e.currentTarget.style.color = t.rejectFg; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = t.warnFg; }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Discard local draft</TooltipContent>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
