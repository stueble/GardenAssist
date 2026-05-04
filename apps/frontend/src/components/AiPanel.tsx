import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiPanelProps {
  /** Optional context pill text, e.g. "⚙️ Einstellungen" */
  context?: string;
}

/**
 * AI Assistant panel (ADR-006: always rightmost).
 *
 * Collapsed: shows a narrow vertical toggle strip (~34px).
 * Expanded: 300px wide panel with header, messages area, and input.
 *
 * This is a visual stub — no AI connection yet.
 */
export function AiPanel({ context }: AiPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex shrink-0 border-l border-border" data-testid="ai-panel">
      {/* Open panel */}
      {open && (
        <div className="w-[300px] flex flex-col bg-warm-white">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 pb-3 border-b border-border shrink-0">
            <span className="font-display text-[15px] text-green-deep font-semibold flex items-center gap-2 whitespace-nowrap">
              🤖 KI-Assistent
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Assistent schließen"
              className="text-text-light hover:text-text-dark transition-colors p-0.5"
            >
              <X size={16} />
            </button>
          </div>

          {/* Context pill */}
          {context && (
            <div className="px-4 pt-3">
              <span className="inline-flex items-center gap-1 bg-green-pale text-green-deep rounded-full px-[10px] py-[3px] text-[10px] font-semibold">
                {context}
              </span>
            </div>
          )}

          {/* Messages area */}
          <div
            className="flex-1 overflow-y-auto p-[14px] flex flex-col gap-3 min-h-0"
            data-testid="ai-messages"
          >
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold tracking-[0.5px] uppercase text-text-light px-1">
                Assistent
              </span>
              <span className="self-start bg-green-mist text-text-dark border border-border rounded-[4px_12px_12px_12px] px-3 py-2 text-[12px] leading-relaxed max-w-[90%]">
                Hallo! Ich helfe dir beim Konfigurieren deiner Einstellungen. Was möchtest du anpassen?
              </span>
            </div>
          </div>

          {/* Input */}
          <div className="flex gap-2 p-3 border-t border-border shrink-0">
            <input
              type="text"
              placeholder="Nachricht…"
              aria-label="Nachricht an Assistenten"
              className="flex-1 bg-green-mist border border-border rounded-full px-[14px] py-2 text-[12px] font-body text-text-dark outline-none focus:border-green-mid transition-colors"
            />
            <button
              type="button"
              aria-label="Senden"
              className="w-8 h-8 rounded-full bg-green-mid text-white flex items-center justify-center text-[14px] hover:bg-green-deep transition-colors shrink-0"
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* Toggle strip — always visible */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Assistent schließen" : "Assistent öffnen"}
        aria-expanded={open}
        className={cn(
          "flex flex-col items-center gap-[10px] px-[11px] py-6 border-none font-body text-[14px] font-medium cursor-pointer transition-colors shrink-0",
          open
            ? "bg-green-mid text-green-pale hover:bg-green-light"
            : "bg-green-mid text-green-pale hover:bg-green-light"
        )}
      >
        <span className="text-[20px] leading-none" aria-hidden="true">🤖</span>
        <span
          className="text-[13px] tracking-[0.8px] font-medium"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}
        >
          Assistent
        </span>
      </button>
    </div>
  );
}
