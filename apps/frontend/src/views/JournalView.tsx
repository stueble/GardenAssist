import { useTranslation } from "react-i18next";

export function JournalView() {
  const { t } = useTranslation("journal");
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-green-deep font-display">{t("title")}</h1>
      <p className="mt-2 text-text-mid">{t("subtitle")}</p>
    </div>
  );
}
