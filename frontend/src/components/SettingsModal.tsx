import React, { useState, useEffect } from "react";
import { X, Save, KeyRound, User, Server, Cpu } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "profile" | "api" | "mcp";

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>("api");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Form State
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [mcpFsEnabled, setMcpFsEnabled] = useState(true);
  const [mcpCustomCmd, setMcpCustomCmd] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          setGeminiKey(data.gemini_key || "");
          setOpenaiKey(data.openai_key || "");
          setAnthropicKey(data.anthropic_key || "");
          setUserName(data.user_name || "");
          setUserEmail(data.user_email || "");
          setMcpFsEnabled(data.mcp_filesystem_enabled ?? true);
          setMcpCustomCmd(data.mcp_custom_cmd || "");
          setMessage("");
        })
        .catch(console.error);
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");
    try {
      const payload: any = {
        user_name: userName,
        user_email: userEmail,
        mcp_filesystem_enabled: mcpFsEnabled,
        mcp_custom_cmd: mcpCustomCmd,
      };

      if (!geminiKey.includes("...")) payload.gemini_key = geminiKey;
      if (!openaiKey.includes("...")) payload.openai_key = openaiKey;
      if (!anthropicKey.includes("...")) payload.anthropic_key = anthropicKey;

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (data.status === "success") {
        setMessage("Settings saved successfully!");
        setTimeout(() => onClose(), 1500);
      }
    } catch (err) {
      setMessage("Error saving settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[var(--color-surface)] w-full max-w-4xl h-[600px] rounded-3xl border border-[var(--color-border)] shadow-2xl flex overflow-hidden">
        
        {/* Left Sidebar */}
        <div className="w-64 bg-[var(--color-base)] border-r border-[var(--color-border)] flex flex-col p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[var(--color-contrast)] text-[var(--color-base)] rounded-xl flex items-center justify-center">
              <Cpu size={20} />
            </div>
            <h2 className="text-[20px] font-bold tracking-tight text-[var(--color-contrast)]">
              Settings
            </h2>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-all ${
                activeTab === "profile" 
                  ? "bg-[var(--color-contrast)] text-[var(--color-base)] shadow-md" 
                  : "text-[var(--color-contrast)] hover:bg-black/5 opacity-70 hover:opacity-100"
              }`}
            >
              <User size={18} /> Profile
            </button>
            <button
              onClick={() => setActiveTab("api")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-all ${
                activeTab === "api" 
                  ? "bg-[var(--color-contrast)] text-[var(--color-base)] shadow-md" 
                  : "text-[var(--color-contrast)] hover:bg-black/5 opacity-70 hover:opacity-100"
              }`}
            >
              <KeyRound size={18} /> API Keys
            </button>
            <button
              onClick={() => setActiveTab("mcp")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-all ${
                activeTab === "mcp" 
                  ? "bg-[var(--color-contrast)] text-[var(--color-base)] shadow-md" 
                  : "text-[var(--color-contrast)] hover:bg-black/5 opacity-70 hover:opacity-100"
              }`}
            >
              <Server size={18} /> MCP Servers
            </button>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col relative bg-[var(--color-surface)]">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 opacity-50 hover:opacity-100 hover:bg-black/5 rounded-full transition-all text-[var(--color-contrast)] z-10"
          >
            <X size={20} />
          </button>

          <div className="flex-1 overflow-y-auto p-10 pt-16">
            
            {/* Tab: User Profile */}
            {activeTab === "profile" && (
              <div className="flex flex-col gap-8 max-w-xl animate-in fade-in slide-in-from-bottom-2">
                <div>
                  <h3 className="text-[24px] font-bold tracking-tight text-[var(--color-contrast)] mb-2">User Profile</h3>
                  <p className="text-[14px] opacity-70">Manage your account details and appearance.</p>
                </div>
                
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] uppercase font-bold opacity-60">Username</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="e.g. JohnDoe"
                      className="w-full py-2.5 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-[14px] outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] uppercase font-bold opacity-60">Email Address</label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="e.g. john@example.com"
                      className="w-full py-2.5 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-[14px] outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab: API Keys */}
            {activeTab === "api" && (
              <div className="flex flex-col gap-8 max-w-xl animate-in fade-in slide-in-from-bottom-2">
                <div>
                  <h3 className="text-[24px] font-bold tracking-tight text-[var(--color-contrast)] mb-2">API Configuration</h3>
                  <p className="text-[14px] opacity-70">Enter your personal API keys below. They are saved securely in your local `.env` file.</p>
                </div>

                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] uppercase font-bold opacity-60">Google Gemini API Key</label>
                    <input
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full py-2.5 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-[14px] outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] uppercase font-bold opacity-60">Anthropic API Key</label>
                    <input
                      type="password"
                      value={anthropicKey}
                      onChange={(e) => setAnthropicKey(e.target.value)}
                      placeholder="sk-ant-..."
                      className="w-full py-2.5 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-[14px] outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] uppercase font-bold opacity-60">OpenAI API Key</label>
                    <input
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full py-2.5 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-[14px] outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab: MCP Servers */}
            {activeTab === "mcp" && (
              <div className="flex flex-col gap-8 max-w-xl animate-in fade-in slide-in-from-bottom-2">
                <div>
                  <h3 className="text-[24px] font-bold tracking-tight text-[var(--color-contrast)] mb-2">Model Context Protocol</h3>
                  <p className="text-[14px] opacity-70">Manage active MCP connections. Changes here will actively reboot the MCP connection pool in the backend.</p>
                </div>

                <div className="flex flex-col gap-6">
                  {/* Built-in Toggle */}
                  <div className="flex items-center justify-between p-4 bg-[var(--color-base)] rounded-xl border border-[var(--color-border)]">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-[14px]">Filesystem MCP</span>
                      <span className="text-[12px] opacity-70">Allows AI to read/write to your workspace.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={mcpFsEnabled}
                      onChange={(e) => setMcpFsEnabled(e.target.checked)}
                      className="w-5 h-5 accent-[var(--color-contrast)] cursor-pointer"
                    />
                  </div>

                  {/* Custom Command Input */}
                  <div className="flex flex-col gap-1.5 p-4 bg-[var(--color-base)] rounded-xl border border-[var(--color-border)]">
                    <label className="text-[13px] font-bold">Custom MCP Server Command</label>
                    <p className="text-[12px] opacity-70 mb-2">Provide a custom stdio launch command (e.g. npx -y @modelcontextprotocol/server-postgres)</p>
                    <input
                      type="text"
                      value={mcpCustomCmd}
                      onChange={(e) => setMcpCustomCmd(e.target.value)}
                      placeholder="e.g. node /path/to/custom/mcp.js"
                      className="w-full py-2.5 px-3 rounded-lg border border-black/10 bg-white/50 dark:bg-black/20 text-[14px] outline-none font-mono text-[13px]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Save Area */}
          <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-base)] flex justify-between items-center">
            <div className={`text-[13px] font-medium ${message.includes("Error") ? "text-red-500" : "text-emerald-500"}`}>
              {message}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg text-[14px] font-semibold opacity-70 hover:opacity-100 hover:bg-black/5 transition-all text-[var(--color-contrast)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-lg bg-[var(--color-contrast)] text-[var(--color-base)] text-[14px] font-semibold hover:opacity-90 flex items-center gap-2 transition-opacity disabled:opacity-50"
              >
                <Save size={16} />
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
