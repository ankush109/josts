"use client";

import { useState, useEffect, useCallback, useRef, useMemo, FC, KeyboardEvent } from "react";
import { useGenerateCalibrationReport } from "@/app/hooks/mutation/useGenerateCalibrationReport";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/provider/AuthProvider";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useUpdateCalibrationReport } from "@/app/hooks/mutation/(calibration)/updateCalibrationReport";
import { useComputeCalibration } from "@/app/hooks/mutation/(calibration)/useComputeCalibration";
import { useGetCalibrationReportById } from "@/app/hooks/query/(calibration)/useGetCalibReportById";
import { cn } from "@/lib/utils";
import { Plus, X, Loader2, ArrowLeft, FlaskConical, AlertCircle, ChevronDown, ChevronRight, CheckCircle2, Calculator } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetCalibrationReports } from "@/app/hooks/query/useCalibrationReport";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportMeta {
  certNo: string;
  customerName: string;
  customerAddress: string;
  customerRefNo: string;
  ducReceivedDate: string;
  calibrationLocation: "onsite" | "at_lab";
  dateOfCalibration: string;
  calibrationDueDate: string;
}

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
  | { type: "addParam"; instId: string; instrumentKey: string };

interface FormError {
  message: string;
  instId?: string;
  paramId?: string;
  fieldId?: string;
}

// ─── Parameter type keys ─────────────────────────────────────────────────────
// Must stay in sync with PARAM_TYPES in server/src/v1/constants/voltage-ranges.js

const PARAM_TYPES = {
  DC_VOLTAGE:            "DC Voltage",
  AC_VOLTAGE_50HZ:       "AC Voltage @50Hz",
  DC_CURRENT:            "DC Current",
  AC_CURRENT_50HZ:       "AC Current @50Hz",
  RESISTANCE:            "Resistance",
  CLAMP_AC_CURRENT_50HZ: "Clamp Meter AC Current @50Hz",
  AC_VOLTAGE:            "AC Voltage",
  AUX_DC_VOLTAGE:        "AUX. DC Voltage",
} as const;

// ─── modelType dropdown value → INSTRUMENT_CONSTANTS key ─────────────────────
const MODEL_TO_INSTRUMENT_KEY: Record<string, string> = {
  "8846A": "Fluke 8846A",
  "780":   "SVERKER 780",
};

// ─── Per-instrument presets (ranges + units + sample readings) ────────────────

type SampleMeasurement = [string, string[]];

interface InstrumentPreset {
  params:  Record<string, string[]>;
  units:   Record<string, string>;
  samples: Record<string, SampleMeasurement[][]>;
}

