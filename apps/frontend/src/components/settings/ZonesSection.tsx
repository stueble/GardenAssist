import { useTranslation } from "react-i18next";
import { ListEntry, AddRowButton, FieldHint } from "./FieldInput";
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

  return (
    <div>
      <div className="flex flex-col gap-[6px] mb-[10px]">
        {form.irrigation_zones.map((zone, i) => (
          <ListEntry
            key={i}
            value={zone}
            onChange={(val) => updateZone(i, val)}
            onDelete={() => deleteZone(i)}
            placeholder={t("zones_section.name_placeholder")}
          />
        ))}
      </div>
      <AddRowButton onClick={addZone}>＋ Zone hinzufügen</AddRowButton>
      <FieldHint>
        Zonennamen erscheinen im Pflanzendialog als Dropdown. Reihenfolge und Bezeichnung sind frei wählbar.
      </FieldHint>
    </div>
  );
}
