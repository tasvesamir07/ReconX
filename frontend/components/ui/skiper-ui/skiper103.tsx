"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle, ShieldAlert, Cpu, FileCheck2, Sparkles, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AccordionItemData {
  id: string | number;
  question: string;
  answer: string;
  category?: string;
  icon?: React.ReactNode;
}

interface BouncyAccordionProps {
  items?: AccordionItemData[];
  className?: string;
  allowMultiple?: boolean;
}

const DEFAULT_FAQ_ITEMS: AccordionItemData[] = [
  {
    id: 1,
    question: "How does ReconX eliminate false positives with cryptographic proof?",
    answer:
      "Unlike traditional scanners that rely on pattern-matching banners, ReconX actively reproduces verified exploit paths inside isolated Kali Linux sandboxes. Every finding requires an immutable SHA-256 evidence digest, recorded in the tamper-evident audit ledger before being reported to your team.",
    category: "Evidence Proof",
    icon: <FileCheck2 className="w-4 h-4 text-[#C6F432]" />,
  },
  {
    id: 2,
    question: "What is scope authorization, and why is human approval required?",
    answer:
      "ReconX operates under strict deterministic boundaries. Security engineers or moderators must explicitly approve target domains, CIDR blocks, and probe depth before any automated Kali agent dispatches. Scans against out-of-scope assets are cryptographically blocked at the policy layer.",
    category: "Authorization",
    icon: <ShieldAlert className="w-4 h-4 text-[#C6F432]" />,
  },
  {
    id: 3,
    question: "Can ReconX integrate directly into our CI/CD pull request workflow?",
    answer:
      "Yes. Our CLI and GitHub Action dispatch ephemeral Kali worker probes whenever a pull request touches network or auth code. Findings block pull requests only when verified against live sandbox evidence, preventing your developers from chasing unconfirmed alerts.",
    category: "CI/CD & CLI",
    icon: <Terminal className="w-4 h-4 text-[#C6F432]" />,
  },
  {
    id: 4,
    question: "Which automated tools and exploit suites does the engine utilize?",
    answer:
      "The orchestrator securely coordinates industry-standard, auditable tools including Nuclei with real-time CVE templates, Nmap for precision service fingerprinting, Gobuster for directory enumeration, and custom cryptographic signing runners running in ephemeral Docker/container sandboxes.",
    category: "Engine Stack",
    icon: <Cpu className="w-4 h-4 text-[#C6F432]" />,
  },
  {
    id: 5,
    question: "How are compliance reports generated for SOC 2, ISO 27001, and HIPAA?",
    answer:
      "Every assessment automatically renders a verifiable PDF audit archive containing executive summaries, risk matrices, raw request/response transcripts, and authorization certificates ready for external compliance auditors.",
    category: "Governance",
    icon: <Sparkles className="w-4 h-4 text-[#C6F432]" />,
  },
];

/**
 * Skiper 103 — Bouncy Accordion (@skiper-ui/skiper103)
 * Interactive accordion with spring-physics transitions, glassmorphic cards,
 * rotating indicator icons, and smooth layout height expansion.
 */
export function Skiper103({
  items = DEFAULT_FAQ_ITEMS,
  className,
  allowMultiple = false,
}: BouncyAccordionProps) {
  const [openIds, setOpenIds] = useState<(string | number)[]>([items[0]?.id ?? 1]);

  const toggleItem = (id: string | number) => {
    if (allowMultiple) {
      setOpenIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <div className={cn("w-full flex flex-col gap-3", className)}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);

        return (
          <motion.div
            key={item.id}
            className={cn(
              "rounded-2xl border transition-colors overflow-hidden group backdrop-blur-md",
              isOpen
                ? "bg-[#141416] border-[#C6F432]/40 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.8),0_0_20px_-6px_rgba(198,244,50,0.15)]"
                : "bg-[#101012]/80 hover:bg-[#141416]/90 border-white/8 hover:border-white/18"
            )}
          >
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              className="w-full px-5 py-4.5 sm:px-6 sm:py-5 flex items-center justify-between text-left gap-4 cursor-pointer select-none"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300",
                    isOpen
                      ? "bg-[#C6F432]/15 border-[#C6F432]/50 text-[#C6F432] shadow-[0_0_12px_rgba(198,244,50,0.25)] scale-105"
                      : "bg-white/5 border-white/10 text-zinc-400 group-hover:text-white group-hover:border-white/20"
                  )}
                >
                  {item.icon || <HelpCircle className="w-4 h-4" />}
                </div>
                <div className="flex flex-col min-w-0">
                  {item.category && (
                    <span className="text-[10px] font-mono tracking-wider uppercase text-[#C6F432] font-semibold mb-0.5">
                      {item.category}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-sm sm:text-base font-medium tracking-tight transition-colors line-clamp-2",
                      isOpen ? "text-white font-semibold" : "text-zinc-300 group-hover:text-white"
                    )}
                  >
                    {item.question}
                  </span>
                </div>
              </div>

              {/* Bouncy Rotating Chevron Indicator */}
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0, scale: isOpen ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                  isOpen
                    ? "bg-[#C6F432] text-[#0B0B0C] border-[#C6F432] shadow-[0_0_10px_rgba(198,244,50,0.4)]"
                    : "bg-white/5 text-zinc-400 border-white/10 group-hover:border-white/25 group-hover:text-white"
                )}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>

            {/* Bouncy Spring Height Expansion */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: "auto",
                    opacity: 1,
                    transition: {
                      height: { type: "spring", stiffness: 350, damping: 28 },
                      opacity: { duration: 0.25, delay: 0.05 },
                    },
                  }}
                  exit={{
                    height: 0,
                    opacity: 0,
                    transition: {
                      height: { type: "spring", stiffness: 380, damping: 30 },
                      opacity: { duration: 0.15 },
                    },
                  }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-1 text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed border-t border-white/5">
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
