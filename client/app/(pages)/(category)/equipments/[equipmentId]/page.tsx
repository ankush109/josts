"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO, isPast, differenceInDays } from "date-fns";
import {
  ArrowLeft, Calendar, AlertCircle, CheckCircle2, Clock, FlaskConical,
  Award, Activity, Pencil, Save, X, Power, Plus, Trash2, History, RefreshCw,
  Upload, ToggleLeft, ToggleRight, FileSpreadsheet, Download, FileText, Eye,
  Paperclip,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetEuipmentsById } from "@/app/hooks/query/useGetEuipmentById";
import { useGetEquipmentHistory } from "@/app/hooks/query/useGetEquipmentHistory";
import {
  useUpdateEquipment,
  useSetEquipmentActive,
  useDeleteEquipment,
} from "@/app/hooks/mutate/useUpdateEquipment";
import { useOnlineStatus } from "@/app/hooks/useOnlineStatus";
import { useAuth } from "@/app/provider/AuthProvider";
import { authClient } from "@/lib/api-client";
import {
  EP_EQUIPMENT_TRACEABILITY_PRESIGN,
  EP_EQUIPMENT_TRACEABILITY_URL,
} from "@/lib/endpoints";

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  try { return format(typeof d === "string" ? parseISO(d) : d, "dd MMM yyyy"); } catch { return "—"; }
};
const dateInput = (d: string | Date | null | undefined): string => {
  if (!d) return "";
  try {
    const dt = typeof d === "string" ? parseISO(d) : d;
    return isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
  } catch { return ""; }
};
const num = (v: any): number | null => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
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
  if (s === "overdue") return <Badge className="bg-red-100 text-red-700 border border-red-200 gap-1 font-medium"><AlertCircle className="h-3 w-3" />Overdue</Badge>;
  if (s === "soon")    return <Badge className="bg-amber-100 text-amber-700 border border-amber-200 gap-1 font-medium"><Clock className="h-3 w-3" />Due Soon</Badge>;
  if (s === "valid")   return <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 gap-1 font-medium"><CheckCircle2 className="h-3 w-3" />Valid</Badge>;
  return <Badge variant="outline" className="text-slate-400">No Due Date</Badge>;
};

interface Parameter {
  parameterName?: string;
  range?:         string;
  subRange?:      string;
  stdValue?:      number | string | null;
  ducReading?:    number | string | null;
  unit?:          string;
  errorPct?:      number | string | null;
  uncertaintyPct?: number | string | null;
  accuracy?:      number | string | null;
  remarks?:       string;
  [k: string]: any;
}

const NUMERIC_PARAM_KEYS = new Set(["stdValue", "ducReading", "errorPct", "uncertaintyPct", "accuracy"]);

const isPartialNumeric = (v: string): boolean =>
  v === "" || /^-?\d*\.?\d*$/.test(v);

interface EquipmentDoc {
  _id?:                  string;
  equipmentName?:        string;
  make?:                 string;
  model?:                string;
  serialNo?:             string;
  idNo?:                 string;
  certificateNo?:        string;
  calLab?:               string;
  nablCert?:             string;
  calDate?:              string | null;
  nextDue?:              string | null;
  nominalRatio?:         string;
  parameters?:           Parameter[];
  traceabilityFileKey?:  string;
  traceabilityFiles?:    { key: string; name: string; uploadedBy?: string; uploadedAt?: string }[];
  isActive?:             boolean;
  createdAt?:            string;
  updatedAt?:            string;
}

