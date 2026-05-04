import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const LANGUAGES = ["de", "en"] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language.slice(0, 2); // normalise e.g. "de-DE" → "de"

  function switchTo(lang: string) {
    i18n.changeLanguage(lang);
    localStorage.setItem("ga_language", lang);
  }

  return (
    <div className="flex items-center gap-0.5" aria-label="Sprache wählen">
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          onClick={() => switchTo(lang)}
          className={cn(
            "px-2 py-0.5 rounded text-[12px] font-medium transition-colors uppercase",
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