const INSTRUMENT_PRESETS: Record<string, InstrumentPreset> = {
  "Fluke 8846A": {
    params: {
      [PARAM_TYPES.AC_VOLTAGE_50HZ]: ["4V/0.001", "40V/0.01", "400V/0.1", "1000V/1"],
      [PARAM_TYPES.DC_VOLTAGE]:      ["400mV/0.1", "4V/0.001", "40V/0.01", "400V/0.1", "1000V/1"],
      [PARAM_TYPES.AC_CURRENT_50HZ]: ["40mA/0.01", "400mA/0.1", "4A/0.001", "10A/0.01"],
      [PARAM_TYPES.DC_CURRENT]:      ["40mA/0.01", "400mA/0.1", "4A/0.001", "10A/0.01"],
      [PARAM_TYPES.RESISTANCE]:      ["400Ω/0.1", "4KΩ/0.001", "40KΩ/0.01", "400KΩ/0.1"],
    },
    units: {
      [PARAM_TYPES.AC_VOLTAGE_50HZ]: "V",
      [PARAM_TYPES.DC_VOLTAGE]:      "V",
      [PARAM_TYPES.AC_CURRENT_50HZ]: "mA",
      [PARAM_TYPES.DC_CURRENT]:      "mA",
      [PARAM_TYPES.RESISTANCE]:      "Ω",
    },
    samples: {
      [PARAM_TYPES.AC_VOLTAGE_50HZ]: [
        [["0.5",  ["0.497","0.498","0.499","0.496","0.495"]], ["3.5",  ["3.494","3.497","3.493","3.493","3.493"]]],
        [["5",    ["4.97", "4.98", "4.99", "4.94", "4.97"]], ["35",   ["34.95","34.96","34.97","34.94","34.93"]]],
        [["50",   ["49.9", "50.0", "49.8", "49.6", "49.9"]], ["350",  ["349.8","349.9","349.7","349.7","349.6"]]],
        [["500",  ["498",  "499",  "498",  "497",  "498" ]], ["950",  ["947",  "948",  "948",  "946",  "946" ]]],
      ],
      [PARAM_TYPES.DC_VOLTAGE]: [
        [["0.1",  ["0.0997","0.0998","0.0996","0.0997","0.0995"]], ["0.35", ["0.3496","0.3497","0.3494","0.3495","0.3493"]]],
        [["0.5",  ["0.497", "0.498", "0.499", "0.496", "0.497" ]], ["3.5",  ["3.494", "3.497", "3.493", "3.494", "3.493" ]]],
        [["5",    ["4.97",  "4.98",  "4.99",  "4.94",  "4.97"  ]], ["35",   ["34.95", "34.96", "34.97", "34.94", "34.93" ]]],
        [["50",   ["49.9",  "50.0",  "49.8",  "49.6",  "49.9"  ]], ["350",  ["349.8", "349.9", "349.7", "349.7", "349.6" ]]],
        [["500",  ["498",   "499",   "498",   "497",   "498"   ]], ["950",  ["947",   "948",   "948",   "946",   "946"   ]]],
      ],
      [PARAM_TYPES.AC_CURRENT_50HZ]: [
        [["20",   ["19.97","19.98","19.96","19.97","19.95"]], ["35",   ["34.95","34.96","34.94","34.95","34.93"]]],
        [["200",  ["199.8","199.9","199.7","199.8","199.6"]], ["350",  ["349.8","349.9","349.7","349.8","349.6"]]],
        [["2",    ["1.997","1.998","1.996","1.997","1.995"]], ["3.5",  ["3.495","3.496","3.494","3.495","3.493"]]],
        [["5",    ["4.97", "4.98", "4.96", "4.97", "4.95"]], ["9",    ["8.97", "8.98", "8.96", "8.97", "8.95"]]],
      ],
      [PARAM_TYPES.DC_CURRENT]: [
        [["20",   ["19.97","19.98","19.96","19.97","19.95"]], ["35",   ["34.95","34.96","34.94","34.95","34.93"]]],
        [["200",  ["199.8","199.9","199.7","199.8","199.6"]], ["350",  ["349.8","349.9","349.7","349.8","349.6"]]],
        [["2",    ["1.997","1.998","1.996","1.997","1.995"]], ["3.5",  ["3.495","3.496","3.494","3.495","3.493"]]],
        [["5",    ["4.97", "4.98", "4.96", "4.97", "4.95"]], ["9",    ["8.97", "8.98", "8.96", "8.97", "8.95"]]],
      ],
      [PARAM_TYPES.RESISTANCE]: [
        [["100",  ["99.9", "100.0","99.8", "99.9", "99.7"]], ["350",  ["349.8","349.9","349.7","349.8","349.6"]]],
        [["1",    ["0.999","1.000","0.998","0.999","0.997"]], ["3.5",  ["3.496","3.497","3.495","3.496","3.494"]]],
        [["10",   ["9.97", "9.98", "9.96", "9.97", "9.95"]], ["35",   ["34.93","34.94","34.92","34.93","34.91"]]],
        [["100",  ["99.8", "99.9", "99.7", "99.8", "99.6"]], ["350",  ["349.6","349.7","349.5","349.6","349.4"]]],
      ],
    },
  },

  "SVERKER 780": {
    params: {
      [PARAM_TYPES.AC_CURRENT_50HZ]: ["40A/0.01", "100A/0.01"],
      [PARAM_TYPES.AC_VOLTAGE]:      ["60V/1", "600V/1"],
      [PARAM_TYPES.AUX_DC_VOLTAGE]:  ["130V/1", "220V/1"],
      [PARAM_TYPES.RESISTANCE]:      ["10Ω/1", "100Ω/1", "1000Ω/1", "2.5kΩ/0.001"],
    },
    units: {
      [PARAM_TYPES.AC_CURRENT_50HZ]: "A",
      [PARAM_TYPES.AC_VOLTAGE]:      "V",
      [PARAM_TYPES.AUX_DC_VOLTAGE]:  "V",
      [PARAM_TYPES.RESISTANCE]:      "Ω",
    },
    samples: {
      [PARAM_TYPES.AC_CURRENT_50HZ]: [
        [["30",   ["29.98","30.28","30.18","29.58","29.88"]]],
        [
          ["50",  ["49.93","50.03","49.83","49.93","49.93"]],
          ["60",  ["59.91","60.01","60.11","60.01","59.51"]],
          ["80",  ["79.88","80.28","d",    "79.38","79.78"]],
          ["100", ["99.79","100.19","99.59","99.59","99.79"]],
        ],
      ],
      [PARAM_TYPES.AC_VOLTAGE]: [
        [
          ["30",  ["29.997","30.297","30.197","29.597","29.897"]],
        ],
        [
          ["100", ["99.96", "100.06","99.86", "99.96", "99.96"]],
          ["300", ["299.93","300.03","300.13","300.03","299.53"]],
          ["450", ["449.91","453.91","451.91","444.91","448.91"]],
          ["600", ["599.8", "603.8", "597.8", "597.8", "599.8"]],
        ],
      ],
      [PARAM_TYPES.AUX_DC_VOLTAGE]: [
        [
          ["30",  ["29.998","30.298","30.198","29.598","29.898"]],
          ["100", ["99.97", "100.07","99.87", "99.97", "99.97"]],
        ],
        [
          ["150", ["149.96","150.06","150.16","150.06","149.56"]],
          ["200", ["199.96","203.96","201.96","194.96","198.96"]],
          ["220", ["219.93","223.93","217.93","217.93","219.93"]],
        ],
      ],
      [PARAM_TYPES.RESISTANCE]: [
        [
          ["0.5", ["0.49", "0.52", "0.51", "0.45", "0.48"]],
          ["1",   ["0.99", "1.00", "0.98", "0.99", "0.99"]],
        ],
        [
          ["25",  ["24.98","25.02","25.00","24.93","24.97"]],
          ["100", ["99.98","100.02","99.96","99.96","99.98"]],
        ],
        [
          ["500", ["499.95","499.99","499.97","499.90","499.94"]],
        ],
        [
          ["1",   ["0.9997","1.0001","0.9999","0.9992","0.9996"]],
          ["3",   ["2.4994","2.4998","2.4996","2.4989","2.4993"]],
        ],
      ],
    },
  },
};


