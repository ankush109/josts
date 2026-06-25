"use client";

import { useState, useEffect, useCallback, useRef, useMemo, useId, FC, KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import type { Step, EventData, TooltipRenderProps } from "react-joyride";
const Joyride = dynamic(() => import("react-joyride").then((m) => ({ default: m.Joyride })), { ssr: false });
import {
  useGenerateCalibrationReport,
  useUpdateCalibrationReport,
  useComputeCalibration,
  useGetCalibrationReportById,
  useGetAuditLog,
  useGetCalibrationReports,
} from "@/app/hooks";
import { authClient as AUTH_API } from "@/lib/api-client";
import { EP_REPORT_URL } from "@/lib/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/provider/AuthProvider";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import {
  isLocalId,
  createLocalDraft,
  updateLocalDraft,
  getDraft,
} from "@/app/lib/offline-drafts";
import { useOnlineStatus } from "@/app/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";
import { Plus, X, Loader2, ArrowLeft, FlaskConical, AlertCircle, ChevronDown, ChevronRight, CheckCircle2, Calculator, Info, History, ArrowRight, MapPin, Menu, Save, Send, Eye, EyeOff, PenLine, GitBranch, List, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

// ─── Types (canonical source: @/types/calibration) ───────────────────────────
import type {
  ReportMeta,
  InstrumentMeta,
  ComputedBudget,
  Measurement,
  Parameter,
  Instrument,
  PanelState,
  FormError,
  AutoSaveStatus,
  AuditEntry,
} from "@/types/calibration";

// ─── Constants & utilities (canonical sources) ───────────────────────────────
import {
  BLANK_REPORT_META,
  BLANK_INSTRUMENT_META as BLANK_META,
  PARAM_STATUS_DOT,
  type InstrumentPreset,
} from "./constants";
import { useInstrumentPresets } from "@/app/hooks/query/useInstrumentPresets";
import { useGetParameters, type Parameter as ParameterConfig } from "@/app/hooks/query/useGetParameters";
import {
  uid,
  makeMeasurement,
  makeParam,
  makeInstrument,
  isNumericInput,
  getParamStatus,
  getInstCompletion,
  calcMean,
  buildPayload,
  mapApiToInstruments,
  mapApiToReportMeta,
  parseNomInput,
} from "./utils";
import { useGetEquipmentParamSummary } from "@/app/hooks/query/useGetEquipmentParamSummary";
import { usePresenceHeartbeat } from "@/app/hooks/query/usePresence";
import Wordmark from "@/components/Wordmark";
import { ReportViewerStack } from "@/components/PresenceViewers";


// ─── Report-level field helper ─────────────────────────────────────────────────

const RF: FC<{
  label: string; value: string; span2?: boolean; readOnly?: boolean;
  type?: string; placeholder?: string; id?: string; onChange?: (v: string) => void;
}> = ({ label, value, span2, readOnly, type = "text", placeholder, id, onChange }) => (
  <div className={cn("flex flex-col gap-1", span2 && "col-span-2")}>
    <Label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{label}</Label>
    <Input id={id} type={type} value={value} readOnly={readOnly} placeholder={placeholder}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      className={cn("h-9 text-sm", readOnly && "bg-zinc-50 text-zinc-500 cursor-default")} />
  </div>
);

// ─── Field ────────────────────────────────────────────────────────────────────

const Field: FC<{
  label: string;
  k: keyof InstrumentMeta;
  type?: string;
  span2?: boolean;
  span3?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  readOnly?: boolean;
  meta: InstrumentMeta;
  showErrors?: boolean;
  touched?: Set<string>;
  onTouch?: (key: string) => void;
  onChange: (key: keyof InstrumentMeta, val: string) => void;
  helper?: React.ReactNode;
}> = ({ label, k, type = "text", span2, span3, required, autoFocus, readOnly, meta, showErrors, touched, onTouch, onChange, helper }) => {
  const isTouched = touched?.has(k) ?? false;
  const hasError = !readOnly && required && (showErrors || isTouched) && !String(meta[k]).trim();
  return (
    <div className={cn("flex flex-col gap-1.5", span2 && "col-span-2", span3 && "col-span-3")}>
      <Label htmlFor={`field-${k}`} className={cn("text-[10px] font-semibold uppercase tracking-widest", hasError ? "text-destructive" : "text-muted-foreground")}>
        {label}{required && !readOnly && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <Input
        id={`field-${k}`}
        type={type}
        value={meta[k]}
        autoFocus={!readOnly && autoFocus}
        readOnly={readOnly}
        aria-invalid={hasError}
        onChange={(e) => !readOnly && onChange(k, e.target.value)}
        onBlur={() => !readOnly && required && onTouch?.(k)}
        className={cn(readOnly && "bg-zinc-50/70 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 cursor-default select-text")}
      />
      {hasError && <span className="text-[10px] text-destructive">This field is required</span>}
      {helper}
    </div>
  );
};

const SelectField: FC<{
  label: string;
  k: keyof InstrumentMeta;
  options: string[];
  span2?: boolean;
  locked?: boolean;
  readOnly?: boolean;
  allowCustom?: boolean;
  /** undefined = no status message; true = "Preset params loaded"; false = "No params found" */
  presetMatched?: boolean;
  meta: InstrumentMeta;
  onChange: (key: keyof InstrumentMeta, val: string) => void;
}> = ({ label, k, options, span2, locked, readOnly, allowCustom, presetMatched, meta, onChange }) => {
  const listId = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", span2 && "col-span-2")}>
      <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {locked || readOnly ? (
        <div className={cn(
          "h-9 px-3 flex items-center rounded-md border text-sm gap-1.5",
          readOnly
            ? "border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
            : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
        )}>
          <span className="flex-1 truncate">{String(meta[k]) || `—`}</span>
          {locked && !readOnly && <span className="text-[10px] text-zinc-400 font-medium shrink-0">locked</span>}
        </div>
      ) : allowCustom ? (
        <>
          <datalist id={listId}>
            {options.map((opt) => <option key={opt} value={opt} />)}
          </datalist>
          <Input
            list={listId}
            value={String(meta[k])}
            onChange={(e) => onChange(k, e.target.value)}
            placeholder={`Select or type ${label}`}
            className="h-9 text-sm"
          />
        </>
      ) : (
        <Select value={meta[k]} onValueChange={(val) => onChange(k, val)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={`Select ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {presetMatched === true && (
        <span className="text-[10px] font-medium text-emerald-600">✓ Preset params loaded</span>
      )}
      {presetMatched === false && (
        <span className="text-[10px] font-medium text-amber-600">No params found — enter any parameter manually</span>
      )}
    </div>
  );
};

// ─── EquipmentCombobox ────────────────────────────────────────────────────────

type EqOption = { equipmentName: string; _id: string; make?: string; model?: string; serialNo?: string; nextDue?: string; parameters: { parameterName: string }[] };

const EquipmentCombobox: FC<{
  value: string;
  equipments: EqOption[];
  instParamNames: string[];
  readOnly?: boolean;
  onChange: (name: string, eq: EqOption) => void;
}> = ({ value, equipments, instParamNames, readOnly, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "");

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return equipments
      .filter((eq) => !q || eq.equipmentName.toLowerCase().includes(q))
      .map((eq) => {
        const masterNames = (eq.parameters ?? []).map((p) => normalize(p.parameterName));
        // A preset param is "covered" if any master param contains it or vice-versa
        // e.g. "resistance" is covered by "resistance(4-wire)"
        const isCovered = (n: string) => {
          const norm = normalize(n);
          return masterNames.some((m) => m.includes(norm) || norm.includes(m));
        };
        const missing = instParamNames.filter((n) => !isCovered(n));
        return { eq, missing, compatible: missing.length === 0 };
      })
      // compatible first, then partial
      .sort((a, b) => (a.compatible === b.compatible ? 0 : a.compatible ? -1 : 1));
  }, [equipments, instParamNames, query]);

  const handleSelect = (eq: EqOption) => {
    onChange(eq.equipmentName, eq);
    setQuery("");
    setOpen(false);
  };

  if (readOnly) {
    return (
      <div className="h-9 px-3 flex items-center rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/50 text-sm text-zinc-600 dark:text-zinc-400">
        <span className="truncate">{value || "—"}</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Trigger */}
      <div
        className="h-9 px-3 flex items-center justify-between text-sm cursor-pointer select-none"
        onClick={() => { setOpen((v) => !v); setQuery(""); }}
      >
        <span className={value ? "text-zinc-800 dark:text-zinc-100 truncate" : "text-zinc-400"}>
          {value || "Select equipment…"}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          {/* Search */}
          <div className="p-1.5">
            <input
              autoFocus
              className="w-full h-7 px-2 text-[12px] rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none placeholder:text-zinc-400"
              placeholder="Search equipment…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800">
            {rows.length === 0 && (
              <div className="px-3 py-3 text-[12px] text-zinc-400">No equipment found</div>
            )}
            {rows.map(({ eq, missing, compatible }) => (
              <div
                key={eq._id}
                title={`Stored params: ${(eq.parameters ?? []).map(p => p.parameterName).join(" | ") || "(none)"}`}
                className={`px-3 py-2.5 cursor-pointer flex items-start gap-2.5 transition-colors ${
                  compatible
                    ? "hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(eq); }}
              >
                {/* tick / cross icon */}
                <span className={`mt-0.5 shrink-0 text-[13px] ${compatible ? "text-emerald-500" : "text-zinc-300"}`}>
                  {compatible ? "✓" : "✗"}
                </span>
                <div className="min-w-0">
                  <div className={`text-[12px] font-medium leading-tight ${compatible ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-400 dark:text-zinc-500"}`}>
                    {eq.equipmentName}
                  </div>
                  {!compatible && (
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      Missing: <span className="text-amber-500">{missing.join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── MetaGrid ─────────────────────────────────────────────────────────────────

const CollapsibleSection: FC<{
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ label, open, onToggle, children }) => (
  <>
    <div className="col-span-2 lg:col-span-4 pt-1 border-t border-border">
      <Button type="button" variant="ghost" size="xs" onClick={onToggle} className="text-muted-foreground gap-1 px-1">
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        <span className="text-[10px] font-semibold uppercase tracking-widest">{label}</span>
      </Button>
    </div>
    {open && children}
  </>
);

const MetaGrid: FC<{
  meta: InstrumentMeta;
  instParamNames: string[];
  modelLocked?: boolean;
  showErrors?: boolean;
  readOnly?: boolean;
  hasPreset?: boolean;
  touched?: Set<string>;
  onTouch?: (key: string) => void;
  onChange: (key: keyof InstrumentMeta, val: string) => void;
}> = ({ meta, instParamNames, modelLocked, showErrors, readOnly, hasPreset, touched, onTouch, onChange }) => {
  const [envOpen, setEnvOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const sharedProps = { meta, showErrors, touched, onTouch, onChange, readOnly };
  const { data: paramSummary } = useGetEquipmentParamSummary();
  const equipments: EqOption[] = paramSummary ?? [];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
      <Field label="Job ID"              k="jobId"         {...sharedProps} />
      <Field label="ID No"               k="idNo"          {...sharedProps} />
      <Field label="Nomenclature of DUC" k="nomenclature"  {...sharedProps} span2 required />
      <SelectField label="Make"         k="make"      options={["Fluke","SVERKER","Megger","Rishabh","Metravi","Maxtech","FI","Sonel","Motwane"]} locked={modelLocked} readOnly={readOnly} allowCustom presetMatched={hasPreset} meta={meta} onChange={onChange} />
      <SelectField label="Model / Type" k="modelType" options={["8846A","780","287","289","87V","189","101","107","179","15B","17B+","AVO 410","AVO 840","AVO 850","AVO 415","M8035","M5097","Multi 14S","15S","16S","18S","615","6016","19 super","Metra Safe 10","Metra Safe 20","19 TRMS","603","DT 603","MAS830L","919X","CMM-40","M42","DCM45A"]} locked={modelLocked} readOnly={readOnly} allowCustom meta={meta} onChange={onChange} />
      <Field label="Sl. No"              k="slNo"          {...sharedProps} />
      <Field label="Other Details"       k="othersDetails" {...sharedProps} span2 />
      <Field label="Report Range"        k="ducRange"      {...sharedProps} span2 />
      <Field label="Calibration Procedure" k="calibrationProcedure" {...sharedProps} span2 />
      <div className="flex flex-col gap-1 col-span-2">
        <Label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Calibration Method</Label>
        <Select
          value={meta.calibrationMethod || "Direct Method"}
          disabled={readOnly}
          onValueChange={(v) => onChange("calibrationMethod", v as "Direct Method" | "Comparison Method")}
        >
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Direct Method">Direct Method</SelectItem>
            <SelectItem value="Comparison Method">Comparison Method</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <CollapsibleSection label="Environmental Conditions" open={envOpen} onToggle={() => setEnvOpen((v) => !v)}>
        <Field label="Supply Voltage (V)" k="supplyVoltage" {...sharedProps} />
        <Field label="Temperature (°C)"   k="temperature"   {...sharedProps} />
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Voltage Area</Label>
          <Select
            value={meta.voltageArea || "low"}
            disabled={readOnly}
            onValueChange={(v) => onChange("voltageArea", v as "high" | "low")}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low Voltage Area</SelectItem>
              <SelectItem value="high">High Voltage Area</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Field label="Humidity (%RH)" k="humidity" {...sharedProps} />
          <p className="text-[10px] text-zinc-400">
            {meta.voltageArea === "high"
              ? "Required: > 60 %RH (High Voltage Area)"
              : "Required: ≤ 60 %RH (Low Voltage Area)"}
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection label="Reference Standard Used" open={refOpen} onToggle={() => setRefOpen((v) => !v)}>
        <Field label="Reference Standard" k="refStandard"    {...sharedProps} span2 />
        <Field label="Make"               k="refMake"        {...sharedProps} />
        <Field label="Model / Type"       k="refModel"       {...sharedProps} />
        <Field label="Sr. No"             k="refSrNo"        {...sharedProps} />
        <Field label="Cal Due Date"       k="refCalDue"      {...sharedProps} type="date" />
        <div className="flex flex-col gap-1.5 col-span-2">
          <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Traceability (Master Equipment)
          </Label>
          <EquipmentCombobox
            value={meta.refTraceability}
            equipments={equipments}
            instParamNames={instParamNames}
            readOnly={readOnly}
            onChange={(_name, selected) => {
              onChange("refTraceability", selected.equipmentName);
              onChange("refEquipmentId", selected._id);
              onChange("refMake",        selected.make        || "");
              onChange("refModel",       selected.model       || "");
              onChange("refSrNo",        selected.serialNo    || "");
              onChange("refCalDue",      selected.nextDue     || "");
            }}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
};

// ─── MeasureTable ─────────────────────────────────────────────────────────────

const MeasureTable: FC<{
  param: Parameter;
  readOnly?: boolean;
  onUpdateParam: (updated: Parameter) => void;
}> = ({ param, readOnly, onUpdateParam }) => {
  const updateRangeLabel = (rid: string, label: string) =>
    onUpdateParam({ ...param, ranges: param.ranges.map((r) => r.id === rid ? { ...r, label } : r) });

  const updateMeasurement = (rid: string, mid: string, patch: Partial<Measurement>) =>
    onUpdateParam({
      ...param,
      ranges: param.ranges.map((r) =>
        r.id !== rid ? r : {
          ...r,
          measurements: r.measurements.map((m) => m.id === mid ? { ...m, ...patch } : m),
        }
      ),
    });

  const updateReading = (rid: string, mid: string, idx: number, val: string) =>
    onUpdateParam({
      ...param,
      ranges: param.ranges.map((r) =>
        r.id !== rid ? r : {
          ...r,
          measurements: r.measurements.map((m) =>
            m.id !== mid ? m : { ...m, readings: m.readings.map((v, i) => (i === idx ? val : v)) }
          ),
        }
      ),
    });

  const addRange = () =>
    onUpdateParam({
      ...param,
      ranges: [...param.ranges, { id: uid(), label: "", measurements: [makeMeasurement(), makeMeasurement()] }],
    });

  const removeRange = (rid: string) =>
    onUpdateParam({ ...param, ranges: param.ranges.filter((r) => r.id !== rid) });

  const addMeasurement = (rid: string) =>
    onUpdateParam({
      ...param,
      ranges: param.ranges.map((r) =>
        r.id !== rid ? r : { ...r, measurements: [...r.measurements, makeMeasurement()] }
      ),
    });

  const removeMeasurement = (rid: string, mid: string) =>
    onUpdateParam({
      ...param,
      ranges: param.ranges.map((r) =>
        r.id !== rid ? r : { ...r, measurements: r.measurements.filter((m) => m.id !== mid) }
      ),
    });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 12 }}>
        <colgroup>
          <col style={{ width: 140 }} />
          <col style={{ width: 32 }} />
          {param.ranges.flatMap((r) => r.measurements.map((m) => <col key={m.id} style={{ minWidth: 110 }} />))}
          <col style={{ width: 88 }} />
        </colgroup>
        <thead>
          {/* Row 1: range labels */}
          <tr>
            <th rowSpan={2} className="px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Reading
            </th>
            <th rowSpan={2} className="px-2 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-center text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              #
            </th>
            {param.ranges.map((r, i) => (
              <th key={r.id} colSpan={r.measurements.length} className="bg-muted/50 border border-border p-0">
                <div className="flex items-center gap-1 px-2 py-1.5">
                  {param.isPredefined ? (
                    <span className="flex-1 font-mono text-[11px] font-semibold text-center">{r.label}</span>
                  ) : (
                    <input
                      value={r.label}
                      onChange={(e) => updateRangeLabel(r.id, e.target.value)}
                      placeholder={`Range ${i + 1}`}
                      className="flex-1 min-w-0 font-mono text-[11px] font-semibold bg-transparent border-none text-center outline-none placeholder:text-muted-foreground/40"
                    />
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-xs" onClick={() => addMeasurement(r.id)}>
                        <Plus />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add measurement column</TooltipContent>
                  </Tooltip>
                  {!param.isPredefined && param.ranges.length > 1 && (
                    <Button variant="ghost" size="icon-xs" onClick={() => removeRange(r.id)} className="text-muted-foreground hover:text-destructive">
                      <X />
                    </Button>
                  )}
                </div>
              </th>
            ))}
            {!param.isPredefined && (
              <th rowSpan={2} className="border-none bg-transparent px-2">
                <Button variant="outline" size="xs" onClick={addRange} className="whitespace-nowrap border-dashed">
                  + range
                </Button>
              </th>
            )}
            {param.isPredefined && <th rowSpan={2} className="border-none bg-transparent px-2" />}
          </tr>
          {/* Row 2: nom values */}
          <tr>
            {param.ranges.flatMap((r) =>
              r.measurements.map((m) => (
                <th key={m.id} className="bg-muted/50 border border-border p-0">
                  <div className="flex items-center gap-0.5 px-1 py-1">
                    <input
                      value={m.nomValue}
                      readOnly={readOnly}
                      onChange={(e) => { if (!readOnly) updateMeasurement(r.id, m.id, { nomValue: e.target.value }); }}
                      placeholder="e.g. 1mV"
                      className={cn("flex-1 min-w-0 h-6 font-mono text-[11px] text-center bg-background border border-border rounded px-1 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 placeholder:text-muted-foreground/40", readOnly && "cursor-default")}
                    />
                    {r.measurements.length > 1 && !readOnly && (
                      <Button variant="ghost" size="icon-xs" onClick={() => removeMeasurement(r.id, m.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                        <X />
                      </Button>
                    )}
                  </div>
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }, (_, ri) => (
            <tr key={ri} className={ri % 2 === 1 ? "bg-zinc-50/60 dark:bg-zinc-800/30" : ""}>
              <td className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 text-[11px] text-zinc-400 dark:text-zinc-500">
                {ri === 0 && (
                  <span className="text-[10px] uppercase tracking-wide">Measured value</span>
                )}
              </td>
              <td className="px-2 py-1.5 border border-zinc-200 dark:border-zinc-700 text-center font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                {ri + 1}
              </td>
              {param.ranges.flatMap((r) =>
                r.measurements.map((m) => {
                  const val = m.readings[ri];
                  return (
                  <td key={m.id} className="border border-border p-0">
                    <input
                      id={`reading-${m.id}-${ri}`}
                      data-reading-input="true"
                      value={val}
                      readOnly={readOnly}
                      onChange={(e) => { if (!readOnly && isNumericInput(e.target.value)) updateReading(r.id, m.id, ri, e.target.value); }}
                      onKeyDown={(e) => {
                        if (readOnly) return;
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const all = Array.from(document.querySelectorAll<HTMLInputElement>("[data-reading-input]"));
                          const idx = all.indexOf(e.currentTarget);
                          if (idx >= 0 && idx < all.length - 1) all[idx + 1].focus();
                        }
                      }}
                      placeholder="—"
                      className={cn("w-full font-mono text-[12px] text-center bg-transparent border-none outline-none py-2 px-2 placeholder:text-muted-foreground/20", readOnly && "cursor-default")}
                    />
                  </td>
                  );
                })
              )}
              <td className="border-none" />
            </tr>
          ))}

          {/* Column status row */}
          <tr className="border-t-2 border-border">
            <td colSpan={2} className="px-3 py-1.5 border border-border text-[10px] uppercase tracking-wide text-muted-foreground">
              Status
            </td>
            {param.ranges.flatMap((r) =>
              r.measurements.map((m) => {
                const filled = m.readings.filter((v) => v !== "").length;
                const allFilled = filled === 5;
                return (
                  <td key={m.id} className="border border-border text-center py-1.5">
                    {filled === 0 ? (
                      <span className="text-[10px] text-muted-foreground/40">—</span>
                    ) : allFilled ? (
                      <Badge variant="uploaded" className="text-[10px] gap-1 px-1.5 py-0"><CheckCircle2 className="size-2.5" />OK</Badge>
                    ) : (
                      <Badge variant="in_progress" className="text-[10px] px-1.5 py-0">{filled}/5</Badge>
                    )}
                  </td>
                );
              })
            )}
            <td className="border-none" />
          </tr>

          {/* Mean row */}
          <tr className="bg-blue-50/70 dark:bg-blue-950/20 border-t-2 border-blue-100 dark:border-blue-900">
            <td colSpan={2} className="px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 font-semibold text-xs text-zinc-700 dark:text-zinc-300">
              Mean value
            </td>
            {param.ranges.flatMap((r) =>
              r.measurements.map((m) => {
                const mean = calcMean(m.readings);
                return (
                  <td
                    key={m.id}
                    className={cn(
                      "border border-zinc-200 dark:border-zinc-700 text-center font-mono text-xs font-semibold py-2",
                      mean ? "text-blue-700 dark:text-blue-400" : "text-zinc-300 dark:text-zinc-600"
                    )}
                  >
                    {mean ?? "—"}
                  </td>
                );
              })
            )}
            <td className="border-none" />
          </tr>

          {/* Corrected value row */}
          <tr className="border-t border-zinc-200 dark:border-zinc-700">
            <td colSpan={2} className="px-3 py-2.5 border border-zinc-200 dark:border-zinc-700">
              <div className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">Corrected value</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">After correction factor</div>
            </td>
            {param.ranges.flatMap((r) =>
              r.measurements.map((m) => (
                <td key={m.id} className="border border-zinc-200 dark:border-zinc-700 p-0">
                  <input
                    value={m.corrected}
                    readOnly={readOnly}
                    onChange={(e) => !readOnly && updateMeasurement(r.id, m.id, { corrected: e.target.value })}
                    placeholder="NA"
                    className={cn("w-full font-mono text-xs text-center bg-transparent border-none outline-none py-2 px-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-300", readOnly && "cursor-default")}
                  />
                </td>
              ))
            )}
            <td className="border-none" />
          </tr>

        </tbody>
      </table>
    </div>
  );
};

// ─── Uncertainty formula reference modal ──────────────────────────────────────

const FORMULA_STEPS = [
  {
    symbol: "J",
    label: "Mean Value",
    formula: "J = mean(r₁, r₂, r₃, r₄, r₅)",
    description: "Arithmetic mean of the 5 repeated readings taken on the DUC.",
  },
  {
    symbol: "K",
    label: "Type A Uncertainty (Std. U/c of Mean)",
    formula: "K = s(r) / √n",
    description: "Standard deviation of the readings divided by √n. Captures repeatability of the measurement process.",
  },
  {
    symbol: "M",
    label: "Std. Uncertainty of Ref. Std.",
    formula: "M = (stdUncPct / 100) × |nomValue|",
    description: "Derived from the reference standard's certificate. stdUncPct is the stated standard uncertainty percentage.",
  },
  {
    symbol: "N",
    label: "U/c of Ref. Std.",
    formula: "N = M / 2",
    description: "The reference standard certificate reports expanded uncertainty (k=2). Dividing by 2 converts to standard uncertainty.",
  },
  {
    symbol: "O",
    label: "U/c due to Accuracy of Ref. Std.",
    formula: "O = (accPct% × |nomValue| + accOffset) / √3",
    description: "Accuracy specification of the reference standard modelled as a rectangular distribution. Dividing by √3 gives standard uncertainty.",
  },
  {
    symbol: "P",
    label: "U/c due to Least Count of DUC",
    formula: "P = leastCount / (2√3)",
    description: "Resolution of the DUC's display modelled as a rectangular distribution (half-width = leastCount / 2).",
  },
  {
    symbol: "Q",
    label: "Combined Standard Uncertainty",
    formula: "Q = √(K² + N² + O² + P²)",
    description: "Root-sum-square of all independent uncertainty components (Type A + Type B sources).",
  },
  {
    symbol: "R",
    label: "Effective Degrees of Freedom",
    formula: "R = Q⁴ / Σ(uᵢ⁴ / νᵢ)  [Welch–Satterthwaite]",
    description: "Estimates the equivalent degrees of freedom for the combined uncertainty using the Welch–Satterthwaite equation.",
  },
  {
    symbol: "S",
    label: "Coverage Factor (k)",
    formula: "S = t(R, 95%)  [capped at 2.0 for DoF > 30]",
    description: "Student's t-value at 95% confidence for the effective DoF. For DoF > 30 the normal approximation k = 2.0 is used.",
  },
  {
    symbol: "T",
    label: "Expanded Uncertainty",
    formula: "T = S × Q",
    description: "Expanded uncertainty at 95% confidence level. This is the primary uncertainty figure reported.",
  },
  {
    symbol: "U",
    label: "Scope Claimed",
    formula: "U = (scopePct / 100) × |nomValue|",
    description: "Minimum uncertainty floor declared in the laboratory's scope of accreditation for this measurement range.",
  },
  {
    symbol: "V",
    label: "Resulted Expanded U/C",
    formula: "V = max(T, U)",
    description: "The reported expanded uncertainty is the larger of the computed expanded uncertainty and the scope-claimed floor.",
  },
  {
    symbol: "W",
    label: "% Uncertainty",
    formula: "W = (V / |nomValue|) × 100",
    description: "Resulted expanded uncertainty expressed as a percentage of the nominal value.",
  },
];

// ─── Audit history shared helpers ─────────────────────────────────────────────

const ACTION_META: Record<AuditEntry["action"], { label: string; color: string; dot: string }> = {
  created:        { label: "Created",        color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400" },
  updated:        { label: "Updated",        color: "bg-blue-100 text-blue-700",       dot: "bg-blue-400"    },
  status_changed: { label: "Status changed", color: "bg-violet-100 text-violet-700",  dot: "bg-violet-400"  },
  deleted:        { label: "Deleted",        color: "bg-red-100 text-red-700",         dot: "bg-red-400"     },
};

function resolveAuditMeta(entry: AuditEntry) {
  const base = ACTION_META[entry.action] ?? { label: entry.action, color: "bg-zinc-100 text-zinc-600", dot: "bg-zinc-400" };
  if (entry.action !== "status_changed") return base;
  const to = entry.changes[0]?.to;
  if (to === "verified") return { label: "Verified", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400" };
  if (to === "rejected") return { label: "Rejected", color: "bg-red-100 text-red-700",         dot: "bg-red-400"     };
  return base;
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-600", "bg-amber-500",
  "bg-rose-500",   "bg-cyan-600", "bg-indigo-500",  "bg-teal-500",
];
function avatarColor(name: string) {
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function AuditEntryCard({ entry, isLast }: { entry: AuditEntry; isLast: boolean }) {
  const meta = resolveAuditMeta(entry);
  const name = entry.performedBy?.signatureName || entry.performedBy?.name || entry.performedBy?.email || "Unknown";
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const date = new Date(entry.createdAt);
  const dateStr = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return (
    <li className="relative flex gap-3">
      {/* timeline spine */}
      <div className="flex flex-col items-center">
        <span className={cn("mt-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white flex-shrink-0", meta.dot)} />
        {!isLast && <span className="mt-1 flex-1 w-px bg-zinc-200" />}
      </div>
      <div className={cn("min-w-0 flex-1", !isLast && "pb-4")}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={cn("h-5 w-5 rounded-full text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0", avatarColor(name))}>
              {initials}
            </div>
            <span className="text-xs font-semibold text-zinc-800 truncate">{name}</span>
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0", meta.color)}>{meta.label}</span>
          </div>
          <span className="text-[10px] text-zinc-400 whitespace-nowrap shrink-0">{dateStr} · {timeStr}</span>
        </div>
        {entry.changes.length > 0 && (
          <div className="mt-1.5 ml-6 space-y-0.5">
            {entry.changes.map((c, ci) => (
              <div key={ci} className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <span className="font-medium min-w-[80px] shrink-0 truncate">{c.field}</span>
                <span className="text-zinc-400 line-through truncate max-w-[60px]">{c.from}</span>
                <ArrowRight className="h-2.5 w-2.5 text-zinc-300 flex-shrink-0" />
                <span className="text-zinc-700 font-medium truncate">{c.to}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

// Small popover — last 2 entries + "View all" button
const HistoryPopover: FC<{ log: AuditEntry[] | undefined; loading: boolean; onViewAll: () => void; onClose: () => void }> = ({ log, loading, onViewAll, onClose }) => {
  const preview = log?.slice(0, 2) ?? [];
  return (
    <div className="absolute left-0 top-full mt-2 z-50 w-80 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xl overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Recent activity</span>
          {(log?.length ?? 0) > 0 && (
            <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">{log!.length}</span>
          )}
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* entries */}
      <div className="px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center h-14 text-xs text-zinc-400 gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        ) : !preview.length ? (
          <div className="flex items-center justify-center h-14 text-xs text-zinc-400">No history yet</div>
        ) : (
          <ol className="space-y-0">
            {preview.map((entry, i) => (
              <AuditEntryCard key={entry._id} entry={entry} isLast={i === preview.length - 1} />
            ))}
          </ol>
        )}
      </div>
      {/* footer */}
      {(log?.length ?? 0) > 0 && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => { onClose(); onViewAll(); }}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 py-2.5 transition-colors"
          >
            View all {log!.length} entries <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
};

// Full history panel — renders in main content area
const HistoryFullPanel: FC<{ log: AuditEntry[] | undefined; loading: boolean; onBack: () => void; reportId?: string }> = ({ log, loading, onBack, reportId }) => {
  async function exportXlsx() {
    if (!log?.length) return;
    const XLSX = await import("xlsx");
    const rows: Record<string, string>[] = [];
    log.forEach((entry) => {
      const name = entry.performedBy?.signatureName || entry.performedBy?.name || entry.performedBy?.email || "Unknown";
      const ts   = new Date(entry.createdAt).toLocaleString("en-IN");
      if (entry.changes?.length) {
        entry.changes.forEach((c) => {
          rows.push({ "Action": entry.action, "Performed By": name, "Timestamp": ts, "Field": c.field, "From": c.from, "To": c.to });
        });
      } else {
        rows.push({ "Action": entry.action, "Performed By": name, "Timestamp": ts, "Field": "", "From": "", "To": "" });
      }
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Log");
    XLSX.writeFile(wb, `audit-log-${reportId ?? "report"}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
  <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900">
    <div className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 px-6 py-3 flex items-center gap-3">
      <button onClick={onBack} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-zinc-400" />
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Audit History</span>
        {log && <span className="text-[11px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">{log.length}</span>}
      </div>
      <button
        onClick={exportXlsx}
        disabled={!log?.length}
        className="ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <FileDown className="h-3.5 w-3.5" />
        Export Excel
      </button>
    </div>
    <div className="flex-1 overflow-y-auto px-6 py-5 max-w-2xl">
      {loading ? (
        <div className="flex items-center justify-center h-40 text-sm text-zinc-400 gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : !log?.length ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-zinc-400">
          <History className="h-8 w-8 opacity-20" />
          <span className="text-sm">No history yet</span>
        </div>
      ) : (
        <ol className="space-y-0">
          {log.map((entry, i) => (
            <AuditEntryCard key={entry._id} entry={entry} isLast={i === log.length - 1} />
          ))}
        </ol>
      )}
    </div>
  </div>
  );
};

// ─── Tour tooltip ─────────────────────────────────────────────────────────────

const STEP_ICONS = ["👋", "📋", "🔬", "⚙️", "➕", "📊", "⚡", "✅"];

const TourTooltip: FC<TooltipRenderProps> = ({
  index, size, step, isLastStep,
  primaryProps, backProps, skipProps,
}) => (
  <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-[340px] overflow-hidden border border-zinc-100 dark:border-zinc-800">
    {/* Top accent bar */}
    <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-violet-500 to-indigo-500" />

    <div className="p-5">
      {/* Step icon + counter */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{STEP_ICONS[index] ?? "📍"}</span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            Step {index + 1} of {size}
          </span>
        </div>
        <button {...skipProps} className="text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors px-1">
          Skip tour
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: size }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              i === index ? "flex-[2] bg-blue-500" : i < index ? "flex-1 bg-blue-200" : "flex-1 bg-zinc-200 dark:bg-zinc-700"
            )}
          />
        ))}
      </div>

      {/* Title */}
      {step.title && (
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5 leading-snug">
          {step.title as string}
        </h3>
      )}

      {/* Content */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
        {step.content as string}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-between mt-5">
        {index > 0 ? (
          <button
            {...backProps}
            className="text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-medium transition-colors"
          >
            ← Back
          </button>
        ) : <span />}

        <button
          {...primaryProps}
          className="flex items-center gap-1.5 bg-[#1e3a5f] hover:bg-[#16304f] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          {isLastStep ? "Got it — add a parameter" : "Next →"}
        </button>
      </div>
    </div>
  </div>
);

const UncertaintyFormulaModal: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
  <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-base font-semibold text-zinc-900">
          Calculation References 
        </DialogTitle>
        <p className="text-xs text-zinc-500 mt-1">
          Each row in the Results table corresponds to a step below. Constants (stdUncPct, accPct, accOffset, leastCount, scopePct) are sourced from the reference standard's calibration certificate.
        </p>
      </DialogHeader>

      <div className="mt-4 space-y-2">
        {FORMULA_STEPS.map((step) => (
          <div key={step.symbol} className="flex gap-3 p-3 rounded-lg border border-zinc-100 bg-zinc-50/60">
            <div className="flex-shrink-0 w-7 h-7 rounded-md bg-zinc-900 text-white flex items-center justify-center text-[11px] font-bold font-mono">
              {step.symbol}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-zinc-700 mb-0.5">{step.label}</div>
              <div className="font-mono text-[11px] text-violet-700 bg-violet-50 border border-violet-100 rounded px-2 py-0.5 inline-block mb-1">
                {step.formula}
              </div>
              <div className="text-[11px] text-zinc-500 leading-relaxed">{step.description}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 rounded-lg border border-blue-100 bg-blue-50/60">
        <p className="text-[11px] text-blue-700 font-medium mb-0.5">Reference Standard</p>
        <p className="text-[11px] text-blue-600">
          All Type B uncertainty components (N, O, P) are evaluated assuming rectangular or normal distributions as per
          <span className="font-semibold"> JCGM 100:2008 (GUM)</span>. The coverage probability is <span className="font-semibold">95%</span>.
        </p>
      </div>
    </DialogContent>
  </Dialog>
);

// ─── Calculation trace (step-by-step with substituted values) ────────────────

function fmt(n: number | null | undefined, dec = 6) {
  if (n == null || !isFinite(n)) return "—";
  return n.toFixed(dec);
}

// ─── Workflow (flow-diagram) view of a single measurement point ──────────────

type TraceStep = { sym: string; label: string; result: string; highlight?: boolean };

const FLOW_NODE_W = 148;
const FLOW_NODE_H = 68;
const FLOW_CW = 1460;
const FLOW_CH = 470;

// center-x, center-y for each variable node
const FLOW_POS: Record<string, [number, number]> = {
  J:   [90,   55],
  err: [280,  15],
  K:   [280, 112],
  M:   [90,  230],
  N:   [280, 230],
  O:   [90,  318],
  P:   [90,  406],
  Q:   [500, 230],
  R:   [695, 162],
  S:   [880, 130],
  T:   [1050, 282],
  U:   [715, 392],
  V:  [1215, 282],
  W:  [1375, 282],
};

const FLOW_EDGES: [string, string][] = [
  ["J", "err"], ["J", "K"],
  ["M", "N"],
  ["K", "Q"], ["N", "Q"], ["O", "Q"], ["P", "Q"],
  ["Q", "R"], ["K", "R"],
  ["R", "S"],
  ["Q", "T"], ["S", "T"],
  ["T", "V"], ["U", "V"],
  ["V", "W"],
];

const FLOW_SHORT_EXPR: Record<string, string> = {
  J:   "mean(readings)",
  err: "J − nom",
  K:   "stdev / √n",
  M:   "stdUnc% / 100 × |nom|",
  N:   "M / 2",
  O:   "(acc% × |nom| + offset) / √3",
  P:   "leastCount / (2√3)",
  Q:   "√(K² + N² + O² + P²)",
  R:   "4 × Q⁴ / K⁴",
  S:   "t(R, 95%)",
  T:   "S × Q",
  U:   "scope% / 100 × |nom|",
  V:   "max(T, U)",
  W:   "(V / |nom|) × 100",
};

const CalcWorkflow: FC<{ steps: TraceStep[]; exprs: Record<string, string> }> = ({ steps, exprs }) => {
  const uid = useId().replace(/:/g, "");
  const markerId = `wf-arrow-${uid}`;
  const stepMap = Object.fromEntries(steps.map((s) => [s.sym, s]));

  return (
    <div className="overflow-x-auto pb-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
      <div className="relative" style={{ width: FLOW_CW, height: FLOW_CH }}>
        <svg className="absolute inset-0 pointer-events-none" width={FLOW_CW} height={FLOW_CH}>
          <defs>
            <marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M1,1 L1,7 L7,4 z" fill="rgb(139 92 246 / 0.7)" />
            </marker>
          </defs>
          {FLOW_EDGES.map(([from, to]) => {
            const [fx, fy] = FLOW_POS[from];
            const [tx, ty] = FLOW_POS[to];
            const x1 = fx + FLOW_NODE_W / 2;
            const y1 = fy;
            const x2 = tx - FLOW_NODE_W / 2;
            const y2 = ty;
            const mx = (x1 + x2) / 2;
            return (
              <path
                key={`${from}-${to}`}
                d={`M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`}
                stroke="rgb(139 92 246 / 0.45)"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                fill="none"
                markerEnd={`url(#${markerId})`}
              />
            );
          })}
        </svg>

        {Object.entries(FLOW_POS).map(([sym, [cx, cy]]) => {
          const step = stepMap[sym];
          if (!step) return null;
          const hi = !!step.highlight;
          return (
            <div
              key={sym}
              style={{ left: cx - FLOW_NODE_W / 2, top: cy - FLOW_NODE_H / 2, width: FLOW_NODE_W, height: FLOW_NODE_H }}
              className="absolute"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`h-full w-full rounded-lg border shadow-sm px-2.5 py-2 flex flex-col justify-between cursor-default select-none ${
                    hi
                      ? "bg-violet-50 dark:bg-violet-950/60 border-violet-300 dark:border-violet-700/70"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                  }`}>
                    {/* sym + label */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`shrink-0 rounded px-1 py-px text-white text-[8px] font-bold font-mono leading-tight ${
                        hi ? "bg-violet-500" : "bg-zinc-500 dark:bg-zinc-600"
                      }`}>
                        {sym}
                      </span>
                      <span className="text-[9px] text-zinc-500 dark:text-zinc-400 truncate leading-tight">{step.label}</span>
                    </div>
                    {/* short formula */}
                    <div className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500 truncate">
                      {FLOW_SHORT_EXPR[sym]}
                    </div>
                    {/* result */}
                    <div className={`font-mono text-[11px] font-bold leading-none ${
                      hi ? "text-violet-600 dark:text-violet-400" : "text-zinc-800 dark:text-zinc-200"
                    }`}>
                      = {step.result}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-72">
                  <div className="space-y-1.5 py-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded px-1.5 py-px text-white text-[9px] font-bold font-mono ${hi ? "bg-violet-500" : "bg-zinc-500"}`}>
                        {sym}
                      </span>
                      <span className="text-[12px] font-semibold">{step.label}</span>
                    </div>
                    <div className="font-mono text-[11px] text-zinc-300 whitespace-pre-wrap break-all leading-relaxed">
                      {exprs[sym] ?? FLOW_SHORT_EXPR[sym]}
                    </div>
                    <div className={`font-mono text-[12px] font-bold pt-0.5 border-t border-zinc-700 ${hi ? "text-violet-400" : "text-zinc-100"}`}>
                      = {step.result}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Step-by-step calculation trace (list + flow views) ──────────────────────

const CalcTrace: FC<{ param: Parameter }> = ({ param }) => {
  const [open, setOpen] = useState(false);
  const [traceView, setTraceView] = useState<"list" | "flow">("list");

  const measurements = param.ranges.flatMap((r) =>
    r.measurements
      .filter((m) => m.computed)
      .map((m) => ({ m, rangeLabel: r.label }))
  );

  if (!measurements.length) return null;

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <Calculator className="h-3.5 w-3.5 text-violet-500" />
          <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300">Step-by-step calculation trace</span>
          <span className="text-[10px] text-zinc-400 bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full">
            {measurements.length} point{measurements.length !== 1 ? "s" : ""}
          </span>
        </button>
        {open && (
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={() => setTraceView("list")}
              title="List view"
              className={`p-1 rounded transition-colors ${traceView === "list" ? "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setTraceView("flow")}
              title="Flow diagram"
              className={`p-1 rounded transition-colors ${traceView === "flow" ? "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"}`}
            >
              <GitBranch className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <button onClick={() => setOpen((v) => !v)}>
          <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {measurements.map(({ m, rangeLabel }, idx) => {
            const c = m.computed!;
            const nom = parseFloat(m.nomValue);
            const absNom = Math.abs(nom);
            const validReadings = m.readings.map(Number).filter((r) => !isNaN(r));
            const n = validReadings.length;

            const K2 = c.stdUcMean ** 2;
            const N2 = c.ucOfRefStd ** 2;
            const O2 = c.ucDueToAccOfRefStd ** 2;
            const P2 = c.ucDueToLcOfDuc ** 2;

            const steps: TraceStep[] = [
              { sym: "J",   label: "Mean Value",                    result: fmt(c.meanValue) },
              { sym: "err", label: "Error (J − nom)",               result: fmt(c.error) },
              { sym: "K",   label: "Type A Uncertainty",            result: fmt(c.stdUcMean) },
              { sym: "M",   label: "Std. Uncertainty of Ref. Std.", result: fmt(c.stdUncertainty) },
              { sym: "N",   label: "U/c of Ref. Std.",              result: fmt(c.ucOfRefStd) },
              { sym: "O",   label: "U/c due to Accuracy of Ref.",   result: fmt(c.ucDueToAccOfRefStd) },
              { sym: "P",   label: "U/c due to Least Count of DUC", result: fmt(c.ucDueToLcOfDuc) },
              { sym: "Q",   label: "Combined Standard Uncertainty", result: fmt(c.combinedUc),          highlight: true },
              { sym: "R",   label: "Effective Degrees of Freedom",  result: c.effectiveDof != null ? String(c.effectiveDof) : "∞" },
              { sym: "S",   label: "Coverage Factor k",             result: fmt(c.kFactor, 2) },
              { sym: "T",   label: "Expanded Uncertainty",          result: fmt(c.expandedUncertainty), highlight: true },
              { sym: "U",   label: "Scope Claimed",                 result: fmt(c.scopeClaimed) },
              { sym: "V",   label: "Resulted Expanded U/C",         result: fmt(c.resultedExpandedUc),  highlight: true },
              { sym: "W",   label: "% Uncertainty",                 result: `${fmt(c.percentUc, 4)}%`,  highlight: true },
            ];

            // expressions only needed for list view
            const exprs: Record<string, string> = {
              J:   `mean(${validReadings.join(", ")})`,
              err: `${fmt(c.meanValue)} − ${isNaN(nom) ? m.nomValue : nom}`,
              K:   `stdev / √${n}`,
              M:   `(stdUnc%) / 100 × ${fmt(absNom, 4)}`,
              N:   `M / 2 = ${fmt(c.stdUncertainty)} / 2`,
              O:   `(acc% × |nom| + offset) / √3`,
              P:   `leastCount / (2√3)`,
              Q:   `√(K² + N² + O² + P²)\n= √(${fmt(K2, 8)} + ${fmt(N2, 8)} + ${fmt(O2, 8)} + ${fmt(P2, 8)})`,
              R:   `4 × Q⁴ / K⁴ (Welch–Satterthwaite)`,
              S:   `t(R=${c.effectiveDof ?? "∞"}, 95%)`,
              T:   `S × Q = ${fmt(c.kFactor, 2)} × ${fmt(c.combinedUc)}`,
              U:   `scope% / 100 × ${fmt(absNom, 4)}`,
              V:   `max(T, U) = max(${fmt(c.expandedUncertainty)}, ${fmt(c.scopeClaimed)})`,
              W:   `(V / |nom|) × 100 = (${fmt(c.resultedExpandedUc)} / ${fmt(absNom, 4)}) × 100`,
            };

            return (
              <div key={m.id} className="p-4">
                {/* Point header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                    Point {idx + 1}
                  </span>
                  {rangeLabel && (
                    <span className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded">
                      {rangeLabel}
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
                    nom = {m.nomValue}
                  </span>
                </div>

                {traceView === "flow" ? (
                  <CalcWorkflow steps={steps} exprs={exprs} />
                ) : (
                  <div className="space-y-1.5">
                    {steps.map((step) => (
                      <div
                        key={step.sym}
                        className={`flex items-start gap-3 rounded-lg px-3 py-2 ${
                          step.highlight
                            ? "bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900"
                            : "bg-zinc-50 dark:bg-zinc-800/40"
                        }`}
                      >
                        <div className="shrink-0 h-6 w-6 rounded-md bg-zinc-800 dark:bg-zinc-700 text-white flex items-center justify-center text-[9px] font-bold font-mono mt-0.5">
                          {step.sym}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-0.5">{step.label}</div>
                          <div className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap break-all">{exprs[step.sym]}</div>
                        </div>
                        <div className={`shrink-0 font-mono text-[12px] font-bold mt-0.5 ${
                          step.highlight ? "text-violet-700 dark:text-violet-400" : "text-zinc-800 dark:text-zinc-200"
                        }`}>
                          = {step.result}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Results table (computed uncertainty budget) ──────────────────────────────

const RESULT_ROWS: { key: keyof ComputedBudget; label: string; decimals: number }[] = [
  { key: "meanValue",           label: "Mean Value",               decimals: 6 },
  { key: "error",               label: "Error",                    decimals: 6 },
  { key: "stdUcMean",           label: "Std. U/c of Mean",         decimals: 6 },
  { key: "stdUncertainty",      label: "Std. Uncertainty",         decimals: 6 },
  { key: "ucOfRefStd",          label: "U/c of Ref. Std.",         decimals: 6 },
  { key: "ucDueToAccOfRefStd",  label: "U/c due to Acc. of Ref.", decimals: 6 },
  { key: "ucDueToLcOfDuc",      label: "U/c due to L/c of DUC",   decimals: 6 },
  { key: "combinedUc",          label: "Combined Uc",              decimals: 6 },
  { key: "effectiveDof",        label: "Effective DoF",            decimals: 0 },
  { key: "kFactor",             label: "k Factor",                 decimals: 2 },
  { key: "expandedUncertainty", label: "Expanded Uncertainty",     decimals: 6 },
  { key: "scopeClaimed",        label: "Scope Claimed",            decimals: 6 },
  { key: "resultedExpandedUc",  label: "Resulted Expanded U/C",   decimals: 6 },
  { key: "percentUc",           label: "% U/C",                   decimals: 4 },
];

const ResultsTable: FC<{ param: Parameter }> = ({ param }) => {
  const hasAny = param.ranges.some((r) => r.measurements.some((m) => m.computed));
  if (!hasAny) return (
    <div className="flex items-center justify-center h-40 text-sm text-zinc-400">
      Click <span className="mx-1 font-semibold text-violet-600">Compute</span> in the toolbar to preview the uncertainty budget.
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 12 }}>
        <thead>
          <tr>
            <th className="px-3 py-2.5 bg-zinc-50 border border-zinc-200 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wide sticky left-0 z-10">
              Parameter
            </th>
            {param.ranges.flatMap((r) =>
              r.measurements.filter((m) => m.computed).map((m) => (
                <th key={m.id} className="px-2 py-2.5 bg-zinc-50 border border-zinc-200 text-center text-[11px] font-semibold text-zinc-600 whitespace-nowrap">
                  <div>{r.label}</div>
                  <div className="font-mono text-zinc-400 font-normal">{m.nomValue}</div>
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {RESULT_ROWS.map((row, i) => (
            <tr key={row.key} className={i % 2 === 1 ? "bg-zinc-50/60" : ""}>
              <td className="px-3 py-2 border border-zinc-200 text-[11px] text-zinc-600 font-medium whitespace-nowrap sticky left-0 bg-white z-10">
                {row.label}
              </td>
              {param.ranges.flatMap((r) =>
                r.measurements.filter((m) => m.computed).map((m) => {
                  const val = m.computed![row.key as keyof typeof m.computed];
                  const display = val == null ? "—" : Number(val).toFixed(row.decimals);
                  return (
                    <td key={m.id} className="px-2 py-2 border border-zinc-200 text-center font-mono text-[11px] text-zinc-800">
                      {display}
                    </td>
                  );
                })
              )}
            </tr>
          ))}
          {/* Traceability row */}
          <tr className="bg-violet-50/60 border-t-2 border-violet-200">
            <td className="px-3 py-2 border border-violet-200 text-[11px] text-violet-700 font-semibold whitespace-nowrap sticky left-0 bg-violet-50 z-10">
              UC% ref used
            </td>
            {param.ranges.flatMap((r) =>
              r.measurements.filter((m) => m.computed).map((m) => {
                const tf = m.computed!.tracedFrom;
                return (
                  <td key={m.id} className="px-2 py-2 border border-violet-200 text-center text-[10px]">
                    {tf ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help space-y-0.5">
                            <div className="font-semibold text-violet-700">{tf.equipmentName}</div>
                            <div className="text-violet-500">{[tf.range, tf.subRange].filter(Boolean).join(" · ")}</div>
                            <div className="font-mono text-violet-600">±{tf.uncertaintyPct}%</div>
                            {tf.source === "derived_from_abs" && (
                              <div className="text-amber-600 text-[9px]">derived from abs</div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-left space-y-1 max-w-56">
                          <p className="font-semibold text-xs">{tf.equipmentName}</p>
                          <p className="text-xs text-muted-foreground">ID: {tf.equipmentId}</p>
                          <p className="text-xs">Range: {tf.range ?? "—"}</p>
                          <p className="text-xs">Sub-range: {tf.subRange ?? "—"}</p>
                          <p className="text-xs">Std value: {tf.stdValue} {tf.unit}</p>
                          <p className="text-xs font-mono font-semibold">UC%: ±{tf.uncertaintyPct}%</p>
                          {tf.source === "derived_from_abs" && (
                            <p className="text-xs text-amber-600">Derived from absolute uncertainty</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-zinc-400 text-[10px]">hardcoded</span>
                    )}
                  </td>
                );
              })
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// ─── Sidebar: instrument + its params ─────────────────────────────────────────

const SbInstrument: FC<{
  inst: Instrument;
  index: number;
  isActive: boolean;
  activeParamId: string;
  canAddParam: boolean;
  readOnly?: boolean;
  presets: Record<string, InstrumentPreset>;
  instrumentKey: string;
  paramConfigs: ParameterConfig[];
  onSelectInstrument: (id: string) => void;
  onSelectParam: (instId: string, paramId: string) => void;
  onRemoveInstrument: (id: string) => void;
  onRemoveParam: (instId: string, paramId: string) => void;
  onAddParam: (instId: string) => void;
  onAddParamDirect: (instId: string, name: string, unit: string, loadExamples: boolean) => void;
}> = ({ inst, index, isActive, activeParamId, canAddParam, readOnly, presets: _presets, instrumentKey: _instrumentKey, paramConfigs, onSelectInstrument, onSelectParam, onRemoveInstrument, onRemoveParam, onAddParam, onAddParamDirect }) => {
  void _presets; void _instrumentKey;
  const activeParamConfigs = paramConfigs.filter((p) => p.isActive);
  const hasPresets = activeParamConfigs.length > 0;
  const label = inst.meta.nomenclature || inst.meta.make || "Unnamed instrument";
  const sub   = [inst.meta.make, inst.meta.modelType].filter(Boolean).join(" · ");

  return (
    <div className={cn(
      "mb-2 rounded-xl border transition-all",
      isActive
        ? "border-blue-200 bg-blue-50/40 shadow-sm dark:border-blue-800 dark:bg-blue-950/30"
        : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-zinc-600"
    )}>
      <div
        onClick={() => { onSelectInstrument(inst.id); if (inst.params[0]) onSelectParam(inst.id, inst.params[0].id); }}
        className="flex items-center justify-between px-2.5 py-2.5 rounded-xl cursor-pointer group"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={cn(
            "shrink-0 h-5 w-5 rounded-md text-[10px] font-bold flex items-center justify-center",
            isActive ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
          )}>
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className={cn("text-xs font-semibold truncate", isActive ? "text-blue-900 dark:text-blue-300" : "text-zinc-800 dark:text-zinc-200")}>{label}</div>
            {sub && <div className="text-[10px] text-zinc-400 mt-0.5 truncate">{sub}</div>}
            <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">{inst.meta.slNo || inst.meta.nomenclature || "—"}</div>
            {/* Completion bar */}
            {(() => {
              const pct = getInstCompletion(inst);
              return (
                <div className="mt-1.5 h-1 rounded-full bg-zinc-100 dark:bg-zinc-700 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500",
                      pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-zinc-300 dark:bg-zinc-500"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              );
            })()}
          </div>
        </div>
        {!readOnly && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemoveInstrument(inst.id); }}
            className="ml-1.5 p-0.5 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isActive && (
        <div className="mx-2.5 mb-2.5 border-t border-blue-100 dark:border-blue-900 pt-2 pl-1">
          {inst.params.map((p) => {
            const pActive = p.id === activeParamId;
            const pStatus = getParamStatus(p);
            return (
              <div
                key={p.id}
                onClick={() => onSelectParam(inst.id, p.id)}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 rounded-md mb-0.5 cursor-pointer group transition-all",
                  pActive
                    ? "bg-blue-50 border border-blue-100 dark:bg-blue-950/40 dark:border-blue-900"
                    : "border border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800"
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={cn("shrink-0 h-2 w-2 rounded-full", PARAM_STATUS_DOT[pStatus])} />
                  <div className="min-w-0">
                    <div className={cn(
                      "text-xs truncate",
                      pActive ? "font-semibold text-blue-700 dark:text-blue-400" : "text-zinc-500 dark:text-zinc-400"
                    )}>
                      {p.name || "Unnamed parameter"}
                    </div>
                    {p.unit && (
                      <div className="text-[10px] text-zinc-400 font-mono">{p.unit}</div>
                    )}
                  </div>
                </div>
                {!readOnly && inst.params.length > 1 && (
                  <Button
                    variant="ghost" size="icon-xs"
                    onClick={(e) => { e.stopPropagation(); onRemoveParam(inst.id, p.id); }}
                    className="ml-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X />
                  </Button>
                )}
              </div>
            );
          })}

          {!readOnly && (
            !canAddParam ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span data-tour="add-param-btn" className="w-full mt-1 block">
                    <Button
                      variant="outline" size="xs"
                      disabled
                      className="w-full border-dashed text-muted-foreground"
                    >
                      <Plus />Add parameter
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs max-w-[180px]">
                  Select Make &amp; Model Type first
                </TooltipContent>
              </Tooltip>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    data-tour="add-param-btn"
                    variant="outline" size="xs"
                    className="w-full border-dashed text-muted-foreground mt-1"
                  >
                    <Plus />Add parameter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={4}
                  className="w-[15rem] max-h-[60vh] overflow-y-auto"
                >
                  {hasPresets && (
                    <>
                      <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground py-1">
                        Parameters
                      </DropdownMenuLabel>
                      {activeParamConfigs.map((pc) => {
                        const pName = pc.parameterName;
                        const pUnit = pc.unit ?? "";
                        const hasSamples = (pc.samples ?? []).some((r) => (r?.length ?? 0) > 0);
                        if (!hasSamples) {
                          return (
                            <DropdownMenuItem
                              key={pName}
                              onClick={() => onAddParamDirect(inst.id, pName, pUnit, false)}
                              className="text-xs"
                            >
                              <span className="flex-1 truncate">{pName}</span>
                              {pUnit && (
                                <span className="text-[10px] font-mono text-muted-foreground min-w-[1.5rem] text-right">
                                  {pUnit}
                                </span>
                              )}
                            </DropdownMenuItem>
                          );
                        }
                        return (
                          <DropdownMenuSub key={pName}>
                            <DropdownMenuSubTrigger className="text-xs">
                              <span className="flex-1 truncate">{pName}</span>
                              {pUnit && (
                                <span className="text-[10px] font-mono text-muted-foreground min-w-[1.5rem] text-right">
                                  {pUnit}
                                </span>
                              )}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-56">
                              <DropdownMenuItem
                                onClick={() => onAddParamDirect(inst.id, pName, pUnit, false)}
                                className="text-xs"
                              >
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium">Manual entry</span>
                                  <span className="text-[10px] text-muted-foreground">Start blank</span>
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onAddParamDirect(inst.id, pName, pUnit, true)}
                                className="text-xs"
                              >
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium">Load example values</span>
                                  <span className="text-[10px] text-muted-foreground">Pre-filled sample readings</span>
                                </div>
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        );
                      })}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => onAddParam(inst.id)}
                    className="text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Custom parameter…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          )}
        </div>
      )}
    </div>
  );
};

// ─── Add-instrument choice panel ─────────────────────────────────────────────

const AddInstrumentPanel: FC<{
  currentMeta: InstrumentMeta;
  onCancel: () => void;
  onConfirm: (mode: "import" | "fresh") => void;
}> = ({ currentMeta, onCancel, onConfirm }) => (
  <div className="flex flex-col gap-2">
    <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">
      Add instrument
    </div>

    <button
      onClick={() => onConfirm("import")}
      className="text-left p-3 rounded-lg border border-border bg-muted/40 hover:bg-accent hover:border-accent-foreground/20 transition-colors"
    >
      <div className="text-xs font-semibold mb-1">Same instrument, new parameter</div>
      <div className="text-[11px] text-muted-foreground leading-relaxed">
        Copies CSR No, make, model and all metadata. Only the measurement table is fresh.
      </div>
      {currentMeta.nomenclature && (
        <Badge variant="outline" className="mt-1.5 text-[11px]">
          {currentMeta.nomenclature}
        </Badge>
      )}
    </button>

    <button
      onClick={() => onConfirm("fresh")}
      className="text-left p-3 rounded-lg border border-border bg-muted/40 hover:bg-accent hover:border-accent-foreground/20 transition-colors"
    >
      <div className="text-xs font-semibold mb-1">Different instrument</div>
      <div className="text-[11px] text-muted-foreground leading-relaxed">
        Blank form. Fill in the new instrument's CSR, make, model and all details from scratch.
      </div>
    </button>

    <Button variant="outline" size="sm" onClick={onCancel} className="w-full">Cancel</Button>
  </div>
);

// ─── Add-parameter dialog ─────────────────────────────────────────────────────

const AddParamDialog: FC<{
  open: boolean;
  instrumentKey: string;
  presets: Record<string, InstrumentPreset>;
  paramConfigs?: ParameterConfig[];
  equipmentParamNames?: string[];
  initialMode?: "pick" | "custom";
  onCancel: () => void;
  onConfirm: (name: string, unit: string, loadExamples: boolean, configRanges?: string[]) => void;
}> = ({ open, instrumentKey, presets, paramConfigs = [], equipmentParamNames = [], initialMode = "pick", onCancel, onConfirm }) => {
  const [mode,              setMode]             = useState<"pick" | "choose" | "custom">(initialMode);
  const [pendingName,       setPendingName]       = useState("");
  const [pendingUnit,       setPendingUnit]       = useState("");
  const [pendingConfigRanges, setPendingConfigRanges] = useState<string[] | undefined>(undefined);
  const [name,              setName]              = useState("");
  const [unit,              setUnit]              = useState("");
  const nameRef    = useRef<HTMLInputElement>(null);
  const datalistId = useId();

  const activeConfigs = paramConfigs.filter((p) => p.isActive);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
    } else {
      setMode("pick"); setName(""); setUnit("");
      setPendingName(""); setPendingUnit(""); setPendingConfigRanges(undefined);
    }
  }, [open, initialMode]);

  useEffect(() => { if (mode === "custom") setTimeout(() => nameRef.current?.focus(), 60); }, [mode]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && name.trim()) onConfirm(name.trim(), unit.trim(), false);
  };

  const selectPreset = (pName: string, pUnit: string, cfgRanges?: string[]) => {
    setPendingName(pName);
    setPendingUnit(pUnit);
    setPendingConfigRanges(cfgRanges);
    setMode("choose");
  };

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Parameter</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 mt-1">
          {mode === "pick" && (
            <>
              {activeConfigs.map((pc) => (
                <button
                  key={pc._id}
                  onClick={() => onConfirm(pc.parameterName, pc.unit, false, pc.ranges.map((r) => r.label))}
                  className="text-left px-3 py-2.5 rounded-lg border border-border bg-muted/40 hover:bg-accent transition-colors"
                >
                  <div className="text-sm font-semibold">{pc.parameterName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{pc.ranges.map((r) => r.label).join(" · ")}</div>
                </button>
              ))}
              {activeConfigs.length === 0 && (
                <div className="text-xs text-muted-foreground px-1 py-2">No parameters configured. Add one via Parameter Config or use Custom below.</div>
              )}
              <Button variant="outline" size="sm" onClick={() => setMode("custom")} className="w-full border-dashed justify-start mt-1">
                + Custom parameter
              </Button>
            </>
          )}

          {mode === "choose" && (
            <>
              <div className="px-3 py-2 rounded-lg bg-muted/50 border border-border mb-1">
                <p className="text-sm font-semibold">{pendingName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">How do you want to add this parameter?</p>
              </div>
              {!pendingConfigRanges && (
                <button
                  onClick={() => onConfirm(pendingName, pendingUnit, true)}
                  className="text-left px-3 py-3 rounded-lg border border-border bg-muted/40 hover:bg-accent transition-colors"
                >
                  <div className="text-sm font-semibold">Load example values</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Pre-fills ranges with sample readings — useful for testing calculations</div>
                </button>
              )}
              <button
                onClick={() => onConfirm(pendingName, pendingUnit, false, pendingConfigRanges)}
                className="text-left px-3 py-3 rounded-lg border border-border bg-muted/40 hover:bg-accent transition-colors"
              >
                <div className="text-sm font-semibold">Manual entry</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {pendingConfigRanges
                    ? `Adds ${pendingConfigRanges.length} pre-configured range${pendingConfigRanges.length !== 1 ? "s" : ""} with empty readings`
                    : "Start with empty fields and enter your own readings"}
                </div>
              </button>
              <Button variant="ghost" size="sm" onClick={() => setMode("pick")} className="w-full mt-1 text-muted-foreground">
                ← Back
              </Button>
            </>
          )}

          {mode === "custom" && (
            <>
              {equipmentParamNames.length > 0 && (
                <datalist id={datalistId}>
                  {equipmentParamNames.map((n) => <option key={n} value={n} />)}
                </datalist>
              )}
              <Input
                ref={nameRef}
                list={equipmentParamNames.length > 0 ? datalistId : undefined}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Parameter name (type or pick from master equipment)"
                className="text-xs"
              />
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} onKeyDown={handleKey} placeholder="Unit (V, mA, Ω…)" className="text-xs" />
              <div className="flex gap-2 mt-1">
                <Button variant="outline" size="sm" onClick={() => setMode("pick")} className="flex-1">Back</Button>
                <Button size="sm" onClick={() => name.trim() && onConfirm(name.trim(), unit.trim(), false)} disabled={!name.trim()} className="flex-1">Add</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface CalibrationReportPageProps {
  reportId?: string;
}

export default function CalibrationReportPage({ reportId }: CalibrationReportPageProps) {
  const isEditMode = Boolean(reportId);
  const isOffline  = !useOnlineStatus();
  const reportIdIsLocal = isLocalId(reportId);
  const { user: authUser } = useAuth();

  // Register presence — only for server-stored reports (not local drafts).
  const presenceReportId = !reportIdIsLocal && reportId ? reportId : null;
  usePresenceHeartbeat({
    enabled:  !!authUser,
    route:    presenceReportId ? `/calibration/${presenceReportId}` : "/calibration",
    reportId: presenceReportId,
  });
  const { refetch } = useGetCalibrationReports();
  const router = useRouter();
  const { mutate: generateCalibrationReport, isPending: isCreating } = useGenerateCalibrationReport();
  const { mutate: updateCalibrationReport,   isPending: isUpdating  } = useUpdateCalibrationReport();
  const { mutate: computeCalibration,        isPending: isComputing } = useComputeCalibration();
  const isPending = isCreating || isUpdating;

  // For server-stored reports, hit the API as before. For local drafts
  // (id starts with "local-"), skip the network call and resolve from IDB.
  const { data: serverReport, isLoading: isLoadingServerReport } =
    useGetCalibrationReportById(reportIdIsLocal ? "" : (reportId ?? ""));
  const [localReport,     setLocalReport]     = useState<any>(undefined);
  const [localReportLoading, setLocalReportLoading] = useState<boolean>(reportIdIsLocal);
  useEffect(() => {
    if (!reportIdIsLocal || !reportId) { setLocalReport(undefined); setLocalReportLoading(false); return; }
    let cancelled = false;
    setLocalReportLoading(true);
    getDraft(reportId).then((d) => {
      if (cancelled) return;
      // Once a local draft has been synced and assigned a serverId, redirect
      // the URL to the canonical /calibration/<serverId> so subsequent edits
      // PUT to the server instead of churning IDB only.
      if (d?.serverId) {
        router.replace(`/calibration/${d.serverId}`);
        return;
      }
      setLocalReport(d?.payload);
      setLocalReportLoading(false);
    });
    return () => { cancelled = true; };
  }, [reportId, reportIdIsLocal, router]);

  const existingReport: any = reportIdIsLocal ? localReport : serverReport;
  const isLoadingReport     = reportIdIsLocal ? localReportLoading : isLoadingServerReport;

  // Copy-to-new-report: when `?cloneFrom=<id>` is in the URL and we are NOT in
  // edit mode, fetch that source report so we can prefill the form as a new draft.
  const searchParams = useSearchParams();
  const cloneFromId = !isEditMode ? (searchParams?.get("cloneFrom") || "") : "";
  const { data: cloneSourceReport } = useGetCalibrationReportById(cloneFromId || "");

  // DUC instrument master presets (Fluke 8846A, SVERKER 780, …)
  const { presets: instrumentPresets, makeKeyMap } = useInstrumentPresets();
  const { data: paramConfigData } = useGetParameters();
  const paramConfigs = paramConfigData?.data ?? [];
  const { data: equipParamSummary } = useGetEquipmentParamSummary();
  const equipmentParamNames = useMemo(() => {
    const names = new Set<string>();
    for (const eq of equipParamSummary ?? []) {
      for (const p of eq.parameters ?? []) {
        if (p.parameterName) names.add(p.parameterName);
      }
    }
    return [...names].sort();
  }, [equipParamSummary]);

  const blankInstrument = useMemo((): Instrument => ({
    id: uid(), meta: { ...BLANK_META }, params: [],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  const [instruments,   setInstruments]   = useState<Instrument[]>([blankInstrument]);
  const [activeInstId,  setActiveInstId]  = useState<string>(blankInstrument.id);
  const [activeParamId, setActiveParamId] = useState<string>("");
  const [panel,         setPanel]         = useState<PanelState>(null);
  const [hydrated,      setHydrated]      = useState(false);
  const [view,          setView]          = useState<"readings" | "results">("readings");
  const [showFormulas,  setShowFormulas]  = useState(false);
  const [historyPopover,    setHistoryPopover]    = useState(false);
  const [showHistoryPanel,  setShowHistoryPanel]  = useState(false);
  const { data: auditLog, isLoading: auditLoading } = useGetAuditLog(isEditMode ? reportId ?? null : null);
  const [formErrors,    setFormErrors]    = useState<FormError[]>([]);
  const [errorPanelOpen, setErrorPanelOpen] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [reportMeta, setReportMeta] = useState<ReportMeta>({ ...BLANK_REPORT_META });
  const [reportDetailsOpen, setReportDetailsOpen] = useState(!isEditMode);
  const [tourRun, setTourRun] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const cleanSnapshot    = useRef<{ instruments: Instrument[]; reportMeta: ReportMeta } | null>(null);
  const originalSnapshot = useRef<{ instruments: Instrument[]; reportMeta: ReportMeta } | null>(null);
  const [snapshotVersion, setSnapshotVersion] = useState(0);
  const [exitDialog,    setExitDialog]    = useState(false);
  const [revertDialog,  setRevertDialog]  = useState(false);
  // view mode: true by default when opening an existing report so users read before editing
  const [viewMode, setViewMode] = useState(isEditMode);

  // ── PDF preview ────────────────────────────────────────────────────────────
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfUrls,        setPdfUrls]        = useState<string[]>([]);
  const [pdfLoading,     setPdfLoading]     = useState(false);

  const activeInstIndex = instruments.findIndex((i) => i.id === activeInstId);
  const activePdfUrl    = pdfUrls[activeInstIndex] ?? pdfUrls[0] ?? null;

  async function handleTogglePdfPreview() {
    if (showPdfPreview) { setShowPdfPreview(false); return; }
    if (pdfUrls.length > 0) { setShowPdfPreview(true); return; }
    if (!reportId) return;
    setPdfLoading(true);
    try {
      const res = await AUTH_API.get(EP_REPORT_URL(reportId, "calibration"));
      setPdfUrls(res.data.fileUrls ?? []);
      setShowPdfPreview(true);
    } catch {
      toast.error("Failed to load PDF preview");
    } finally {
      setPdfLoading(false);
    }
  }

  const tourSteps: Step[] = useMemo(() => [
    {
      target: "body",
      placement: "center",
      disableBeacon: true,
      title: "Welcome to Calibration Reports",
      content: "This tour walks you through creating your first calibration report — adding instruments, entering readings, computing the uncertainty budget, and submitting.",
    },
    {
      target: "[data-tour='report-details']",
      placement: "right",
      disableBeacon: true,
      title: "Report Details",
      content: "Start by expanding this section to fill in customer info, calibration dates, and location. These appear on the final PDF certificate.",
    },
    {
      target: "[data-tour='instrument-sidebar']",
      placement: "right",
      disableBeacon: true,
      title: "Instruments",
      content: "Each report can hold multiple instruments. The first one is already created. Click an instrument to make it active.",
    },
    {
      target: "[data-tour='instrument-meta']",
      placement: "right",
      disableBeacon: true,
      title: "Instrument Details",
      content: "Fill in the Make, Model, CSR No, and Serial No. Make and model must be set before you can add parameters.",
    },
    {
      target: "[data-tour='add-param-btn']",
      placement: "right",
      disableBeacon: true,
      title: "Add a Parameter",
      content: "Click here to add a measurement parameter — DC Voltage, AC Voltage, Resistance, etc. You can load example values to test the calculations, or enter your own readings.",
    },
    {
      target: "[data-tour='add-instrument-btn']",
      placement: "top",
      disableBeacon: true,
      title: "Multiple Instruments",
      content: "Need to calibrate more than one instrument in the same job? Add more here. Each gets its own set of parameters.",
    },
    {
      target: "[data-tour='compute-btn']",
      placement: "bottom",
      disableBeacon: true,
      title: "Compute Uncertainty Budget",
      content: "After entering readings, click Compute to run the Welch-Satterthwaite calculation. Switch to the Results tab to see the full uncertainty budget breakdown.",
    },
    {
      target: "[data-tour='save-submit']",
      placement: "bottom",
      disableBeacon: true,
      title: "Save or Submit",
      content: "Save as draft anytime — no fields are required. When everything is filled in, click Submit to generate the PDF certificate and send the report for verification.",
    },
  ], []);

  const updateReportMeta = useCallback(<K extends keyof ReportMeta>(key: K, val: ReportMeta[K]) => {
    setReportMeta((prev) => ({ ...prev, [key]: val }));
  }, []);

  // Auto-fill dateOfCalibration from ducReceivedDate when onsite — only if empty, user can override
  useEffect(() => {
    if (reportMeta.calibrationLocation === "onsite" && reportMeta.ducReceivedDate && !reportMeta.dateOfCalibration) {
      setReportMeta((prev) => ({ ...prev, dateOfCalibration: prev.ducReceivedDate }));
    }
  }, [reportMeta.calibrationLocation, reportMeta.ducReceivedDate, reportMeta.dateOfCalibration]);

  // Auto-fill calibrationDueDate = dateOfCalibration + interval months (only when empty — user can override)
  useEffect(() => {
    if (!reportMeta.dateOfCalibration) return;
    if (reportMeta.calibrationDueDate) return;
    const d = new Date(reportMeta.dateOfCalibration);
    if (isNaN(d.getTime())) return;
    const months = reportMeta.calibrationInterval || 12;
    d.setMonth(d.getMonth() + months);
    setReportMeta((prev) => ({ ...prev, calibrationDueDate: d.toISOString().slice(0, 10) }));
  }, [reportMeta.dateOfCalibration, reportMeta.calibrationDueDate, reportMeta.calibrationInterval]);

  useEffect(() => {
    if (!existingReport || hydrated) return;
    const mapped = mapApiToInstruments(existingReport, instrumentPresets);
    if (!mapped.length) return;
    const first = mapped[0];
    setInstruments(mapped);
    setActiveInstId(first.id);
    if (first.params[0]) setActiveParamId(first.params[0].id);
    const meta = mapApiToReportMeta(existingReport);
    setReportMeta(meta);
    setHydrated(true);
    cleanSnapshot.current    = { instruments: mapped, reportMeta: meta };
    originalSnapshot.current = { instruments: mapped, reportMeta: meta };
    setSnapshotVersion((v) => v + 1);
  }, [existingReport, hydrated, instrumentPresets]);

  // Clone hydration — runs once when the source report arrives. Drops fields
  // that must be regenerated for the new report (cert no, dates, status).
  useEffect(() => {
    if (!cloneFromId || !cloneSourceReport || hydrated) return;
    const mapped = mapApiToInstruments(cloneSourceReport as Record<string, unknown>, instrumentPresets);
    if (!mapped.length) return;
    const reassigned = mapped.map((inst) => ({ ...inst, id: uid(), params: inst.params.map((p) => ({ ...p, id: uid(), ranges: p.ranges.map((r) => ({ ...r, id: uid(), measurements: r.measurements.map((m) => ({ ...m, id: uid() })) })) })) }));
    const first = reassigned[0];
    setInstruments(reassigned);
    setActiveInstId(first.id);
    if (first.params[0]) setActiveParamId(first.params[0].id);
    const sourceMeta = mapApiToReportMeta(cloneSourceReport as Record<string, unknown>);
    const meta: ReportMeta = {
      ...sourceMeta,
      certNo:            "",
      ducReceivedDate:   "",
      dateOfCalibration: "",
      calibrationDueDate: "",
    };
    setReportMeta(meta);
    setHydrated(true);
    cleanSnapshot.current    = { instruments: reassigned, reportMeta: meta };
    originalSnapshot.current = { instruments: reassigned, reportMeta: meta };
    setSnapshotVersion((v) => v + 1);
    toast.success("Copied from existing report — review and submit as a new draft");
  }, [cloneFromId, cloneSourceReport, hydrated, instrumentPresets]);

  // For new reports: set snapshot once on first mount
  useEffect(() => {
    if (isEditMode) return; // edit mode snapshot is set after hydration
    if (cleanSnapshot.current) return;
    cleanSnapshot.current = { instruments, reportMeta };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = useMemo(() => {
    if (!cleanSnapshot.current) return false;
    return JSON.stringify({ instruments, reportMeta }) !== JSON.stringify(cleanSnapshot.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instruments, reportMeta, snapshotVersion]);

  // ── Auto-save ──────────────────────────────────────────────────────────────
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const [lastSavedAt,    setLastSavedAt]    = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ticker so "saved Xs ago" stays fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  function timeAgo(d: Date): string {
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60)  return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }

  useEffect(() => {
    // Only auto-save in edit mode (not view mode) with unsaved changes
    if (!isEditMode || viewMode || !isDirty || !hydrated || !userId || !reportId) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      setAutoSaveStatus("saving");
      const payload = buildPayload(instruments, "draft", userId, reportMeta);

      // Always persist to IndexedDB first — guarantees no data loss whether
      // online or offline, and whether the report is a server doc or a local
      // draft. This must complete before we declare success.
      updateLocalDraft(reportId, payload).then(() => {
        cleanSnapshot.current = { instruments, reportMeta };
        setSnapshotVersion((v) => v + 1);
        setLastSavedAt(new Date());

        // Local-only drafts never hit the server here; the sync queue will
        // POST them on reconnect.
        if (reportIdIsLocal || isOffline) {
          setAutoSaveStatus("saved-local");
          return;
        }

        updateCalibrationReport({ reportId, ...payload }, {
          onSuccess: () => {
            setAutoSaveStatus("saved");
            queryClient.invalidateQueries({ queryKey: ["get-calibration-reports"] });
          },
          // Server failed but the local write succeeded — the sync queue
          // will retry. Reflect that in the badge.
          onError: () => setAutoSaveStatus("saved-local"),
        });
      }).catch(() => setAutoSaveStatus("error"));
    }, 5000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, instruments, reportMeta]);

  // Warn on browser refresh / tab close
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const activeInst  = instruments.find((i) => i.id === activeInstId)  ?? instruments[0];
  const activeParam = activeInst.params.find((p) => p.id === activeParamId) ?? activeInst.params[0] ?? null;


  const { user } = useAuth();
  const userId = user?.id ?? (user as any)?._id ?? null;
  const queryClient = useQueryClient();

  function validate(status: "draft" | "submitted"): FormError[] {
    if (status === "draft") return [];

    const errors: FormError[] = [];

    // ── Report-level fields ──────────────────────────────────────────────────
    if (!reportMeta.customerName.trim())
      errors.push({ message: "Customer Name is required", fieldId: "report-customerName" });
    if (!reportMeta.customerAddress.trim())
      errors.push({ message: "Customer Address is required", fieldId: "report-customerAddress" });
    if (!reportMeta.customerRefNo.trim())
      errors.push({ message: "Customer Ref No (PO) is required", fieldId: "report-customerRefNo" });
    if (!reportMeta.ducReceivedDate)
      errors.push({ message: "DUC Received Date is required", fieldId: "report-ducReceivedDate" });
    if (!reportMeta.dateOfCalibration)
      errors.push({ message: "Date of Calibration is required", fieldId: "report-dateOfCalibration" });

    // ── Per-instrument fields ────────────────────────────────────────────────
    for (const inst of instruments) {
      const lbl = inst.meta.nomenclature || inst.meta.make || "Unnamed instrument";
      if (!inst.meta.nomenclature.trim())
        errors.push({ message: `[${lbl}] Nomenclature of DUC is required`, instId: inst.id, fieldId: "field-nomenclature" });
      if (!inst.meta.make.trim())
        errors.push({ message: `[${lbl}] Make is required`, instId: inst.id });
      if (!inst.meta.modelType.trim())
        errors.push({ message: `[${lbl}] Model / Type is required`, instId: inst.id });
      if (!inst.meta.calDate)
        errors.push({ message: `[${lbl}] Calibration Date is required`, instId: inst.id, fieldId: "field-calDate" });
      if (!inst.meta.slNo.trim())
        errors.push({ message: `[${lbl}] Serial No is required`, instId: inst.id, fieldId: "field-slNo" });
      if (!inst.meta.supplyVoltage.trim())
        errors.push({ message: `[${lbl}] Supply Voltage is required`, instId: inst.id, fieldId: "field-supplyVoltage" });
      if (!inst.meta.temperature.trim())
        errors.push({ message: `[${lbl}] Temperature is required`, instId: inst.id, fieldId: "field-temperature" });
      if (!inst.meta.humidity.trim()) {
        errors.push({ message: `[${lbl}] Humidity is required`, instId: inst.id, fieldId: "field-humidity" });
      } else {
        const humVal = parseFloat(inst.meta.humidity);
        if (!isNaN(humVal)) {
          if (inst.meta.voltageArea === "high" && humVal <= 60)
            errors.push({ message: `[${lbl}] Humidity must be > 60 %RH for High Voltage Area`, instId: inst.id, fieldId: "field-humidity" });
          else if (inst.meta.voltageArea !== "high" && humVal > 60)
            errors.push({ message: `[${lbl}] Humidity must be ≤ 60 %RH for Low Voltage Area`, instId: inst.id, fieldId: "field-humidity" });
        }
      }
      if (!inst.meta.refStandard.trim())
        errors.push({ message: `[${lbl}] Ref. Standard name is required`, instId: inst.id, fieldId: "field-refStandard" });
      if (!inst.meta.refMake.trim())
        errors.push({ message: `[${lbl}] Ref. Standard Make is required`, instId: inst.id, fieldId: "field-refMake" });
      if (!inst.meta.refModel.trim())
        errors.push({ message: `[${lbl}] Ref. Standard Model is required`, instId: inst.id, fieldId: "field-refModel" });
      if (!inst.meta.refSrNo.trim())
        errors.push({ message: `[${lbl}] Ref. Standard Sr. No is required`, instId: inst.id, fieldId: "field-refSrNo" });
      if (!inst.meta.refCalDue)
        errors.push({ message: `[${lbl}] Ref. Standard Cal Due Date is required`, instId: inst.id, fieldId: "field-refCalDue" });
      if (!inst.meta.refTraceability.trim())
        errors.push({ message: `[${lbl}] Ref. Standard Traceability is required`, instId: inst.id, fieldId: "field-refTraceability" });
      if (inst.params.length === 0)
        errors.push({ message: `[${lbl}] has no parameters — add at least one`, instId: inst.id });
      for (const p of inst.params) {
        if (!p.name.trim())
          errors.push({ message: `[${lbl}] A parameter has no name`, instId: inst.id, paramId: p.id, fieldId: `param-name-${p.id}` });
      }
    }
    return errors;
  }

  // Re-run validation live whenever form data changes (only while errors exist from a submit attempt)
  useEffect(() => {
    if (formErrors.length === 0) return;
    const next = validate("submitted");
    setFormErrors(next);
    if (next.length === 0) setErrorPanelOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instruments, reportMeta]);

  function focusError(err: FormError) {
    if (err.instId) setActiveInstId(err.instId);
    if (err.paramId) setActiveParamId(err.paramId);
    setTimeout(() => {
      const el = document.getElementById(err.fieldId ?? "");
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }, 60);
  }

  const handleTouch = useCallback((key: string) => {
    setTouchedFields((prev) => { const next = new Set(prev); next.add(key); return next; });
  }, []);

  function handleCompute(instId: string) {
    const inst = instruments.find((i) => i.id === instId);
    if (!inst) return;

    // Build the same server-side instrument shape that injectComputed expects
    const payload = {
      make:        inst.meta.make,
      modelType:   inst.meta.modelType,
      refStandard: {
        equipmentId: inst.meta.refEquipmentId || null,
      },
      parameters: inst.params.map((p) => ({
        name:   p.name,
        unit:   p.unit,
        ranges: p.ranges.map((r) => ({
          label: r.label,
          measurements: r.measurements.map((m) => {
            const parsed = parseNomInput(m.nomValue);
            return {
              nomValue:  parsed ? parsed.value : (m.nomValue === "" ? null : Number(m.nomValue)),
              nomUnit:   parsed?.unit || "",
              readings:  m.readings.map((v) => (v === "" ? null : Number(v))),
              corrected: m.corrected,
            };
          }),
        })),
      })),
    };

    computeCalibration(payload, {
      onSuccess: (computed) => {
        // Merge computed values back into frontend state by position
        setInstruments((ins) =>
          ins.map((i) => {
            if (i.id !== instId) return i;
            return {
              ...i,
              params: i.params.map((p, pi) => ({
                ...p,
                ranges: p.ranges.map((r, ri) => ({
                  ...r,
                  measurements: r.measurements.map((m, mi) => ({
                    ...m,
                    computed: computed.parameters?.[pi]?.ranges?.[ri]?.measurements?.[mi]?.computed ?? m.computed,
                  })),
                })),
              })),
            };
          })
        );
        setView("results");
        toast.success("Computed successfully");
      },
      onError: () => toast.error("Computation failed — check instrument make/model"),
    });
  }

  function handleSave(status: "draft" | "submitted") {
    if (!userId) { toast.error("You must be logged in to save a report"); return; }
    const errors = validate(status);
    if (errors.length) {
      setFormErrors(errors);
      setErrorPanelOpen(true);
      focusError(errors[0]);
      return;
    }
    setFormErrors([]);
    setErrorPanelOpen(false);
    setTouchedFields(new Set());
    refetch()

    const payload = buildPayload(instruments, status, userId, reportMeta);

    const successMsg = status === "draft"
      ? "Draft saved successfully"
      : "Report submitted for verification";

    const onSuccess = () => {
      cleanSnapshot.current = { instruments, reportMeta };
      toast.success(successMsg);
      queryClient.invalidateQueries({ queryKey: ["get-calibration-reports"] });
      if (isEditMode) {
        setViewMode(true);
        setHydrated(false);
      } else {
        router.push("/calibration");
      }
    };

    const onError = (err: any) => {
      const msg = err?.response?.data?.message ?? "Failed to save report";
      toast.error(msg);
    };

    if (isEditMode && reportId) {
      // Existing draft (server or local). Persist to IDB always; if it's a
      // server-side draft and we're online, also PUT to the server.
      updateLocalDraft(reportId, payload)
        .then(() => {
          if (reportIdIsLocal || isOffline) {
            onSuccess();
            return;
          }
          updateCalibrationReport({ reportId, ...payload }, { onSuccess, onError });
        })
        .catch((err) => onError(err));
    } else if (isOffline) {
      // Offline create — generate a local UUID, save to IDB, route to /calibration/<localId>.
      // The sync queue will POST this when the device reconnects.
      createLocalDraft(payload)
        .then((draft) => {
          toast.success("Saved on this device — will sync when online");
          router.push(`/calibration/${draft.localId}`);
        })
        .catch((err) => onError(err));
    } else {
      generateCalibrationReport(payload, { onSuccess, onError });
    }
  }

  const handleTourCallback = useCallback((data: EventData) => {
    const { status, action } = data;
    if (status === "finished" || status === "skipped" || action === "close") {
      setTourRun(false);
      // At end of tour, open the add-param dialog so user can try it
      if (status === "finished") {
        const inst = instruments.find((i) => i.id === activeInstId);
        const instrumentKey = makeKeyMap[inst?.meta.make ?? ""] ?? "";
        setPanel({ type: "addParam", instId: activeInstId, instrumentKey });
      }
    }
  }, [activeInstId, instruments, makeKeyMap]);

  const updateMeta = useCallback((key: keyof InstrumentMeta, val: string) => {
    setInstruments((ins) =>
      ins.map((i) => i.id !== activeInstId ? i : { ...i, meta: { ...i.meta, [key]: val } })
    );
  }, [activeInstId]);

  const updateParam = useCallback((instId: string, updated: Parameter) =>
    setInstruments((ins) =>
      ins.map((i) =>
        i.id !== instId ? i : { ...i, params: i.params.map((p) => p.id === updated.id ? updated : p) }
      )
    ), []);

  const removeInstrument = (id: string) => {
    if (instruments.length === 1) return;
    const rem = instruments.filter((i) => i.id !== id);
    setInstruments(rem);
    if (activeInstId === id) { setActiveInstId(rem[0].id); if (rem[0].params[0]) setActiveParamId(rem[0].params[0].id); }
  };

  const removeParam = (instId: string, paramId: string) => {
    setInstruments((ins) =>
      ins.map((i) => {
        if (i.id !== instId || i.params.length <= 1) return i;
        return { ...i, params: i.params.filter((p) => p.id !== paramId) };
      })
    );
    if (activeParamId === paramId) {
      const inst = instruments.find((i) => i.id === instId)!;
      const rem  = inst.params.filter((p) => p.id !== paramId);
      if (rem.length) setActiveParamId(rem[0].id);
    }
  };

  const handleAddInstrumentConfirm = (mode: "import" | "fresh") => {
    const meta = mode === "import" ? { ...activeInst.meta } : { ...BLANK_META };
    const newInst = makeInstrument(meta);
    setInstruments((ins) => [...ins, newInst]);
    setActiveInstId(newInst.id);
    setPanel(null);
  };

  const handleAddParam = (instId: string) => {
    setActiveInstId(instId);
    const inst = instruments.find((i) => i.id === instId);
    const instrumentKey = makeKeyMap[inst?.meta.make ?? ""] ?? "";
    setPanel({ type: "addParam", instId, instrumentKey, initialMode: "custom" });
  };

  /** Add a parameter inline (from the sidebar dropdown), bypassing the dialog. */
  const handleAddParamDirect = (instId: string, name: string, unit: string, loadExamples: boolean) => {
    const inst = instruments.find((i) => i.id === instId);
    const instrumentKey = makeKeyMap[inst?.meta.make ?? ""] ?? "";
    const pc = paramConfigs.find((c) => c.parameterName === name);
    const configRanges  = pc?.ranges.map((r) => r.label);
    const configSamples = pc?.samples;
    const p = makeParam(name, unit, instrumentKey, loadExamples, instrumentPresets, configRanges, configSamples);
    setInstruments((ins) =>
      ins.map((i) => i.id !== instId ? i : { ...i, params: [...i.params, p] })
    );
    setActiveInstId(instId);
    setActiveParamId(p.id);
  };

  const handleAddParamConfirm = (name: string, unit: string, loadExamples: boolean, configRanges?: string[]) => {
    if (panel?.type !== "addParam") return;
    const pc = paramConfigs.find((c) => c.parameterName === name);
    const configSamples = pc?.samples;
    const p = makeParam(name, unit, panel.instrumentKey, loadExamples, instrumentPresets, configRanges, configSamples);
    setInstruments((ins) =>
      ins.map((i) => i.id !== panel.instId ? i : { ...i, params: [...i.params, p] })
    );
    setActiveInstId(panel.instId);
    setActiveParamId(p.id);
    setPanel(null);
  };

  /** Restore form state to the original server-fetched snapshot. */
  function handleRevert() {
    if (!originalSnapshot.current) return;
    const { instruments: origInst, reportMeta: origMeta } = originalSnapshot.current;
    setInstruments(origInst);
    setReportMeta(origMeta);
    setActiveInstId(origInst[0]?.id ?? "");
    setActiveParamId(origInst[0]?.params[0]?.id ?? "");
    cleanSnapshot.current = { instruments: origInst, reportMeta: origMeta };
    setSnapshotVersion((v) => v + 1);
    setRevertDialog(false);
    toast.success("Reverted to last saved state");
  }

  // ── Loading state ──
  if (isEditMode && isLoadingReport) {
    return (
      <div className="flex min-h-screen bg-background">
        {/* Sidebar skeleton */}
        <div className="hidden lg:flex w-60 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 min-h-screen">
          {/* Brand header */}
          <div className="px-4 py-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-32 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                <div className="h-2.5 w-24 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              </div>
            </div>
            <div className="h-6 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          </div>
          {/* Instruments label */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="h-2.5 w-20 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <div className="h-4 w-5 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          </div>
          {/* Instrument cards */}
          <div className="flex-1 px-2 space-y-1.5 pt-1">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse shrink-0" />
                  <div className="space-y-1 flex-1">
                    <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                    <div className="h-2.5 w-16 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                  </div>
                </div>
                {/* Parameter rows */}
                {[1, 2, 3].map((j) => (
                  <div key={j} className="ml-8 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse shrink-0" />
                    <div className="h-2.5 w-28 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                  </div>
                ))}
              </div>
            ))}
          </div>
          {/* Add instrument button */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 p-3">
            <div className="h-9 w-full rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 animate-pulse" />
          </div>
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sticky top bar */}
          <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-8 py-3.5 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse shrink-0" />
                <div className="h-3 w-40 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
              </div>
              <div className="h-5 w-56 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
              <div className="h-2.5 w-44 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Unit input */}
              <div className="hidden sm:flex items-center gap-1.5 border-r border-zinc-200 dark:border-zinc-700 pr-3">
                <div className="h-3 w-6 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                <div className="h-8 w-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              </div>
              {/* Save badge */}
              <div className="h-6 w-24 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              {/* Buttons */}
              <div className="flex gap-2">
                <div className="h-8 w-20 rounded-md bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                <div className="h-8 w-20 rounded-md bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                <div className="h-8 w-24 rounded-md bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                <div className="h-8 w-28 rounded-md bg-zinc-900 dark:bg-zinc-600 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Status timeline strip */}
          <div className="flex items-center gap-4 px-8 py-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                {i < 3 && <div className="w-12 h-px bg-zinc-200 dark:bg-zinc-700 ml-1" />}
              </div>
            ))}
          </div>

          {/* Content area */}
          <div className="flex-1 px-8 py-6 space-y-4">
            {/* Report Details card */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                <div className="h-3.5 w-3.5 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                <div className="h-3 w-40 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse ml-1" />
              </div>
            </div>

            {/* Instrument Details card */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-36 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                  <div className="h-3 w-48 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse ml-1" />
                </div>
                <div className="h-3 w-36 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              </div>
              {/* Meta fields grid */}
              <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={cn("space-y-2", i === 4 && "col-span-2")}>
                    <div className="h-2.5 w-16 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                    <div className="h-9 w-full rounded-md bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Readings table card */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              {/* Table header bar */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                  <div className="h-5 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                </div>
                <div className="flex gap-1.5">
                  <div className="h-7 w-20 rounded-md bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                  <div className="h-7 w-16 rounded-md bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                </div>
              </div>
              {/* Table */}
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                      {[80, 40, 90, 90, 90, 90, 90].map((w, i) => (
                        <th key={i} className="px-4 py-3 text-left">
                          <div className="h-3 rounded animate-pulse bg-zinc-200 dark:bg-zinc-700" style={{ width: w }} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, row) => (
                      <tr key={row} className="border-b border-zinc-50 dark:border-zinc-800/60">
                        <td className="px-4 py-3">
                          <div className="h-3 w-16 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-3 w-6 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                        </td>
                        {[1, 2, 3, 4, 5].map((c) => (
                          <td key={c} className="px-4 py-3">
                            <div className="h-8 w-full rounded-md bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))}
                    {/* Mean / Status rows */}
                    {["Status", "Mean value", "Corrected value"].map((row) => (
                      <tr key={row} className="border-b border-zinc-50 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-800/20">
                        <td className="px-4 py-3" colSpan={2}>
                          <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                        </td>
                        {[1, 2, 3, 4, 5].map((c) => (
                          <td key={c} className="px-4 py-3">
                            <div className="h-5 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse mx-auto" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── Mobile backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <div className={cn(
        "fixed lg:relative inset-y-0 left-0 z-40 w-64 lg:w-60 shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col min-h-screen shadow-sm transition-transform duration-200 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>

        {/* Brand header */}
        <div className="px-4 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 mb-3">
            <button
              onClick={() => isDirty ? setExitDialog(true) : router.push("/calibration")}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            {/* Close button on mobile */}
            <button
              className="lg:hidden ml-auto p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <Wordmark size="sm" showDot caption="Calibration Suite" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditMode && (
              <div className="relative">
                <button
                  onClick={() => setHistoryPopover((v) => !v)}
                  className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <History className="h-3 w-3" />
                  History
                </button>
                {historyPopover && (
                  <HistoryPopover
                    log={auditLog}
                    loading={auditLoading}
                    onViewAll={() => setShowHistoryPanel(true)}
                    onClose={() => setHistoryPopover(false)}
                  />
                )}
              </div>
            )}
            {!isEditMode && (
              <button
                onClick={() => setTourRun(true)}
                className="flex items-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-800 px-2.5 py-1 rounded-full border border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <MapPin className="h-3 w-3" />
                Tour
              </button>
            )}
            {!isEditMode && (
              <span className="inline-flex text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/60">
                New report
              </span>
            )}
          </div>
        </div>

        {/* Instruments label */}
        <div data-tour="instrument-sidebar" className="px-4 pt-4 pb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Instruments
          </span>
          <span className="text-[10px] text-zinc-400 font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
            {instruments.length}
          </span>
        </div>

        {/* Instrument list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {instruments.map((inst, idx) => (
            <SbInstrument
              key={inst.id}
              inst={inst}
              index={idx}
              isActive={inst.id === activeInstId}
              activeParamId={activeParamId}
              canAddParam={!!(inst.meta.make && inst.meta.modelType)}
              readOnly={viewMode}
              presets={instrumentPresets}
              instrumentKey={makeKeyMap[inst.meta.make ?? ""] ?? ""}
              paramConfigs={paramConfigs}
              onSelectInstrument={(id) => { setActiveInstId(id); setPanel(null); }}
              onSelectParam={(instId, paramId) => { setActiveInstId(instId); setActiveParamId(paramId); setPanel(null); }}
              onRemoveInstrument={removeInstrument}
              onRemoveParam={removeParam}
              onAddParam={handleAddParam}
              onAddParamDirect={handleAddParamDirect}
            />
          ))}
        </div>

        {/* Bottom panel */}
        {!viewMode && (
          <div className="border-t border-zinc-100 dark:border-zinc-800 p-3">
            {panel?.type === "addInstrument" ? (
              <AddInstrumentPanel
                currentMeta={activeInst.meta}
                onCancel={() => setPanel(null)}
                onConfirm={handleAddInstrumentConfirm}
              />
            ) : (
              <Button data-tour="add-instrument-btn" variant="outline" className="w-full border-dashed" onClick={() => setPanel({ type: "addInstrument" })}>
                <Plus />Add instrument
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-x-auto flex flex-col">

        {showHistoryPanel && (
          <HistoryFullPanel
            log={auditLog}
            loading={auditLoading}
            onBack={() => setShowHistoryPanel(false)}
            reportId={reportId}
          />
        )}

        {!showHistoryPanel && <>

        {/* Sticky top bar */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 shadow-sm">

          {/* ── Row 1: title / breadcrumb ── */}
          <div className="flex items-center gap-2 px-4 lg:px-8 py-3 lg:py-3.5">
            {/* Mobile sidebar toggle */}
            <button
              className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              {isEditMode ? (
                <>
                  <div className="flex items-center gap-2 mb-0.5">
                    <FlaskConical className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 truncate">
                      {activeInst.meta.nomenclature || "Instrument"}
                    </span>
                  </div>
                  {activeParam ? (
                    <input
                      id={`param-name-${activeParam.id}`}
                      value={activeParam.name}
                      onChange={(e) => !activeParam.isPredefined && updateParam(activeInstId, { ...activeParam, name: e.target.value })}
                      readOnly={activeParam.isPredefined || viewMode}
                      placeholder="Parameter name"
                      className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 bg-transparent border-none outline-none w-full leading-tight placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                    />
                  ) : (
                    <div className="text-lg font-semibold text-zinc-300">No parameters yet</div>
                  )}
                  <div className="text-xs text-zinc-400 mt-0.5 hidden sm:block">
                    JECL/KOL/LAB/FM/36B · {activeInst.meta.calDate || "No date set"}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Plus className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-500 truncate">
                      New Calibration Report
                    </span>
                    {(() => {
                      // Prefer the authoritative validation result when available
                      // (set on submit / compute) — falls back to a quick CSR +
                      // Nomenclature check before the user has tried submitting.
                      const count = formErrors.length > 0
                        ? formErrors.length
                        : instruments.reduce((acc, inst) => {
                            if (!inst.meta.nomenclature.trim()) acc++;
                            return acc;
                          }, 0);
                      if (count === 0) return null;
                      const label = count === 1 ? "1 required field missing" : `${count} required fields missing`;
                      return <Badge variant="in_progress" className="ml-1 text-[10px]">{label}</Badge>;
                    })()}
                  </div>
                  {activeParam ? (
                    <input
                      id={`param-name-${activeParam.id}`}
                      value={activeParam.name}
                      onChange={(e) => !activeParam.isPredefined && updateParam(activeInstId, { ...activeParam, name: e.target.value })}
                      readOnly={activeParam.isPredefined}
                      placeholder="Parameter name"
                      className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 bg-transparent border-none outline-none w-full leading-tight placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                    />
                  ) : (
                    <div className="text-lg font-semibold text-zinc-400">Add instrument details to get started</div>
                  )}
                  <div className="text-xs text-zinc-400 mt-0.5 hidden sm:block">
                    Fill in report details · Add instrument · Enter readings · Submit
                  </div>
                </>
              )}
            </div>

            {/* Right: presence avatars + mode badge */}
            {presenceReportId && (
              <ReportViewerStack reportId={presenceReportId} currentUserId={authUser?.id} />
            )}
            {isEditMode && viewMode && (
              <span className="shrink-0 hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700">
                <Eye className="h-2.5 w-2.5" />
                Viewing
              </span>
            )}
            {(!isEditMode || !viewMode) && isEditMode && (
              <span className={cn(
                "shrink-0 hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all",
                autoSaveStatus === "saving"
                  ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                  : autoSaveStatus === "error"
                  ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                  : autoSaveStatus === "saved-local" && !isDirty
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                  : autoSaveStatus === "saved" && !isDirty
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                  : isDirty
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60"
                  : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
              )}>
                {autoSaveStatus === "saving" ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <PenLine className="h-2.5 w-2.5" />}
                <span>Editing</span>
                <span className="opacity-40">·</span>
                <span className="font-normal">
                  {autoSaveStatus === "saving" ? "Saving…"
                    : autoSaveStatus === "error" ? "Save failed"
                    : autoSaveStatus === "saved-local" && !isDirty && lastSavedAt ? `Saved on this device · will sync`
                    : autoSaveStatus === "saved" && !isDirty && lastSavedAt ? `Saved ${timeAgo(lastSavedAt)}`
                    : isDirty ? "Unsaved changes"
                    : "Up to date"}
                </span>
              </span>
            )}
          </div>

          {/* ── Row 2: toolbar (view mode buttons OR edit/create actions) ── */}
          <div className="flex items-center gap-2 px-4 lg:px-8 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30">

            {/* View mode toolbar */}
            {isEditMode && viewMode && (
              <div className="flex items-center gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTogglePdfPreview}
                  disabled={pdfLoading || isOffline}
                  title={isOffline ? "PDF preview requires internet — generated on the server" : undefined}
                  className={cn("gap-1.5 px-2.5 sm:px-3 transition-colors", showPdfPreview ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400" : "")}
                >
                  {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : showPdfPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{pdfLoading ? "Loading…" : showPdfPreview ? "Close preview" : "Preview PDF"}</span>
                  <span className="sm:hidden">{pdfLoading ? "…" : showPdfPreview ? "Close" : "Preview"}</span>
                </Button>
                <div className="flex-1" />
                <Button
                  size="sm"
                  onClick={() => setViewMode(false)}
                  className="gap-1.5 px-3 sm:px-4"
                >
                  <PenLine className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Edit Report</span>
                  <span className="sm:hidden">Edit</span>
                </Button>
              </div>
            )}

            {/* Edit / create mode toolbar */}
            {(!isEditMode || !viewMode) && (
              <div className="flex items-center gap-1.5 lg:gap-2 w-full" data-tour="save-submit">
                {/* Unit input */}
                {activeParam && (
                  <div className="flex items-center gap-1.5 border-r border-zinc-200 dark:border-zinc-700 pr-3 mr-1">
                    <span className="text-xs text-zinc-400 shrink-0">Unit</span>
                    <input
                      value={activeParam.unit}
                      readOnly={viewMode}
                      onChange={(e) => updateParam(activeInstId, { ...activeParam, unit: e.target.value })}
                      placeholder="V"
                      className="w-14 h-7 font-mono text-sm text-center rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all"
                    />
                  </div>
                )}

                {/* Revert — only when dirty draft */}
                {isEditMode && isDirty && existingReport?.status === "draft" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRevertDialog(true)}
                    className="gap-1.5 px-2.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Revert</span>
                  </Button>
                )}

                {/* Preview */}
                {isEditMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTogglePdfPreview}
                    disabled={pdfLoading || isOffline}
                    title={isOffline ? "PDF preview requires internet — generated on the server" : undefined}
                    className={cn("gap-1.5 px-2.5 lg:px-3 transition-colors", showPdfPreview ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400" : "")}
                  >
                    {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : showPdfPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{pdfLoading ? "Loading…" : showPdfPreview ? "Edit" : "Preview"}</span>
                  </Button>
                )}

                {/* Spacer pushes primary actions to the right */}
                <div className="flex-1" />

                {/* Separator */}
                <div className="hidden sm:block h-5 w-px bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

                {/* Compute */}
                <Button
                  data-tour="compute-btn"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCompute(activeInstId)}
                  disabled={isComputing || isOffline || !activeInst.meta.make || !activeInst.meta.modelType || activeInst.params.length === 0}
                  title={isOffline ? "Compute requires internet — runs on the server" : undefined}
                  className="gap-1.5 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:border-violet-300 dark:hover:border-violet-700 px-2.5 lg:px-3"
                >
                  {isComputing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calculator className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{isComputing ? "Computing…" : "Compute"}</span>
                </Button>

                {/* Separator */}
                <div className="hidden sm:block h-5 w-px bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

                {/* Save draft */}
                <Button variant="outline" size="sm" onClick={() => handleSave("draft")} disabled={isPending} className="px-2.5 lg:px-3">
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline ml-1">{isPending ? "Saving…" : "Save draft"}</span>
                </Button>

                {/* Submit / Save */}
                <div className="relative">
                  <Button
                    size="sm"
                    onClick={() => handleSave("submitted")}
                    disabled={isPending || isOffline}
                    title={isOffline ? "Submit requires internet — generates certificate on the server" : undefined}
                    className="px-2.5 lg:px-3"
                  >
                    <Send className="h-3.5 w-3.5 sm:hidden" />
                    <span className="hidden sm:inline">
                      {!isEditMode ? "Create Report"
                        : existingReport?.status === "draft" ? "Submit report"
                        : "Save changes"}
                    </span>
                  </Button>
                  {formErrors.length > 0 && (
                    <span
                      onClick={(e) => { e.stopPropagation(); setErrorPanelOpen(true); }}
                      className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center cursor-pointer"
                    >
                      {formErrors.length}
                    </span>
                  )}
                </div>

                {/* Done — exit edit mode back to view */}
                {isEditMode && (
                  <>
                    <div className="hidden sm:block h-5 w-px bg-zinc-200 dark:bg-zinc-700 mx-0.5" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setViewMode(true); if (isDirty) handleRevert(); }}
                      className="px-2.5 lg:px-3 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Done</span>
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Create mode: step progress strip ── */}
        {!isEditMode && (() => {
          const hasMeta  = instruments.some((i) => i.meta.nomenclature.trim() && i.meta.make.trim());
          const hasParam = instruments.some((i) => i.params.length > 0);
          const hasReads = instruments.some((i) =>
            i.params.some((p) => p.ranges.some((r) => r.measurements.some((m) => m.readings.some((v) => v !== ""))))
          );
          const steps = [
            { label: "Report Details",  done: !!reportMeta.customerName.trim() },
            { label: "Instrument Info", done: hasMeta },
            { label: "Enter Readings",  done: hasReads },
            { label: "Submit",          done: false },
          ];
          const currentStep = steps.findIndex((s) => !s.done);
          return (
            <div className="flex items-center gap-0 px-4 lg:px-8 py-2.5 border-b border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 overflow-x-auto shrink-0">
              {steps.map((step, i) => {
                const isActive = i === currentStep;
                const isDone   = step.done;
                return (
                  <div key={step.label} className="flex items-center gap-0 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "flex items-center justify-center h-4 w-4 rounded-full text-[9px] font-bold shrink-0",
                        isDone   ? "bg-blue-500 text-white" :
                        isActive ? "bg-blue-500 text-white ring-2 ring-blue-200 dark:ring-blue-900" :
                                   "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500"
                      )}>
                        {isDone ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                      </div>
                      <span className={cn(
                        "text-[11px] font-semibold whitespace-nowrap",
                        isDone   ? "text-blue-600 dark:text-blue-400" :
                        isActive ? "text-blue-700 dark:text-blue-300" :
                                   "text-zinc-400 dark:text-zinc-500"
                      )}>
                        {step.label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={cn(
                        "w-8 lg:w-16 h-px mx-2",
                        isDone ? "bg-blue-300 dark:bg-blue-700" : "bg-zinc-200 dark:bg-zinc-700"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ── Status timeline ── */}
        {isEditMode && existingReport && (
          <div className="flex items-center gap-0 px-4 lg:px-8 py-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 overflow-x-auto shrink-0">
            {(() => {
              const current = (existingReport as any)?.status ?? "draft";
              const isRejected = current === "rejected";

              const ORDER  = isRejected
                ? ["draft", "submitted", "rejected"] as const
                : ["draft", "submitted", "verified"] as const;
              const LABELS: Record<string, string> = { draft: "Draft", submitted: "Submitted", verified: "Verified", rejected: "Rejected" };

              const normalOrder = ["draft", "submitted", "verified", "rejected"];
              const currentIdx  = normalOrder.indexOf(current);

              return ORDER.map((step, i) => {
                const stepNormalIdx = normalOrder.indexOf(step);
                const isDone    = stepNormalIdx < currentIdx;
                const isCurrent = step === current;
                const ts: string | undefined =
                  step === "draft"     ? (existingReport as any)?.createdAt :
                  step === "submitted" ? (existingReport as any)?.submittedAt ?? (currentIdx >= 1 ? (existingReport as any)?.updatedAt : undefined) :
                  step === "verified"  ? (existingReport as any)?.verifiedAt  ?? (currentIdx >= 3 ? (existingReport as any)?.updatedAt : undefined) :
                  step === "rejected"  ? (existingReport as any)?.rejectedAt  ?? (isRejected ? (existingReport as any)?.updatedAt : undefined) :
                  undefined;
                return (
                  <div key={step} className="flex items-center gap-0 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full shrink-0 transition-colors",
                        isCurrent && isRejected       ? "bg-red-500 ring-2 ring-red-200 dark:ring-red-900" :
                        isCurrent && current !== "verified" ? "bg-blue-500 ring-2 ring-blue-200 dark:ring-blue-900" :
                        isCurrent ? "bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900" :
                        isDone    ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700"
                      )} />
                      <div className="leading-tight">
                        <span className={cn(
                          "text-[11px] font-semibold",
                          isCurrent && isRejected ? "text-red-600 dark:text-red-400" :
                          isCurrent ? "text-zinc-900 dark:text-zinc-100" :
                          isDone    ? "text-emerald-600 dark:text-emerald-400" :
                                      "text-zinc-400 dark:text-zinc-600"
                        )}>
                          {LABELS[step]}
                        </span>
                        {ts && (
                          <span className="ml-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">
                            {new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                    {i < ORDER.length - 1 && (
                      <div className={cn(
                        "w-8 lg:w-14 h-px mx-3",
                        isDone ? "bg-emerald-300 dark:bg-emerald-800" : "bg-zinc-200 dark:bg-zinc-700"
                      )} />
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* ── PDF Preview panel ── */}
        {showPdfPreview && (
          <div className="flex flex-col" style={{ height: "calc(100vh - 57px)" }}>
            {/* Instrument tabs — one per PDF */}
            {pdfUrls.length > 1 && (
              <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 overflow-x-auto">
                {instruments.map((inst, idx) => (
                  <button
                    key={inst.id}
                    onClick={() => { setActiveInstId(inst.id); setActiveParamId(""); }}
                    className={cn(
                      "shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                      inst.id === activeInstId
                        ? "text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    )}
                    style={inst.id === activeInstId ? { backgroundColor: "#1e3a5f" } : {}}
                  >
                    {inst.meta.nomenclature || `Instrument ${idx + 1}`}
                  </button>
                ))}
              </div>
            )}
            {activePdfUrl ? (
              <iframe
                key={activePdfUrl}
                src={activePdfUrl}
                className="flex-1 w-full border-0"
                title="Calibration Certificate Preview"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-400">
                <Eye className="h-8 w-8 opacity-30" />
                <p className="text-sm">No PDF available for this instrument yet.</p>
                <p className="text-xs text-zinc-400">Save the report first, then click Preview.</p>
              </div>
            )}
          </div>
        )}

        {/* Content area */}
        <div className={cn("flex-1 px-4 py-4 lg:px-8 lg:py-6 space-y-4", showPdfPreview && "hidden")}>

          {/* Report Details section */}
          <div data-tour="report-details" className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setReportDetailsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/50 hover:bg-zinc-100/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                {reportDetailsOpen
                  ? <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                  : <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />}
                <span className="text-sm font-semibold text-zinc-800">Report Details</span>
                <span className="text-xs text-zinc-400">· Customer · Dates · Certificate</span>
              </div>
              {!reportDetailsOpen && reportMeta.customerName && (
                <span className="text-xs text-zinc-500 font-medium truncate max-w-[200px]">{reportMeta.customerName}</span>
              )}
            </button>
            {reportDetailsOpen && (
              <div className="p-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
                  <RF label="Certificate No" value={reportMeta.certNo || (isEditMode ? "" : "Auto-generated on save")} readOnly placeholder="Auto-generated" />
                  <RF id="report-customerRefNo" label="Customer Ref No (PO)" value={reportMeta.customerRefNo} readOnly={viewMode} onChange={(v) => updateReportMeta("customerRefNo", v)} />
                  <RF id="report-customerName" label="Customer Name" value={reportMeta.customerName} span2 readOnly={viewMode} onChange={(v) => updateReportMeta("customerName", v)} />
                  <RF id="report-customerAddress" label="Customer Address" value={reportMeta.customerAddress} span2 readOnly={viewMode} onChange={(v) => updateReportMeta("customerAddress", v)} />
                  <RF id="report-ducReceivedDate" label="DUC Received Date" value={reportMeta.ducReceivedDate} type="date" readOnly={viewMode} onChange={(v) => updateReportMeta("ducReceivedDate", v)} />
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Calibration Location</Label>
                    <Select value={reportMeta.calibrationLocation} disabled={viewMode} onValueChange={(v) => updateReportMeta("calibrationLocation", v as "onsite" | "at_lab")}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onsite">Onsite</SelectItem>
                        <SelectItem value="at_lab">At Lab</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <RF id="report-dateOfCalibration" label="Date of Calibration" value={reportMeta.dateOfCalibration} type="date"
                    readOnly={viewMode}
                    onChange={!viewMode ? (v) => updateReportMeta("dateOfCalibration", v) : undefined} />
                  <RF id="report-calibrationDueDate" label="Calibration Due Date" value={reportMeta.calibrationDueDate} type="date"
                    readOnly={viewMode}
                    onChange={!viewMode ? (v) => updateReportMeta("calibrationDueDate", v) : undefined} />
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Calibration Interval</Label>
                    <Select
                      value={String(reportMeta.calibrationInterval || 12)}
                      disabled={viewMode}
                      onValueChange={(v) => {
                        const months = Number(v) || 12;
                        setReportMeta((prev) => {
                          const next = { ...prev, calibrationInterval: months };
                          if (prev.dateOfCalibration) {
                            const d = new Date(prev.dateOfCalibration);
                            if (!isNaN(d.getTime())) {
                              d.setMonth(d.getMonth() + months);
                              next.calibrationDueDate = d.toISOString().slice(0, 10);
                            }
                          }
                          return next;
                        });
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 months</SelectItem>
                        <SelectItem value="6">6 months</SelectItem>
                        <SelectItem value="12">12 months (default)</SelectItem>
                        <SelectItem value="18">18 months</SelectItem>
                        <SelectItem value="24">24 months</SelectItem>
                        <SelectItem value="36">36 months</SelectItem>
                      </SelectContent>
                    </Select>
                    {reportMeta.calibrationInterval !== 12 && (
                      <Badge variant="outline" className="mt-0.5 w-fit border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        As Per Client Requirement
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Instrument details section */}
          <div data-tour="instrument-meta" className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
              <div>
                <span className="text-sm font-semibold text-zinc-800">Instrument Details</span>
                <span className="ml-2 text-xs text-zinc-400">· Environmental · Reference Standard</span>
              </div>
              <span className="text-[11px] text-zinc-400 italic">
                Shared across all parameters of this instrument
              </span>
            </div>
            <div className="p-5">
              <MetaGrid
                meta={activeInst.meta}
                instParamNames={(() => {
                  if (activeInst.params.length > 0) return activeInst.params.map((p) => p.name);
                  const key = makeKeyMap[activeInst.meta.make] ?? `${activeInst.meta.make} ${activeInst.meta.modelType}`.trim();
                  return Object.keys(instrumentPresets[key]?.params ?? {});
                })()}
                modelLocked={activeInst.params.length > 0}
                showErrors={formErrors.length > 0}
                readOnly={viewMode}
                hasPreset={
                  activeInst.meta.make
                    ? Object.keys(
                        instrumentPresets[makeKeyMap[activeInst.meta.make] ?? ""]?.params ?? {}
                      ).length > 0
                    : undefined
                }
                touched={touchedFields}
                onTouch={handleTouch}
                onChange={updateMeta}
              />
            </div>
          </div>

          {/* Empty state — no params yet */}
          {!activeParam && (() => {
            const canAdd = !!(activeInst.meta.make && activeInst.meta.modelType);
            const activeParamConfigs = paramConfigs.filter((p) => p.isActive);
            const hasPresets = activeParamConfigs.length > 0;
            return (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
                <FlaskConical className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                <div className="text-sm font-semibold text-zinc-500">No parameters added yet</div>
                {canAdd ? (
                  <>
                    <div className="text-xs text-zinc-400">
                      Pick a preset or add a custom parameter
                    </div>
                    {!viewMode && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" className="mt-1 gap-1.5">
                            <Plus className="h-3.5 w-3.5" />
                            Add parameter
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="center"
                          sideOffset={4}
                          className="w-[15rem] max-h-[60vh] overflow-y-auto"
                        >
                          {hasPresets && (
                            <>
                              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground py-1">
                                Parameters
                              </DropdownMenuLabel>
                              {activeParamConfigs.map((pc) => {
                                const pName = pc.parameterName;
                                const pUnit = pc.unit ?? "";
                                const hasSamples = (pc.samples ?? []).some((r) => (r?.length ?? 0) > 0);
                                if (!hasSamples) {
                                  return (
                                    <DropdownMenuItem
                                      key={pName}
                                      onClick={() => handleAddParamDirect(activeInst.id, pName, pUnit, false)}
                                      className="text-xs"
                                    >
                                      <span className="flex-1 truncate">{pName}</span>
                                      {pUnit && (
                                        <span className="text-[10px] font-mono text-muted-foreground min-w-[1.5rem] text-right">
                                          {pUnit}
                                        </span>
                                      )}
                                    </DropdownMenuItem>
                                  );
                                }
                                return (
                                  <DropdownMenuSub key={pName}>
                                    <DropdownMenuSubTrigger className="text-xs">
                                      <span className="flex-1 truncate">{pName}</span>
                                      {pUnit && (
                                        <span className="text-[10px] font-mono text-muted-foreground min-w-[1.5rem] text-right">
                                          {pUnit}
                                        </span>
                                      )}
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent className="w-56">
                                      <DropdownMenuItem
                                        onClick={() => handleAddParamDirect(activeInst.id, pName, pUnit, false)}
                                        className="text-xs"
                                      >
                                        <div className="flex flex-col gap-0.5">
                                          <span className="font-medium">Manual entry</span>
                                          <span className="text-[10px] text-muted-foreground">Start blank</span>
                                        </div>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleAddParamDirect(activeInst.id, pName, pUnit, true)}
                                        className="text-xs"
                                      >
                                        <div className="flex flex-col gap-0.5">
                                          <span className="font-medium">Load example values</span>
                                          <span className="text-[10px] text-muted-foreground">Pre-filled sample readings</span>
                                        </div>
                                      </DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                  </DropdownMenuSub>
                                );
                              })}
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleAddParam(activeInst.id)}
                            className="text-xs"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Custom parameter…
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-zinc-400">
                    Select <span className="font-semibold">Make</span> and <span className="font-semibold">Model / Type</span> above, then add a parameter
                  </div>
                )}
              </div>
            );
          })()}

          {/* Measurement / Results tabs */}
          {activeParam && <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-zinc-800">
                  {activeParam.name || "Parameter"}
                </span>
                {activeParam.unit && (
                  <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full font-mono font-medium">
                    {activeParam.unit}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {view === "results" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowFormulas(true)}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                      >
                        <Info size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs">View calculation formulas</TooltipContent>
                  </Tooltip>
                )}
                <div className="flex rounded-lg border border-zinc-200 overflow-hidden text-[11px] font-medium">
                  <button
                    onClick={() => setView("readings")}
                    className={cn("px-3 py-1.5 transition-colors", view === "readings" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}
                  >
                    Readings
                  </button>
                  <button
                    onClick={() => setView("results")}
                    className={cn("px-3 py-1.5 transition-colors border-l border-border", view === "results" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}
                  >
                    Results
                  </button>
                </div>
              </div>
            </div>
            {view === "readings" ? (
              <MeasureTable
                param={activeParam}
                onUpdateParam={(updated) => updateParam(activeInstId, updated)}
                readOnly={viewMode}
              />
            ) : (
              <div className="p-4 space-y-4">
                <ResultsTable param={activeParam} />
                <CalcTrace param={activeParam} />
              </div>
            )}
          </div>}

          {/* Signatures */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-6 py-5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-8">
              Signatures
            </div>
            <div className="flex justify-between max-w-lg">
              {([
                {
                  label: "Calibration done by",
                  name: existingReport?.signatures?.calibratedBy?.signatureName || existingReport?.signatures?.calibratedBy?.name,
                },
                {
                  label: "Verified by",
                  name: existingReport?.signatures?.verifiedBy?.signatureName || existingReport?.signatures?.verifiedBy?.name,
                },
              ] as const).map(({ label, name }) => (
                <div key={label} className="flex flex-col items-center min-w-[140px]">
                  {name && (
                    <span className="text-sm font-semibold text-zinc-700 mb-3">{name}</span>
                  )}
                  <div className="w-full h-px bg-zinc-300 mb-2" />
                  <span className="text-xs text-zinc-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </>}
      </div>

      {/* ── Add parameter dialog ── */}
      <AddParamDialog
        open={panel?.type === "addParam"}
        instrumentKey={panel?.type === "addParam" ? panel.instrumentKey : ""}
        initialMode={panel?.type === "addParam" ? panel.initialMode : undefined}
        presets={instrumentPresets}
        paramConfigs={paramConfigs}
        equipmentParamNames={equipmentParamNames}
        onCancel={() => setPanel(null)}
        onConfirm={handleAddParamConfirm}
      />

      {/* ── Error panel (right) ── */}
      {formErrors.length > 0 && errorPanelOpen && (
        <div className="fixed top-0 right-0 w-72 h-screen bg-white border-l border-red-100 flex flex-col shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-red-100 bg-red-50">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-sm font-semibold text-red-700">
                {formErrors.length} issue{formErrors.length > 1 ? "s" : ""} to fix
              </span>
            </div>
            <Button variant="ghost" size="icon-xs" onClick={() => setErrorPanelOpen(false)} className="text-destructive/40 hover:text-destructive hover:bg-destructive/10">
              <X />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {formErrors.map((err, i) => (
              <button
                key={i}
                onClick={() => focusError(err)}
                className="w-full text-left flex gap-2.5 p-3 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 hover:border-red-200 transition-colors group"
              >
                <span className="shrink-0 mt-0.5 h-4 w-4 rounded-full bg-red-200 text-red-700 text-[10px] font-bold flex items-center justify-center group-hover:bg-red-300">
                  {i + 1}
                </span>
                <span className="text-xs text-red-800 leading-relaxed">{err.message}</span>
              </button>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-red-100 bg-red-50/50">
            <p className="text-[11px] text-red-400 leading-relaxed">
              Click an issue to jump to it. Fix all to save.
            </p>
          </div>
        </div>
      )}

      <UncertaintyFormulaModal open={showFormulas} onClose={() => setShowFormulas(false)} />

      {/* ── Unsaved changes exit dialog ── */}
      <Dialog open={exitDialog} onOpenChange={setExitDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-amber-500">⚠</span> Unsaved changes
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            You have unsaved changes. Save as a draft so you can continue later, or discard and leave.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              className="w-full"
              onClick={() => {
                setExitDialog(false);
                handleSave("draft");
              }}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save as draft
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                cleanSnapshot.current = { instruments, reportMeta };
                setExitDialog(false);
                router.push("/calibration");
              }}
            >
              Discard &amp; leave
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setExitDialog(false)}>
              Stay on page
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Revert changes confirmation dialog ── */}
      <Dialog open={revertDialog} onOpenChange={setRevertDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 text-amber-500" /> Revert changes
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            This will discard all unsaved edits and restore the report to its last saved state. This cannot be undone.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="destructive" className="w-full" onClick={handleRevert}>
              Revert to last saved
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setRevertDialog(false)}>
              Keep editing
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Joyride
        steps={tourSteps}
        run={tourRun}
        continuous
        onEvent={handleTourCallback}
        tooltipComponent={TourTooltip}
        options={{
          zIndex: 10000,
          overlayColor: "rgba(0,0,0,0.45)",
        }}
      />
    </div>
  );
}
