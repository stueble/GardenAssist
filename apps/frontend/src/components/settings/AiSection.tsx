import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FieldLabel, FieldInput, FieldSelect, FieldRow } from "./FieldInput";
import type { Settings } from "@api/settings";
import type { AiProvider } from "@api/settings";

interface Props {
  form:     Settings;
  onChange: (patch: Partial<Settings>) => void;
}

const ANTHROPIC_MODELS = [
  "claude-sonnet-4-6",
  "claude-opus-4-5",
  "claude-haiku-4-5",
] as const;

const OPENAI_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "o1",
  "o1-mini",
] as const;

const PROVIDERS: AiProvider[] = ["anthropic", "openai", "openrouter"];

export function AiSection({ form, onChange }: Props) {
  const { t } = useTranslation("settings");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");

  const provider = form.ai_provider;

  function handleProviderChange(value: string) {
    const newProvider = (value || null) as AiProvider | null;
    // Reset model when provider changes so no stale model ID lingers
    const defaultModel = newProvider === "anthropic"
      ? "claude-sonnet-4-6"
      : newProvider === "openai"
        ? "gpt-4o"
        : null;
    onChange({ ai_provider: newProvider, ai_model: defaultModel });
  }

  async function testConnection() {
    setTestStatus("testing");
    // Stub — real implementation needs AI provider call
    await new Promise((r) => setTimeout(r, 1200));
    setTestStatus("ok");
    setTimeout(() => setTestStatus("idle"), 3000);
  }

  const canTest = !!(provider && form.ai_api_key);

  return (
    <div>
      {/* Provider */}
      <FieldRow>
        <FieldLabel htmlFor="ai_provider">{t("fields.ai_provider")}</FieldLabel>
        <FieldSelect
          id="ai_provider"
          value={provider ?? ""}
          onChange={(e) => handleProviderChange(e.target.value)}
        >
          <option value="">{t("ai_provider.placeholder")}</option>
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>{t(`ai_provider.${p}`)}</option>
          ))}
        </FieldSelect>
      </FieldRow>

      {/* Model */}
      <FieldRow>
        <FieldLabel htmlFor="ai_model">{t("fields.ai_model")}</FieldLabel>

        {provider === "openrouter" ? (
          /* Free-text input for OpenRouter — model IDs are arbitrary */
          <FieldInput
            id="ai_model"
            mono
            value={form.ai_model ?? ""}
            onChange={(e) => onChange({ ai_model: e.target.value || null })}
            placeholder={t("ai_model.placeholder")}
            disabled={!provider}
          />
        ) : (
          <FieldSelect
            id="ai_model"
            value={form.ai_model ?? ""}
            onChange={(e) => onChange({ ai_model: e.target.value || null })}
            disabled={!provider}
          >
            {!provider && (
              <option value="">{t("ai_provider.placeholder")}</option>
            )}
            {provider === "anthropic" && ANTHROPIC_MODELS.map((m) => (
              <option key={m} value={m}>{t(`ai_model.anthropic.${m}`)}</option>
            ))}
            {provider === "openai" && OPENAI_MODELS.map((m) => (
              <option key={m} value={m}>{t(`ai_model.openai.${m}`)}</option>
            ))}
          </FieldSelect>
        )}
      </FieldRow>

      {/* API Key */}
      <FieldRow>
        <FieldLabel htmlFor="ai_api_key">{t("fields.ai_api_key")}</FieldLabel>
        <div className="flex gap-2">
          <FieldInput
            id="ai_api_key"
            type="password"
            mono
            value={form.ai_api_key ?? ""}
            onChange={(e) => onChange({ ai_api_key: e.target.value || null })}
            placeholder="sk-…"
            className="flex-1"
            disabled={!provider}
          />
          <button
            type="button"
            onClick={testConnection}
            disabled={!canTest || testStatus === "testing"}
            className="shrink-0 whitespace-nowrap px-4 py-2 rounded-[8px] text-[13px] font-medium font-body border-[1.5px] border-border bg-none text-text-mid cursor-pointer transition-colors hover:border-green-mid hover:text-green-deep disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t(`ai_test.${testStatus}`)}
          </button>
        </div>
      </FieldRow>
    </div>
  );
}
