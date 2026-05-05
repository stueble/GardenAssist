import { useTranslation } from "react-i18next";
import { AiPanel } from "@/components/AiPanel";

export function PlantsView() {
  const { t } = useTranslation("plants");
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden bg-cream">
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="text-2xl font-semibold text-green-deep font-display">{t("title")}</h1>
        <p className="mt-2 text-text-mid">{t("subtitle")}</p>
      </div>
      <AiPanel context={`🌿 ${t("title")}`} />
    </div>
  );
}
