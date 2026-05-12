import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// ── Locale imports ────────────────────────────────────────────────────────────

import deCommon   from "../locales/de/common.json";
import dePlants   from "../locales/de/plants.json";
import deCalendar from "../locales/de/calendar.json";
import deJournal  from "../locales/de/journal.json";
import deSettings from "../locales/de/settings.json";

import enCommon   from "../locales/en/common.json";
import enPlants   from "../locales/en/plants.json";
import enCalendar from "../locales/en/calendar.json";
import enJournal  from "../locales/en/journal.json";
import enSettings from "../locales/en/settings.json";

// ── i18next configuration ─────────────────────────────────────────────────────

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: {
        common:   deCommon,
        plants:   dePlants,
        calendar: deCalendar,
        journal:  deJournal,
        settings: deSettings,
      },
      en: {
        common:   enCommon,
        plants:   enPlants,
        calendar: enCalendar,
        journal:  enJournal,
        settings: enSettings,
      },
    },
    defaultNS:   "common",
    fallbackLng: "en",
    supportedLngs: ["de", "en"],
    detection: {
      // Look for language in localStorage only — default is English when not set
      order: ["localStorage"],
      lookupLocalStorage: "ga_language",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