const BASE_PARAM_COLS: { key: keyof Parameter; label: string; align: "left" | "right" | "center" }[] = [
  { key: "range",          label: "Range",           align: "left"  },
  { key: "subRange",       label: "Sub Range",       align: "left"  },
  { key: "stdValue",       label: "Std. Value",      align: "right" },
  { key: "ducReading",     label: "DUC Reading",     align: "right" },
  { key: "unit",           label: "Unit",            align: "center"},
  { key: "errorPct",       label: "Error (%)",       align: "right" },
  { key: "remarks",        label: "Remarks",         align: "left"  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.equipmentId as string;

  const { data: res, isLoading, isError } = useGetEuipmentsById(id);
  const { data: history } = useGetEquipmentHistory(id);
  const { mutate: update, isPending: isSaving } = useUpdateEquipment();
  const { mutate: setActive, isPending: isToggling } = useSetEquipmentActive();

  const eq: EquipmentDoc | undefined = res?.data;
  const [editMode, setEditMode] = useState(false);
  const isOffline = !useOnlineStatus();
  const [draft, setDraft] = useState<EquipmentDoc | null>(null);
  const [showAccuracy, setShowAccuracy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === "admin";
  const { mutate: deleteEquipment, isPending: isDeleting } = useDeleteEquipment();

  useEffect(() => { if (eq) setDraft(structuredClone(eq)); }, [eq]);

  const isDirty = useMemo(() => {
    if (!eq || !draft) return false;
    return JSON.stringify(eq) !== JSON.stringify(draft);
  }, [eq, draft]);

  const allFiles = useMemo(() => {
    const files: { key: string; name: string; uploadedBy?: string; uploadedAt?: string; isLegacy?: boolean }[] = [];
    if (draft?.traceabilityFileKey) {
      files.push({ key: draft.traceabilityFileKey, name: "Traceability Certificate", isLegacy: true });
    }
    for (const f of draft?.traceabilityFiles ?? []) {
      files.push(f);
    }
    return files;
  }, [draft?.traceabilityFileKey, draft?.traceabilityFiles]);

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400 dark:text-zinc-500" />
        <p className="text-[13px] text-slate-400 dark:text-zinc-500">Loading equipment details…</p>
      </div>
    </div>
  );

  if (isError || !eq || !draft) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 dark:text-red-400 text-[14px] mb-3">Failed to load equipment.</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>Go Back</Button>
      </div>
    </div>
  );

  const updateTop = <K extends keyof EquipmentDoc>(k: K, v: EquipmentDoc[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const updateParam = (idx: number, patch: Partial<Parameter>) =>
    setDraft((d) => d && {
      ...d,
      parameters: (d.parameters ?? []).map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    });

  const BLANK_PARAM = (): Parameter => ({
    parameterName: "", range: "", subRange: "", stdValue: null, ducReading: null,
    unit: "", errorPct: null, uncertaintyPct: null, accuracy: null, remarks: "",
  });

  const addParam = () =>
    setDraft((d) => d && { ...d, parameters: [...(d.parameters ?? []), BLANK_PARAM()] });

  const insertParam = (afterIdx: number) =>
    setDraft((d) => d && {
      ...d,
      parameters: [
        ...(d.parameters ?? []).slice(0, afterIdx + 1),
        BLANK_PARAM(),
        ...(d.parameters ?? []).slice(afterIdx + 1),
      ],
    });

  const removeParam = (idx: number) =>
    setDraft((d) => d && {
      ...d,
      parameters: (d.parameters ?? []).filter((_, i) => i !== idx),
    });

  const sanitizeParams = (params: Parameter[]): Parameter[] =>
    params.map((p) => ({
      ...p,
      stdValue:      num(String(p.stdValue ?? "")),
      ducReading:    num(String(p.ducReading ?? "")),
      errorPct:      num(String(p.errorPct ?? "")),
      uncertaintyPct: num(String(p.uncertaintyPct ?? "")),
      accuracy:      num(String(p.accuracy ?? "")),
    }));

  const onSave = () => {
    if (!draft) return;
    const payload = { ...draft, parameters: sanitizeParams(draft.parameters ?? []) };
    update({ id, payload }, {
      onSuccess: () => { toast.success("Equipment saved"); setEditMode(false); },
      onError:   (err: any) => toast.error(err?.response?.data?.message ?? "Save failed"),
    });
  };

  const onDelete = () => {
    deleteEquipment(id, {
      onSuccess: () => { toast.success("Equipment deleted"); router.push("/equipments"); },
      onError:   () => toast.error("Failed to delete equipment"),
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setIsUploading(true);
    try {
      const uploaded: { key: string; name: string; uploadedBy: string; uploadedAt: string }[] = [];
      for (const file of files) {
        const presignRes = await authClient.post(EP_EQUIPMENT_TRACEABILITY_PRESIGN(id), {
          contentType: file.type || "application/octet-stream",
          filename: file.name,
        });
        const { uploadUrl, key } = presignRes.data;
        await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });
        uploaded.push({ key, name: file.name, uploadedBy: user?.name ?? "Unknown", uploadedAt: new Date().toISOString() });
      }
      const existing = eq.traceabilityFiles ?? [];
      update(
        { id, payload: { ...eq, traceabilityFiles: [...existing, ...uploaded] } },
        {
          onSuccess: () => toast.success(`${uploaded.length} file${uploaded.length > 1 ? "s" : ""} uploaded`),
          onError:   () => toast.error("Uploaded to S3 but failed to save reference"),
        },
      );
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePreview = async (fileKey: string, name: string) => {
    try {
      const res = await authClient.get(`${EP_EQUIPMENT_TRACEABILITY_URL(id)}?key=${encodeURIComponent(fileKey)}`);
      const url: string = res.data.downloadUrl;
      const isPdf = name.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        setPreviewName(name);
        setPreviewUrl(url);
      } else {
        window.open(url, "_blank");
      }
    } catch {
      toast.error("Failed to get file URL");
    }
  };

  const handleDownloadFile = async (fileKey: string) => {
    try {
      const res = await authClient.get(`${EP_EQUIPMENT_TRACEABILITY_URL(id)}?key=${encodeURIComponent(fileKey)}`);
      window.open(res.data.downloadUrl, "_blank");
    } catch {
      toast.error("Failed to get file URL");
    }
  };

  const handleDeleteFile = (fileKey: string, isLegacy?: boolean) => {
    if (isLegacy) {
      update(
        { id, payload: { ...eq, traceabilityFileKey: undefined } },
        {
          onSuccess: () => toast.success("File removed"),
          onError:   () => toast.error("Failed to remove file"),
        },
      );
    } else {
      const remaining = (eq.traceabilityFiles ?? []).filter((f) => f.key !== fileKey);
      update(
        { id, payload: { ...eq, traceabilityFiles: remaining } },
        {
          onSuccess: () => toast.success("File removed"),
          onError:   () => toast.error("Failed to remove file"),
        },
      );
    }
  };

  const onCancel = () => { setDraft(structuredClone(eq)); setEditMode(false); };

  const onToggleActive = () => {
    setActive({ id, isActive: !draft.isActive }, {
      onSuccess: () => toast.success(draft.isActive ? "Equipment deactivated" : "Equipment activated"),
      onError:   () => toast.error("Failed to update status"),
    });
  };

  const dueStatus = getDueStatus(draft.nextDue);
  const parameters = draft.parameters ?? [];

  return (
    <div className="min-h-screen bg-background">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.pdf" multiple className="hidden" onChange={handleFileUpload} />
      {/* Top bar */}
      <div className="bg-[#1e3a5f] dark:bg-zinc-900 dark:border-b dark:border-zinc-800 text-white px-6 py-4 flex items-center gap-4 shadow-md">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 shrink-0" onClick={() => router.push("/equipments")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[17px] font-semibold truncate">{draft.equipmentName}</h1>
          <p className="text-[12px] text-white/50 mt-0.5">Equipment Detail · <span className="font-mono">{draft.idNo}</span></p>
        </div>
        <DueStatusBadge nextDue={draft.nextDue} />
        <Badge className={draft.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500"}>
          {draft.isActive ? "Active" : "Inactive"}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          onClick={onToggleActive}
          disabled={isToggling || isOffline}
          title={isOffline ? "Reference standards can only be updated online" : undefined}
          className="text-white/80 hover:text-white hover:bg-white/10 gap-1.5"
        >
          <Power className="h-3.5 w-3.5" />
          {draft.isActive ? "Deactivate" : "Activate"}
        </Button>
        {isAdmin && !draft.isActive && (
          deleteConfirm ? (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-white/70">Confirm delete?</span>
              <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(false)} className="text-white/70 hover:text-white hover:bg-white/10 h-7 px-2">No</Button>
              <Button size="sm" onClick={onDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 h-7 px-2 gap-1">
                <Trash2 className="h-3 w-3" />{isDeleting ? "…" : "Yes, delete"}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(true)} className="text-red-300 hover:text-red-100 hover:bg-red-900/30 gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          )
        )}
        {!editMode ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditMode(true)}
            disabled={isOffline}
            title={isOffline ? "Reference standards can only be edited online" : undefined}
            className="gap-1.5 bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={onCancel} className="text-white/80 hover:text-white hover:bg-white/10 gap-1.5">
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={!isDirty || isSaving || isOffline}
              title={isOffline ? "Save requires internet" : undefined}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-5 py-7 space-y-6">
        {/* Identity + Calibration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card icon={<FlaskConical className="h-4 w-4 text-[#1e3a5f]" />} title="Equipment Identity">
            <Field label="Equipment"   value={draft.equipmentName} edit={editMode} onChange={(v) => updateTop("equipmentName", v)} />
            <Field label="Make"        value={draft.make}          edit={editMode} onChange={(v) => updateTop("make", v)} />
            <Field label="Model"       value={draft.model}         edit={editMode} onChange={(v) => updateTop("model", v)} />
            <Field label="Serial No."  value={draft.serialNo}      edit={editMode} onChange={(v) => updateTop("serialNo", v)} mono />
            <Field label="ID No."      value={draft.idNo}          edit={editMode} onChange={(v) => updateTop("idNo", v)} mono />
            <Field label="Nominal Ratio" value={draft.nominalRatio} edit={editMode} onChange={(v) => updateTop("nominalRatio", v)} />
          </Card>

          <Card icon={<Award className="h-4 w-4 text-[#1e3a5f]" />} title="Calibration Details">
            <Field label="Certificate No." value={draft.certificateNo} edit={editMode} onChange={(v) => updateTop("certificateNo", v)} mono />
            <Field label="NABL Cert."      value={draft.nablCert}      edit={editMode} onChange={(v) => updateTop("nablCert", v)} mono />
            <Field label="Cal. Lab"        value={draft.calLab}        edit={editMode} onChange={(v) => updateTop("calLab", v)} />
            {editMode ? (
              <>
                <DateField label="Cal. Date" value={draft.calDate} onChange={(v) => updateTop("calDate", v)} />
                <DateField label="Next Due"  value={draft.nextDue} onChange={(v) => updateTop("nextDue", v)} />
              </>
            ) : (
              <>
                <InfoRow label="Cal. Date" value={
                  <span className="flex items-center gap-1.5 text-[12px]">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />{fmt(draft.calDate)}
                  </span>
                } />
                <InfoRow label="Next Due" value={
                  <span className={`flex items-center gap-1.5 font-semibold text-[12px] ${dueStatus === "overdue" ? "text-red-600" : dueStatus === "soon" ? "text-amber-600" : "text-slate-700"}`}>
                    {dueStatus === "overdue" && <AlertCircle className="h-3.5 w-3.5" />}
                    {fmt(draft.nextDue)}
                  </span>
                } />
              </>
            )}
          </Card>
        </div>

        {/* Certificate Files */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#1e3a5f]/10 dark:bg-blue-500/15 flex items-center justify-center shrink-0">
              <Paperclip className="h-4 w-4 text-[#1e3a5f] dark:text-blue-400" />
            </div>
            <span className="text-[13px] font-semibold text-slate-700 dark:text-zinc-200 flex-1">
              Certificate Files
              <span className="text-[11px] font-normal text-slate-400 dark:text-zinc-500 ml-2">{allFiles.length} file{allFiles.length !== 1 ? "s" : ""}</span>
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 h-8 disabled:opacity-50 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              {isUploading ? "Uploading…" : "Attach"}
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            {allFiles.length === 0 && (
              <div className="px-5 py-8 text-center text-[12px] text-slate-400 dark:text-zinc-500">
                No files attached. Click <span className="font-medium">Attach</span> to upload a PDF or Excel certificate.
              </div>
            )}
            {allFiles.map((file) => {
              const isPdf = file.name.toLowerCase().endsWith(".pdf");
              const FileIcon = isPdf ? FileText : FileSpreadsheet;
              const iconColor = isPdf ? "text-red-400" : "text-emerald-500";
              return (
                <div key={file.key} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 group/file">
                  <FileIcon className={`h-4 w-4 shrink-0 ${iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-slate-700 dark:text-zinc-200 truncate">{file.name}</p>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                      {file.uploadedBy && <span className="font-medium text-slate-500 dark:text-zinc-400">{file.uploadedBy}</span>}
                      {file.uploadedBy && file.uploadedAt && <span> · </span>}
                      {file.uploadedAt && <span>{fmt(file.uploadedAt)}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover/file:opacity-100 transition-opacity">
                    {isPdf && (
                      <button
                        onClick={() => handlePreview(file.key, file.name)}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline px-2 py-0.5"
                      >
                        <Eye className="h-3.5 w-3.5" /> Preview
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadFile(file.key)}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 border border-slate-200 dark:border-zinc-700 rounded px-2 py-0.5"
                    >
                      <Download className="h-3 w-3" /> Download
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.key, file.isLegacy)}
                      className="text-slate-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Parameters */}
        {(() => {
          const paramCols = [
            ...BASE_PARAM_COLS.slice(0, 6),
            showAccuracy
              ? { key: "accuracy"      as keyof Parameter, label: "Accuracy (%)", align: "right" as const }
              : { key: "uncertaintyPct" as keyof Parameter, label: "Uncertainty (%)", align: "right" as const },
            BASE_PARAM_COLS[6],
          ];
          return (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="h-8 w-8 rounded-xl bg-[#1e3a5f]/10 dark:bg-blue-500/15 flex items-center justify-center shrink-0">
                  <Activity className="h-4 w-4 text-[#1e3a5f] dark:text-blue-400" />
                </div>
                <div>
                  <span className="text-[13px] font-semibold text-slate-700 dark:text-zinc-200">Calibration Results</span>
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500 ml-2">{parameters.length} reading{parameters.length === 1 ? "" : "s"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Traceability / Accuracy toggle */}
                <button
                  onClick={() => setShowAccuracy((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-slate-200 dark:border-zinc-700 text-[11px] font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  {showAccuracy ? <ToggleRight className="h-3.5 w-3.5 text-blue-500" /> : <ToggleLeft className="h-3.5 w-3.5 text-slate-400" />}
                  {showAccuracy ? "Accuracy" : "Traceability"}
                </button>
                {editMode && (
                  <Button size="sm" variant="outline" onClick={addParam} className="gap-1.5 h-8">
                    <Plus className="h-3.5 w-3.5" /> Add row
                  </Button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800">
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest w-8">#</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Parameter</th>
                    {paramCols.map((c) => (
                      <th key={String(c.key)} className={`px-3 py-3 text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest whitespace-nowrap text-${c.align}`}>
                        {c.label}
                      </th>
                    ))}
                    {editMode && <th className="px-3 py-3 w-20"></th>}
                  </tr>
                </thead>
                <tbody>
                  {parameters.map((p, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 group/row">
                      <td className="px-3 py-2 text-slate-300 dark:text-zinc-600 text-[11px] font-mono">{i + 1}</td>
                      <td className="px-3 py-2">
                        {editMode ? (
                          <Input value={p.parameterName ?? ""} onChange={(e) => updateParam(i, { parameterName: e.target.value })} className="h-8 text-[12px]" />
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60">
                            {p.parameterName || "—"}
                          </span>
                        )}
                      </td>
                      {paramCols.map((c) => (
                        <td key={String(c.key)} className={`px-3 py-2 font-mono text-[12px] text-${c.align}`}>
                          {editMode ? (
                            <Input
                              value={p[c.key] == null ? "" : String(p[c.key])}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (NUMERIC_PARAM_KEYS.has(String(c.key))) {
                                  if (!isPartialNumeric(raw)) return;
                                  const isIntermediate = raw === "-" || raw === "." || raw === "-." || raw.endsWith(".");
                                  updateParam(i, { [c.key]: raw === "" ? null : isIntermediate ? raw : (num(raw) ?? raw) } as any);
                                } else {
                                  updateParam(i, { [c.key]: raw } as Partial<Parameter>);
                                }
                              }}
                              className={`h-8 text-[12px] font-mono ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}`}
                            />
                          ) : (
                            renderCell(c.key, p[c.key])
                          )}
                        </td>
                      ))}
                      {editMode && (
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              title="Insert row below"
                              onClick={() => insertParam(i)}
                              className="text-slate-300 hover:text-blue-500 dark:text-zinc-600 dark:hover:text-blue-400 opacity-0 group-hover/row:opacity-100 transition-opacity"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => removeParam(i)} className="text-red-400 hover:text-red-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {parameters.length === 0 && (
                    <tr>
                      <td colSpan={paramCols.length + 2} className="px-4 py-8 text-center text-slate-400 dark:text-zinc-500 text-[12px]">
                        No calibration readings.{editMode && " Use 'Add row' or 'Upload Excel' to get started."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          );
        })()}

        {/* History */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 dark:border-zinc-800">
            <div className="h-8 w-8 rounded-xl bg-[#1e3a5f]/10 dark:bg-blue-500/15 flex items-center justify-center">
              <History className="h-4 w-4 text-[#1e3a5f] dark:text-blue-400" />
            </div>
            <span className="text-[13px] font-semibold text-slate-700 dark:text-zinc-200">History</span>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 ml-auto">{history?.length ?? 0} entries</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-zinc-800 max-h-96 overflow-y-auto">
            {(!history || history.length === 0) && (
              <div className="px-5 py-10 text-center text-slate-400 dark:text-zinc-500 text-[12px]">No history yet.</div>
            )}
            {history?.map((e) => (
              <div key={e._id} className="px-5 py-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 dark:text-zinc-300">{e.action}</span>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500">·</span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">{e.performedBy?.name ?? e.performedBy?.email ?? "system"}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">{new Date(e.createdAt).toLocaleString()}</span>
                </div>
                {e.changes.length > 0 && (
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 space-y-0.5">
                    {e.changes.slice(0, 8).map((c, i) => (
                      <div key={i}>
                        <span className="font-semibold text-slate-600 dark:text-zinc-300">{c.field}</span>
                        <span className="text-slate-400 dark:text-zinc-500"> · </span>
                        <span className="line-through text-slate-400 dark:text-zinc-500">{c.from}</span>
                        <span className="text-slate-400 dark:text-zinc-500"> → </span>
                        <span className="text-slate-700 dark:text-zinc-200">{c.to}</span>
                      </div>
                    ))}
                    {e.changes.length > 8 && <div className="text-slate-400 dark:text-zinc-500">+{e.changes.length - 8} more…</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500 px-1">
          <span>Created: {fmt(eq.createdAt)}</span>
          <span>Last updated: {fmt(eq.updatedAt)}</span>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden"
            style={{ height: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-red-400 shrink-0" />
                <span className="text-[13px] font-semibold text-slate-700 dark:text-zinc-200 truncate">{previewName}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => window.open(previewUrl, "_blank")}
                  className="inline-flex items-center gap-1.5 text-[12px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <iframe src={previewUrl} className="flex-1 w-full" title={previewName} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-8 w-8 rounded-xl bg-[#1e3a5f]/10 dark:bg-blue-500/15 flex items-center justify-center shrink-0">{icon}</div>
        <span className="text-[13px] font-semibold text-slate-700 dark:text-zinc-200">{title}</span>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-slate-100 dark:border-zinc-800 last:border-0">
      <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-widest w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-[13px] text-slate-800 dark:text-zinc-100 text-right">{value ?? "—"}</span>
    </div>
  );
}

function Field({ label, value, edit, onChange, mono }: {
  label: string; value: string | undefined; edit: boolean; onChange: (v: string) => void; mono?: boolean;
}) {
  if (edit) {
    return (
      <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-zinc-800 last:border-0">
        <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-widest w-36 shrink-0">{label}</span>
        <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={`h-8 text-[12px] ${mono ? "font-mono" : ""}`} />
      </div>
    );
  }
  return (
    <InfoRow label={label} value={
      mono ? <span className="font-mono text-[12px] bg-slate-100 dark:bg-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded">{value || "—"}</span>
           : <span>{value || "—"}</span>
    } />
  );
}

function DateField({ label, value, onChange }: {
  label: string; value: string | Date | null | undefined; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-zinc-800 last:border-0">
      <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-widest w-36 shrink-0">{label}</span>
      <Input type="date" value={dateInput(value)} onChange={(e) => onChange(e.target.value)} className="h-8 text-[12px]" />
    </div>
  );
}

function renderCell(key: keyof Parameter, val: any): React.ReactNode {
  const isEmpty = val === undefined || val === null || val === "";
  if (key === "uncertaintyPct") {
    return isEmpty
      ? <span className="text-slate-300">—</span>
      : <span className={Number(val) > 0.1 ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>±{String(val)}%</span>;
  }
  if (key === "errorPct") {
    if (isEmpty) return <span className="text-slate-300">—</span>;
    const n = Number(val);
    return <span className={`font-semibold ${n < 0 ? "text-red-500" : n > 0 ? "text-blue-500" : "text-slate-400"}`}>{n > 0 ? `+${val}` : String(val)}</span>;
  }
  if (key === "unit") {
    return isEmpty ? <span className="text-slate-300">—</span>
                   : <span className="bg-slate-100 text-slate-600 font-mono text-[11px] px-2 py-0.5 rounded">{String(val)}</span>;
  }
  return isEmpty ? <span className="text-slate-300">—</span> : String(val);
}
