"use client";

import { useState, useEffect, useCallback, useRef, useMemo, FC, KeyboardEvent } from "react";
import { useGenerateCalibrationReport } from "@/app/hooks/mutation/useGenerateCalibrationReport";
import { useAuth } from "@/app/provider/AuthProvider";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useUpdateCalibrationReport } from "@/app/hooks/mutation/(calibration)/updateCalibrationReport";
import { useGetCalibrationReportById } from "@/app/hooks/query/(calibration)/useGetCalibReportById";
import { cn } from "@/lib/utils";
import { Plus, X, Loader2, ArrowLeft, FlaskConical, AlertCircle, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InstrumentMeta {
  csrNo: string;
  calDate: string;
  jobId: string;
  idNo: string;
  nomenclature: string;
  make: string;
  modelType: string;
  slNo: string;
  othersDetails: string;
  supplyVoltage: string;
  temperature: string;
  humidity: string;
  refStandard: string;
  refMake: string;
  refModel: string;
  refSrNo: string;
  refCalDue: string;
  refTraceability: string;
}

interface ComputedBudget {
  meanValue: number; error: number; stdUcMean: number; stdUncertainty: number;
  ucOfRefStd: number; ucDueToAccOfRefStd: number; ucDueToLcOfDuc: number;
  combinedUc: number; effectiveDof: number | null; kFactor: number;
  expandedUncertainty: number; scopeClaimed: number; resultedExpandedUc: number; percentUc: number;
}

interface Measurement {
  id: string;
  nomValue: string;
  readings: string[]; // always length 5
  corrected: string;
  computed: ComputedBudget | null;
}

interface Range {
  id: string;
  label: string;
  measurements: Measurement[];
}

interface Parameter {
  id: string;
  name: string;
  unit: string;
  ranges: Range[];
  isPredefined?: boolean;
}

interface Instrument {
  id: string;
  meta: InstrumentMeta;
  params: Parameter[];
}

type PanelState =
  | null
  | { type: "addInstrument" }
  | { type: "addParam"; instId: string };

interface FormError {
  message: string;
  instId?: string;
  paramId?: string;
  fieldId?: string;
}

// ─── Predefined parameter → range labels ──────────────────────────────────────

const PREDEFINED_PARAMS: Record<string, string[]> = {
  "AC Voltage @50Hz": ["4V/0.001", "40V/0.01", "400V/0.1", "1000V/1"],
  "DC Voltage":       ["400mV/0.1", "4V/0.001", "40V/0.01", "400V/0.1", "1000V/1"],
};

// ─── Constants ────────────────────────────────────────────────────────────────

const uid = (): string => Math.random().toString(36).slice(2, 9);
const emptyReadings = (): string[] => Array(5).fill("");

const isNumericInput = (v: string) => v === "" || /^-?\d*\.?\d*$/.test(v);

// Reading must be ≤ its own nom value (DUC always reads slightly below the set reference value)
function isOutOfRange(val: string, nomValue: string): boolean {
  if (val === "" || nomValue === "") return false;
  const reading = parseFloat(val);
  const nom = parseFloat(nomValue);
  if (isNaN(reading) || isNaN(nom)) return false;
  return reading > nom;
}

const BLANK_META: InstrumentMeta = {
  csrNo: "", calDate: "", jobId: "", idNo: "NA",
  nomenclature: "", make: "", modelType: "", slNo: "", othersDetails: "NA",
  supplyVoltage: "", temperature: "", humidity: "",
  refStandard: "", refMake: "", refModel: "", refSrNo: "", refCalDue: "", refTraceability: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcMean(readings: string[]): string | null {
  const nums = readings.map(Number).filter((n) => !isNaN(n) && n !== 0);
  if (!nums.length) return null;
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(4);
}

function makeMeasurement(): Measurement {
  return { id: uid(), nomValue: "", readings: emptyReadings(), corrected: "", computed: null };
}

function makeParam(name = "", unit = ""): Parameter {
  const predefinedLabels = PREDEFINED_PARAMS[name];
  if (predefinedLabels) {
    return {
      id: uid(), name, unit, isPredefined: true,
      ranges: predefinedLabels.map((label) => ({ id: uid(), label, measurements: [makeMeasurement(), makeMeasurement()] })),
    };
  }
  return { id: uid(), name, unit, ranges: [{ id: uid(), label: "", measurements: [makeMeasurement(), makeMeasurement()] }] };
}

function makeInstrument(meta: InstrumentMeta = BLANK_META): Instrument {
  return { id: uid(), meta: { ...meta }, params: [makeParam()] };
}

// ─── Field ────────────────────────────────────────────────────────────────────

const Field: FC<{
  label: string;
  k: keyof InstrumentMeta;
  type?: string;
  span2?: boolean;
  span3?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  meta: InstrumentMeta;
  showErrors?: boolean;
  touched?: Set<string>;
  onTouch?: (key: string) => void;
  onChange: (key: keyof InstrumentMeta, val: string) => void;
}> = ({ label, k, type = "text", span2, span3, required, autoFocus, meta, showErrors, touched, onTouch, onChange }) => {
  const isTouched = touched?.has(k) ?? false;
  const hasError = required && (showErrors || isTouched) && !String(meta[k]).trim();
  return (
    <div className={cn("flex flex-col gap-1.5", span2 && "col-span-2", span3 && "col-span-3")}>
      <Label htmlFor={`field-${k}`} className={cn("text-[10px] font-semibold uppercase tracking-widest", hasError ? "text-destructive" : "text-muted-foreground")}>
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <Input
        id={`field-${k}`}
        type={type}
        value={meta[k]}
        autoFocus={autoFocus}
        aria-invalid={hasError}
        onChange={(e) => onChange(k, e.target.value)}
        onBlur={() => required && onTouch?.(k)}
      />
      {hasError && <span className="text-[10px] text-destructive">This field is required</span>}
    </div>
  );
};

// ─── Section divider ──────────────────────────────────────────────────────────

const SectionLabel: FC<{ label: string }> = ({ label }) => (
  <div className="col-span-4 pt-2 border-t border-zinc-100">
    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{label}</span>
  </div>
);

// ─── MetaGrid ─────────────────────────────────────────────────────────────────

const CollapsibleSection: FC<{
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ label, open, onToggle, children }) => (
  <>
    <div className="col-span-4 pt-1 border-t border-border">
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
  showErrors?: boolean;
  autoFocusCsr?: boolean;
  touched?: Set<string>;
  onTouch?: (key: string) => void;
  onChange: (key: keyof InstrumentMeta, val: string) => void;
}> = ({ meta, showErrors, autoFocusCsr, touched, onTouch, onChange }) => {
  const [envOpen, setEnvOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const sharedProps = { meta, showErrors, touched, onTouch, onChange };
  return (
    <div className="grid grid-cols-4 gap-x-4 gap-y-3">
      <Field label="CSR No"              k="csrNo"         {...sharedProps} required autoFocus={autoFocusCsr} />
      <Field label="Cal Date"            k="calDate"       {...sharedProps} type="date" />
      <Field label="Job ID"              k="jobId"         {...sharedProps} />
      <Field label="ID No"               k="idNo"          {...sharedProps} />
      <Field label="Nomenclature of DUC" k="nomenclature"  {...sharedProps} span2 required />
      <Field label="Make"                k="make"          {...sharedProps} />
      <Field label="Model / Type"        k="modelType"     {...sharedProps} />
      <Field label="Sl. No"              k="slNo"          {...sharedProps} />
      <Field label="Other Details"       k="othersDetails" {...sharedProps} span2 />

      <CollapsibleSection label="Environmental Conditions" open={envOpen} onToggle={() => setEnvOpen((v) => !v)}>
        <Field label="Supply Voltage (V)" k="supplyVoltage" {...sharedProps} />
        <Field label="Temperature (°C)"   k="temperature"   {...sharedProps} />
        <Field label="Humidity (%RH)"     k="humidity"      {...sharedProps} />
      </CollapsibleSection>

      <CollapsibleSection label="Reference Standard Used" open={refOpen} onToggle={() => setRefOpen((v) => !v)}>
        <Field label="Reference Standard" k="refStandard"    {...sharedProps} span2 />
        <Field label="Make"               k="refMake"        {...sharedProps} />
        <Field label="Model / Type"       k="refModel"       {...sharedProps} />
        <Field label="Sr. No"             k="refSrNo"        {...sharedProps} />
        <Field label="Cal Due Date"       k="refCalDue"      {...sharedProps} type="date" />
        <Field label="Traceability"       k="refTraceability" {...sharedProps} span2 />
      </CollapsibleSection>
    </div>
  );
};

// ─── MeasureTable ─────────────────────────────────────────────────────────────

const MeasureTable: FC<{
  param: Parameter;
  onUpdateParam: (updated: Parameter) => void;
}> = ({ param, onUpdateParam }) => {
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
            <th rowSpan={2} className="px-3 py-2.5 bg-zinc-50 border border-zinc-200 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
              Reading
            </th>
            <th rowSpan={2} className="px-2 py-2.5 bg-zinc-50 border border-zinc-200 text-center text-[11px] font-semibold text-zinc-500">
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
                      onChange={(e) => { if (isNumericInput(e.target.value)) updateMeasurement(r.id, m.id, { nomValue: e.target.value }); }}
                      placeholder="Set/Nom"
                      className="flex-1 min-w-0 h-6 font-mono text-[11px] text-center bg-background border border-border rounded px-1 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 placeholder:text-muted-foreground/40"
                    />
                    {r.measurements.length > 1 && (
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
            <tr key={ri} className={ri % 2 === 1 ? "bg-zinc-50/60" : ""}>
              <td className="px-3 py-1.5 border border-zinc-200 text-[11px] text-zinc-400">
                {ri === 0 && (
                  <span className="text-[10px] uppercase tracking-wide">Measured value</span>
                )}
              </td>
              <td className="px-2 py-1.5 border border-zinc-200 text-center font-mono text-[11px] text-zinc-400">
                {ri + 1}
              </td>
              {param.ranges.flatMap((r) =>
                r.measurements.map((m) => {
                  const val = m.readings[ri];
                  const readingError = isOutOfRange(val, m.nomValue);
                  return (
                  <td key={m.id} className={cn("border border-border p-0", readingError && "bg-destructive/5")}>
                    <Tooltip open={readingError ? undefined : false}>
                      <TooltipTrigger asChild>
                        <input
                          id={`reading-${m.id}-${ri}`}
                          data-reading-input="true"
                          value={val}
                          onChange={(e) => { if (isNumericInput(e.target.value)) updateReading(r.id, m.id, ri, e.target.value); }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const all = Array.from(document.querySelectorAll<HTMLInputElement>("[data-reading-input]"));
                              const idx = all.indexOf(e.currentTarget);
                              if (idx >= 0 && idx < all.length - 1) all[idx + 1].focus();
                            }
                          }}
                          placeholder="—"
                          className={cn("w-full font-mono text-[12px] text-center bg-transparent border-none outline-none py-2 px-2 placeholder:text-muted-foreground/20", readingError ? "text-destructive font-semibold" : "")}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top">Must be ≤ {m.nomValue}</TooltipContent>
                    </Tooltip>
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
                const hasErr = m.readings.some((v) => isOutOfRange(v, m.nomValue));
                const allFilled = filled === 5 && !hasErr;
                return (
                  <td key={m.id} className="border border-border text-center py-1.5">
                    {filled === 0 ? (
                      <span className="text-[10px] text-muted-foreground/40">—</span>
                    ) : hasErr ? (
                      <Badge variant="destructive" className="text-[10px] gap-1 px-1.5 py-0"><X className="size-2.5" />Invalid</Badge>
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
          <tr className="bg-blue-50/70 border-t-2 border-blue-100">
            <td colSpan={2} className="px-3 py-2.5 border border-zinc-200 font-semibold text-xs text-zinc-700">
              Mean value
            </td>
            {param.ranges.flatMap((r) =>
              r.measurements.map((m) => {
                const mean = calcMean(m.readings);
                return (
                  <td
                    key={m.id}
                    className={cn(
                      "border border-zinc-200 text-center font-mono text-xs font-semibold py-2",
                      mean ? "text-blue-700" : "text-zinc-300"
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
          <tr className="border-t border-zinc-200">
            <td colSpan={2} className="px-3 py-2.5 border border-zinc-200">
              <div className="font-semibold text-xs text-zinc-700">Corrected value</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">After correction factor</div>
            </td>
            {param.ranges.flatMap((r) =>
              r.measurements.map((m) => (
                <td key={m.id} className="border border-zinc-200 p-0">
                  <input
                    value={m.corrected}
                    onChange={(e) => updateMeasurement(r.id, m.id, { corrected: e.target.value })}
                    placeholder="NA"
                    className="w-full font-mono text-xs text-center bg-transparent border-none outline-none py-2 px-2 text-zinc-900 placeholder:text-zinc-300"
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
      Save the report to compute uncertainty budget values.
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
                  const val = m.computed![row.key];
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
        </tbody>
      </table>
    </div>
  );
};

// ─── Sidebar: instrument + its params ─────────────────────────────────────────

const SbInstrument: FC<{
  inst: Instrument;
  isActive: boolean;
  activeParamId: string;
  onSelectInstrument: (id: string) => void;
  onSelectParam: (instId: string, paramId: string) => void;
  onRemoveInstrument: (id: string) => void;
  onRemoveParam: (instId: string, paramId: string) => void;
  onAddParam: (instId: string) => void;
}> = ({ inst, isActive, activeParamId, onSelectInstrument, onSelectParam, onRemoveInstrument, onRemoveParam, onAddParam }) => {
  const label = inst.meta.nomenclature || inst.meta.make || "Unnamed instrument";
  const sub   = [inst.meta.make, inst.meta.modelType].filter(Boolean).join(" · ");

  return (
    <div className="mb-1">
      <div
        onClick={() => { onSelectInstrument(inst.id); onSelectParam(inst.id, inst.params[0].id); }}
        className={cn(
          "flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer group transition-all",
          isActive
            ? "bg-zinc-100 border border-zinc-200"
            : "border border-transparent hover:bg-zinc-50 hover:border-zinc-100"
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-zinc-900 truncate">{label}</div>
          {sub && <div className="text-[10px] text-zinc-400 mt-0.5 truncate">{sub}</div>}
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {inst.meta.csrNo || "No CSR yet"}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemoveInstrument(inst.id); }}
          className="ml-1.5 p-0.5 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {isActive && (
        <div className="ml-3 mt-1 border-l border-zinc-200 pl-2">
          {inst.params.map((p) => {
            const pActive = p.id === activeParamId;
            return (
              <div
                key={p.id}
                onClick={() => onSelectParam(inst.id, p.id)}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 rounded-md mb-0.5 cursor-pointer group transition-all",
                  pActive
                    ? "bg-blue-50 border border-blue-100"
                    : "border border-transparent hover:bg-zinc-50"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className={cn(
                    "text-xs truncate",
                    pActive ? "font-semibold text-blue-700" : "text-zinc-500"
                  )}>
                    {p.name || "Unnamed parameter"}
                  </div>
                  {p.unit && (
                    <div className="text-[10px] text-zinc-400 font-mono">{p.unit}</div>
                  )}
                </div>
                {inst.params.length > 1 && (
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

          <Button variant="outline" size="xs" onClick={() => onAddParam(inst.id)} className="w-full border-dashed mt-1 text-muted-foreground">
            <Plus />Add parameter
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── Add-instrument choice panel ──────────────────────────────────────────────

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
          {currentMeta.nomenclature} · {currentMeta.csrNo || "no CSR"}
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

// ─── Add-parameter panel ──────────────────────────────────────────────────────

const AddParamPanel: FC<{
  onCancel: () => void;
  onConfirm: (name: string, unit: string) => void;
}> = ({ onCancel, onConfirm }) => {
  const [mode,  setMode]  = useState<"pick" | "custom">("pick");
  const [name,  setName]  = useState("");
  const [unit,  setUnit]  = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (mode === "custom") setTimeout(() => nameRef.current?.focus(), 60); }, [mode]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && name.trim()) onConfirm(name.trim(), unit.trim());
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">
        New parameter
      </div>

      {mode === "pick" ? (
        <>
          {Object.keys(PREDEFINED_PARAMS).map((pName) => (
            <button
              key={pName}
              onClick={() => onConfirm(pName, "V")}
              className="text-left px-3 py-2.5 rounded-lg border border-border bg-muted/40 hover:bg-accent transition-colors"
            >
              <div className="text-xs font-semibold">{pName}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {PREDEFINED_PARAMS[pName].join(" · ")}
              </div>
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={() => setMode("custom")} className="w-full border-dashed justify-start">
            + Custom parameter
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel} className="w-full">Cancel</Button>
        </>
      ) : (
        <>
          <Input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={handleKey} placeholder="Parameter name" className="text-xs" />
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} onKeyDown={handleKey} placeholder="Unit (V, mA, Ω…)" className="text-xs" />
          <div className="flex gap-2 mt-1">
            <Button variant="outline" size="sm" onClick={() => setMode("pick")} className="flex-1">Back</Button>
            <Button size="sm" onClick={() => name.trim() && onConfirm(name.trim(), unit.trim())} disabled={!name.trim()} className="flex-1">Add</Button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Payload mapper ───────────────────────────────────────────────────────────

function buildPayload(instruments: Instrument[], status: "draft" | "submitted", createdBy: string) {
  const csrNo = instruments[0]?.meta.csrNo ?? "";

  return {
    csrNo,
    status,
    createdBy,
    instruments: instruments.map((inst) => ({
      nomenclature:  inst.meta.nomenclature,
      make:          inst.meta.make,
      modelType:     inst.meta.modelType,
      slNo:          inst.meta.slNo,
      idNo:          inst.meta.idNo,
      othersDetails: inst.meta.othersDetails,
      jobId:         inst.meta.jobId,
      calDate:       inst.meta.calDate || undefined,
      environmental: {
        supplyVoltage: inst.meta.supplyVoltage,
        temperature:   inst.meta.temperature,
        humidity:      inst.meta.humidity,
      },
      refStandard: {
        name:         inst.meta.refStandard,
        make:         inst.meta.refMake,
        modelType:    inst.meta.refModel,
        srNo:         inst.meta.refSrNo,
        calDueDate:   inst.meta.refCalDue || undefined,
        traceability: inst.meta.refTraceability,
      },
      parameters: inst.params.map((p) => ({
        name:   p.name,
        unit:   p.unit,
        ranges: p.ranges.map((r) => ({
          label: r.label,
          measurements: r.measurements.map((m) => ({
            nomValue:  m.nomValue === "" ? null : Number(m.nomValue),
            readings:  m.readings.map((v) => (v === "" ? null : Number(v))),
            corrected: m.corrected,
          })),
        })),
      })),
    })),
    signatures: {},
  };
}

// ─── API response → frontend state mapper ────────────────────────────────────

function mapApiToInstruments(apiReport: any): Instrument[] {
  return (apiReport.instruments ?? []).map((inst: any) => ({
    id: inst._id ?? uid(),
    meta: {
      csrNo:          apiReport.csrNo ?? "",
      calDate:        inst.calDate ? inst.calDate.slice(0, 10) : "",
      jobId:          inst.jobId ?? "",
      idNo:           inst.idNo ?? "NA",
      nomenclature:   inst.nomenclature ?? "",
      make:           inst.make ?? "",
      modelType:      inst.modelType ?? "",
      slNo:           inst.slNo ?? "",
      othersDetails:  inst.othersDetails ?? "NA",
      supplyVoltage:  inst.environmental?.supplyVoltage ?? "",
      temperature:    inst.environmental?.temperature ?? "",
      humidity:       inst.environmental?.humidity ?? "",
      refStandard:    inst.refStandard?.name ?? "",
      refMake:        inst.refStandard?.make ?? "",
      refModel:       inst.refStandard?.modelType ?? "",
      refSrNo:        inst.refStandard?.srNo ?? "",
      refCalDue:      inst.refStandard?.calDueDate ? inst.refStandard.calDueDate.slice(0, 10) : "",
      refTraceability: inst.refStandard?.traceability ?? "",
    },
    params: (inst.parameters ?? []).map((p: any) => ({
      id:          p._id ?? uid(),
      name:        p.name ?? "",
      unit:        p.unit ?? "",
      isPredefined: Boolean(PREDEFINED_PARAMS[p.name]),
      ranges: (p.ranges ?? []).map((r: any) => ({
        id:    r._id ?? uid(),
        label: r.label ?? "",
        measurements: (r.measurements ?? []).map((m: any) => ({
          id:        m._id ?? uid(),
          nomValue:  m.nomValue != null ? String(m.nomValue) : "",
          readings:  Array(5).fill("").map((_, i) =>
            m.readings?.[i] != null ? String(m.readings[i]) : ""
          ),
          corrected: m.corrected ?? "",
          computed:  m.computed ?? null,
        })),
      })),
    })),
  }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface CalibrationReportPageProps {
  reportId?: string;
}

export default function CalibrationReportPage({ reportId }: CalibrationReportPageProps) {
  const isEditMode = Boolean(reportId);

  const router = useRouter();
  const { mutate: generateCalibrationReport, isPending: isCreating } = useGenerateCalibrationReport();
  const { mutate: updateCalibrationReport,   isPending: isUpdating  } = useUpdateCalibrationReport();
  const isPending = isCreating || isUpdating;

  const { data: existingReport, isLoading: isLoadingReport } = useGetCalibrationReportById(reportId ?? "");

  const blankInstrument = useMemo((): Instrument => {
    const mkM = (nom: string, r: string[]): Measurement => ({
      id: uid(), nomValue: nom, corrected: "", computed: null,
      readings: r.slice(0, 5),
    });
    return {
      id: uid(), meta: { ...BLANK_META },
      params: [{
        id: uid(), name: "AC Voltage @50Hz", unit: "V", isPredefined: true,
        ranges: [
          { id: uid(), label: "4V/0.001",  measurements: [mkM("0.5", ["0.497","0.498","0.499","0.496","0.495"]),  mkM("3.5",  ["3.494","3.497","3.493","3.493","3.493"])] },
          { id: uid(), label: "40V/0.01",  measurements: [mkM("5",   ["4.97", "4.98", "4.99", "4.94", "4.97"]),   mkM("35",   ["34.95","34.96","34.97","34.94","34.93"])] },
          { id: uid(), label: "400V/0.1",  measurements: [mkM("50",  ["49.9", "50.0", "49.8", "49.6", "49.9"]),   mkM("350",  ["349.8","349.9","349.7","349.7","349.6"])] },
          { id: uid(), label: "1000V/1",   measurements: [mkM("500", ["498",  "499",  "498",  "497",  "498"]),    mkM("950",  ["947",  "948",  "948",  "946",  "946"])] },
        ],
      }],
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [instruments,   setInstruments]   = useState<Instrument[]>([blankInstrument]);
  const [activeInstId,  setActiveInstId]  = useState<string>(blankInstrument.id);
  const [activeParamId, setActiveParamId] = useState<string>(blankInstrument.params[0].id);
  const [panel,         setPanel]         = useState<PanelState>(null);
  const [hydrated,      setHydrated]      = useState(false);
  const [view,          setView]          = useState<"readings" | "results">("readings");
  const [formErrors,    setFormErrors]    = useState<FormError[]>([]);
  const [errorPanelOpen, setErrorPanelOpen] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!existingReport || hydrated) return;
    const mapped = mapApiToInstruments(existingReport);
    if (!mapped.length) return;
    // If the first instrument has only one unnamed/empty parameter, replace with AC default
    const first = mapped[0];
    if (first.params.length === 1 && !first.params[0].name.trim()) {
      first.params = blankInstrument.params.map((p) => ({ ...p, id: uid() }));
    }
    setInstruments(mapped);
    setActiveInstId(first.id);
    setActiveParamId(first.params[0].id);
    setHydrated(true);
  }, [existingReport, hydrated, blankInstrument.params]);

  const activeInst  = instruments.find((i) => i.id === activeInstId)  ?? instruments[0];
  const activeParam = activeInst.params.find((p) => p.id === activeParamId) ?? activeInst.params[0];

  const { user } = useAuth();
  const userId = user?.id ?? (user as any)?._id ?? null;

  function validate(): FormError[] {
    const errors: FormError[] = [];
    for (const inst of instruments) {
      if (!inst.meta.csrNo.trim())
        errors.push({ message: "CSR No is required", instId: inst.id, fieldId: "field-csrNo" });
      if (!inst.meta.nomenclature.trim())
        errors.push({ message: "Nomenclature of DUC is required", instId: inst.id, fieldId: "field-nomenclature" });
      for (const p of inst.params) {
        if (!p.name.trim())
          errors.push({ message: `Parameter "${p.name || "unnamed"}" has no name`, instId: inst.id, paramId: p.id, fieldId: `param-name-${p.id}` });
        for (const r of p.ranges) {
          for (const m of r.measurements) {
            if (!m.nomValue) continue;
            m.readings.forEach((v, ri) => {
              if (isOutOfRange(v, m.nomValue))
                errors.push({
                  message: `Reading ${v} > nom ${m.nomValue} in "${r.label}" column ${ri + 1}`,
                  instId: inst.id, paramId: p.id, fieldId: `reading-${m.id}-${ri}`,
                });
            });
          }
        }
      }
    }
    return errors;
  }

  // Re-run validation live whenever instruments change (only while errors exist)
  useEffect(() => {
    if (formErrors.length === 0) return;
    const next = validate();
    setFormErrors(next);
    if (next.length === 0) setErrorPanelOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instruments]);

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

  function handleSave(status: "draft" | "submitted") {
    if (!userId) { toast.error("You must be logged in to save a report"); return; }
    const errors = validate();
    if (errors.length) {
      setFormErrors(errors);
      setErrorPanelOpen(true);
      focusError(errors[0]);
      return;
    }
    setFormErrors([]);
    setErrorPanelOpen(false);
    setTouchedFields(new Set());

    const payload = buildPayload(instruments, status, userId);

    const successMsg = status === "draft"
      ? "Draft saved successfully"
      : "Report submitted for verification";

    const onSuccess = () => {
      toast.success(successMsg);
      if (status === "draft" && isEditMode) {
        setView("results");
        setHydrated(false); // re-hydrate to get computed values back
      } else {
        router.push("/calibration");
      }
    };

    const onError = (err: any) => {
      const msg = err?.response?.data?.message ?? "Failed to save report";
      const is409 = err?.response?.status === 409;
      toast.error(is409 ? "CSR number already exists. Use a different CSR No." : msg);
    };

    if (isEditMode && reportId) {
      updateCalibrationReport({ reportId, ...payload }, { onSuccess, onError });
    } else {
      generateCalibrationReport(payload, { onSuccess, onError });
    }
  }

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
    if (activeInstId === id) { setActiveInstId(rem[0].id); setActiveParamId(rem[0].params[0].id); }
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
    setActiveParamId(newInst.params[0].id);
    setPanel(null);
  };

  const handleAddParam = (instId: string) => {
    setActiveInstId(instId);
    setPanel({ type: "addParam", instId });
  };

  const handleAddParamConfirm = (name: string, unit: string) => {
    if (panel?.type !== "addParam") return;
    const p = makeParam(name, unit);
    setInstruments((ins) =>
      ins.map((i) => i.id !== panel.instId ? i : { ...i, params: [...i.params, p] })
    );
    setActiveInstId(panel.instId);
    setActiveParamId(p.id);
    setPanel(null);
  };

  // ── Loading state ──
  if (isEditMode && isLoadingReport) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="flex flex-col items-center gap-3 text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading report…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">

      {/* ── Sidebar ── */}
      <div className="w-60 shrink-0 bg-white border-r border-zinc-200 flex flex-col min-h-screen shadow-sm">

        {/* Brand header */}
        <div className="px-4 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5 mb-3">
            <Link
              href="/calibration"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zinc-900 truncate">Jost's Engineering</div>
              <div className="text-[11px] text-zinc-400">Calibration Lab · Kolkata</div>
            </div>
          </div>
          <span className={cn(
            "inline-flex text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border",
            isEditMode
              ? "bg-amber-50 text-amber-600 border-amber-200"
              : "bg-blue-50 text-blue-600 border-blue-200"
          )}>
            {isEditMode ? "Editing report" : "New report"}
          </span>
        </div>

        {/* Instruments label */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Instruments
          </span>
          <span className="text-[10px] text-zinc-400 font-mono bg-zinc-100 px-1.5 py-0.5 rounded">
            {instruments.length}
          </span>
        </div>

        {/* Instrument list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {instruments.map((inst) => (
            <SbInstrument
              key={inst.id}
              inst={inst}
              isActive={inst.id === activeInstId}
              activeParamId={activeParamId}
              onSelectInstrument={(id) => { setActiveInstId(id); setPanel(null); }}
              onSelectParam={(instId, paramId) => { setActiveInstId(instId); setActiveParamId(paramId); setPanel(null); }}
              onRemoveInstrument={removeInstrument}
              onRemoveParam={removeParam}
              onAddParam={handleAddParam}
            />
          ))}
        </div>

        {/* Bottom panel */}
        <div className="border-t border-zinc-100 p-3">
          {panel?.type === "addInstrument" ? (
            <AddInstrumentPanel
              currentMeta={activeInst.meta}
              onCancel={() => setPanel(null)}
              onConfirm={handleAddInstrumentConfirm}
            />
          ) : panel?.type === "addParam" ? (
            <AddParamPanel
              onCancel={() => setPanel(null)}
              onConfirm={handleAddParamConfirm}
            />
          ) : (
            <Button variant="outline" className="w-full border-dashed" onClick={() => setPanel({ type: "addInstrument" })}>
              <Plus />Add instrument
            </Button>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-x-auto flex flex-col">

        {/* Sticky top bar */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-zinc-200 px-8 py-3.5 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <FlaskConical className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 truncate">
                {activeInst.meta.nomenclature || "Instrument"} · {activeInst.meta.csrNo || "No CSR"}
              </span>
              {/* Completion indicator — only shown when something is missing */}
              {(() => {
                const missing: string[] = [];
                instruments.forEach((inst) => {
                  if (!inst.meta.csrNo.trim()) missing.push("CSR No");
                  if (!inst.meta.nomenclature.trim()) missing.push("Nomenclature");
                });
                if (!missing.length) return null;
                const label = missing.length === 1 ? `${missing[0]} missing` : `${missing.length} required fields missing`;
                return (
                  <Badge variant="in_progress" className="ml-1 text-[10px]">{label}</Badge>
                );
              })()}
            </div>
            <input
              id={`param-name-${activeParam.id}`}
              value={activeParam.name}
              onChange={(e) => !activeParam.isPredefined && updateParam(activeInstId, { ...activeParam, name: e.target.value })}
              readOnly={activeParam.isPredefined}
              placeholder="Parameter name"
              className="text-lg font-semibold text-zinc-900 bg-transparent border-none outline-none w-full leading-tight placeholder:text-zinc-300"
            />
            <div className="text-xs text-zinc-400 mt-0.5">
              JECL/KOL/LAB/FM/36B · {activeInst.meta.calDate || "No date set"}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 border-r border-zinc-200 pr-3">
              <span className="text-xs text-zinc-400">Unit</span>
              <input
                value={activeParam.unit}
                onChange={(e) => updateParam(activeInstId, { ...activeParam, unit: e.target.value })}
                placeholder="V"
                className="w-16 h-8 font-mono text-sm text-center rounded-lg border border-zinc-200 bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSave("draft")} disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : null}
                {isPending ? "Saving…" : "Save draft"}
              </Button>
              <div className="relative">
                <Button onClick={() => handleSave("submitted")} disabled={isPending}>
                  Submit report
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
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 px-8 py-6 space-y-4">

          {/* Instrument details section */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/50">
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
                showErrors={formErrors.length > 0}
                autoFocusCsr={!isEditMode}
                touched={touchedFields}
                onTouch={handleTouch}
                onChange={updateMeta}
              />
            </div>
          </div>

          {/* Measurement / Results tabs */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/50">
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
              <div className="flex rounded-lg border border-zinc-200 overflow-hidden text-[11px] font-medium">
                <button
                  onClick={() => setView("readings")}
                  className={cn("px-3 py-1.5 transition-colors", view === "readings" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50")}
                >
                  Readings
                </button>
                <button
                  onClick={() => setView("results")}
                  className={cn("px-3 py-1.5 transition-colors border-l border-zinc-200", view === "results" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50")}
                >
                  Results
                </button>
              </div>
            </div>
            {view === "readings" ? (
              <MeasureTable
                param={activeParam}
                onUpdateParam={(updated) => updateParam(activeInstId, updated)}
              />
            ) : (
              <div className="p-4">
                <ResultsTable param={activeParam} />
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="bg-white rounded-xl border border-zinc-200 px-6 py-5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-8">
              Signatures
            </div>
            <div className="flex justify-between max-w-lg">
              {(["Calibration done by", "Verified by"] as const).map((label) => (
                <div key={label} className="flex flex-col items-center min-w-[140px]">
                  <div className="w-full h-px bg-zinc-300 mb-2" />
                  <span className="text-xs text-zinc-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}
