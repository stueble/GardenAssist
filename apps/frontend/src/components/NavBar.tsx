import { NavLink } from "react-router-dom";
import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/",         icon: "🏠", key: "dashboard" },
  { to: "/plants",   icon: "🌱", key: "plants"    },
  { to: "/calendar", icon: "🗓", key: "calendar"  },
  { to: "/journal",  icon: "📔", key: "journal"   },
] as const;

export function NavBar() {
  const { t } = useTranslation("common");

  return (
    <nav
      className="flex items-center shrink-0 bg-green-deep shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
      style={{ height: "var(--height-nav)" }}
      aria-label="Hauptnavigation"
    >
      {/* Logo */}
      <span
        className="flex items-center shrink-0 px-5 h-full border-r border-white/10 font-display leading-none text-green-pale tracking-[0.5px] select-none"
        style={{ gap: "8px", width: "var(--width-nav-logo)", fontSize: "var(--font-size-logo)" }}
      >
        <img src="/favicon.svg" alt="" aria-hidden="true" style={{ width: "25px", height: "25px" }} />{t("app_name")}
      </span>

      {/* Main tabs */}
      <div className="flex gap-0.5 flex-1 items-center px-3" role="tablist">
        {tabs.map(({ to, icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            role="tab"
            className={({ isActive }) =>
              cn(
                "flex items-center px-[14px] h-9 rounded-[6px] text-green-pale transition-all whitespace-nowrap border-none bg-none",
                isActive
                  ? "opacity-100 bg-white/15 font-medium"
                  : "opacity-75 hover:opacity-100 hover:bg-white/10"
              )
            }
            style={{ gap: "6px", fontSize: "var(--font-size-nav)" }}
          >
            <span aria-hidden="true">{icon}</span>{t(`nav.${key}`)}
          </NavLink>
        ))}
      </div>

      {/* Settings icon — 36px wide, flush right, centered over the AI strip below */}
      <div className="flex items-center justify-center shrink-0" style={{ width: "36px" }}>
        <NavLink
          to="/settings"
          aria-label={t("nav.settings")}
          className={({ isActive }) =>
            cn(
              "flex items-center justify-center h-9 rounded-[6px] text-green-pale transition-all",
              isActive
                ? "opacity-100 bg-white/15 w-[30px]"   /* 30px: leaves 3px dark-green on each side */
                : "opacity-75 hover:opacity-100 hover:bg-white/10 w-[30px]"
            )
          }
        >
          <Settings size={18} />
        </NavLink>
      </div>
    </nav>
  );
}
