import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FieldLabel, FieldInput, FieldSelect, FieldHint, FieldRow } from "./FieldInput";
import type { Settings } from "@api/settings";

interface Props {
  form:     Settings;
  onChange: (patch: Partial<Settings>) => void;
}

const AI_MODELS = [
  { value: "claude-sonnet-4-6", label: "claude-sonnet-4-6 (empfohlen)" },
  { value: "claude-opus-4-6",   label: "claude-opus-4-6 (leistungsstärker, langsamer)" },
  { value: "claude-haiku-4-5",  label: "claude-haiku-4-5 (schneller, günstig)" },
];

export function AiSection({ form, onChange }: Props) {
  const { t } = useTranslation("settings");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");

  async function testConnection() {
    setTestStatus("testing");
    // Stub — real implementation needs AI provider call
    await new Promise((r) => setTimeout(r, 1200));
    setTestStatus("ok");
    setTimeout(() => setTestStatus("idle"), 3000);
  }

  const testLabel = {
    idle:    "🔌 Verbindung testen",
    testing: "⏳ Teste …",
    ok:      "✅ Verbindung erfolgreich",
    error:   "❌ Verbindung fehlgeschlagen",
  }[testStatus];

  return (
    <div>
      <FieldRow>
        <FieldLabel htmlFor="ai_api_key">{t("fields.ai_api_key")}</FieldLabel>
        <div className="flex gap-2">
          <FieldInput
            id="ai_api_key"
            type="password"
            mono
            value={form.ai_api_key ?? ""}
            onChange={(e) => onChange({ ai_api_key: e.target.value || null })}
            placeholder="sk-ant-…"
            className="flex-1"
          />
          <button
            type="button"
            onClick={testConnection}
            disabled={testStatus === "testing" || !form.ai_api_key}
            className="shrink-0 whitespace-nowrap px-4 py-2 rounded-[8px] text-[13px] font-medium font-body border-[1.5px] border-border bg-none text-text-mid cursor-pointer transition-colors hover:border-green-mid hover:text-green-deep disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testLabel}
          </button>
        </div>
        <FieldHint>
          Wird nur lokal gespeichert und nie übertragen. Erhalte deinen Schlüssel unter console.anthropic.com.
        </FieldHint>
      </FieldRow>

      <FieldRow>
        <FieldLabel htmlFor="ai_model">{t("fields.ai_model")}</FieldLabel>
        <FieldSelect
          id="ai_model"
          value={form.ai_model ?? "claude-sonnet-4-6"}
          onChange={(e) => onChange({ ai_model: e.target.value })}
        >
          {AI_MODELS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </FieldSelect>
      </FieldRow>
    </div>
  );
}
