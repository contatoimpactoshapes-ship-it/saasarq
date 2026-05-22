"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  iconBg: string;
  iconColor: string;
}

export function CategoryCard({ href, icon: Icon, label, description, iconBg, iconColor }: CategoryCardProps) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.15 }}
        className="bg-white border border-[var(--border-subtle)] rounded-xl p-4 cursor-pointer hover:border-[var(--border-default)] hover:shadow-[var(--shadow-card)] transition-all"
      >
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", iconBg)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        <p className="font-semibold text-sm text-[var(--text-primary)] mb-0.5">{label}</p>
        <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">{description}</p>
      </motion.div>
    </Link>
  );
}
