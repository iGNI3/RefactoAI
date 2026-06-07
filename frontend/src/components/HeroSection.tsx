import React, { useState, useEffect, useRef } from "react";
import { useTypewriter } from "../hooks/useTypewriter";

interface HeroSectionProps {
  onNavigate: (view: "dashboard" | "architecture" | "how-it-works") => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const videoReference = useRef<HTMLVideoElement | null>(null);
  const targetTimeRef = useRef(0);
  const currentTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Initialize page-load entry transitions
  useEffect(() => {
    setIsPageLoaded(true);
  }, []);

  // Set up the typewriter hook for the welcome prompt
  const { displayedText, isDone } = useTypewriter(
    "Point me at your codebase. I'll parse the AST, find the issues, and ship the fix \u2014 autonomously.",
    38,
    600
  );

  // Interactive mouse scrubbing (left to right, right to left)
  useEffect(() => {
    const handleMouseScrub = (event: MouseEvent) => {
      const videoElement = videoReference.current;
      if (!videoElement || videoElement.readyState < 2) return;

      // Absolute mapping: left screen edge = start of video, right edge = end
      const percentage = event.clientX / window.innerWidth;
      targetTimeRef.current = percentage * videoElement.duration;
    };

    window.addEventListener("mousemove", handleMouseScrub);

    const updateVideo = () => {
      const videoElement = videoReference.current;
      if (videoElement && videoElement.readyState >= 2) {
        // Lerp towards the target time
        const diff = targetTimeRef.current - currentTimeRef.current;
        
        if (Math.abs(diff) > 0.01) {
          currentTimeRef.current += diff * 0.15; // Smooth factor
          videoElement.currentTime = currentTimeRef.current;
        }
      }
      rafRef.current = requestAnimationFrame(updateVideo);
    };

    rafRef.current = requestAnimationFrame(updateVideo);

    return () => {
      window.removeEventListener("mousemove", handleMouseScrub);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden select-none bg-[var(--color-base)]">
      {/* Background Video Element controlled via horizontal mouse movement */}
      <video
        ref={videoReference}
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4"
        className="fixed inset-0 h-full w-full object-cover pointer-events-none"
        style={{ objectPosition: "70% center", zIndex: 0 }}
        muted
        playsInline
        preload="auto"
      />

      {/* Main Navigation Overlay */}
      <nav
        className="fixed top-0 left-0 w-full flex justify-between items-center px-5 sm:px-8 py-4 sm:py-5 bg-transparent"
        style={{ zIndex: 10 }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-[21px] sm:text-[26px] tracking-tight text-[var(--color-contrast)] font-semibold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Refactor.ai
          </span>
          <span className="text-[25px] sm:text-[30px] text-[var(--color-contrast)] select-none leading-none tracking-tight">
            {"\u2733\uFE0E"}
          </span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1 text-[23px] text-[var(--color-contrast)]">
          <button
            onClick={() => onNavigate("dashboard")}
            className="hover:opacity-60 transition-opacity"
          >
            Dashboard
          </button>
          ,{" "}
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity ml-1">
            GitHub
          </a>
          ,{" "}
          <button onClick={() => onNavigate("how-it-works")} className="hover:opacity-60 transition-opacity ml-1">
            Docs
          </button>
        </div>

        <button
          onClick={() => onNavigate("dashboard")}
          className="hidden md:block text-[23px] text-[var(--color-contrast)] underline underline-offset-2 hover:opacity-60 transition-opacity"
        >
          Open Dashboard
        </button>

        {/* Mobile Hamburger Toggle */}
        <button
          id="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex flex-col gap-[5px] justify-center items-center w-6 h-6 md:hidden z-20 focus:outline-none"
        >
          <span
            className={`w-6 h-[2px] bg-[var(--color-contrast)] transition-all duration-300 ${
              isMobileMenuOpen ? "rotate-45 translate-y-[7px]" : ""
            }`}
          />
          <span
            className={`w-6 h-[2px] bg-[var(--color-contrast)] transition-all duration-300 ${
              isMobileMenuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`w-6 h-[2px] bg-[var(--color-contrast)] transition-all duration-300 ${
              isMobileMenuOpen ? "-rotate-45 -translate-y-[7px]" : ""
            }`}
          />
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className="fixed inset-0 bg-[var(--color-surface)]/95 backdrop-blur-sm flex flex-col justify-center px-8 gap-8 transition-all duration-300 md:hidden"
        style={{
          zIndex: 9,
          opacity: isMobileMenuOpen ? 1 : 0,
          pointerEvents: isMobileMenuOpen ? "auto" : "none",
        }}
      >
        <button onClick={() => { setIsMobileMenuOpen(false); onNavigate("dashboard"); }} className="text-[32px] font-medium text-[var(--color-contrast)] text-left">
          Dashboard
        </button>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-[32px] font-medium text-[var(--color-contrast)]">
          GitHub
        </a>
        <button onClick={() => { setIsMobileMenuOpen(false); onNavigate("how-it-works"); }} className="text-[32px] font-medium text-[var(--color-contrast)] text-left">
          Docs
        </button>
        <hr className="border-[var(--color-border)] w-24 my-2" />
        <button onClick={() => { setIsMobileMenuOpen(false); onNavigate("dashboard"); }} className="text-[32px] font-medium text-[var(--color-contrast)] underline text-left">
          Open Dashboard
        </button>
      </div>

      {/* Hero Section Container */}
      <div
        className="relative w-full h-full flex flex-col justify-end md:justify-center px-5 sm:px-8 md:px-10 pb-12 md:pb-0"
        style={{ zIndex: 1 }}
      >
        <div className="max-w-xl text-left">
          {/* Blurred Introductory Sub-label */}
          <div
            className="mb-5 sm:mb-6 select-none pointer-events-none text-[var(--color-contrast)] leading-tight"
            style={{
              fontSize: "clamp(18px, 4vw, 26px)",
              filter: "blur(4px)",
            }}
          >
            Autonomous Source Code Analysis
            <br />
            & Refactoring Engine
          </div>

          {/* Welcome Prompt with Typewriter Effect */}
          <div
            className="mb-5 sm:mb-8 text-[var(--color-contrast)] font-normal leading-[1.35]"
            style={{
              fontSize: "clamp(18px, 4vw, 26px)",
              minHeight: "54px",
            }}
          >
            <span>{displayedText}</span>
            {!isDone && (
              <span className="inline-block w-[2px] h-[1.1em] bg-[var(--color-contrast)] align-middle ml-[2px] animate-pulse" />
            )}
          </div>

          {/* Action Navigation Pills */}
          <div
            className={`flex flex-wrap gap-y-1 transition-all duration-700 transform ${
              isPageLoaded
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2"
            }`}
            style={{ transitionDelay: "400ms" }}
          >
            <button
              id="btn-analyze-codebase"
              onClick={() => onNavigate("dashboard")}
              className="inline-flex items-center justify-center bg-[var(--color-surface)] text-[var(--color-contrast)] border border-[var(--color-border)] rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap hover:bg-[var(--color-contrast)] hover:text-[var(--color-base)] transition-colors duration-200"
            >
              Analyze a Codebase
            </button>
            <button
              id="btn-open-dashboard"
              onClick={() => onNavigate("dashboard")}
              className="inline-flex items-center justify-center bg-[var(--color-surface)] text-[var(--color-contrast)] border border-[var(--color-border)] rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap hover:bg-[var(--color-contrast)] hover:text-[var(--color-base)] transition-colors duration-200"
            >
              Open Dashboard
            </button>
            <button
              id="btn-view-docs"
              onClick={() => onNavigate("architecture")}
              className="inline-flex items-center justify-center bg-[var(--color-surface)] text-[var(--color-contrast)] border border-[var(--color-border)] rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap hover:bg-[var(--color-contrast)] hover:text-[var(--color-base)] transition-colors duration-200"
            >
              View Architecture
            </button>
            <button
              id="btn-see-how"
              onClick={() => onNavigate("how-it-works")}
              className="inline-flex items-center justify-center bg-[var(--color-surface)] text-[var(--color-contrast)] border border-[var(--color-border)] rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap hover:bg-[var(--color-contrast)] hover:text-[var(--color-base)] transition-colors duration-200"
            >
              See How It Works
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
