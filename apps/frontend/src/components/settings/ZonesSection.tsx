import { useTranslation } from "react-i18next";
import { FieldLabel, FieldInput, ListEntry, AddRowButton, FieldHint } from "./FieldInput";
import type { Settings } from "@api/settings";

interface Props {
  form:     Settings;
  onChange: (patch: Partial<Settings>) => void;
}

export function ZonesSection({ form, onChange }: Props) {
  const { t } = useTranslation("settings");

  function updateZone(index: number, value: string) {
    const zones = [...form.irrigation_zones];
    zones[index] = value;
    onChange({ irrigation_zones: zones });
  }

  function deleteZone(index: number) {
    const zones = form.irrigation_zones.filter((_, i) => i !== index);
    onChange({ irrigation_zones: zones });
  }

  function addZone() {
    onChange({ irrigation_zones: [...form.irrigation_zones, ""] });
  }

  function handleThreshold(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 99) {
      onChange({ soil_moisture_dry_threshold_pct: val });
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-[6px] mb-[10px]">
        {form.irrigation_zones.map((zone, i) => (
          <ListEntry
            key={i}
            value={t(`defaults.zones.${zone}`, { defaultValue: zone })}
            onChange={(val) => updateZone(i, val)}
            onDelete={() => deleteZone(i)}
            placeholder={t("zones_section.name_placeholder")}
          />
        ))}
      </div>
      <AddRowButton onClick={addZone}>{t("zones_section.add_btn")}</AddRowButton>

      <div className="mt-[14px]">
        <FieldLabel htmlFor="soil_moisture_dry_threshold_pct">
          {t("fields.soil_moisture_dry_threshold_pct")}
        </FieldLabel>
        <FieldInput
          id="soil_moisture_dry_threshold_pct"
          type="number"
          min={1}
          max={99}
          value={form.soil_moisture_dry_threshold_pct}
          onChange={handleThreshold}
          className="w-24"
        />
        <FieldHint>{t("zones_section.hint")}</FieldHint>
      </div>
    </div>
  );
}
