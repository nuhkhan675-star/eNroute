"use client";

import { useRef, useState, useTransition } from "react";
import { confirmProfileUpdate } from "@/lib/actions/chat";
import type { ProposeProfileUpdate } from "@/lib/ai/schemas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface Props {
  conversationId: string;
  initialMessages: Message[];
  focusedUniversityId?: string;
}

export function ChatWindow({ conversationId, initialMessages, focusedUniversityId }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<ProposeProfileUpdate | null>(null);
  const [isConfirming, startConfirming] = useTransition();
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const streamingIdRef = useRef<string | null>(null);

  const appendAssistantDelta = (delta: string) => {
    setMessages((prev) => {
      const id = streamingIdRef.current;
      if (!id) return prev;
      return prev.map((m) => (m.id === id ? { ...m, content: m.content + delta } : m));
    });
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    setPendingUpdate(null);

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantId = crypto.randomUUID();
    streamingIdRef.current = assistantId;
    setStreamingMessageId(assistantId);
    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: "assistant", content: "" }]);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text, focusedUniversityId }),
      });
      if (!res.ok || !res.body) throw new Error("Chat request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith("data:")) continue;
          const payload = JSON.parse(line.slice(5).trim());
          if (payload.type === "text") appendAssistantDelta(payload.value);
          if (payload.type === "propose_update") setPendingUpdate(payload.value);
          if (payload.type === "error") toast.error(payload.value);
        }
      }
    } catch {
      toast.error("Something went wrong talking to your advisor.");
    } finally {
      setIsStreaming(false);
      streamingIdRef.current = null;
      setStreamingMessageId(null);
    }
  };

  const handleConfirmUpdate = () => {
    if (!pendingUpdate) return;
    startConfirming(async () => {
      const result = await confirmProfileUpdate(pendingUpdate);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Profile updated. Re-run Analyze to see the effect.");
        setPendingUpdate(null);
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <ScrollArea className="flex-1 rounded-md border p-4" style={{ height: "60vh" }}>
        <div className="flex flex-col gap-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ask me anything about your profile, universities you&apos;re considering, or how to
              improve your chances.
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[80%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : "mr-auto max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap"
              }
            >
              {m.content || (isStreaming && m.id === streamingMessageId ? "…" : "")}
            </div>
          ))}

          {pendingUpdate && (
            <Card className="mr-auto max-w-[90%]">
              <CardContent className="flex flex-col gap-2 py-3">
                <p className="text-sm font-medium">Add this to your profile?</p>
                <p className="text-sm text-muted-foreground">{pendingUpdate.summary}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleConfirmUpdate} disabled={isConfirming}>
                    {isConfirming ? "Saving…" : "Confirm"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPendingUpdate(null)}>
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask your advisor…"
          className="flex-1 resize-none"
          rows={2}
        />
        <Button onClick={handleSend} disabled={isStreaming || !input.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
