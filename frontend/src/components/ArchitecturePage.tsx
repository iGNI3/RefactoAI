import React from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Server, Database, Code2, ShieldAlert, Cpu } from "lucide-react";

interface ArchitecturePageProps {
  onBackToHero: () => void;
}

export const ArchitecturePage: React.FC<ArchitecturePageProps> = ({ onBackToHero }) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <div className="w-full min-h-screen p-6 sm:p-10 flex flex-col gap-8 select-none transition-colors duration-300">
      <div className="flex justify-between items-center max-w-6xl mx-auto w-full">
        <h1
          className="text-[28px] sm:text-[34px] font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          System Architecture
        </h1>
        <button
          onClick={onBackToHero}
          className="text-[14px] uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity underline underline-offset-2"
        >
          &larr; Back to Home
        </button>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Main Orchestrator */}
        <motion.div
          variants={itemVariants}
          className="md:col-span-2 bg-[var(--color-surface)] p-8 rounded-3xl border border-[var(--color-border)] flex flex-col gap-4 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
            <Server size={120} />
          </div>
          <div className="w-12 h-12 bg-[var(--color-contrast)] text-[var(--color-base)] rounded-2xl flex items-center justify-center mb-2 z-10">
            <Server size={24} />
          </div>
          <h2 className="text-[22px] font-bold tracking-tight z-10">FastAPI Orchestrator</h2>
          <p className="text-[15px] opacity-70 leading-relaxed z-10 max-w-lg">
            The central nervous system. Manages Execution Loops, Model Routing, and WebSocket multiplexing for real-time streaming to the UI.
          </p>
        </motion.div>

        {/* Vector Store */}
        <motion.div
          variants={itemVariants}
          className="bg-[var(--color-surface)] p-8 rounded-3xl border border-[var(--color-border)] flex flex-col gap-4 group hover:shadow-lg transition-shadow"
        >
          <div className="w-12 h-12 bg-[var(--color-contrast)] text-[var(--color-base)] rounded-2xl flex items-center justify-center mb-2">
            <Database size={24} />
          </div>
          <h2 className="text-[20px] font-bold tracking-tight">ChromaDB</h2>
          <p className="text-[14px] opacity-70 leading-relaxed">
            High-performance vector storage embedding AST segments into dense multi-dimensional semantic space.
          </p>
        </motion.div>

        {/* AST Chunker */}
        <motion.div
          variants={itemVariants}
          className="bg-[var(--color-surface)] p-8 rounded-3xl border border-[var(--color-border)] flex flex-col gap-4 group hover:shadow-lg transition-shadow"
        >
          <div className="w-12 h-12 bg-[var(--color-contrast)] text-[var(--color-base)] rounded-2xl flex items-center justify-center mb-2">
            <Code2 size={24} />
          </div>
          <h2 className="text-[20px] font-bold tracking-tight">AST Chunker</h2>
          <p className="text-[14px] opacity-70 leading-relaxed">
            Tree-sitter powered parser breaking code down by structural boundaries (functions, classes) instead of naive string splitting.
          </p>
        </motion.div>

        {/* Multi-Model Router */}
        <motion.div
          variants={itemVariants}
          className="bg-[var(--color-surface)] p-8 rounded-3xl border border-[var(--color-border)] flex flex-col gap-4 group hover:shadow-lg transition-shadow"
        >
          <div className="w-12 h-12 bg-[var(--color-contrast)] text-[var(--color-base)] rounded-2xl flex items-center justify-center mb-2">
            <Cpu size={24} />
          </div>
          <h2 className="text-[20px] font-bold tracking-tight">Multi-LLM Router</h2>
          <p className="text-[14px] opacity-70 leading-relaxed">
            Dynamically routes queries to Anthropic, DeepSeek, OpenAI, or Gemini based on user config and token budget.
          </p>
        </motion.div>

        {/* PatchPilot */}
        <motion.div
          variants={itemVariants}
          className="bg-[var(--color-surface)] p-8 rounded-3xl border border-[var(--color-border)] flex flex-col gap-4 group hover:shadow-lg transition-shadow"
        >
          <div className="w-12 h-12 bg-[var(--color-contrast)] text-[var(--color-base)] rounded-2xl flex items-center justify-center mb-2">
            <ShieldAlert size={24} />
          </div>
          <h2 className="text-[20px] font-bold tracking-tight">PatchPilot</h2>
          <p className="text-[14px] opacity-70 leading-relaxed">
            Sandboxed execution environment. Validates generated unified diffs locally before applying them to the filesystem.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};
