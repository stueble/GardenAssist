import { Routes, Route } from "react-router-dom";
import { NavBar }         from "@/components/NavBar";
import { AiPanel }        from "@/components/AiPanel";
import { DashboardView }  from "@/views/DashboardView";
import { PlantsView }     from "@/views/PlantsView";
import { CalendarView }   from "@/views/CalendarView";
import { JournalView }    from "@/views/JournalView";
import { SettingsView }   from "@/views/SettingsView";
import { useAssistantContext } from "@/hooks/useAssistantContext";

export function App() {
  // Single shared AssistantContext updated by whichever view is currently active.
  // AiPanel is rendered once here so messages and input state survive navigation.
  const assistantContext = useAssistantContext();

  return (
    <div className="flex flex-col h-screen bg-warm-white">
      <NavBar />
      <main className="flex flex-1 min-h-0 overflow-hidden">
        {/* Route outlet — takes up all remaining space */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <Routes>
            <Route path="/"         element={<DashboardView />} />
            <Route path="/plants"   element={<PlantsView />}    />
            <Route path="/calendar" element={<CalendarView />}  />
            <Route path="/journal"  element={<JournalView />}   />
            <Route path="/settings" element={<SettingsView />}  />
          </Routes>
        </div>

        {/* Single persistent AiPanel — never unmounts, retains chat history */}
        <AiPanel assistantContext={assistantContext} />
      </main>
    </div>
  );
}
