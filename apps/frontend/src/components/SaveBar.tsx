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
    if (status === "saving")  return t("save_bar.saving");
    if (status === "success") return t("save_bar.success");
    if (status === "error")   return t("save_bar.error");
    return dirty ? t("save_bar.dirty") : t("save_bar.clean");
  };

  const isBusy = status === "saving";

  // Height is fixed at 53px to match the AI panel input area:
  // padding 10px top/bottom + button height 32px (py-[6px] + 13px text * 1.5lh ≈ 19px + 6px = 31px≈32px) + 1px border-top
  return (
    <div
      className="bg-green-deep flex items-center justify-between px-8 py-[10px] shrink-0 shadow-[0_-2px_8px_rgba(0,0,0,0.15)]"
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
            "px-5 py-[6px] rounded-[8px] text-[13px] font-medium font-body border-[1.5px] border-white/30 bg-none text-green-pale transition-colors",
            dirty && !isBusy
              ? "hover:bg-white/10 cursor-pointer"
              : "opacity-40 cursor-not-allowed"
          )}
          data-testid="save-bar-discard"
        >
          {t("actions.discard")}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || isBusy}
          className={cn(
            "px-5 py-[6px] rounded-[8px] text-[13px] font-medium font-body border-[1.5px] border-white transition-colors",
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
