import Link from "next/link";
import { ArrowRight, Zap, Check, Sparkles, Star } from "lucide-react";

const FEATURES = [
  {
    title: "Qualidade Fotorrealista",
    desc: "Modelos de IA de última geração para renderizações que parecem fotografias reais.",
  },
  {
    title: "Geração em Segundos",
    desc: "Do prompt à imagem em segundos. Sem filas longas, sem espera interminável.",
  },
  {
    title: "Planos Flexíveis",
    desc: "De R$10/mês para iniciantes até planos ilimitados para grandes estúdios.",
  },
];

const MODELS = ["Auto", "Nano Banana Pro", "Flux.2 Pro", "Kling 3.0 4K", "Seedream 5.0"];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Nav */}
      <header className="border-b border-[var(--border-subtle)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg brand-gradient flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-[var(--text-primary)]">SaasArq</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <button className="h-8 px-4 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Entrar
              </button>
            </Link>
            <Link href="/signup">
              <button className="h-8 px-4 text-sm font-semibold rounded-full brand-gradient text-white hover:opacity-90 transition-opacity flex items-center gap-1.5">
                Começar grátis
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-5 py-28 text-center">
        <div className="inline-flex items-center gap-2 mb-5 px-3.5 py-1.5 rounded-full border border-[var(--color-brand)]/25 bg-[var(--color-brand)]/5 text-[var(--color-brand)] text-xs font-semibold">
          <Star className="w-3 h-3 fill-current" />
          IA para Arquitetos e Designers
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-[var(--text-primary)] mb-5 leading-tight">
          Transforme ideias em<br />
          <span className="brand-text">renderizações incríveis</span>
        </h1>
        <p className="text-[var(--text-muted)] text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Gere visualizações arquitetônicas fotorrealistas em segundos usando os melhores
          modelos de IA. Impressione seus clientes sem horas de trabalho manual.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/signup">
            <button className="h-11 px-7 text-sm font-semibold rounded-full brand-gradient text-white hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg shadow-[var(--color-brand)]/20">
              <Zap className="w-4 h-4" />
              Começar agora — é grátis
            </button>
          </Link>
          <Link href="/pricing">
            <button className="h-11 px-7 text-sm font-semibold rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] bg-white transition-all">
              Ver planos e preços
            </button>
          </Link>
        </div>

        {/* Model pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-10">
          {MODELS.map((m) => (
            <span
              key={m}
              className="px-3 py-1 text-xs rounded-full border border-[var(--border-default)] bg-white text-[var(--text-muted)] font-medium"
            >
              {m}
            </span>
          ))}
          <span className="px-3 py-1 text-xs rounded-full border border-[var(--border-default)] bg-white text-[var(--text-muted)] font-medium">
            +20 modelos
          </span>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-5 pb-24">
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-white p-8 md:p-12">
          <h2 className="text-2xl font-bold text-center text-[var(--text-primary)] mb-10">
            Por que arquitetos escolhem o SaasArq
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="text-center space-y-2">
                <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center mx-auto mb-3">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-[var(--text-primary)]">{f.title}</h3>
                <p className="text-[var(--text-muted)] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-5 pb-24 text-center">
        <div className="rounded-3xl brand-gradient p-10 text-white">
          <h2 className="text-2xl font-bold mb-2">Pronto para criar?</h2>
          <p className="text-white/80 mb-6">
            Comece grátis e veja o poder da IA para renderizações arquitetônicas.
          </p>
          <Link href="/signup">
            <button className="h-10 px-8 rounded-full bg-white text-[var(--color-brand)] text-sm font-bold hover:bg-white/90 transition-colors">
              Criar conta grátis
            </button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--border-subtle)] py-8 text-center text-[var(--text-muted)] text-xs">
        © 2025 SaasArq · Todos os direitos reservados ·{" "}
        <Link href="/pricing" className="hover:text-[var(--text-primary)] transition-colors">Planos</Link>
      </footer>
    </div>
  );
}
