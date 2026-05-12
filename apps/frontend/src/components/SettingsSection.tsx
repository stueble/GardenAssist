import { useState } from "react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  icon:        string;
  title:       string;
  subtitle?:   string;
  defaultOpen?: boolean;
  testId?:     string;
  children:    React.ReactNode;
}

export function SettingsSection({
  icon,
  title,
  subtitle,
  defaultOpen = false,
  testId,
  children,
}: SettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="bg-warm-white border-[1.5px] border-border rounded-[12px] mb-4 overflow-hidden"
      data-testid="settings-section"
    >
      {/* Header — matches mockup .ss-header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen((o) => !o)}
        className="flex items-center gap-3 px-5 py-[14px] cursor-pointer select-none transition-colors hover:bg-green-mist"
        aria-expanded={open}
        data-testid={testId ? `${testId}-toggle` : undefined}
      >
        {/* Icon — mockup: font-size 20px */}
        <span aria-hidden="true" style={{ fontSize: "20px", flexShrink: 0 }}>{icon}</span>

        {/* Title + optional subtitle */}
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-text-dark">{title}</div>
          {subtitle && (
            <div className="text-[11px] text-text-light mt-[2px]">{subtitle}</div>
          )}
        </div>

        {/* Toggle — mockup uses plain ▾ text at 11px */}
        <span
          className={cn(
            "text-[11px] text-text-light transition-transform duration-200 ml-auto",
            open && "rotate-180 inline-block"
          )}
        >
          ▾
        </span>
      </div>

      {/* Body */}
      {open && (
        <div className="px-5 pb-[18px] border-t border-border">
          <div className="pt-[14px]">{children}</div>
        </div>
      )}
    </div>
  );
}
