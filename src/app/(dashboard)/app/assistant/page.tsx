"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "Como gero imagens fotorrealistas de interiores?",
  "Qual modelo usar para renderizações externas?",
  "Como descrever materiais no prompt?",
  "Dicas para prompts de iluminação?",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text = input) {
    const content = text.trim();
    if (!content || loading) return;

    setInput("");
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const data = await res.json();
      const reply: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reply ?? "Não foi possível gerar uma resposta.",
      };
      setMessages((prev) => [...prev, reply]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "Desculpe, ocorreu um erro. Tente novamente.",
      }]);
    }
    setLoading(false);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen">
      <TopBar breadcrumb={[{ label: "Assistente IA" }]} />

      <div className="flex flex-col flex-1 min-h-0 max-w-2xl w-full mx-auto px-4">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin py-6 space-y-4">
          {isEmpty && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center pt-12"
            >
              <div className="w-14 h-14 rounded-2xl brand-gradient flex items-center justify-center mb-4">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <h2 className="font-bold text-lg text-[var(--text-primary)] mb-1">Assistente SaasArq</h2>
              <p className="text-sm text-[var(--text-muted)] mb-8 max-w-xs">
                Tire dúvidas sobre prompts, modelos e como criar renderizações incríveis.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-left px-3 py-2.5 rounded-xl border border-[var(--border-default)] bg-white hover:border-[var(--color-brand)] hover:shadow-[var(--shadow-card)] transition-all text-xs text-[var(--text-secondary)]"
                  >
                    <Sparkles className="w-3 h-3 text-[var(--color-brand)] inline mr-1.5 mb-0.5" />
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "assistant" ? "brand-gradient" : "bg-[var(--bg-secondary)]"
                }`}>
                  {msg.role === "assistant"
                    ? <Bot className="w-3.5 h-3.5 text-white" />
                    : <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  }
                </div>
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[var(--color-brand)] text-white rounded-tr-sm"
                    : "bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-tl-sm"
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-7 h-7 rounded-full brand-gradient flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="px-3.5 py-3 rounded-2xl rounded-tl-sm bg-[var(--bg-secondary)] flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="pb-4 shrink-0">
          <div className="flex items-end gap-2 p-1.5 rounded-2xl border border-[var(--border-default)] bg-white focus-within:border-[var(--color-brand)] transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Pergunte sobre prompts, modelos, técnicas..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none max-h-32 overflow-y-auto"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="w-8 h-8 flex items-center justify-center rounded-xl brand-gradient text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-[var(--text-muted)] mt-1.5">
            Enter para enviar · Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </div>
  );
}
