import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { SettingsSaveStatus } from "@/hooks/useSettings";

interface SaveBarProps {
  dirty:    boolean;
  status?:  SettingsSaveStatus;
  onSave:   () => void;
  onDiscard: () => void;
}

export function SaveBar({ dirty, status = "idle", onSave, onDiscard }: SaveBarProps) {
  const { t } = useTranslation("common");

  const hintText = () => {
    if (status === "saving")  return "⏳ Wird gespeichert …";
    if (status === "success") return "✅ Einstellungen gespeichert";
    if (status === "error")   return "❌ Fehler beim Speichern";
    return dirty ? "Ungespeicherte Änderungen vorhanden" : "Keine ungespeicherten Änderungen";
  };

  const isBusy = status === "saving";

  return (
    <div
      className="bg-green-deep flex items-center justify-between px-8 py-3 shrink-0 shadow-[0_-2px_8px_rgba(0,0,0,0.15)]"
      data-testid="save-bar"
    >
      {/* Hint text — always visible */}
      <span className="text-[12px] text-green-pale opacity-80">
        {hintText()}
      </span>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDiscard}
          disabled={!dirty || isBusy}
          className={cn(
            "px-5 py-2 rounded-[8px] text-[13px] font-medium font-body border-[1.5px] border-white/30 bg-none text-green-pale transition-colors",
            dirty && !isBusy
              ? "hover:bg-white/10 cursor-pointer"
              : "opacity-40 cursor-not-allowed"
          )}
          data-testid="save-bar-discard"
        >
          Verwerfen
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || isBusy}
          className={cn(
            "px-5 py-2 rounded-[8px] text-[13px] font-medium font-body border-[1.5px] border-white transition-colors",
            dirty && !isBusy
              ? "bg-white text-green-deep hover:bg-green-pale cursor-pointer"
              : "bg-white/30 text-green-pale/50 border-white/20 cursor-not-allowed"
          )}
          data-testid="save-bar-save"
        >
          {t("actions.save")}
        </button>
      </div>
    </div>
  );
}
