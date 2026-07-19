"use client";

import * as React from "react";
import {
  Trash2, Loader2, History, FileDown, PenLine,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AuditEntry } from "@/types/calibration";
import { MONO_FF, type ThemeTokens } from "./theme";
import type { ReportRow } from "./row";
import { AuditRow, GhostButton, PrimaryButton } from "./ui";

// ─── Dialog header eyebrow (mono uppercase like landing) ──────────────────────

function DialogEyebrow({ children, t }: { children: React.ReactNode; t: ThemeTokens }) {
  return (
    <div style={{
      fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.16em",
      color: t.accent, fontWeight: 700, marginBottom: 4,
    }}>
      {children}
    </div>
  );
}

// ─── Discard Local Draft ──────────────────────────────────────────────────────

export function DiscardLocalDialog({
  open, onOpenChange, onConfirm, t,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onConfirm: () => void; t: ThemeTokens;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent style={{ maxWidth: 420 }}>
        <AlertDialogHeader>
          <DialogEyebrow t={t}>§ DISCARD DRAFT</DialogEyebrow>
          <AlertDialogTitle style={{ fontSize: 18, fontWeight: 640, letterSpacing: "-0.01em", color: t.ink }}>
            Discard local draft?
          </AlertDialogTitle>
          <AlertDialogDescription style={{ fontSize: 13.5, color: t.muted, lineHeight: 1.55 }}>
            This draft has not been synced to the server. Discarding removes it from this device permanently.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter style={{ marginTop: 8 }}>
          <AlertDialogCancel style={{ fontFamily: MONO_FF, fontSize: 11, letterSpacing: "0.1em", fontWeight: 700 }}>
            CANCEL
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            style={{
              background: t.rejectFg, color: "#fff",
              fontFamily: MONO_FF, fontSize: 11, letterSpacing: "0.1em", fontWeight: 700,
            }}
          >
            DISCARD
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Delete Report ────────────────────────────────────────────────────────────

export function DeleteReportDialog({
  open, onOpenChange, report, isDeleting, onConfirm, t,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  report: ReportRow | null;
  isDeleting: boolean;
  onConfirm: () => void;
  t: ThemeTokens;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent style={{ maxWidth: 460 }}>
        <AlertDialogHeader>
          <DialogEyebrow t={t}>§ DELETE REPORT</DialogEyebrow>
          <AlertDialogTitle style={{ fontSize: 18, fontWeight: 640, letterSpacing: "-0.01em", color: t.ink }}>
            Delete this calibration report?
          </AlertDialogTitle>
          <AlertDialogDescription style={{ fontSize: 13.5, color: t.muted, lineHeight: 1.55 }}>
            This soft-deletes the report. It will no longer appear in the list.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {report && (
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
            <MetaRow k="Format No" v={report.formatNo} mono t={t} />
            <MetaRow k="Certificate" v={report.certNo || "—"} mono t={t} />
            {report.instruments?.length > 0 && (
              <div style={{
                display: "flex", justifyContent: "space-between",
                gap: 12, padding: "10px 0",
                borderTop: `1px solid ${t.softLine}`,
              }}>
                <span style={{
                  fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.14em",
                  color: t.faint, fontWeight: 700,
                }}>
                  {report.instruments.length > 1 ? "INSTRUMENTS" : "INSTRUMENT"}
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", maxWidth: "60%" }}>
                  {report.instruments.map((inst, i) => (
                    <span key={i} style={{
                      padding: "2px 8px", borderRadius: 100,
                      background: t.softLine, color: t.muted,
                      fontSize: 11, fontWeight: 560,
                    }}>
                      {[inst.make, inst.modelType].filter(Boolean).join(" ") || "Unknown"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter style={{ marginTop: 12 }}>
          <AlertDialogCancel disabled={isDeleting} style={{ fontFamily: MONO_FF, fontSize: 11, letterSpacing: "0.1em", fontWeight: 700 }}>
            CANCEL
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm} disabled={isDeleting}
            style={{
              background: t.rejectFg, color: "#fff",
              fontFamily: MONO_FF, fontSize: 11, letterSpacing: "0.1em", fontWeight: 700,
            }}
          >
            {isDeleting
              ? <><Loader2 size={13} className="animate-spin" style={{ marginRight: 6 }} /> DELETING…</>
              : "DELETE"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MetaRow({ k, v, mono, t }: { k: string; v: string; mono?: boolean; t: ThemeTokens }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 0", borderTop: `1px solid ${t.softLine}`,
    }}>
      <span style={{
        fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.14em",
        color: t.faint, fontWeight: 700,
      }}>
        {k.toUpperCase()}
      </span>
      <span style={{
        fontFamily: mono ? MONO_FF : undefined,
        fontSize: 13, fontWeight: 700, color: t.ink,
      }}>
        {v}
      </span>
    </div>
  );
}

// ─── Audit History ────────────────────────────────────────────────────────────

export function AuditHistoryDialog({
  open, onOpenChange, entries, loading, onExport, t,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  entries: AuditEntry[] | undefined; loading: boolean;
  onExport: () => void; t: ThemeTokens;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 480, maxHeight: "82vh", display: "flex", flexDirection: "column", padding: 0, gap: 0, overflow: "hidden" }}>
        <DialogHeader style={{ padding: "16px 20px", borderBottom: `1px solid ${t.line}`, flexShrink: 0 }}>
          <DialogEyebrow t={t}>§ HISTORY</DialogEyebrow>
          <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 640, color: t.ink }}>
            <History size={16} style={{ color: t.faint }} />
            Audit History
            {(entries?.length ?? 0) > 0 && (
              <span style={{
                fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.08em",
                fontWeight: 700, color: t.muted,
                background: t.softLine, padding: "2px 7px", borderRadius: 10,
                marginLeft: 4,
              }}>
                {entries!.length}
              </span>
            )}
            <div style={{ marginLeft: "auto" }}>
              <GhostButton t={t} onClick={onExport} disabled={!entries?.length} icon={<FileDown size={12} />}>
                EXPORT XLSX
              </GhostButton>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
          {loading ? (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              height: 140, color: t.faint, gap: 8, fontSize: 13,
            }}>
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : !entries?.length ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              height: 140, gap: 8, color: t.faint,
            }}>
              <History size={22} style={{ opacity: 0.5 }} />
              <span style={{ fontFamily: MONO_FF, fontSize: 11, letterSpacing: "0.12em" }}>NO HISTORY YET</span>
            </div>
          ) : (
            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" }}>
              {entries.map((entry, i) => (
                <AuditRow key={entry._id} entry={entry} isLast={i === entries.length - 1} t={t} />
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Onboarding (first login: set signature name) ─────────────────────────────

export function OnboardingDialog({
  sigName, setSigName, isSaving, onSave, t,
}: {
  sigName: string;
  setSigName: (v: string) => void;
  isSaving: boolean;
  onSave: () => void;
  t: ThemeTokens;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
    }}>
      <div style={{
        background: t.card, borderRadius: 16, boxShadow: "0 30px 70px rgba(0,0,0,0.45)",
        border: `1px solid ${t.line}`,
        width: "100%", maxWidth: 440, margin: 16, padding: 28,
        display: "flex", flexDirection: "column", gap: 20,
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 13,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: t.accentSoft, border: `1px solid ${t.accentSoftBorder}`,
          }}>
            <PenLine size={22} color={t.accent} />
          </div>
          <DialogEyebrow t={t}>§ ONE LAST STEP</DialogEyebrow>
          <h2 style={{
            margin: 0, fontSize: 22, fontWeight: 660, letterSpacing: "-0.02em", color: t.ink,
          }}>
            Set your signature
          </h2>
          <p style={{ margin: 0, fontSize: 13.5, color: t.muted, maxWidth: 300, lineHeight: 1.5 }}>
            Enter the name you&apos;d like to appear on calibration certificates and reports.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{
            fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.14em",
            color: t.muted, fontWeight: 700,
          }}>
            SIGNATURE / DISPLAY NAME
          </label>
          <Input
            autoFocus
            placeholder="e.g. Ankush Kumar"
            value={sigName}
            onChange={(e) => setSigName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSave()}
            style={{ height: 44, background: t.card, border: `1px solid ${t.line}`, color: t.ink }}
          />
          <p style={{
            margin: 0, fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.06em", color: t.faint,
          }}>
            SHOWN UNDER YOUR SIGNATURE ON ALL DOCUMENTS
          </p>
        </div>

        <PrimaryButton
          t={t}
          onClick={onSave}
          disabled={!sigName.trim() || isSaving}
          style={{ width: "100%", height: 44 }}
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : "GET STARTED →"}
        </PrimaryButton>
      </div>
    </div>
  );
}

// ─── Reopen Report ────────────────────────────────────────────────────────────

export function ReopenDialog({
  report, reason, setReason, isReopening, onConfirm, onClose, t,
}: {
  report: ReportRow | null;
  reason: string; setReason: (v: string) => void;
  isReopening: boolean;
  onConfirm: () => void; onClose: () => void;
  t: ThemeTokens;
}) {
  return (
    <Dialog open={!!report} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent style={{ maxWidth: 480 }}>
        <DialogHeader>
          <DialogEyebrow t={t}>§ REOPEN</DialogEyebrow>
          <DialogTitle style={{ fontSize: 18, fontWeight: 640, letterSpacing: "-0.01em", color: t.ink }}>
            Reopen report
          </DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
          <p style={{ margin: 0, fontSize: 13.5, color: t.muted, lineHeight: 1.55 }}>
            This will revert the status from <b style={{ color: t.ink }}>{report?.status}</b> to <b style={{ color: t.ink }}>submitted</b> and clear the verification signature. A reason is required — it will be saved to the audit log.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label style={{
              fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.14em",
              color: t.muted, fontWeight: 700,
            }}>
              REASON
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you reopening this report?"
              rows={3}
              disabled={isReopening}
              style={{ background: t.card, border: `1px solid ${t.line}`, color: t.ink }}
            />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <GhostButton t={t} onClick={onClose} disabled={isReopening}>CANCEL</GhostButton>
          <PrimaryButton t={t} onClick={onConfirm} disabled={isReopening || reason.trim().length < 3}>
            {isReopening ? <Loader2 size={13} className="animate-spin" /> : "REOPEN"}
          </PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reassign Signatories ─────────────────────────────────────────────────────

export function ReassignDialog({
  report, users, calib, verif, setCalib, setVerif, isReassigning, onConfirm, onClose, t,
}: {
  report: ReportRow | null;
  users: { id: string; name: string; signatureName?: string | null }[];
  calib: string; verif: string;
  setCalib: (v: string) => void; setVerif: (v: string) => void;
  isReassigning: boolean;
  onConfirm: () => void; onClose: () => void;
  t: ThemeTokens;
}) {
  return (
    <Dialog open={!!report} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent style={{ maxWidth: 480 }}>
        <DialogHeader>
          <DialogEyebrow t={t}>§ REASSIGN</DialogEyebrow>
          <DialogTitle style={{ fontSize: 18, fontWeight: 640, letterSpacing: "-0.01em", color: t.ink }}>
            Reassign signatories
          </DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
          <p style={{ margin: 0, fontSize: 13.5, color: t.muted, lineHeight: 1.55 }}>
            Change who calibrated and/or verified this report. Saving regenerates the PDF so the new names appear on the certificate.
          </p>
          <ReassignField
            label="CALIBRATED BY"
            value={calib}
            onChange={setCalib}
            users={users}
            t={t}
          />
          <ReassignField
            label="VERIFIED BY"
            value={verif}
            onChange={setVerif}
            users={users}
            t={t}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <GhostButton t={t} onClick={onClose} disabled={isReassigning}>CANCEL</GhostButton>
          <PrimaryButton t={t} onClick={onConfirm} disabled={isReassigning}>
            {isReassigning ? <Loader2 size={13} className="animate-spin" /> : "SAVE"}
          </PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReassignField({
  label, value, onChange, users, t,
}: {
  label: string; value: string; onChange: (v: string) => void;
  users: { id: string; name: string; signatureName?: string | null }[];
  t: ThemeTokens;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label style={{ fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.14em", color: t.muted, fontWeight: 700 }}>
        {label}
      </Label>
      <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
        <SelectTrigger style={{ height: 38, background: t.card, border: `1px solid ${t.line}`, color: t.ink }}>
          <SelectValue placeholder="Select a user" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— None —</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>{u.name}{u.signatureName ? ` (${u.signatureName})` : ""}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Bulk Confirm ─────────────────────────────────────────────────────────────

export function BulkConfirmDialog({
  action, count, busy, onConfirm, onClose, t,
}: {
  action: "verify" | "reject" | "delete" | null;
  count: number; busy: boolean;
  onConfirm: () => void; onClose: () => void;
  t: ThemeTokens;
}) {
  const titles = {
    verify: `Verify ${count} report${count > 1 ? "s" : ""}?`,
    reject: `Reject ${count} report${count > 1 ? "s" : ""}?`,
    delete: `Delete ${count} report${count > 1 ? "s" : ""}?`,
  } as const;
  const descs = {
    verify: "Drafts and already-verified reports will be skipped.",
    reject: "Drafts and already-rejected reports will be skipped.",
    delete: "This soft-deletes the selected reports. They will no longer appear in the list.",
  } as const;
  const eyebrow = { verify: "§ BULK VERIFY", reject: "§ BULK REJECT", delete: "§ BULK DELETE" } as const;
  const buttonBg = action === "verify" ? t.verifyFg : t.rejectFg;
  const buttonLabel = action === "verify" ? "VERIFY" : action === "reject" ? "REJECT" : "DELETE";

  return (
    <AlertDialog open={!!action} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent style={{ maxWidth: 420 }}>
        {action && (
          <>
            <AlertDialogHeader>
              <DialogEyebrow t={t}>{eyebrow[action]}</DialogEyebrow>
              <AlertDialogTitle style={{ fontSize: 17, fontWeight: 640, letterSpacing: "-0.01em", color: t.ink }}>
                {titles[action]}
              </AlertDialogTitle>
              <AlertDialogDescription style={{ fontSize: 13.5, color: t.muted, lineHeight: 1.55 }}>
                {descs[action]}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter style={{ marginTop: 8 }}>
              <AlertDialogCancel disabled={busy} style={{ fontFamily: MONO_FF, fontSize: 11, letterSpacing: "0.1em", fontWeight: 700 }}>
                CANCEL
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onConfirm} disabled={busy}
                style={{
                  background: buttonBg, color: "#fff",
                  fontFamily: MONO_FF, fontSize: 11, letterSpacing: "0.1em", fontWeight: 700,
                }}
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : buttonLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