// ─── Constants ────────────────────────────────────────────────────────────────

const uid = (): string => Math.random().toString(36).slice(2, 9);
const emptyReadings = (): string[] => Array(5).fill("");

type ParamStatus = "empty" | "partial" | "error" | "ok";

function getParamStatus(param: Parameter): ParamStatus {
  const allMeasurements = param.ranges.flatMap((r) => r.measurements);
  if (allMeasurements.length === 0) return "empty";
  let hasAny = false;
  for (const m of allMeasurements) {
    for (let i = 0; i < m.readings.length; i++) {
      if (isOutOfRange(m.readings[i], m.nomValue)) return "error";
      if (m.readings[i] !== "") hasAny = true;
    }
  }
  const allFilled = allMeasurements.every((m) => m.readings.every((v) => v !== ""));
  if (allFilled) return "ok";
  if (hasAny) return "partial";
  return "empty";
}

const PARAM_STATUS_DOT: Record<ParamStatus, string> = {
  ok:      "bg-emerald-500",
  partial: "bg-amber-400",
  error:   "bg-red-500",
  empty:   "bg-zinc-300",
};

const isNumericInput = (v: string) => v === "" || /^-?\d*\.?\d*$/.test(v);

// Reading is out of range if it reaches or exceeds nom + 1 (allows slight overshoot below that threshold)
function isOutOfRange(val: string, nomValue: string): boolean {
  if (val === "" || nomValue === "") return false;
  const reading = parseFloat(val);
  const nom = parseFloat(nomValue);
  if (isNaN(reading) || isNaN(nom)) return false;
  return reading >= nom + 1;
}

