import { useTranslation } from "react-i18next";
import { AiPanel } from "@/components/AiPanel";

export function DashboardView() {
  const { t } = useTranslation("common");
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden bg-cream">
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="text-2xl font-semibold text-green-deep font-display">{t("nav.dashboard")}</h1>
      </div>
      <AiPanel context={`🏠 ${t("nav.dashboard")}`} />
    </div>
  );
}
