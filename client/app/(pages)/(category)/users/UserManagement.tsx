"use client";

import { useState, useMemo } from "react";
import {
  Plus, Search, RefreshCw, Key, UserCheck, UserX, Mail, ShieldCheck, ArrowUpCircle, ArrowDownCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  useAdminUsers,
  useAdminCreateUser,
  useAdminResetPassword,
  useAdminSetUserActive,
  useAdminSetUserRole,
  type AdminUser,
} from "@/app/hooks/query/useAdminUsers";
import { useAuth } from "@/app/provider/AuthProvider";

type StatusFilter = "all" | "active" | "inactive";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// ── Add user dialog ─────────────────────────────────────────────────────────

function AddUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [role,     setRole]     = useState<"user" | "admin">("user");
  const { mutate: create, isPending } = useAdminCreateUser();

  const reset = () => { setName(""); setEmail(""); setPassword(""); setRole("user"); };

  const handleSubmit = () => {
    if (!email.trim() || !password) {
      toast.error("Email and password are required");
      return;
    }
    if (!email.trim().toLowerCase().endsWith("@josts.in")) {
      toast.error("Email must be a @josts.in address");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    create(
      { name: name.trim() || undefined, email: email.trim(), password, role },
      {
        onSuccess: () => {
          toast.success("User created");
          reset();
          onClose();
        },
        onError: (e: any) =>
          toast.error(e?.response?.data?.message ?? "Could not create user"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500 dark:text-zinc-400 -mt-2">
          Creates a new account. The user can log in immediately with these credentials.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-1 block">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@josts.in"
              className="h-9"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-1 block">
              Display Name <span className="text-slate-400">(optional)</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Defaults to email prefix"
              className="h-9"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-1 block">
              Initial password
            </label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="h-9 font-mono"
            />
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
              Share this with the user securely. They can change it in their profile.
            </p>
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-1 block">
              Role
            </label>
            <div className="flex gap-2">
              {(["user", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 px-3 py-2 rounded-md border text-sm capitalize transition-colors ${
                    role === r
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                      : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-zinc-700">
            <Button onClick={handleSubmit} disabled={isPending} className="h-8 text-sm">
              {isPending ? "Creating…" : "Create user"}
            </Button>
            <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={isPending} className="h-8 text-sm">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Reset password dialog ───────────────────────────────────────────────────

function ResetPasswordDialog({
  user, open, onClose,
}: {
  user:  AdminUser | null;
  open:  boolean;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const { mutate: reset, isPending } = useAdminResetPassword();

  if (!user) return null;

  const handleSubmit = () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    reset(
      { userId: user.id, newPassword: password },
      {
        onSuccess: () => { toast.success("Password reset"); setPassword(""); onClose(); },
        onError: (e: any) =>
          toast.error(e?.response?.data?.message ?? "Could not reset password"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setPassword(""); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500 dark:text-zinc-400 -mt-2">
          Sets a new password for <span className="font-medium">{user.email}</span>. The user is not notified — share the new password with them out-of-band.
        </p>
        <div className="space-y-3">
          <Input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (min 6 chars)"
            className="h-9 font-mono"
            autoFocus
          />
          <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-zinc-700">
            <Button onClick={handleSubmit} disabled={isPending} className="h-8 text-sm">
              {isPending ? "Resetting…" : "Reset password"}
            </Button>
            <Button variant="outline" onClick={() => { setPassword(""); onClose(); }} disabled={isPending} className="h-8 text-sm">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── User row ────────────────────────────────────────────────────────────────

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 65% 45%)`;
}

function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function UserRow({
  user,
  selfId,
  onReset,
}: {
  user:    AdminUser;
  selfId?: string;
  onReset: (u: AdminUser) => void;
}) {
  const { mutate: setActive, isPending: toggling } = useAdminSetUserActive();
  const { mutate: setRole,   isPending: roling   } = useAdminSetUserRole();
  const isSelf = user.id === selfId;

  const handleToggle = () => {
    setActive(
      { userId: user.id, isActive: !user.isActive },
      {
        onSuccess: () => toast.success(user.isActive ? "Account deactivated" : "Account reactivated"),
        onError: (e: any) => toast.error(e?.response?.data?.message ?? "Could not update"),
      },
    );
  };

  const handleRoleToggle = () => {
    const next = user.role === "admin" ? "user" : "admin";
    setRole(
      { userId: user.id, role: next },
      {
        onSuccess: () => toast.success(next === "admin" ? "Promoted to admin" : "Demoted to user"),
        onError: (e: any) => toast.error(e?.response?.data?.message ?? "Could not update role"),
      },
    );
  };

  return (
    <tr className={`border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-50/60 dark:hover:bg-zinc-800/30 ${
      !user.isActive ? "opacity-60" : ""
    }`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            style={{ background: avatarColor(user.name) }}
          >
            {initials(user.name || user.email)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-900 dark:text-zinc-100 truncate">
              {user.name}
              {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
            </div>
            <div className="text-xs text-slate-500 dark:text-zinc-400 truncate flex items-center gap-1">
              <Mail className="h-3 w-3" /> {user.email}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {user.role === "admin" ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400">
            <ShieldCheck className="h-3 w-3" /> Admin
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300">
            User
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {user.isActive ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" title={user.deactivatedAt ? `Deactivated ${timeAgo(user.deactivatedAt)}` : ""}>
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Deactivated
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500 dark:text-zinc-400">
        {timeAgo(user.createdAt)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onReset(user)}
            className="p-1.5 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="Reset password"
          >
            <Key className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleRoleToggle}
            disabled={roling || isSelf}
            className={`p-1.5 rounded transition-colors ${
              isSelf
                ? "text-slate-300 dark:text-zinc-700 cursor-not-allowed"
                : user.role === "admin"
                  ? "text-violet-500 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                  : "text-slate-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20"
            }`}
            title={isSelf ? "Cannot demote yourself" : user.role === "admin" ? "Demote to user" : "Promote to admin"}
          >
            {user.role === "admin" ? <ArrowDownCircle className="h-3.5 w-3.5" /> : <ArrowUpCircle className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={handleToggle}
            disabled={toggling || isSelf}
            className={`p-1.5 rounded transition-colors ${
              isSelf
                ? "text-slate-300 dark:text-zinc-700 cursor-not-allowed"
                : user.isActive
                  ? "text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  : "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            }`}
            title={isSelf ? "Cannot deactivate yourself" : user.isActive ? "Deactivate" : "Reactivate"}
          >
            {user.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function UserManagement() {
  const { user: me } = useAuth();
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<StatusFilter>("all");
  const [addOpen,  setAddOpen]  = useState(false);
  const [resetFor, setResetFor] = useState<AdminUser | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useAdminUsers(search, filter);
  const users = useMemo(() => data ?? [], [data]);

  const activeCount   = users.filter((u) => u.isActive).length;
  const inactiveCount = users.length - activeCount;
  const adminCount    = users.filter((u) => u.role === "admin").length;

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
            User Management
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-zinc-400 mt-0.5">
            Add accounts, reset passwords, and deactivate access. Deactivated users see a “contact support” message on login.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <Button onClick={() => setAddOpen(true)} size="sm" className="h-8 text-sm gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add user
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total",    value: users.length,  bg: "bg-slate-100 dark:bg-zinc-800",        text: "text-slate-700 dark:text-zinc-200" },
          { label: "Active",   value: activeCount,   bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400" },
          { label: "Inactive", value: inactiveCount, bg: "bg-red-50 dark:bg-red-900/20",         text: "text-red-700 dark:text-red-400" },
          { label: "Admins",   value: adminCount,    bg: "bg-violet-50 dark:bg-violet-900/20",   text: "text-violet-700 dark:text-violet-400" },
        ].map(({ label, value, bg, text }) => (
          <div key={label} className={`${bg} rounded-lg px-4 py-3`}>
            <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${text}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex rounded-md border border-slate-200 dark:border-zinc-700 overflow-hidden text-xs">
          {(["all", "active", "inactive"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                filter === f
                  ? "bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                  : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-x-auto">
        {isLoading ? (
          <div className="py-20 text-center text-sm text-slate-400 dark:text-zinc-500">Loading…</div>
        ) : isError ? (
          <div className="py-20 text-center text-sm text-red-500">Failed to load users.</div>
        ) : (
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60">
                {["User", "Role", "Status", "Created", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-slate-400 dark:text-zinc-500">
                    {search ? "No users match your search." : "No users yet."}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <UserRow key={u.id} user={u} selfId={me?.id} onReset={setResetFor} />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <AddUserDialog       open={addOpen}    onClose={() => setAddOpen(false)} />
      <ResetPasswordDialog open={!!resetFor} user={resetFor} onClose={() => setResetFor(null)} />
    </div>
  );
}