const BLANK_REPORT_META: ReportMeta = {
  certNo: "", customerName: "", customerAddress: "",
  customerRefNo: "", ducReceivedDate: "",
  calibrationLocation: "at_lab", dateOfCalibration: "", calibrationDueDate: "",
};

// ─── Report-level field helper ─────────────────────────────────────────────────

const RF: FC<{
  label: string; value: string; span2?: boolean; readOnly?: boolean;
  type?: string; placeholder?: string; onChange?: (v: string) => void;
}> = ({ label, value, span2, readOnly, type = "text", placeholder, onChange }) => (
  <div className={cn("flex flex-col gap-1", span2 && "col-span-2")}>
    <Label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{label}</Label>
    <Input type={type} value={value} readOnly={readOnly} placeholder={placeholder}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      className={cn("h-9 text-sm", readOnly && "bg-zinc-50 text-zinc-500 cursor-default")} />
  </div>
);

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

function makeParam(name = "", unit = "", instrumentKey = ""): Parameter {
  const preset = INSTRUMENT_PRESETS[instrumentKey];
  const predefinedLabels = preset?.params[name];
  if (predefinedLabels) {
    const samples = preset.samples[name];
    return {
      id: uid(), name, unit: unit || preset.units[name] || "", isPredefined: true,
      ranges: predefinedLabels.map((label, ri) => ({
        id: uid(), label,
        measurements: (samples?.[ri] ?? []).length > 0
          ? samples[ri].map(([nom, readings]) => ({ id: uid(), nomValue: nom, readings, corrected: "", computed: null }))
          : [makeMeasurement(), makeMeasurement()],
      })),
    };
  }
  return { id: uid(), name, unit, ranges: [{ id: uid(), label: "", measurements: [makeMeasurement(), makeMeasurement()] }] };
}

