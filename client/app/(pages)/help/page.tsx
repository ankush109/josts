"use client";

import { useState, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/app/provider/AuthProvider";
import {
  useGetMySupport,
  useGetAllSupport,
  type SupportMessage,
} from "@/app/hooks/query/useGetSupportMessages";
import {
  useSubmitSupport,
  useMarkSupportSeen,
  useReplySupport,
} from "@/app/hooks/mutate/useSupportMutations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  ChevronDown,
  HelpCircle,
  MessageSquare,
  BookOpen,
  WifiOff,
  ClipboardList,
  Wrench,
  FileText,
  Users,
  Send,
  CheckCheck,
  Inbox,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

// ─── Guide data ───────────────────────────────────────────────────────────────

const GUIDE_SECTIONS = [
  {
    icon: BookOpen,
    title: "Getting Started",
    items: [
      {
        q: "How do I create a calibration report?",
        a: `Click "+ New Report" on the Calibration Reports page. Fill in the CSR number, customer details, and instrument information. Add parameters and enter the 5 readings for each measurement point. Once ready, click "Compute" to calculate the uncertainty budget, then "Submit" to finalize.`,
      },
      {
        q: "What is a CSR number?",
        a: `CSR (Calibration Service Request) number is the unique identifier for each calibration job. It is auto-suggested based on the current date and your engineer code, but you can edit it. The format is typically JECL/KOL/LAB/FM/XXX.`,
      },
      {
        q: "What does the status flow look like?",
        a: `Draft → Submitted → Verified (or Rejected). You can save a draft at any time. Once submitted, only an admin can verify or reject it. Rejected reports can be edited and resubmitted.`,
      },
    ],
  },
  {
    icon: WifiOff,
    title: "Offline Mode",
    items: [
      {
        q: "How does offline mode work?",
        a: `The app is a Progressive Web App (PWA). When you lose internet connection, an amber banner appears at the top. You can still create and edit calibration drafts — they are saved to your device's storage (IndexedDB). When you reconnect, the app automatically syncs all pending drafts to the server.`,
      },
      {
        q: "How do I install the app on iPad for field use?",
        a: `Open Safari on your iPad and navigate to the app URL while you have internet. Tap the Share icon → "Add to Home Screen" → "Add". Always launch from the home screen icon (not Safari) for persistent offline storage. Before leaving the office, open the app once while online to refresh the equipment and instrument data cache.`,
      },
      {
        q: "What can I do offline?",
        a: `Offline you can: create new calibration drafts, edit existing drafts, and view recently loaded calibration reports, equipment, and instrument lists (from cache). Offline you cannot: run Compute, generate PDFs, submit reports, or edit Equipment/Instrument masters — these require a server connection.`,
      },
      {
        q: "What is the pending sync count in the navbar?",
        a: `The cloud icon with a number shows how many local drafts are waiting to be synced to the server. Click "Sync now" to trigger a manual sync. The count drops to zero once all drafts are successfully uploaded.`,
      },
    ],
  },
  {
    icon: ClipboardList,
    title: "Uncertainty Budget",
    items: [
      {
        q: "What does Compute do?",
        a: `Compute calculates the full uncertainty budget for all measurement points using the Welch–Satterthwaite method. It derives: Type A uncertainty (from repeat readings), Ref. Std. uncertainty (from equipment certificate), accuracy uncertainty, and least-count uncertainty — then combines them into the Expanded Uncertainty U = k × Q.`,
      },
      {
        q: "How do I read the step-by-step trace?",
        a: `After computing, expand "Step-by-step calculation trace" under the Results tab. Switch between List and Flow views. Each variable (J through W) shows the formula and result. Hover any node in Flow view for the substituted calculation.`,
      },
    ],
  },
  {
    icon: Wrench,
    title: "Equipment & Instruments",
    items: [
      {
        q: "What is the difference between Equipment and Instruments?",
        a: `Equipment refers to reference standards used during calibration. Instruments are the DUC (Device Under Calibration) presets. Equipment masters are imported from the traceability workbook; instrument presets are managed via the Instruments page.`,
      },
      {
        q: "Can I deactivate an instrument or equipment without deleting it?",
        a: `Yes. Open the detail page and click "Deactivate". Deactivated entries are hidden from calibration form dropdowns but can be reactivated at any time.`,
      },
    ],
  },
  {
    icon: FileText,
    title: "PDF Certificates",
    items: [
      {
        q: "Why is the PDF still generating?",
        a: `PDF generation runs asynchronously on the server. It usually completes within 30–60 seconds after submitting. If the spinner persists beyond 5 minutes, try refreshing the page. If the issue continues, contact support.`,
      },
    ],
  },
  {
    icon: Users,
    title: "User Roles",
    items: [
      {
        q: "What can an admin do that a regular user cannot?",
        a: `Admins can: verify or reject submitted calibration reports, reply to support messages, and activate/deactivate equipment and instrument entries. Regular engineers can create, edit, and submit their own reports.`,
      },
    ],
  },
];

// ─── Accordion ────────────────────────────────────────────────────────────────

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 py-3.5 text-left text-sm font-medium hover:text-primary transition-colors"
      >
        <span>{q}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>}
    </div>
  );
}

