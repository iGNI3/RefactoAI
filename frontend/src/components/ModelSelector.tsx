import React from "react";

interface ModelSelectorProps {
  selectedProvider: string;
  selectedModel: string;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  isThinkingActive: boolean;
  onThinkingToggle: (active: boolean) => void;
  thinkingBudget: number;
  onThinkingBudgetChange: (budget: number) => void;
}

const AVAILABLE_MODELS: Record<string, string[]> = {
  anthropic: ["claude-3-7-sonnet", "claude-3-5-sonnet"],
  deepseek: ["deepseek-reasoner", "deepseek-chat"],
  openai: ["gpt-4o", "o3-mini"],
  google: ["gemini-2.5-pro", "gemini-2.5-flash"],
  ollama: ["qwen2.5-coder-7b", "llama3.3"],
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  isThinkingActive,
  onThinkingToggle,
  thinkingBudget,
  onThinkingBudgetChange,
}) => {
  const handleProviderClick = (provider: string) => {
    onProviderChange(provider);
    onModelChange(AVAILABLE_MODELS[provider][0]);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Provider Selection */}
      <div className="flex flex-col gap-2">
        <label className="text-[12px] uppercase opacity-60 font-bold">
          Model Provider
        </label>
        <div className="grid grid-cols-3 gap-2">
          {Object.keys(AVAILABLE_MODELS).map((prov) => (
            <button
              key={prov}
              id={`provider-${prov}`}
              onClick={() => handleProviderClick(prov)}
              className={`py-2 px-3 text-[13px] rounded-lg border font-medium uppercase transition-all ${
                selectedProvider === prov
                  ? "bg-[var(--color-contrast)] text-white border-transparent"
                  : "bg-[var(--color-base)] text-black border-black/10 hover:bg-black/5"
              }`}
            >
              {prov}
            </button>
          ))}
        </div>
      </div>

      {/* Model Selection */}
      <div className="flex flex-col gap-2">
        <label className="text-[12px] uppercase opacity-60 font-bold">
          Target Model
        </label>
        <select
          id="model-selector"
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full py-2.5 px-3 rounded-lg border border-black/10 bg-[var(--color-base)] text-[14px] outline-none"
        >
          {(AVAILABLE_MODELS[selectedProvider] || []).map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      {/* Extended Thinking Controls */}
      <div className="flex flex-col gap-3 p-4 bg-[var(--color-base)] rounded-xl border border-black/5">
        <div className="flex justify-between items-center">
          <label className="text-[12px] uppercase opacity-60 font-bold">
            Extended Thinking
          </label>
          <input
            id="thinking-toggle"
            type="checkbox"
            checked={isThinkingActive}
            onChange={(e) => onThinkingToggle(e.target.checked)}
            className="w-4 h-4 accent-black"
          />
        </div>

        {isThinkingActive && (
          <div className="flex flex-col gap-1.5 transition-opacity">
            <div className="flex justify-between text-[11px] font-semibold opacity-60">
              <span>Thinking Budget:</span>
              <span>{thinkingBudget.toLocaleString()} Tokens</span>
            </div>
            <input
              id="thinking-budget-slider"
              type="range"
              min="1024"
              max="128000"
              step="1024"
              value={thinkingBudget}
              onChange={(e) => onThinkingBudgetChange(Number(e.target.value))}
              className="w-full accent-black cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
};
