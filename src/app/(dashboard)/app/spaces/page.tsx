"use client";

import { motion } from "framer-motion";
import { Layers, Plus } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";

export default function SpacesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar breadcrumb={[{ label: "Spaces" }]} />

      <div className="flex-1 p-6 max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Spaces</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Sua tela infinita para fluxos de trabalho criativos
            </p>
          </div>
          <button className="h-9 px-4 flex items-center gap-2 rounded-xl brand-gradient text-white text-sm font-semibold hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" />
            Novo Space
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 border border-dashed border-[var(--border-default)] rounded-2xl text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
            <Layers className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="font-bold text-[var(--text-primary)] mb-1">Nenhum Space ainda</h2>
          <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed mb-6">
            Crie um Space para organizar seus projetos em uma tela infinita colaborativa
          </p>
          <button className="h-9 px-5 rounded-xl brand-gradient text-white text-sm font-semibold hover:opacity-90 transition-opacity">
            Criar primeiro Space
          </button>
        </motion.div>
      </div>
    </div>
  );
}
