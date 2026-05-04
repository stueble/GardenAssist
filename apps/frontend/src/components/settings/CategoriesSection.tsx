import { ListEntry, AddRowButton, FieldHint } from "./FieldInput";
import type { Settings } from "@api/settings";

interface Props {
  form:     Settings;
  onChange: (patch: Partial<Settings>) => void;
}

export function CategoriesSection({ form, onChange }: Props) {
  function updateCategory(index: number, value: string) {
    const cats = [...form.plant_categories];
    cats[index] = value;
    onChange({ plant_categories: cats });
  }

  function deleteCategory(index: number) {
    const cats = form.plant_categories.filter((_, i) => i !== index);
    onChange({ plant_categories: cats });
  }

  function addCategory() {
    onChange({ plant_categories: [...form.plant_categories, ""] });
  }

  return (
    <div>
      <div className="flex flex-col gap-[6px] mb-[10px]">
        {form.plant_categories.map((cat, i) => (
          <ListEntry
            key={i}
            value={cat}
            onChange={(val) => updateCategory(i, val)}
            onDelete={() => deleteCategory(i)}
            placeholder="Kategoriename …"
          />
        ))}
      </div>
      <AddRowButton onClick={addCategory}>＋ Kategorie hinzufügen</AddRowButton>
      <FieldHint>
        Diese Kategorien erscheinen im Pflanzendialog als Dropdown-Auswahl.
      </FieldHint>
    </div>
  );
}