function GuideSection({ section }: { section: typeof GUIDE_SECTIONS[0] }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="font-semibold text-sm flex-1">{section.title}</span>
        <span className="text-xs text-muted-foreground mr-2">{section.items.length} topics</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-5 border-t border-border">
          {section.items.map((item) => <AccordionItem key={item.q} q={item.q} a={item.a} />)}
        </div>
      )}
    </div>
  );
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────

function Bubble({
  text, time, isUser, seen, userName,
}: {
  text: string; time: string; isUser: boolean; seen?: boolean; userName?: string;
}) {
  return (
    <div className={cn("flex gap-2.5 max-w-[85%]", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-primary-foreground">
          S
        </div>
      )}
      <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
        {!isUser && userName && (
          <span className="text-[10px] font-semibold text-muted-foreground px-1">{userName}</span>
        )}
        <div className={cn(
          "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm",
        )}>
          {text}
        </div>
        <div className={cn("flex items-center gap-1 px-1", isUser ? "flex-row-reverse" : "")}>
          <span className="text-[10px] text-muted-foreground">{time}</span>
          {isUser && seen !== undefined && (
            seen
              ? <CheckCheck className="h-3 w-3 text-primary" />
              : <CheckCheck className="h-3 w-3 text-muted-foreground/50" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── User chat window ─────────────────────────────────────────────────────────

function UserChat() {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useGetMySupport();
  const { mutate: submit, isPending } = useSubmitSupport();
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Server returns newest-first; reverse so latest message sits at the bottom
  const sortedMessages = [...messages].reverse();

  // Subject is the first ~60 chars of the message, auto-derived so the user never sees it
  function deriveSubject(msg: string) {
    const first = msg.trim().split("\n")[0].trim();
    return first.length > 60 ? first.slice(0, 57) + "…" : first || "Support request";
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    submit(
      { subject: deriveSubject(text), message: text },
      {
        onSuccess: () => {
          setText("");
          textareaRef.current?.focus();
        },
        onError: () => toast.error("Failed to send"),
      }
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col" style={{ height: 520 }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 shrink-0">
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
          <span className="text-[11px] font-bold text-primary-foreground">S</span>
        </div>
        <div>
          <p className="text-sm font-semibold">Jasper Support</p>
          <p className="text-[10px] text-muted-foreground">We usually reply within 1 business day</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground select-none">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">How can we help?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Type your question below and we'll get back to you.</p>
            </div>
          </div>
        ) : (
          sortedMessages.map((msg) => (
            <div key={msg._id} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground font-medium px-2 py-0.5 rounded-full border border-border bg-background whitespace-nowrap">
                  {msg.subject}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <Bubble text={msg.message} time={ago(msg.createdAt)} isUser={true} seen={msg.seenByAdmin} />
              {msg.reply && (
                <Bubble text={msg.reply} time={ago(msg.repliedAt!)} isUser={false} userName="Support" />
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input — always visible */}
      <form onSubmit={handleSend} className="border-t border-border p-3 flex gap-2 items-end shrink-0 bg-background/50">
        <Textarea
          ref={textareaRef}
          placeholder="Ask us anything…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          maxLength={2000}
          className="resize-none text-sm flex-1 min-h-[38px] max-h-[120px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as unknown as React.FormEvent); }
          }}
        />
        <Button type="submit" size="icon" disabled={isPending || !text.trim()} className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

// ─── Admin inbox + chat ───────────────────────────────────────────────────────

function AdminChat() {
  const { data: messages = [], isLoading } = useGetAllSupport();
  const { mutate: markSeen } = useMarkSupportSeen();
  const { mutate: reply, isPending: isReplying } = useReplySupport();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const selected = messages.find((m) => m._id === selectedId) ?? null;
  const unseen = messages.filter((m) => !m.seenByAdmin).length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId, selected?.reply]);

  function openThread(msg: SupportMessage) {
    setSelectedId(msg._id);
    setReplyText(msg.reply ?? "");
    if (!msg.seenByAdmin) markSeen(msg._id);
  }

  function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !replyText.trim()) return;
    reply(
      { id: selected._id, reply: replyText },
      {
        onSuccess: () => toast.success("Reply sent"),
        onError: () => toast.error("Failed to send reply"),
      }
    );
  }

  return (
    <div
      className="rounded-2xl border border-border bg-card overflow-hidden flex"
      style={{ height: 560 }}
    >
      {/* Sidebar */}
      <div className="w-64 shrink-0 border-r border-border flex flex-col">
        <div className="px-3 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Inbox</span>
            {unseen > 0 && (
              <span className="ml-auto text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-px">
                {unseen}
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-4">
              <Inbox className="h-7 w-7 opacity-25" />
              <p className="text-xs text-center">No messages yet</p>
            </div>
          ) : (
            messages.map((msg) => (
              <button
                key={msg._id}
                onClick={() => openThread(msg)}
                className={cn(
                  "w-full text-left px-3 py-3 border-b border-border/50 transition-colors",
                  selectedId === msg._id
                    ? "bg-primary/10"
                    : !msg.seenByAdmin
                    ? "bg-primary/5 hover:bg-primary/8"
                    : "hover:bg-accent/50",
                )}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  {!msg.seenByAdmin && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                  <span className="text-xs font-semibold truncate flex-1">{msg.subject}</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{msg.userName}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">{ago(msg.createdAt)}</span>
                  <Badge
                    variant={msg.status === "replied" ? "default" : "secondary"}
                    className="text-[9px] px-1 py-px h-auto"
                  >
                    {msg.status === "replied" ? "Replied" : "Open"}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat panel */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Thread header */}
          <div className="px-4 py-3 border-b border-border shrink-0 bg-card/80">
            <p className="text-sm font-semibold truncate">{selected.subject}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {selected.userName} · {selected.userEmail} · {ago(selected.createdAt)}
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <Bubble
              text={selected.message}
              time={ago(selected.createdAt)}
              isUser={false}
              userName={selected.userName}
            />
            {selected.reply && (
              <Bubble
                text={selected.reply}
                time={ago(selected.repliedAt!)}
                isUser={true}
              />
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply input */}
          <form onSubmit={handleReply} className="border-t border-border p-3 flex gap-2 shrink-0 bg-background/50">
            <Textarea
              placeholder={selected.reply ? "Update reply…" : "Type a reply…"}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={2}
              maxLength={2000}
              className="resize-none text-sm flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(e as unknown as React.FormEvent); }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isReplying || !replyText.trim()}
              className="h-auto self-end shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <MessageSquare className="h-9 w-9 opacity-20" />
          <p className="text-sm">Select a conversation</p>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <div className="w-full min-h-screen pt-24">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-10">

        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Help &amp; Support</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Browse the guide or chat with the support team below.
          </p>
        </div>

        {/* Guide */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">User Guide</h2>
          </div>
          {GUIDE_SECTIONS.map((s) => <GuideSection key={s.title} section={s} />)}
        </section>

        {/* Chat */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">
              {isAdmin ? "Support Inbox" : "Contact Support"}
            </h2>
          </div>
          {isAdmin ? <AdminChat /> : <UserChat />}
        </section>

      </div>
    </div>
  );
}
