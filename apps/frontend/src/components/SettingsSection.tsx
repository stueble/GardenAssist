import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  icon:     string;
  title:    string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function SettingsSection({
  icon,
  title,
  defaultOpen = false,
  children,
}: SettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="bg-warm-white border-[1.5px] border-border rounded-lg mb-4 overflow-hidden"
      data-testid="settings-section"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-[14px] cursor-pointer select-none transition-colors hover:bg-green-mist text-left"
        aria-expanded={open}
      >
        <span aria-hidden="true" className="text-[18px]">{icon}</span>
        <span className="flex-1 text-[14px] font-semibold text-text-dark">{title}</span>
        <ChevronDown
          size={16}
          className={cn(
            "text-text-light transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Body */}
      {open && (
        <div className="px-5 pb-[18px] border-t border-border">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}
