import { SignIn } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl brand-gradient flex items-center justify-center shadow-lg">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold brand-text">SaasArq</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Renderizações com IA para arquitetos
          </p>
        </div>
      </div>
      <SignIn
        appearance={{
          elements: {
            card: "shadow-[var(--shadow-modal)] border border-[var(--border-subtle)] rounded-2xl",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
          },
        }}
      />
    </div>
  );
}
