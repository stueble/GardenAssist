import { useTranslation } from "react-i18next";
import { FieldLabel, FieldInput, FieldHint } from "./FieldInput";
import type { Settings } from "@api/settings";

interface Props {
  form:       Settings;
  onChange:   (patch: Partial<Settings>) => void;
}

export function LocationSection({ form, onChange }: Props) {
  const { t } = useTranslation("settings");

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <FieldLabel htmlFor="location_city">{t("fields.location_city")}</FieldLabel>
        <FieldInput
          id="location_city"
          type="text"
          value={form.location_city ?? ""}
          onChange={(e) => onChange({ location_city: e.target.value || null })}
          placeholder="z.B. München"
        />
      </div>
      <div>
        <FieldLabel htmlFor="location_zip">{t("fields.location_zip")}</FieldLabel>
        <FieldInput
          id="location_zip"
          type="text"
          value={form.location_zip ?? ""}
          onChange={(e) => onChange({ location_zip: e.target.value || null })}
          placeholder="z.B. 80331"
        />
      </div>
      <FieldHint>
        Wird für Wetterwarnungen (Frost, Trockenheit) und den Wetter-Widget im Dashboard verwendet.
        Wetterintegration ist für eine zukünftige Version geplant.
      </FieldHint>
    </div>
  );
}
