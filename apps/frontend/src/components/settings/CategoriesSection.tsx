import { useTranslation } from "react-i18next";
import { ListEntry, AddRowButton, FieldHint } from "./FieldInput";
import type { Settings } from "@api/settings";

interface Props {
  form:     Settings;
  onChange: (patch: Partial<Settings>) => void;
}

export function CategoriesSection({ form, onChange }: Props) {
  const { t } = useTranslation("settings");
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
            value={t(`defaults.categories.${cat}`, { defaultValue: cat })}
            onChange={(val) => updateCategory(i, val)}
            onDelete={() => deleteCategory(i)}
            placeholder={t("categories_section.name_placeholder")}
          />
        ))}
      </div>
      <AddRowButton onClick={addCategory}>{t("categories_section.add_btn")}</AddRowButton>
      <FieldHint>{t("categories_section.hint")}</FieldHint>
    </div>
  );
}
