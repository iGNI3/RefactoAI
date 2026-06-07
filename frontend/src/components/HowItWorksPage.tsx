import React from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ScanSearch, BrainCircuit, TerminalSquare, FileCode2 } from "lucide-react";

interface HowItWorksPageProps {
  onBackToHero: () => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onBackToHero }) => {
  const stepVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <div className="w-full min-h-screen p-6 sm:p-10 flex flex-col gap-12 select-none transition-colors duration-300">
      <div className="flex justify-between items-center max-w-5xl mx-auto w-full">
        <h1
          className="text-[28px] sm:text-[34px] font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          How It Works
        </h1>
        <button
          onClick={onBackToHero}
          className="text-[14px] uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity underline underline-offset-2"
        >
          &larr; Back to Home
        </button>
      </div>

      <div className="max-w-5xl mx-auto w-full flex flex-col gap-16">
        {/* Step 1 */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stepVariants}
          className="flex flex-col md:flex-row gap-8 items-center"
        >
          <div className="flex-1 flex flex-col gap-4">
            <div className="w-12 h-12 bg-[var(--color-contrast)] text-[var(--color-base)] rounded-2xl flex items-center justify-center">
              <ScanSearch size={24} />
            </div>
            <h3 className="text-[24px] font-bold tracking-tight">1. Index the Codebase</h3>
            <p className="text-[16px] opacity-70 leading-relaxed max-w-md">
              Provide the absolute path to your local workspace. The platform reads the directory, skips ignored files, and uses Tree-sitter to parse the Abstract Syntax Tree (AST).
            </p>
          </div>
          <div className="flex-1 w-full bg-[var(--color-surface)] p-6 rounded-3xl border border-[var(--color-border)] shadow-sm font-mono text-[13px] overflow-hidden">
            <div className="flex gap-2 mb-4 border-b border-[var(--color-border)] pb-2 opacity-50">
              <span className="w-3 h-3 rounded-full bg-red-400"></span>
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <span className="w-3 h-3 rounded-full bg-green-400"></span>
            </div>
            <pre className="opacity-80">
              <span className="text-emerald-500">INFO</span>: Discovered 48 files<br/>
              <span className="text-emerald-500">INFO</span>: Parsing AST trees...<br/>
              <span className="text-emerald-500">INFO</span>: Extracted 1,412 node chunks<br/>
              <span className="text-emerald-500">INFO</span>: Upserting to ChromaDB [██████████] 100%
            </pre>
          </div>
        </motion.div>

        {/* Step 2 */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stepVariants}
          className="flex flex-col md:flex-row-reverse gap-8 items-center"
        >
          <div className="flex-1 flex flex-col gap-4">
            <div className="w-12 h-12 bg-[var(--color-contrast)] text-[var(--color-base)] rounded-2xl flex items-center justify-center">
              <BrainCircuit size={24} />
            </div>
            <h3 className="text-[24px] font-bold tracking-tight">2. Semantic Retrieval</h3>
            <p className="text-[16px] opacity-70 leading-relaxed max-w-md">
              When you ask a question, the query is embedded and compared against the vector store. The platform retrieves the exact AST segments needed, bypassing context window bloat.
            </p>
          </div>
          <div className="flex-1 w-full bg-[var(--color-surface)] p-6 rounded-3xl border border-[var(--color-border)] shadow-sm font-mono text-[13px]">
             <pre className="opacity-80">
              {"{\n"}
              {'  "query": "find auth middleware",\n'}
              {'  "matches": [\n'}
              {'    {\n'}
              {'      "file": "middleware/auth.ts",\n'}
              {'      "type": "function_declaration",\n'}
              {'      "distance": 0.1245\n'}
              {'    }\n'}
              {'  ]\n'}
              {"}"}
            </pre>
          </div>
        </motion.div>

        {/* Step 3 */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stepVariants}
          className="flex flex-col md:flex-row gap-8 items-center"
        >
          <div className="flex-1 flex flex-col gap-4">
            <div className="w-12 h-12 bg-[var(--color-contrast)] text-[var(--color-base)] rounded-2xl flex items-center justify-center">
              <TerminalSquare size={24} />
            </div>
            <h3 className="text-[24px] font-bold tracking-tight">3. Autonomous Refactoring</h3>
            <p className="text-[16px] opacity-70 leading-relaxed max-w-md">
              The retrieved context is fed to a target LLM. Models like DeepSeek Reasoner spend their token budget internally reasoning about the logic before outputting a unified diff.
            </p>
          </div>
          <div className="flex-1 w-full bg-[#121210] text-[#f5f5f0] p-6 rounded-3xl border border-white/10 shadow-lg font-mono text-[13px]">
            <pre>
              <span className="text-amber-400 opacity-80">{'<think>\n'}</span>
              <span className="text-amber-400 opacity-60">{'The auth token is missing validation...\n'}</span>
              <span className="text-amber-400 opacity-60">{'I should add a try-catch block here.\n'}</span>
              <span className="text-amber-400 opacity-80">{'</think>\n\n'}</span>
              <span className="text-emerald-400">{'```diff\n'}</span>
              <span className="text-red-400">{'- const token = req.headers.auth;\n'}</span>
              <span className="text-emerald-400">{'+ const token = validate(req.headers.auth);\n'}</span>
              <span className="text-emerald-400">{'```'}</span>
            </pre>
          </div>
        </motion.div>

        {/* Step 4 */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stepVariants}
          className="flex flex-col md:flex-row-reverse gap-8 items-center"
        >
          <div className="flex-1 flex flex-col gap-4">
            <div className="w-12 h-12 bg-[var(--color-contrast)] text-[var(--color-base)] rounded-2xl flex items-center justify-center">
              <FileCode2 size={24} />
            </div>
            <h3 className="text-[24px] font-bold tracking-tight">4. PatchPilot Application</h3>
            <p className="text-[16px] opacity-70 leading-relaxed max-w-md">
              The Sandboxed PatchPilot engine intercepts the generated diff, parses the modifications, and validates them. If valid, the diff is automatically applied to your local files.
            </p>
          </div>
          <div className="flex-1 w-full bg-[var(--color-surface)] p-6 rounded-3xl border border-[var(--color-border)] shadow-sm font-mono text-[13px]">
            <pre className="opacity-80">
              <span className="text-emerald-500">✔</span> Diff parsed successfully<br/>
              <span className="text-emerald-500">✔</span> Context lines match source<br/>
              <span className="text-emerald-500">✔</span> Sandbox permission granted<br/><br/>
              Patch applied to <span className="font-bold underline">middleware/auth.ts</span>
            </pre>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
