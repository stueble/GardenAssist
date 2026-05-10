import { Routes, Route }        from "react-router-dom";
import { NavBar }                from "@/components/NavBar";
import { AiPanel }               from "@/components/AiPanel";
import { GlobalPlantEditOverlay } from "@/components/GlobalPlantEditOverlay";
import { DashboardView }         from "@/views/DashboardView";
import { PlantsView }            from "@/views/PlantsView";
import { CalendarView }          from "@/views/CalendarView";
import { JournalView }           from "@/views/JournalView";
import { SettingsView }          from "@/views/SettingsView";
import { useAssistantContext }   from "@/hooks/useAssistantContext";
import { useGarden, invalidateGarden } from "@/hooks/useGarden";

export function App() {
  // Single shared AssistantContext updated by whichever view is currently active.
  // AiPanel is rendered once here so messages and input state survive navigation.
  const assistantContext = useAssistantContext();

  // Single garden fetch for the entire app — shared across all views.
  // Views receive garden + loading as props and call invalidateGarden() after mutations.
  const { garden, loading } = useGarden();

  const sharedGardenProps = { garden, loading, invalidateGarden };

  return (
    <div className="flex flex-col h-screen bg-warm-white">
      <NavBar />
      <main className="flex flex-1 min-h-0 overflow-hidden">
        {/* Route outlet — takes up all remaining space */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <Routes>
            <Route path="/"         element={<DashboardView {...sharedGardenProps} />} />
            <Route path="/plants"   element={<PlantsView    {...sharedGardenProps} />} />
            <Route path="/calendar" element={<CalendarView  {...sharedGardenProps} />} />
            <Route path="/journal"  element={<JournalView   {...sharedGardenProps} />} />
            <Route path="/settings" element={<SettingsView  {...sharedGardenProps} />} />
          </Routes>
        </div>

        {/* Single persistent AiPanel — never unmounts, retains chat history */}
        <AiPanel assistantContext={assistantContext} />
      </main>

      {/* Global plant edit overlay — always mounted, visible when editPlant tool is dispatched */}
      <GlobalPlantEditOverlay
        planUrl={garden?.plan_url ?? null}
        invalidateGarden={invalidateGarden}
      />
    </div>
  );
}
