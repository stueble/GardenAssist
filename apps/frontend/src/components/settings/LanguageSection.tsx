import { useTranslation } from "react-i18next";
import { FieldLabel, FieldSelect } from "./FieldInput";
import type { Settings } from "@api/settings";

interface Props {
  form:     Settings;
  onChange: (patch: Partial<Settings>) => void;
}

const LANGUAGES: Array<{ value: "de" | "en"; label: { de: string; en: string } }> = [
  { value: "de", label: { de: "Deutsch", en: "Deutsch" } },
  { value: "en", label: { de: "English", en: "English" } },
];

export function LanguageSection({ form, onChange }: Props) {
  const { t } = useTranslation("settings");

  return (
    <div>
      <FieldLabel htmlFor="language">{t("fields.language")}</FieldLabel>
      <FieldSelect
        id="language"
        value={form.language}
        onChange={(e) => onChange({ language: e.target.value as "de" | "en" })}
      >
        {LANGUAGES.map(({ value, label }) => (
          <option key={value} value={value}>
            {label[form.language] ?? label.de}
          </option>
        ))}
      </FieldSelect>
    </div>
  );
}
