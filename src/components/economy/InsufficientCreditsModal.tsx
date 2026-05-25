"use client";

import { AlertCircle, Zap, X } from "lucide-react";

interface Props {
  open:       boolean;
  required:   number;
  current:    number;
  onClose:    () => void;
  onUpgrade?: () => void;
  onBuyPack?: () => void;
}

export function InsufficientCreditsModal({ open, required, current, onClose, onUpgrade, onBuyPack }: Props) {
  if (!open) return null;

  const deficit = required - current;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Créditos Insuficientes</h3>
            <p className="text-xs text-zinc-400">Você precisa de mais créditos para continuar</p>
          </div>
        </div>

        <div className="bg-zinc-800/60 rounded-lg p-4 mb-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Necessário</span>
            <span className="font-mono text-white">{required.toLocaleString()} créditos</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Disponível</span>
            <span className="font-mono text-zinc-300">{current.toLocaleString()} créditos</span>
          </div>
          <div className="border-t border-white/5 pt-2 flex justify-between">
            <span className="text-zinc-400">Faltam</span>
            <span className="font-mono text-amber-400 font-medium">{deficit.toLocaleString()} créditos</span>
          </div>
        </div>

        <div className="space-y-2">
          {onBuyPack && (
            <button
              onClick={onBuyPack}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Zap className="w-4 h-4" />
              Comprar Créditos
            </button>
          )}
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="w-full px-4 py-2.5 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
            >
              Fazer Upgrade do Plano
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-zinc-500 hover:text-zinc-400 text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
