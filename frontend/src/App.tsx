import { useState, useEffect } from "react";
import { Moon, Sun, Settings } from "lucide-react";
import { HeroSection } from "./components/HeroSection";
import { ConsolePanel } from "./components/ConsolePanel";
import { ArchitecturePage } from "./components/ArchitecturePage";
import { HowItWorksPage } from "./components/HowItWorksPage";
import { SettingsModal } from "./components/SettingsModal";
import { IDELayout } from "./components/IDELayout";

type AppView = "hero" | "dashboard" | "architecture" | "how-it-works" | "ide";

export default function App() {
  const isElectron = navigator.userAgent.toLowerCase().includes('electron');
  const [currentView, setCurrentView] = useState<AppView>(
    isElectron ? "ide" : "hero"
  );
  const [isDark, setIsDark] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const navigateTo = (view: AppView) => {
    window.scrollTo(0, 0);
    setCurrentView(view);
  };

  const renderView = () => {
    switch (currentView) {
      case "ide":
        return <IDELayout onBackToHero={() => navigateTo("hero")} />;
      case "dashboard":
        return <ConsolePanel onBackToHero={() => navigateTo("hero")} />;
      case "architecture":
        return <ArchitecturePage onBackToHero={() => navigateTo("hero")} />;
      case "how-it-works":
        return <HowItWorksPage onBackToHero={() => navigateTo("hero")} />;
      default:
        return <HeroSection onNavigate={navigateTo} />;
    }
  };

  return (
    <>
      {renderView()}
      
      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-12 h-12 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-contrast)] rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          aria-label="Open Settings"
        >
          <Settings size={20} />
        </button>
        <button
          onClick={() => setIsDark(!isDark)}
          className="w-12 h-12 bg-[var(--color-contrast)] text-[var(--color-base)] rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          aria-label="Toggle Theme"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </>
  );
}
