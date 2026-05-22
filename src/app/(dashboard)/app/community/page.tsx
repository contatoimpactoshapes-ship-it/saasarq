"use client";

import { motion } from "framer-motion";
import { Users, Heart, Download, Eye } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";

const MOCK_FEED = Array.from({ length: 12 }, (_, i) => ({
  id: `post-${i}`,
  user: `Usuário ${i + 1}`,
  prompt: ["Modern office lobby", "Luxury villa exterior", "Minimalist bedroom", "Rooftop garden"][i % 4],
  likes: Math.floor(Math.random() * 200) + 10,
  views: Math.floor(Math.random() * 2000) + 100,
  model: ["Auto", "Flux.2 Pro", "Nano Banana Pro"][i % 3],
}));

export default function CommunityPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar breadcrumb={[{ label: "Comunidade" }]} />

      <div className="flex-1 p-6 max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Comunidade</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Explore criações de outros usuários e se inspire
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          {[
            { label: "Criações", value: "142K" },
            { label: "Usuários", value: "8.4K" },
            { label: "Esta semana", value: "3.2K" },
          ].map((stat) => (
            <div key={stat.label} className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-white">
              <p className="text-lg font-bold text-[var(--text-primary)]">{stat.value}</p>
              <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Feed grid */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
        >
          {MOCK_FEED.map((post) => (
            <motion.div
              key={post.id}
              variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}
              className="group rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-secondary)] cursor-pointer hover:border-[var(--text-muted)] transition-all"
            >
              {/* Shimmer placeholder */}
              <div className="aspect-square shimmer" />
              <div className="p-2">
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">{post.prompt}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-[var(--text-muted)]">{post.user}</span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)]">
                      <Heart className="w-2.5 h-2.5" />
                      {post.likes}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)]">
                      <Eye className="w-2.5 h-2.5" />
                      {post.views}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
