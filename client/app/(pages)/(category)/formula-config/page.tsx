"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Plus, CheckCircle2, RefreshCw, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useGetFormulaConfigs, FormulaConfig } from "@/app/hooks/query/useGetFormulaConfigs";
import { useCreateFormulaConfig } from "@/app/hooks/mutate/useCreateFormulaConfig";
import { useActivateFormulaConfig } from "@/app/hooks/mutate/useActivateFormulaConfig";
import { cn } from "@/lib/utils";

const fmt = (d: string | undefined) => {
  if (!d) return "—";
  try { return format(parseISO(d), "dd MMM yyyy"); } catch { return "—"; }
};

export default function FormulaConfigListPage() {
  const router = useRouter();
  const { data: configs, isLoading, isError } = useGetFormulaConfigs();
  const { mutate: create, isPending: isCreating } = useCreateFormulaConfig();
  const { mutate: activate, isPending: isActivating } = useActivateFormulaConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const activeConfig = configs?.find((c) => c.isActive);

  const handleCreate = () => {
    if (!newName.trim()) { toast.error("Name is required"); return; }
    create(
      { name: newName.trim(), description: newDesc.trim(), sourceId: activeConfig?._id },
      {
        onSuccess: (data) => {
          toast.success("Config created");
          setDialogOpen(false);
          setNewName("");
          setNewDesc("");
          router.push(`/formula-config/${data._id}`);
        },
        onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to create"),
      },
    );
  };

  const handleActivate = (config: FormulaConfig) => {
    setActivatingId(config._id);
    activate(config._id, {
      onSuccess: () => { toast.success(`"${config.name}" is now active`); setActivatingId(null); },
      onError: (err: any) => { toast.error(err?.response?.data?.message ?? "Failed to activate"); setActivatingId(null); },
    });
  };

  return (
    <div className="w-full min-h-screen pt-24 flex flex-col items-center bg-background">
      <Navbar />
      <div className="w-full mt-10 max-w-5xl px-4 sm:px-6 lg:px-8 mb-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-[22px] font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2.5">
              <Calculator className="h-5 w-5 text-violet-500" />
              Formula Configs
            </h1>
            <p className="text-[13px] text-slate-400 dark:text-zinc-500 mt-1">
              Uncertainty budget formula sets. One config is active at a time.
            </p>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Plus className="h-4 w-4" />
            New Config
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-5 w-5 animate-spin text-zinc-400" />
            <span className="ml-2 text-[13px] text-zinc-400">Loading…</span>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="py-16 text-center text-[13px] text-red-400">
            Failed to load formula configs.
          </div>
        )}

        {/* Cards */}
        {!isLoading && !isError && (
          <div className="space-y-3">
            {(configs ?? []).length === 0 && (
              <div className="py-16 text-center text-[13px] text-zinc-400">
                No formula configs yet. Create one to get started.
              </div>
            )}
            {(configs ?? []).map((config) => (
              <div
                key={config._id}
                className={cn(
                  "relative flex items-center gap-5 px-5 py-4 rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm transition-all",
                  config.isActive
                    ? "border-violet-400 dark:border-violet-700 ring-1 ring-violet-400/30 dark:ring-violet-700/30"
                    : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700",
                )}
              >
                {/* Active stripe */}
                {config.isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-violet-500" />
                )}

                <div className="flex-1 min-w-0 pl-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[15px] font-semibold text-slate-800 dark:text-zinc-100 truncate">
                      {config.name}
                    </span>
                    {config.isActive && (
                      <Badge className="bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800 gap-1 text-[11px]">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                  {config.description && (
                    <p className="text-[12px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate">
                      {config.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 dark:text-zinc-500">
                    <span>{config.formulas?.length ?? 0} formulas</span>
                    <span>·</span>
                    <span>Created {fmt(config.createdAt)}</span>
                    {config.createdBy?.name && (
                      <>
                        <span>·</span>
                        <span>by {config.createdBy.name}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!config.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleActivate(config)}
                      disabled={isActivating && activatingId === config._id}
                      className="h-8 text-[12px] border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-600 dark:hover:text-violet-400"
                    >
                      {isActivating && activatingId === config._id ? "Activating…" : "Activate"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/formula-config/${config._id}`)}
                    className="h-8 text-[12px] gap-1 border-slate-200 dark:border-zinc-700"
                  >
                    View / Edit
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Config Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Formula Config</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <label className="text-[12px] font-medium text-slate-600 dark:text-zinc-400 block mb-1.5">
                Name <span className="text-red-400">*</span>
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Standard UC Budget v2"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-slate-600 dark:text-zinc-400 block mb-1.5">
                Description
              </label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            {activeConfig && (
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                Will clone formulas from active config: <span className="font-semibold text-slate-600 dark:text-zinc-300">{activeConfig.name}</span>
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isCreating || !newName.trim()}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {isCreating ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
