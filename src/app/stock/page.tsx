"use client";

import { motion } from "framer-motion";
import { Package, Search, Image, Video, Music, FileText } from "lucide-react";

const CATEGORIES = [
  { icon: Image, label: "Fotos", count: "185M+" },
  { icon: Video, label: "Vídeos", count: "12M+" },
  { icon: Music, label: "Músicas", count: "25M+" },
  { icon: FileText, label: "Vetores & PSD", count: "30M+" },
];

export default function StockPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-5 w-16 h-16 rounded-2xl bg-slate-100 justify-center mx-auto">
            <Package className="w-8 h-8 text-slate-600" />
          </div>
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-3">
            Stock
          </h1>
          <p className="text-[var(--text-muted)] text-lg max-w-xl mx-auto">
            Mais de 250 milhões de fotos, vídeos, vetores e áudios licenciados.
            Disponível nos planos Premium e superiores.
          </p>
        </motion.div>

        {/* Search bar (decorative) */}
        <div className="max-w-xl mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Buscar fotos, vídeos, vetores..."
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-[var(--border-default)] bg-white text-sm focus:outline-none focus:border-[var(--color-brand)] transition-colors"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.label}
                className="p-4 rounded-xl border border-[var(--border-default)] bg-white text-center"
              >
                <Icon className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="font-semibold text-sm text-[var(--text-primary)]">{cat.label}</p>
                <p className="text-xs text-[var(--text-muted)]">{cat.count}</p>
              </div>
            );
          })}
        </div>

        {/* Upgrade CTA */}
        <div className="rounded-2xl brand-gradient p-8 text-white">
          <h2 className="font-bold text-2xl mb-2">Acesse o maior acervo stock</h2>
          <p className="text-white/80 mb-6 max-w-md mx-auto">
            Faça upgrade para Premium e tenha acesso ilimitado a 250M+ assets licenciados.
          </p>
          <a href="/pricing">
            <button className="h-10 px-6 bg-white text-[var(--color-brand)] text-sm font-semibold rounded-full hover:bg-white/90 transition-colors">
              Ver planos
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
