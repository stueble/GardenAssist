import { useTranslation } from "react-i18next";

export function DashboardView() {
  const { t } = useTranslation("common");
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-green-deep font-display">{t("nav.dashboard")}</h1>
    </div>
  );
}