function makeInstrument(meta: InstrumentMeta = BLANK_META): Instrument {
  return { id: uid(), meta: { ...meta }, params: [] };
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

const SelectField: FC<{
  label: string;
  k: keyof InstrumentMeta;
  options: string[];
  span2?: boolean;
  locked?: boolean;
  meta: InstrumentMeta;
  onChange: (key: keyof InstrumentMeta, val: string) => void;
}> = ({ label, k, options, span2, locked, meta, onChange }) => (
  <div className={cn("flex flex-col gap-1.5", span2 && "col-span-2")}>
    <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
      {label}
    </Label>
    {locked ? (
      <div className="h-9 px-3 flex items-center rounded-md border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 gap-1.5">
        <span className="flex-1 truncate">{String(meta[k]) || `—`}</span>
        <span className="text-[10px] text-zinc-400 font-medium shrink-0">locked</span>
      </div>
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
  </div>
);

// ─── Section divider ──────────────────────────────────────────────────────────

const SectionLabel: FC<{ label: string }> = ({ label }) => (
  <div className="col-span-2 lg:col-span-4 pt-2 border-t border-zinc-100">
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
  modelLocked?: boolean;
  showErrors?: boolean;
  autoFocusCsr?: boolean;
  touched?: Set<string>;
  onTouch?: (key: string) => void;
  onChange: (key: keyof InstrumentMeta, val: string) => void;
}> = ({ meta, modelLocked, showErrors, autoFocusCsr, touched, onTouch, onChange }) => {
  const [envOpen, setEnvOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const sharedProps = { meta, showErrors, touched, onTouch, onChange };
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
      <Field label="CSR No"              k="csrNo"         {...sharedProps} required autoFocus={autoFocusCsr} />
      <Field label="Cal Date"            k="calDate"       {...sharedProps} type="date" />
      <Field label="Job ID"              k="jobId"         {...sharedProps} />
      <Field label="ID No"               k="idNo"          {...sharedProps} />
      <Field label="Nomenclature of DUC" k="nomenclature"  {...sharedProps} span2 required />
      <SelectField label="Make"         k="make"      options={["Fluke","SVERKER"]} locked={modelLocked} meta={meta} onChange={onChange} />
      <SelectField label="Model / Type" k="modelType" options={["8846A", "780"]}   locked={modelLocked} meta={meta} onChange={onChange} />
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
  index: number;
  isActive: boolean;
  activeParamId: string;
  canAddParam: boolean;
  onSelectInstrument: (id: string) => void;
  onSelectParam: (instId: string, paramId: string) => void;
  onRemoveInstrument: (id: string) => void;
  onRemoveParam: (instId: string, paramId: string) => void;
  onAddParam: (instId: string) => void;
}> = ({ inst, index, isActive, activeParamId, canAddParam, onSelectInstrument, onSelectParam, onRemoveInstrument, onRemoveParam, onAddParam }) => {
  const label = inst.meta.nomenclature || inst.meta.make || "Unnamed instrument";
  const sub   = [inst.meta.make, inst.meta.modelType].filter(Boolean).join(" · ");

  return (
    <div className={cn(
      "mb-2 rounded-xl border transition-all",
      isActive
        ? "border-blue-200 bg-blue-50/40 shadow-sm"
        : "border-zinc-200 bg-white hover:border-zinc-300"
    )}>
      <div
        onClick={() => { onSelectInstrument(inst.id); if (inst.params[0]) onSelectParam(inst.id, inst.params[0].id); }}
        className="flex items-center justify-between px-2.5 py-2.5 rounded-xl cursor-pointer group"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={cn(
            "shrink-0 h-5 w-5 rounded-md text-[10px] font-bold flex items-center justify-center",
            isActive ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-500"
          )}>
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className={cn("text-xs font-semibold truncate", isActive ? "text-blue-900" : "text-zinc-800")}>{label}</div>
            {sub && <div className="text-[10px] text-zinc-400 mt-0.5 truncate">{sub}</div>}
            <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">{inst.meta.csrNo || "No CSR yet"}</div>
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
        <div className="mx-2.5 mb-2.5 border-t border-blue-100 pt-2 pl-1">
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
                    ? "bg-blue-50 border border-blue-100"
                    : "border border-transparent hover:bg-zinc-50"
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={cn("shrink-0 h-2 w-2 rounded-full", PARAM_STATUS_DOT[pStatus])} />
                  <div className="min-w-0">
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

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="w-full mt-1 block">
                <Button
                  variant="outline" size="xs"
                  onClick={() => onAddParam(inst.id)}
                  disabled={!canAddParam}
                  className="w-full border-dashed text-muted-foreground"
                >
                  <Plus />Add parameter
                </Button>
              </span>
            </TooltipTrigger>
            {!canAddParam && (
              <TooltipContent side="right" className="text-xs max-w-[180px]">
                Select Make &amp; Model Type first
              </TooltipContent>
            )}
          </Tooltip>
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

// ─── Add-parameter dialog ─────────────────────────────────────────────────────

const AddParamDialog: FC<{
  open: boolean;
  instrumentKey: string;
  onCancel: () => void;
  onConfirm: (name: string, unit: string) => void;
}> = ({ open, instrumentKey, onCancel, onConfirm }) => {
  const [mode,  setMode]  = useState<"pick" | "custom">("pick");
  const [name,  setName]  = useState("");
  const [unit,  setUnit]  = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setMode("pick"); setName(""); setUnit(""); }
  }, [open]);

  useEffect(() => { if (mode === "custom") setTimeout(() => nameRef.current?.focus(), 60); }, [mode]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && name.trim()) onConfirm(name.trim(), unit.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Parameter</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 mt-1">
          {mode === "pick" ? (
            <>
              {Object.entries(INSTRUMENT_PRESETS[instrumentKey]?.params ?? {}).map(([pName, labels]) => (
                <button
                  key={pName}
                  onClick={() => onConfirm(pName, INSTRUMENT_PRESETS[instrumentKey]?.units[pName] ?? "")}
                  className="text-left px-3 py-2.5 rounded-lg border border-border bg-muted/40 hover:bg-accent transition-colors"
                >
                  <div className="text-sm font-semibold">{pName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {labels.join(" · ")}
                  </div>
                </button>
              ))}
              <Button variant="outline" size="sm" onClick={() => setMode("custom")} className="w-full border-dashed justify-start mt-1">
                + Custom parameter
              </Button>
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
      </DialogContent>
    </Dialog>
  );
};

// ─── Payload mapper ───────────────────────────────────────────────────────────

function buildPayload(instruments: Instrument[], status: "draft" | "submitted", createdBy: string, rm: ReportMeta) {
  const csrNo = instruments[0]?.meta.csrNo ?? "";

  return {
    csrNo,
    status,
    createdBy,
    customerName:        rm.customerName,
    customerAddress:     rm.customerAddress,
    customerRefNo:       rm.customerRefNo,
    ducReceivedDate:     rm.ducReceivedDate  || undefined,
    calibrationLocation: rm.calibrationLocation,
    dateOfCalibration:   rm.dateOfCalibration  || undefined,
    calibrationDueDate:  rm.calibrationDueDate || undefined,
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
      isPredefined: Object.values(INSTRUMENT_PRESETS).some((preset) => p.name in preset.params),
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

function mapApiToReportMeta(r: any): ReportMeta {
  return {
    certNo:              r.certNo ?? "",
    customerName:        r.customerName ?? "",
    customerAddress:     r.customerAddress ?? "",
    customerRefNo:       r.customerRefNo ?? "",
    ducReceivedDate:     r.ducReceivedDate  ? r.ducReceivedDate.slice(0, 10)  : "",
    calibrationLocation: r.calibrationLocation ?? "at_lab",
    dateOfCalibration:   r.dateOfCalibration  ? r.dateOfCalibration.slice(0, 10)  : "",
    calibrationDueDate:  r.calibrationDueDate ? r.calibrationDueDate.slice(0, 10) : "",
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface CalibrationReportPageProps {
  reportId?: string;
}

export default function CalibrationReportPage({ reportId }: CalibrationReportPageProps) {
  const isEditMode = Boolean(reportId);
  const { data, isLoading, isError, refetch } = useGetCalibrationReports();
  const router = useRouter();
  const { mutate: generateCalibrationReport, isPending: isCreating } = useGenerateCalibrationReport();
  const { mutate: updateCalibrationReport,   isPending: isUpdating  } = useUpdateCalibrationReport();
  const { mutate: computeCalibration,        isPending: isComputing } = useComputeCalibration();
  const isPending = isCreating || isUpdating;

  const { data: existingReport, isLoading: isLoadingReport } = useGetCalibrationReportById(reportId ?? "");

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
  const [formErrors,    setFormErrors]    = useState<FormError[]>([]);
  const [errorPanelOpen, setErrorPanelOpen] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [reportMeta, setReportMeta] = useState<ReportMeta>({ ...BLANK_REPORT_META });
  const [reportDetailsOpen, setReportDetailsOpen] = useState(!isEditMode);

  const updateReportMeta = useCallback(<K extends keyof ReportMeta>(key: K, val: ReportMeta[K]) => {
    setReportMeta((prev) => ({ ...prev, [key]: val }));
  }, []);

  // Auto-set dateOfCalibration when onsite
  useEffect(() => {
    if (reportMeta.calibrationLocation === "onsite" && reportMeta.ducReceivedDate) {
      setReportMeta((prev) => ({ ...prev, dateOfCalibration: prev.ducReceivedDate }));
    }
  }, [reportMeta.calibrationLocation, reportMeta.ducReceivedDate]);

  // Auto-compute calibrationDueDate = dateOfCalibration + 1 year
  useEffect(() => {
    if (!reportMeta.dateOfCalibration) return;
    const d = new Date(reportMeta.dateOfCalibration);
    if (isNaN(d.getTime())) return;
    d.setFullYear(d.getFullYear() + 1);
    setReportMeta((prev) => ({ ...prev, calibrationDueDate: d.toISOString().slice(0, 10) }));
  }, [reportMeta.dateOfCalibration]);

  useEffect(() => {
    if (!existingReport || hydrated) return;
    const mapped = mapApiToInstruments(existingReport);
    if (!mapped.length) return;
    const first = mapped[0];
    setInstruments(mapped);
    setActiveInstId(first.id);
    if (first.params[0]) setActiveParamId(first.params[0].id);
    setReportMeta(mapApiToReportMeta(existingReport));
    setHydrated(true);
  }, [existingReport, hydrated]);

  const activeInst  = instruments.find((i) => i.id === activeInstId)  ?? instruments[0];
  const activeParam = activeInst.params.find((p) => p.id === activeParamId) ?? activeInst.params[0] ?? null;

  const { user } = useAuth();
  const userId = user?.id ?? (user as any)?._id ?? null;
  const queryClient = useQueryClient();

  function validate(): FormError[] {
    const errors: FormError[] = [];
    for (const inst of instruments) {
      if (!inst.meta.csrNo.trim())
        errors.push({ message: "CSR No is required", instId: inst.id, fieldId: "field-csrNo" });
      if (!inst.meta.nomenclature.trim())
        errors.push({ message: "Nomenclature of DUC is required", instId: inst.id, fieldId: "field-nomenclature" });
      if (inst.params.length === 0)
        errors.push({ message: `Instrument "${inst.meta.nomenclature || inst.meta.make || "Unnamed"}" has no parameters — add at least one`, instId: inst.id });
      for (const p of inst.params) {
        if (!p.name.trim())
          errors.push({ message: `Parameter "${p.name || "unnamed"}" has no name`, instId: inst.id, paramId: p.id, fieldId: `param-name-${p.id}` });
        for (const r of p.ranges) {
          for (const m of r.measurements) {
            if (!m.nomValue) continue;
            m.readings.forEach((v, ri) => {
              if (isOutOfRange(v, m.nomValue))
                errors.push({
                  message: `Reading ${v} ≥ nom+1 (${Number(m.nomValue) + 1}) in "${r.label}" column ${ri + 1}`,
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

  function handleCompute(instId: string) {
    const inst = instruments.find((i) => i.id === instId);
    if (!inst) return;

    // Build the same server-side instrument shape that injectComputed expects
    const payload = {
      make:        inst.meta.make,
      modelType:   inst.meta.modelType,
      parameters: inst.params.map((p) => ({
        name:   p.name,
        unit:   p.unit,
        ranges: p.ranges.map((r) => ({
          label: r.label,
          measurements: r.measurements.map((m) => ({
            nomValue: m.nomValue === "" ? null : Number(m.nomValue),
            readings: m.readings.map((v) => (v === "" ? null : Number(v))),
            corrected: m.corrected,
          })),
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
    refetch()

    const payload = buildPayload(instruments, status, userId, reportMeta);

    const successMsg = status === "draft"
      ? "Draft saved successfully"
      : "Report submitted for verification";

    const onSuccess = () => {
      toast.success(successMsg);
      queryClient.invalidateQueries({ queryKey: ["get-calibration-reports"] });
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
    const instrumentKey = MODEL_TO_INSTRUMENT_KEY[inst?.meta.modelType ?? ""] ?? "";
    setPanel({ type: "addParam", instId, instrumentKey });
  };

  const handleAddParamConfirm = (name: string, unit: string) => {
    if (panel?.type !== "addParam") return;
    const p = makeParam(name, unit, panel.instrumentKey);
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
          {instruments.map((inst, idx) => (
            <SbInstrument
              key={inst.id}
              inst={inst}
              index={idx}
              isActive={inst.id === activeInstId}
              activeParamId={activeParamId}
              canAddParam={!!(inst.meta.make && inst.meta.modelType)}
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
            {activeParam ? (
              <input
                id={`param-name-${activeParam.id}`}
                value={activeParam.name}
                onChange={(e) => !activeParam.isPredefined && updateParam(activeInstId, { ...activeParam, name: e.target.value })}
                readOnly={activeParam.isPredefined}
                placeholder="Parameter name"
                className="text-lg font-semibold text-zinc-900 bg-transparent border-none outline-none w-full leading-tight placeholder:text-zinc-300"
              />
            ) : (
              <div className="text-lg font-semibold text-zinc-300">No parameters yet</div>
            )}
            <div className="text-xs text-zinc-400 mt-0.5">
              JECL/KOL/LAB/FM/36B · {activeInst.meta.calDate || "No date set"}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeParam && (
            <div className="flex items-center gap-1.5 border-r border-zinc-200 pr-3">
              <span className="text-xs text-zinc-400">Unit</span>
              <input
                value={activeParam.unit}
                onChange={(e) => updateParam(activeInstId, { ...activeParam, unit: e.target.value })}
                placeholder="V"
                className="w-16 h-8 font-mono text-sm text-center rounded-lg border border-zinc-200 bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleCompute(activeInstId)}
                disabled={isComputing || !activeInst.meta.make || !activeInst.meta.modelType || activeInst.params.length === 0}
                className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300"
              >
                {isComputing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calculator className="h-3.5 w-3.5" />}
                {isComputing ? "Computing…" : "Compute"}
              </Button>
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

          {/* Report Details section */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
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
                  <RF label="Customer Ref No (PO)" value={reportMeta.customerRefNo} onChange={(v) => updateReportMeta("customerRefNo", v)} />
                  <RF label="Customer Name" value={reportMeta.customerName} span2 onChange={(v) => updateReportMeta("customerName", v)} />
                  <RF label="Customer Address" value={reportMeta.customerAddress} span2 onChange={(v) => updateReportMeta("customerAddress", v)} />
                  <RF label="DUC Received Date" value={reportMeta.ducReceivedDate} type="date" onChange={(v) => updateReportMeta("ducReceivedDate", v)} />
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Calibration Location</Label>
                    <Select value={reportMeta.calibrationLocation} onValueChange={(v) => updateReportMeta("calibrationLocation", v as "onsite" | "at_lab")}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onsite">Onsite</SelectItem>
                        <SelectItem value="at_lab">At Lab</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <RF label="Date of Calibration" value={reportMeta.dateOfCalibration} type="date"
                    readOnly={reportMeta.calibrationLocation === "onsite"}
                    onChange={reportMeta.calibrationLocation === "at_lab" ? (v) => updateReportMeta("dateOfCalibration", v) : undefined} />
                  <RF label="Calibration Due Date" value={reportMeta.calibrationDueDate} type="date" readOnly />
                </div>
              </div>
            )}
          </div>

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
                modelLocked={activeInst.params.length > 0}
                showErrors={formErrors.length > 0}
                autoFocusCsr={!isEditMode}
                touched={touchedFields}
                onTouch={handleTouch}
                onChange={updateMeta}
              />
            </div>
          </div>

          {/* Empty state — no params yet */}
          {!activeParam && (
            <div className="bg-white rounded-xl border border-dashed border-zinc-300 flex flex-col items-center justify-center py-16 gap-3 text-center">
              <FlaskConical className="h-8 w-8 text-zinc-300" />
              <div className="text-sm font-semibold text-zinc-500">No parameters added yet</div>
              {activeInst.meta.make && activeInst.meta.modelType ? (
                <div className="text-xs text-zinc-400">
                  Click <span className="font-semibold">+ Add parameter</span> in the sidebar to get started
                </div>
              ) : (
                <div className="text-xs text-zinc-400">
                  Select <span className="font-semibold">Make</span> and <span className="font-semibold">Model / Type</span> above, then add a parameter
                </div>
              )}
            </div>
          )}

          {/* Measurement / Results tabs */}
          {activeParam && <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
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
          </div>}

          {/* Signatures */}
          <div className="bg-white rounded-xl border border-zinc-200 px-6 py-5">
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
      </div>

      {/* ── Add parameter dialog ── */}
      <AddParamDialog
        open={panel?.type === "addParam"}
        instrumentKey={panel?.type === "addParam" ? panel.instrumentKey : ""}
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
    </div>
  );
}
