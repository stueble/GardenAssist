import { NavLink } from "react-router-dom";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/",         label: "Dashboard" },
  { to: "/plants",   label: "Pflanzen"  },
  { to: "/calendar", label: "Kalender"  },
  { to: "/journal",  label: "Tagebuch"  },
] as const;

export function NavBar() {
  return (
    <nav
      className="flex items-center h-[52px] shrink-0 bg-green-deep shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
      aria-label="Hauptnavigation"
    >
      {/* Logo — 280px, Playfair Display 20px, green-pale, border-right */}
      <span className="flex items-center gap-2 w-[280px] shrink-0 px-5 h-full border-r border-white/10 font-display text-[20px] text-green-pale tracking-[0.5px] select-none">
        🌿 GardenAssist
      </span>

      {/* Main tabs */}
      <div className="flex gap-0.5 flex-1 items-center px-3" role="tablist">
        {tabs.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            role="tab"
            className={({ isActive }) =>
              cn(
                "flex items-center px-[14px] h-9 rounded-[6px] text-[13px] text-green-pale transition-all whitespace-nowrap border-none bg-none",
                isActive
                  ? "opacity-100 bg-white/15 font-medium"
                  : "opacity-75 hover:opacity-100 hover:bg-white/10"
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Settings icon */}
      <div className="pr-4">
        <NavLink
          to="/settings"
          aria-label="Einstellungen"
          className={({ isActive }) =>
            cn(
              "text-green-pale text-[18px] transition-opacity",
              isActive ? "opacity-100" : "opacity-75 hover:opacity-100"
            )
          }
        >
          <Settings size={18} />
        </NavLink>
      </div>
    </nav>
  );
}
