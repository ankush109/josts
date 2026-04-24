"use client";

import { useParams, useRouter } from "next/navigation";
import { format, parseISO, isPast, differenceInDays } from "date-fns";
import {
  ArrowLeft, Calendar, AlertCircle, CheckCircle2, Clock,
  FlaskConical, Building2, Award, Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useGetEuipmentsById } from "@/app/hooks/query/useGetEuipmentById";

const fmt = (d: string | null | undefined) => {
  if (!d) return "—";
  try { return format(parseISO(d), "dd MMM yyyy"); } catch { return "—"; }
};

const getDueStatus = (nextDue: string | null | undefined) => {
  if (!nextDue) return "none";
  const d = parseISO(nextDue);
  if (isPast(d)) return "overdue";
  if (differenceInDays(d, new Date()) <= 60) return "soon";
  return "valid";
};

const DueStatusBadge = ({ nextDue }: { nextDue: string | null | undefined }) => {
  const s = getDueStatus(nextDue);
  if (s === "overdue") return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><AlertCircle className="h-3 w-3" />Overdue</Badge>;
  if (s === "soon")    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1"><Clock className="h-3 w-3" />Due Soon</Badge>;
  if (s === "valid")   return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1"><CheckCircle2 className="h-3 w-3" />Valid</Badge>;
  return <Badge variant="outline" className="text-slate-400">No Due Date</Badge>;
};

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between py-2.5 border-b border-slate-100 last:border-0">
    <span className="text-[12px] text-slate-400 font-medium uppercase tracking-wide w-36 shrink-0">{label}</span>
    <span className="text-[13px] text-slate-800 text-right">{value ?? "—"}</span>
  </div>
);

const colLabel = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/pct$/i, " (%)")
    .replace(/abs$/i, " (abs)")
    .replace(/\bDuc\b/i, "DUC")
    .replace(/\bStd\b/i, "Std.")
    .trim();

const SKIP_KEYS = new Set(["_id", "parameterName"]);
const palette = ["bg-blue-50 text-blue-700", "bg-violet-50 text-violet-700", "bg-teal-50 text-teal-700", "bg-orange-50 text-orange-700", "bg-pink-50 text-pink-700"];

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.equipmentId as string;

  const { data: res, isLoading, isError } = useGetEuipmentsById(id);
  const eq = res?.data;

  if (isLoading) return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-[#1e3a5f] border-t-transparent animate-spin" />
        <p className="text-[13px] text-slate-400">Loading equipment details…</p>
      </div>
    </div>
  );

  if (isError || !eq) return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 text-[14px] mb-3">Failed to load equipment.</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>Go Back</Button>
      </div>
    </div>
  );

  const dueStatus = getDueStatus(eq.nextDue);

  // color map per parameter group
  const groupColors: Record<string, string> = {};
  const paramGroups = eq.parameters.reduce((acc: Record<string, unknown[]>, p: Record<string, unknown>) => {
    const name = p.parameterName as string;
    (acc[name] = acc[name] || []).push(p);
    return acc;
  }, {});
  Object.keys(paramGroups).forEach((k, i) => { groupColors[k] = palette[i % palette.length]; });

  // union of all keys across every parameter row — handles mixed schemas
const allKeys: string[] = eq.parameters.length > 0
  ? Object.keys(eq.parameters[0]).filter((k) => !SKIP_KEYS.has(k))
  : [];

  return (
    <div className="min-h-screen bg-[#f0f4f8]">

      {/* top bar */}
      <div className="bg-[#1e3a5f] text-white px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-[16px] font-semibold">{eq.equipmentName}</h1>
          <p className="text-[12px] text-white/50 mt-0.5">Equipment Detail · {eq.idNo}</p>
        </div>
        <DueStatusBadge nextDue={eq.nextDue} />
      </div>

      <div className="max-w-6xl mx-auto px-5 py-6 space-y-5">

        {/* identity + calibration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                <FlaskConical className="h-3.5 w-3.5 text-[#1e3a5f]" />
              </div>
              <span className="text-[13px] font-semibold text-slate-700">Equipment Identity</span>
            </div>
            <InfoRow label="Equipment" value={<span className="font-semibold">{eq.equipmentName}</span>} />
            <InfoRow label="Make" value={eq.make} />
            <InfoRow label="Model" value={eq.model} />
            <InfoRow label="Serial No." value={<span className="font-mono text-[12px]">{eq.serialNo}</span>} />
            <InfoRow label="ID No." value={
              <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded text-[11px] font-bold font-mono">{eq.idNo}</span>
            } />
            {eq.nominalRatio && <InfoRow label="Nominal Ratio" value={eq.nominalRatio} />}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                <Award className="h-3.5 w-3.5 text-[#1e3a5f]" />
              </div>
              <span className="text-[13px] font-semibold text-slate-700">Calibration Details</span>
            </div>
            <InfoRow label="Certificate No." value={<span className="text-blue-600 font-medium text-[12px]">{eq.certificateNo}</span>} />
            <InfoRow label="NABL Cert." value={<Badge variant="outline" className="font-mono text-[11px]">{eq.nablCert}</Badge>} />
            <InfoRow label="Cal. Lab" value={
              <span className="flex items-center gap-1"><Building2 className="h-3 w-3 text-slate-400 shrink-0" /><span className="text-[12px]">{eq.calLab}</span></span>
            } />
            <InfoRow label="Cal. Date" value={
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-slate-400" />{fmt(eq.calDate)}</span>
            } />
            <InfoRow label="Next Due" value={
              <span className={`flex items-center gap-1 font-semibold text-[12px] ${dueStatus === "overdue" ? "text-red-600" : dueStatus === "soon" ? "text-amber-600" : "text-slate-700"}`}>
                {dueStatus === "overdue" && <AlertCircle className="h-3 w-3" />}{fmt(eq.nextDue)}
              </span>
            } />
            <InfoRow label="Status" value={<DueStatusBadge nextDue={eq.nextDue} />} />
          </div>
        </div>

        {/* parameters table — dynamic columns */}
        {eq.parameters.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                <Activity className="h-3.5 w-3.5 text-[#1e3a5f]" />
              </div>
              <div>
                <span className="text-[13px] font-semibold text-slate-700">Calibration Results</span>
                <span className="text-[11px] text-slate-400 ml-2">
                  {eq.parameters.length} readings · {Object.keys(paramGroups).length} parameter type{Object.keys(paramGroups).length > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-8">#</TableHead>
                    <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Parameter</TableHead>
                    {allKeys.map((key) => (
                      <TableHead key={key} className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">
                        {colLabel(key)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eq.parameters.map((p: Record<string, unknown>, i: number) => (
                    <TableRow key={i} className="hover:bg-slate-50/60 border-slate-100">
                      <TableCell className="text-slate-300 text-[11px]">{i + 1}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${groupColors[p.parameterName as string]}`}>
                          {p.parameterName as string}
                        </span>
                      </TableCell>
                      {allKeys.map((key) => {
                        const val = p[key];
                        const isNum = typeof val === "number";
                        const isNeg = isNum && (val as number) < 0;
                        const isUncertainty = key.toLowerCase().includes("uncertainty");
                        return (
                          <TableCell key={key} className={`text-right font-mono text-[12px] whitespace-nowrap ${
                            isNeg ? "text-red-500 font-semibold" : isNum ? "text-slate-600" : "text-slate-500"
                          }`}>
                            {val === undefined || val === null
                              ? <span className="text-slate-300">—</span>
                              : isUncertainty ? `±${val}`
                              : String(val)
                            }
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>Created: {fmt(eq.createdAt)}</span>
          <span>Last updated: {fmt(eq.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}