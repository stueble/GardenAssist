import type deCommon   from "../locales/de/common.json";
import type dePlants   from "../locales/de/plants.json";
import type deCalendar from "../locales/de/calendar.json";
import type deJournal  from "../locales/de/journal.json";
import type deSettings from "../locales/de/settings.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common:   typeof deCommon;
      plants:   typeof dePlants;
      calendar: typeof deCalendar;
      journal:  typeof deJournal;
      settings: typeof deSettings;
    };
  }
}
