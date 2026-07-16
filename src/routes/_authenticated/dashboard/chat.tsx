import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, User, Loader2, Construction, Mic, MicOff, Volume2, VolumeX } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/chat")({
  head: () => ({ meta: [{ title: "AI Assistant · Escorts Kubota AI" }] }),
  component: ChatPage,
});

function ChatPage() {
  const { roles } = useAuth();
  const priority: AppRole[] = ["admin", "service_engineer", "dealer", "customer"];
  const role = priority.find((p) => roles.includes(p)) ?? "customer";
  return (
    <DashboardShell role={role}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">AI Assistant</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask by voice or text. Grounded in your product manuals and service knowledge base.
        </p>
      </div>
      <ChatWindow />
    </DashboardShell>
  );
}

function ChatWindow() {
  const [input, setInput] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceErr, setVoiceErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setToken(session?.access_token ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const transport = useMemo(() => {
    if (!token) return undefined;
    return new DefaultChatTransport({ api: "/api/chat", headers: { Authorization: `Bearer ${token}` } });
  }, [token]);

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onError: (e) => console.error("[chat] error", e),
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => { if (!isLoading) inputRef.current?.focus(); }, [isLoading]);

  // Auto-speak the latest completed assistant message when voice is on.
  useEffect(() => {
    if (!voiceOn || isLoading || !token) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (spokenIdsRef.current.has(last.id)) return;
    const text = (last.parts ?? []).filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ").trim();
    if (!text) return;
    spokenIdsRef.current.add(last.id);
    speak(text, token).catch((e) => console.error("[tts]", e));
  }, [messages, isLoading, voiceOn, token]);

  const speak = async (text: string, tok: string) => {
    try {
      audioRef.current?.pause();
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ text: stripMarkdown(text), voice: "alloy" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (e: any) {
      setVoiceErr(`Voice playback failed: ${e.message}`);
    }
  };

  const toggleVoice = () => {
    if (voiceOn) audioRef.current?.pause();
    setVoiceOn((v) => !v);
    setVoiceErr(null);
  };

  const startRecording = async () => {
    setVoiceErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 1024) { setVoiceErr("Recording too short — try again."); return; }
        if (!token) return;
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append("file", blob, `recording.${mime.includes("mp4") ? "mp4" : "webm"}`);
          const res = await fetch("/api/stt", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          const text = (data.text ?? "").trim();
          if (text) setInput((prev) => (prev ? prev + " " : "") + text);
          else setVoiceErr("No speech detected.");
        } catch (e: any) {
          setVoiceErr(`Transcription failed: ${e.message}`);
        } finally {
          setTranscribing(false);
        }
      };
      mediaRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (e: any) {
      setVoiceErr(`Microphone access denied: ${e.message}`);
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading || !transport) return;
    setInput("");
    await sendMessage({ text });
  };

  return (
    <div className="flex h-[calc(100vh-14rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-center justify-between border-b border-border bg-background/60 px-4 py-2">
        <div className="text-xs text-muted-foreground">
          {voiceOn ? "🔊 Voice replies on" : "Voice replies off"}
        </div>
        <Button size="sm" variant={voiceOn ? "default" : "outline"} onClick={toggleVoice}>
          {voiceOn ? <><Volume2 className="h-4 w-4 mr-1"/>Voice on</> : <><VolumeX className="h-4 w-4 mr-1"/>Voice off</>}
        </Button>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.length === 0 ? <EmptyState /> : messages.map((m) => <MessageBubble key={m.id} message={m} />)}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />Searching manuals and thinking…
          </div>
        )}
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error.message}</div>}
        {voiceErr && <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">{voiceErr}</div>}
      </div>
      <form onSubmit={onSubmit} className="flex gap-2 border-t border-border bg-background/60 p-4">
        <Button
          type="button"
          size="icon"
          variant={recording ? "destructive" : "outline"}
          onClick={recording ? stopRecording : startRecording}
          disabled={!transport || transcribing || isLoading}
          className="self-end"
          title={recording ? "Stop recording" : "Speak your question"}
        >
          {transcribing ? <Loader2 className="h-4 w-4 animate-spin"/> : recording ? <MicOff className="h-4 w-4"/> : <Mic className="h-4 w-4"/>}
        </Button>
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(e); } }}
          placeholder={recording ? "Listening…" : "Ask by voice (🎤) or type your question…"}
          className="min-h-[52px] resize-none"
          disabled={!transport || recording}
        />
        <Button type="submit" disabled={isLoading || !input.trim() || !transport} className="self-end">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#+\s+/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = (message.parts ?? []).filter((p): p is { type: "text"; text: string } => p.type === "text").map((p) => p.text).join("");
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
        {isUser ? <p className="whitespace-pre-wrap">{text}</p> : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-headings:mb-2 prose-ol:my-2 prose-ul:my-2">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  const samples = [
    "What is the oil change interval for the Farmtrac 60?",
    "Explain the warranty coverage for the hydraulic system.",
    "EMI for a ₹9,50,000 tractor at 9.5% over 5 years?",
    "Steps to troubleshoot a tractor that won't start.",
  ];
  return (
    <div className="mx-auto max-w-2xl py-10 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Bot className="h-5 w-5" /></div>
      <h2 className="mt-4 font-display text-xl font-semibold">Ask the Escorts Kubota AI Assistant</h2>
      <p className="mt-2 text-sm text-muted-foreground">Tap the mic to speak, or type. Answers are grounded in your uploaded manuals.</p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {samples.map((s) => <div key={s} className="rounded-lg border border-border bg-background p-3 text-left text-xs text-muted-foreground">{s}</div>)}
      </div>
    </div>
  );
}

export function ComingSoon({ icon: Icon = Construction, title, body }: { icon?: typeof Bot; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-soft">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="h-6 w-6" /></div>
      <h2 className="mt-6 font-display text-xl font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
