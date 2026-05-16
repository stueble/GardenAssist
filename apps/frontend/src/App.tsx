import { Routes, Route }        from "react-router-dom";
import { NavBar }                from "@/components/NavBar";
import { AiPanel }               from "@/components/AiPanel";
import { GlobalPlantEditOverlay } from "@/components/GlobalPlantEditOverlay";
import { DashboardView }         from "@/views/DashboardView";
import { PlantsView }            from "@/views/PlantsView";
import { CalendarView }          from "@/views/CalendarView";
import { JournalView }           from "@/views/JournalView";
import { SettingsView }          from "@/views/SettingsView";
import { MobileTaskView }        from "@/views/MobileTaskView";
import { MobilePlantsView }      from "@/views/MobilePlantsView";
import { MobileCalendarView }    from "@/views/MobileCalendarView";
import { MobileJournalView }     from "@/views/MobileJournalView";
import { MobilePlanView }           from "@/views/MobilePlanView";
import { MobileSettingsView }       from "@/views/MobileSettingsView";
import { MobilePlantDetailView }    from "@/views/MobilePlantDetailView";
import { MobilePlantEditView }      from "@/views/MobilePlantEditView";
import { useAssistantContext }   from "@/hooks/useAssistantContext";
import { useGarden, invalidateGarden } from "@/hooks/useGarden";
import { useIsMobile }           from "@/hooks/useIsMobile";

export function App() {
  const assistantContext = useAssistantContext();
  const { garden, loading } = useGarden();
  const isMobile = useIsMobile();

  const sharedGardenProps = { garden, loading, invalidateGarden };

  // ── Mobile layout ────────────────────────────────────────────────────────────
  // On narrow viewports (≤ 768 px) the entire shell is replaced by the mobile
  // task view which includes its own top bar, bottom nav and in-flow chat panel.
  // Other routes on mobile still use the desktop views — subsequent tasks will
  // add dedicated mobile views for those screens.
  if (isMobile) {
    return (
      <div style={{
        height:          "100dvh",
        display:         "flex",
        flexDirection:   "column",
        overflow:        "hidden",
        paddingTop:      "env(safe-area-inset-top)",
        paddingBottom:   "env(safe-area-inset-bottom)",
        paddingLeft:     "env(safe-area-inset-left)",
        paddingRight:    "env(safe-area-inset-right)",
        boxSizing:       "border-box",
      }}>
        <Routes>
          <Route path="/"         element={<MobileTaskView {...sharedGardenProps} />} />
          <Route path="/plants"   element={<MobilePlantsView    {...sharedGardenProps} />} />
          <Route path="/plants/:id"      element={<MobilePlantDetailView {...sharedGardenProps} />} />
          <Route path="/plants/:id/edit" element={<MobilePlantEditView   {...sharedGardenProps} />} />
          <Route path="/plants/new"      element={<MobilePlantEditView   {...sharedGardenProps} />} />
          <Route path="/calendar" element={<MobileCalendarView {...sharedGardenProps} />} />
          <Route path="/journal"  element={<MobileJournalView {...sharedGardenProps} />} />
          <Route path="/plan"     element={<MobilePlanView   {...sharedGardenProps} />} />
          <Route path="/settings" element={<MobileSettingsView {...sharedGardenProps} />} />
        </Routes>
      </div>
    );
  }

  // ── Desktop layout ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-warm-white">
      <NavBar />
      <main className="flex flex-1 min-h-0 overflow-hidden">
        {/* Content slot: Route outlet OR global plant edit overlay — never both visible */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden relative">
          <GlobalPlantEditOverlay
            planUrl={garden?.plan_url ?? null}
            invalidateGarden={invalidateGarden}
          />
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
    </div>
  );
}
