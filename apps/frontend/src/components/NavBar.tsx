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
      className="flex items-center justify-between px-4 h-12 border-b"
      style={{ background: "var(--green-deep)", borderColor: "var(--green-mid)" }}
      aria-label="Hauptnavigation"
    >
      {/* Logo */}
      <span className="text-white font-semibold text-sm tracking-wide select-none">
        🌿 GardenAssist
      </span>

      {/* Main tabs */}
      <div className="flex gap-1" role="tablist">
        {tabs.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            role="tab"
            className={({ isActive }) =>
              cn(
                "px-4 py-1.5 rounded text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Settings icon */}
      <NavLink
        to="/settings"
        aria-label="Einstellungen"
        className={({ isActive }) =>
          cn(
            "p-1.5 rounded transition-colors",
            isActive
              ? "bg-white/20 text-white"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          )
        }
      >
        <Settings size={18} />
      </NavLink>
    </nav>
  );
}
