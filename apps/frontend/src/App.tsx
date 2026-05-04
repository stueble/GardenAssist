import { Routes, Route } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { DashboardView } from "@/views/DashboardView";
import { PlantsView }    from "@/views/PlantsView";
import { CalendarView }  from "@/views/CalendarView";
import { JournalView }   from "@/views/JournalView";
import { SettingsView }  from "@/views/SettingsView";

export function App() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--warm-white)" }}>
      <NavBar />
      <main className="flex-1">
        <Routes>
          <Route path="/"         element={<DashboardView />} />
          <Route path="/plants"   element={<PlantsView />}    />
          <Route path="/calendar" element={<CalendarView />}  />
          <Route path="/journal"  element={<JournalView />}   />
          <Route path="/settings" element={<SettingsView />}  />
        </Routes>
      </main>
    </div>
  );
}
