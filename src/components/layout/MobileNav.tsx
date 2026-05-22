"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wand2, FolderOpen, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Início", icon: LayoutDashboard },
  { href: "/app/ai-image-generator", label: "Gerar", icon: Wand2 },
  { href: "/app/projects", label: "Projetos", icon: FolderOpen },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors",
                isActive ? "text-[var(--brand)]" : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
