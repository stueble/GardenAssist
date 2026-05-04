import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface SaveBarProps {
  dirty:    boolean;
  onSave:   () => void;
  onDiscard: () => void;
}

export function SaveBar({ dirty, onSave, onDiscard }: SaveBarProps) {
  const { t } = useTranslation("common");

  return (
    <div
      className="bg-green-deep flex items-center justify-between px-8 py-3 shrink-0 shadow-[0_-2px_8px_rgba(0,0,0,0.15)]"
      data-testid="save-bar"
    >
      <span className="text-[12px] text-green-pale opacity-80">
        {dirty ? "⚠ Ungespeicherte Änderungen" : ""}
      </span>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDiscard}
          disabled={!dirty}
          className={cn(
            "px-5 py-2 rounded-[8px] text-[13px] font-medium font-body border-[1.5px] border-white/30 bg-none text-green-pale transition-colors",
            dirty
              ? "hover:bg-white/10 cursor-pointer"
              : "opacity-40 cursor-not-allowed"
          )}
          data-testid="save-bar-discard"
        >
          {t("actions.cancel")}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty}
          className={cn(
            "px-5 py-2 rounded-[8px] text-[13px] font-medium font-body border-[1.5px] border-white transition-colors",
            dirty
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
