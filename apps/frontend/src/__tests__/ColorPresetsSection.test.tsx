/**
 * ColorPresetsSection tests.
 *
 * Verifies:
 * - All 6 schedule type groups are rendered (AC #1)
 * - Each preset shows swatch, name input, color picker and delete button (AC #2)
 * - "Add color" button adds a new preset entry (AC #3)
 * - Delete button removes a preset and calls onChange (AC #2)
 * - Name change calls onChange with updated preset (AC #2)
 * - Color change calls onChange with updated color (AC #2)
 * - Changes flow through onChange to updateSettings (AC #5)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index";
import { ColorPresetsSection } from "../components/settings/ColorPresetsSection";
import type { Settings } from "@api/settings";
import type { ColorPreset } from "@api/color-preset";

function makeSettings(presets: ColorPreset[] = []): Settings {
  return {
    language: "de",
    location_city: null,
    location_zip: null,
    irrigation_zones: [],
    plant_categories: [],
    color_presets: presets,
    task_lookback_weeks: 2,
    task_lookahead_weeks: 4,
    attachment_size_limit_mb: 10,
    ai_provider: null,
    ai_model: null,
    ai_api_key: null,
  };
}

const SAMPLE_PRESETS: ColorPreset[] = [
  { schedule_type: "bloom",  name: "Rot",        color: "#e74c3c" },
  { schedule_type: "bloom",  name: "Pink",        color: "#e91e8c" },
  { schedule_type: "foliage", name: "Frühjahrsgrün", color: "#a8d5a2" },
  { schedule_type: "misc",   name: "Grau",        color: "#7f8c8d" },
];

beforeEach(async () => {
  await i18n.changeLanguage("de");
  vi.clearAllMocks();
});

function renderSection(presets: ColorPreset[] = [], onChange = vi.fn()) {
  return {
    onChange,
    ...render(
      <I18nextProvider i18n={i18n}>
        <ColorPresetsSection form={makeSettings(presets)} onChange={onChange} />
      </I18nextProvider>
    ),
  };
}

describe("ColorPresetsSection — groups", () => {
  it("renders all 6 schedule type groups (AC #1)", () => {
    renderSection();
    expect(screen.getByTestId("preset-group-bloom")).toBeInTheDocument();
    expect(screen.getByTestId("preset-group-growth")).toBeInTheDocument();
    expect(screen.getByTestId("preset-group-foliage")).toBeInTheDocument();
    expect(screen.getByTestId("preset-group-pruning")).toBeInTheDocument();
    expect(screen.getByTestId("preset-group-fertilization")).toBeInTheDocument();
    expect(screen.getByTestId("preset-group-misc")).toBeInTheDocument();
  });

  it("shows group labels in German", () => {
    renderSection();
    // Use getAllByText because the hint text also contains "Blütezeiten"
    expect(screen.getAllByText(/Blütezeiten/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Wachstum/i)).toBeInTheDocument();
    // "Blätter" also appears in hint text, so use getAllByText
    expect(screen.getAllByText(/Blätter/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Schnitt/i)).toBeInTheDocument();
    expect(screen.getByText(/Düngung/i)).toBeInTheDocument();
    expect(screen.getByText(/Sonstiges/i)).toBeInTheDocument();
  });

  it("each group has an 'Add color' button (AC #3)", () => {
    renderSection();
    const addButtons = screen.getAllByText(/Farbe hinzufügen/i);
    expect(addButtons).toHaveLength(6);
  });
});

describe("ColorPresetsSection — preset entries", () => {
  it("renders preset entries in the correct group (AC #2)", () => {
    renderSection(SAMPLE_PRESETS);
    const bloomEntries = screen.getByTestId("preset-entries-bloom");
    const entries = within(bloomEntries).getAllByTestId("preset-entry");
    expect(entries).toHaveLength(2);
  });

  it("shows preset name in the input (AC #2)", () => {
    renderSection(SAMPLE_PRESETS);
    expect(screen.getByDisplayValue("Rot")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Pink")).toBeInTheDocument();
  });

  it("shows color swatch and color input for each preset (AC #2)", () => {
    renderSection(SAMPLE_PRESETS);
    const swatches = screen.getAllByTestId("preset-swatch");
    const colorInputs = screen.getAllByTestId("preset-color-input");
    expect(swatches).toHaveLength(SAMPLE_PRESETS.length);
    expect(colorInputs).toHaveLength(SAMPLE_PRESETS.length);
  });

  it("shows delete button for each preset (AC #2)", () => {
    renderSection(SAMPLE_PRESETS);
    const deleteButtons = screen.getAllByTestId("preset-delete");
    expect(deleteButtons).toHaveLength(SAMPLE_PRESETS.length);
  });
});

describe("ColorPresetsSection — interactions", () => {
  it("adds a new preset when 'Add color' is clicked (AC #3)", () => {
    const { onChange } = renderSection(SAMPLE_PRESETS);
    const bloomGroup = screen.getByTestId("preset-group-bloom");
    const addBtn = within(bloomGroup).getByRole("button", { name: /Farbe hinzufügen/i });
    fireEvent.click(addBtn);

    expect(onChange).toHaveBeenCalledOnce();
    const [patch] = onChange.mock.calls[0];
    const bloomPresets = (patch.color_presets as ColorPreset[]).filter(
      (p) => p.schedule_type === "bloom"
    );
    expect(bloomPresets).toHaveLength(3); // 2 existing + 1 new
    expect(bloomPresets[2].name).toBe("");
    expect(bloomPresets[2].color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("deletes a preset when delete button is clicked (AC #2)", () => {
    const { onChange } = renderSection(SAMPLE_PRESETS);
    const deleteButtons = screen.getAllByTestId("preset-delete");
    fireEvent.click(deleteButtons[0]); // delete first bloom preset "Rot"

    expect(onChange).toHaveBeenCalledOnce();
    const [patch] = onChange.mock.calls[0];
    const bloomPresets = (patch.color_presets as ColorPreset[]).filter(
      (p) => p.schedule_type === "bloom"
    );
    expect(bloomPresets).toHaveLength(1);
    expect(bloomPresets[0].name).toBe("Pink");
  });

  it("updates preset name on input change (AC #2)", () => {
    const { onChange } = renderSection(SAMPLE_PRESETS);
    fireEvent.change(screen.getByDisplayValue("Rot"), { target: { value: "Dunkelrot" } });

    expect(onChange).toHaveBeenCalledOnce();
    const [patch] = onChange.mock.calls[0];
    const bloom = (patch.color_presets as ColorPreset[]).filter(
      (p) => p.schedule_type === "bloom"
    );
    expect(bloom[0].name).toBe("Dunkelrot");
  });

  it("updates preset color on color input change (AC #2)", () => {
    const { onChange } = renderSection(SAMPLE_PRESETS);
    const colorInputs = screen.getAllByTestId("preset-color-input");
    fireEvent.change(colorInputs[0], { target: { value: "#ff0000" } });

    expect(onChange).toHaveBeenCalledOnce();
    const [patch] = onChange.mock.calls[0];
    const bloom = (patch.color_presets as ColorPreset[]).filter(
      (p) => p.schedule_type === "bloom"
    );
    expect(bloom[0].color).toBe("#ff0000");
  });

  it("onChange passes full color_presets array including other groups (AC #5)", () => {
    const { onChange } = renderSection(SAMPLE_PRESETS);
    // Delete the single foliage preset
    const deleteButtons = screen.getAllByTestId("preset-delete");
    // foliage preset is the 3rd (index 2) after 2 bloom
    fireEvent.click(deleteButtons[2]);

    const [patch] = onChange.mock.calls[0];
    const allPresets = patch.color_presets as ColorPreset[];
    // bloom + misc presets must still be present
    expect(allPresets.filter((p) => p.schedule_type === "bloom")).toHaveLength(2);
    expect(allPresets.filter((p) => p.schedule_type === "misc")).toHaveLength(1);
    expect(allPresets.filter((p) => p.schedule_type === "foliage")).toHaveLength(0);
  });
});
