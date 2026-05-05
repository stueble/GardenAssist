import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { apiClient } from "@/api/client";

const LANGUAGES = ["de", "en"] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language.slice(0, 2); // normalise e.g. "de-DE" → "de"

  async function switchTo(lang: string) {
    // Apply immediately in the UI
    i18n.changeLanguage(lang);
    localStorage.setItem("ga_language", lang);
    // Persist to DB: load current settings, update language, save back
    try {
      const settings = await apiClient.getSettings();
      await apiClient.updateSettings({ ...settings, language: lang as "de" | "en" });
    } catch {
      // Non-critical — localStorage already stores the preference
    }
  }

  return (
    <div className="flex items-center gap-0.5" aria-label="Sprache wählen">
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          onClick={() => switchTo(lang)}
          style={{ fontSize: "var(--font-size-nav-lang)" }}
          className={cn(
            "px-2 py-0.5 rounded font-medium transition-colors uppercase",
            current === lang
              ? "bg-white/20 text-white"
              : "text-white/60 hover:text-white hover:bg-white/10"
          )}
          aria-pressed={current === lang}
          aria-label={lang === "de" ? "Deutsch" : "English"}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
