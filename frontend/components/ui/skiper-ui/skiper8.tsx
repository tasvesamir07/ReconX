"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const DEFAULT_WORDS = [
  "ReconX",
  "Scope Authorization",
  "Cryptographic Ledger",
  "Ephemeral Kali Workers",
  "Deterministic Evidence",
  "Zero False Positives",
];

export interface Skiper8Props {
  words?: string[];
  durationPerWord?: number;
  onComplete?: () => void;
  className?: string;
}

/**
 * Skiper 8 — Words Preloader (@skiper-ui/skiper8)
 * Inspired by Dennis Snellenberg's portfolio preloader.
 * Features animated word reveals with smooth spring transitions and a dynamic
 * quadratic Bézier SVG curved path exit curtain that sweeps upward.
 */
export function Skiper8({
  words = DEFAULT_WORDS,
  durationPerWord = 220,
  onComplete,
  className,
}: Skiper8Props) {
  const [index, setIndex] = useState(0);
  const [dimension, setDimension] = useState({ width: 0, height: 0 });
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const updateDimension = () => {
      setDimension({ width: window.innerWidth, height: window.innerHeight });
    };

    updateDimension();
    window.addEventListener("resize", updateDimension);
    return () => window.removeEventListener("resize", updateDimension);
  }, []);

  // Word cycling sequence
  useEffect(() => {
    if (index === words.length - 1) {
      const exitTimer = setTimeout(() => {
        setIsFinished(true);
        if (onComplete) onComplete();
      }, 500);
      return () => clearTimeout(exitTimer);
    }

    const nextTimer = setTimeout(
      () => {
        setIndex((prev) => prev + 1);
      },
      index === 0 ? 650 : durationPerWord
    );

    return () => clearTimeout(nextTimer);
  }, [index, words.length, durationPerWord, onComplete]);

  // SVG Curved Path generator
  // Quadratic Bézier curve pulled down by 260px at start, flattening out smoothly on exit
  const initialCurvePath = `
    M 0 0 
    L ${dimension.width} 0 
    L ${dimension.width} ${dimension.height} 
    Q ${dimension.width / 2} ${dimension.height + 260} 0 ${dimension.height} 
    Z
  `;

  const flatTargetPath = `
    M 0 0 
    L ${dimension.width} 0 
    L ${dimension.width} ${dimension.height} 
    Q ${dimension.width / 2} ${dimension.height} 0 ${dimension.height} 
    Z
  `;

  const easeCurve: [number, number, number, number] = [0.76, 0, 0.24, 1];

  const curveVariants = {
    initial: {
      d: initialCurvePath,
      transition: { duration: 0.7, ease: easeCurve },
    },
    exit: {
      d: flatTargetPath,
      transition: { duration: 0.7, ease: easeCurve, delay: 0.15 },
    },
  };

  const slideUpVariants = {
    initial: { top: 0 },
    exit: {
      top: "-100vh",
      transition: { duration: 0.85, ease: easeCurve, delay: 0.1 },
    },
  };

  if (dimension.width === 0) return null;

  return (
    <AnimatePresence mode="wait">
      {!isFinished && (
        <motion.div
          variants={slideUpVariants}
          initial="initial"
          exit="exit"
          className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center bg-[#0B0B0C] text-white select-none pointer-events-auto",
            className
          )}
        >
          {dimension.height > 0 && (
            <>
              {/* Center Typography with Lime Green Glow Dot */}
              <div className="relative z-10 flex items-center gap-3.5 px-6">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C6F432] shadow-[0_0_12px_#C6F432] animate-pulse" />
                <motion.h2
                  key={index}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="text-2xl sm:text-4xl lg:text-5xl font-serif tracking-tight text-white"
                >
                  {words[index]}
                </motion.h2>
              </div>

              {/* Dennis Snellenberg SVG Curved Bottom Edge */}
              <svg
                className="absolute top-0 w-full pointer-events-none"
                style={{ height: "calc(100vh + 260px)" }}
              >
                <motion.path
                  variants={curveVariants}
                  initial="initial"
                  exit="exit"
                  fill="#0B0B0C"
                />
              </svg>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
