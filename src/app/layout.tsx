import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SaasArq — Renderização com IA para Arquitetos",
    template: "%s | SaasArq",
  },
  description:
    "Transforme seus projetos arquitetônicos com renderizações realistas geradas por Inteligência Artificial.",
  keywords: ["arquitetura", "renderização", "inteligência artificial", "IA", "design"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="pt-BR" suppressHydrationWarning>
        <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
          {children}
          <Toaster richColors position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
