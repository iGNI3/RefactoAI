import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Moon, Sun, Settings } from "lucide-react";
import { HeroSection } from "./components/HeroSection";
import { ArchitecturePage } from "./components/ArchitecturePage";
import { HowItWorksPage } from "./components/HowItWorksPage";
import { SettingsModal } from "./components/SettingsModal";
import { ToastContainer, useToasts } from "./components/Toast";
import { WorkspaceLayout } from "./components/WorkspaceLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CommandPalette } from "./components/CommandPalette";

type AppView = "hero" | "dashboard" | "architecture" | "how-it-works" | "ide";

function AppContent() {
  const isVsCode = typeof (window as any).vscode !== 'undefined';
  const isElectron = navigator.userAgent.toLowerCase().includes('electron');
  const navigate = useNavigate();
  const location = useLocation();

  const [currentView, setCurrentView] = useState<AppView>(
    isElectron ? "ide" : "hero"
  );
  const [isDark, setIsDark] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { toasts, addToast, dismissToast } = useToasts();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const path = location.pathname.slice(1) || "hero";
    if (["hero", "dashboard", "architecture", "how-it-works", "ide"].includes(path)) {
      setCurrentView(path as AppView);
    }
  }, [location.pathname]);

  const navigateTo = useCallback((view: AppView) => {
    setIsTransitioning(true);
    setTimeout(() => {
      window.scrollTo(0, 0);
      setCurrentView(view);
      navigate(`/${view === "hero" ? "" : view}`, { replace: true });
      setIsTransitioning(false);
    }, 150);
  }, [navigate]);

  const handleCommand = (cmdId: string) => {
    switch (cmdId) {
      case 'toggle-theme':
        setIsDark(prev => !prev);
        addToast({ type: 'success', title: 'Theme Updated', message: 'Toggled application theme.' });
        break;
      case 'open-settings':
        setIsSettingsOpen(true);
        break;
      case 'reload-window':
        window.location.reload();
        break;
      case 'focus-swarm':
        addToast({ type: 'success', title: 'Action', message: 'Swarm sidebar focused' });
        break;
      case 'open-folder':
        addToast({ type: 'success', title: 'Action', message: 'Directory browse dialog requested' });
        break;
      case 'toggle-terminal':
        addToast({ type: 'success', title: 'Action', message: 'Terminal view toggled' });
        break;
      default:
        break;
    }
  };

  const renderView = () => {
    switch (currentView) {
      case "ide":
        return <WorkspaceLayout />;
      case "architecture":
        return <ArchitecturePage onBackToHero={() => navigateTo("hero")} />;
      case "how-it-works":
        return <HowItWorksPage onBackToHero={() => navigateTo("hero")} />;
      default:
        return <HeroSection onNavigate={navigateTo} />;
    }
  };

  return (
    <ErrorBoundary>
      <div
        className="transition-opacity duration-150 min-h-screen"
        style={{ opacity: isTransitioning ? 0 : 1 }}
      >
        {renderView()}
      </div>

      {currentView !== 'ide' && !isVsCode && (
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
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={() => addToast({ type: 'success', title: 'Settings saved', message: 'API keys updated and active.' })}
      />

      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onCommand={handleCommand}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}
