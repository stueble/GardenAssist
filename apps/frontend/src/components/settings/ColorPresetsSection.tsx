/**
 * ColorPresetsSection — Farb-Presets editor in the Settings view.
 *
 * Renders one group per schedule type (6 total). Each group shows the
 * preset list with color swatch, name input, native color picker and
 * delete button. Presets within a group can be reordered via drag & drop.
 * An "Add color" button appends a new preset with a random default color.
 *
 * All changes go through onChange() as a full updated color_presets array,
 * which feeds into the Settings form and is saved via updateSettings().
 */

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Settings } from "@api/settings";
import type { ColorPreset } from "@api/color-preset";
import { AddRowButton, FieldHint } from "./FieldInput";

const SCHEDULE_TYPES = [
  "bloom",
  "growth",
  "foliage",
  "pruning",
  "fertilization",
  "misc",
] as const;

type ScheduleType = typeof SCHEDULE_TYPES[number];

/** Generate a random hex color for new presets */
function randomColor(): string {
  const palette = [
    "#e74c3c", "#e91e8c", "#9b59b6", "#3498db",
    "#2ecc71", "#f39c12", "#1abc9c", "#e67e22",
  ];
  return palette[Math.floor(Math.random() * palette.length)];
}

interface Props {
  form:     Settings;
  onChange: (patch: Partial<Settings>) => void;
}

export function ColorPresetsSection({ form, onChange }: Props) {
  const { t } = useTranslation("settings");

  function presetsFor(type: ScheduleType): ColorPreset[] {
    return form.color_presets.filter((p) => p.schedule_type === type);
  }

  function updatePresets(type: ScheduleType, updated: ColorPreset[]) {
    const others = form.color_presets.filter((p) => p.schedule_type !== type);
    onChange({ color_presets: [...others, ...updated] });
  }

  return (
    <div>
      {SCHEDULE_TYPES.map((type, idx) => (
        <div key={type}>
          {idx > 0 && (
            <div
              style={{
                height:     "1px",
                background: "var(--border)",
                margin:     "16px 0",
              }}
            />
          )}
          <PresetGroup
            scheduleType={type}
            label={t(`color_presets.schedule_types.${type}`)}
            presets={presetsFor(type)}
            addLabel={t("color_presets.add_color")}
            onUpdate={(updated) => updatePresets(type, updated)}
          />
        </div>
      ))}
      <div style={{ marginTop: "10px" }}>
        <FieldHint>{t("color_presets.hint")}</FieldHint>
      </div>
    </div>
  );
}

// ── PresetGroup ───────────────────────────────────────────────────────────────

interface PresetGroupProps {
  scheduleType: ScheduleType;
  label:        string;
  presets:      ColorPreset[];
  addLabel:     string;
  onUpdate:     (presets: ColorPreset[]) => void;
}

function PresetGroup({ scheduleType, label, presets, addLabel, onUpdate }: PresetGroupProps) {
  // Drag & drop state
  const dragIndexRef  = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOver(index);
  }

  function handleDrop(index: number) {
    const from = dragIndexRef.current;
    if (from === null || from === index) {
      dragIndexRef.current = null;
      setDragOver(null);
      return;
    }
    const updated = [...presets];
    const [item] = updated.splice(from, 1);
    updated.splice(index, 0, item);
    dragIndexRef.current = null;
    setDragOver(null);
    onUpdate(updated);
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDragOver(null);
  }

  function updatePreset(index: number, patch: Partial<Omit<ColorPreset, "schedule_type">>) {
    const updated = presets.map((p, i) =>
      i === index ? { ...p, ...patch } : p
    );
    onUpdate(updated);
  }

  function deletePreset(index: number) {
    onUpdate(presets.filter((_, i) => i !== index));
  }

  function addPreset() {
    const color = randomColor();
    onUpdate([...presets, { schedule_type: scheduleType, name: "", color }]);
  }

  return (
    <div data-testid={`preset-group-${scheduleType}`}>
      {/* Group label */}
      <div
        style={{
          fontSize:      "10px",
          fontWeight:    700,
          letterSpacing: ".8px",
          textTransform: "uppercase",
          color:         "var(--text-light)",
          marginBottom:  "10px",
        }}
      >
        {label}
      </div>

      {/* Preset entries */}
      <div
        style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}
        data-testid={`preset-entries-${scheduleType}`}
      >
        {presets.map((preset, index) => (
          <PresetEntry
            key={index}
            preset={preset}
            isDragOver={dragOver === index}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            onDragEnd={handleDragEnd}
            onChangeName={(name) => updatePreset(index, { name })}
            onChangeColor={(color) => updatePreset(index, { color })}
            onDelete={() => deletePreset(index)}
          />
        ))}
      </div>

      <AddRowButton onClick={addPreset}>{addLabel}</AddRowButton>
    </div>
  );
}

// ── PresetEntry ───────────────────────────────────────────────────────────────

interface PresetEntryProps {
  preset:      ColorPreset;
  isDragOver:  boolean;
  draggable:   boolean;
  onDragStart: () => void;
  onDragOver:  (e: React.DragEvent) => void;
  onDrop:      () => void;
  onDragEnd:   () => void;
  onChangeName:  (name: string) => void;
  onChangeColor: (color: string) => void;
  onDelete:    () => void;
}

function PresetEntry({
  preset, isDragOver,
  draggable, onDragStart, onDragOver, onDrop, onDragEnd,
  onChangeName, onChangeColor, onDelete,
}: PresetEntryProps) {
  const colorInputRef  = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      draggable={draggable}
      onDragStart={() => { setIsDragging(true); onDragStart(); }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={() => { setIsDragging(false); onDragEnd(); }}
      data-testid="preset-entry"
      style={{
        display:       "flex",
        alignItems:    "center",
        gap:           "8px",
        background:    "var(--green-mist)",
        border:        isDragOver
          ? "1.5px dashed var(--green-mid)"
          : "1.5px solid var(--border)",
        borderRadius:  "8px",
        padding:       "7px 10px",
        // Only apply grab cursor and userSelect:none while not interacting with text
        cursor:        isDragging ? "grabbing" : "grab",
        userSelect:    isDragging ? "none" : "auto",
      }}
    >
      {/* Color swatch — clicking it opens the hidden color input */}
      <div
        onClick={() => colorInputRef.current?.click()}
        title="Farbe ändern"
        style={{
          width:        "28px",
          height:       "28px",
          borderRadius: "6px",
          border:       "2px solid rgba(0,0,0,.1)",
          flexShrink:   0,
          cursor:       "pointer",
          background:   preset.color,
          transition:   "transform .15s",
        }}
        className="hover:scale-105"
        data-testid="preset-swatch"
      />

      {/* Name input */}
      <input
        type="text"
        value={preset.name}
        onChange={(e) => onChangeName(e.target.value)}
        placeholder="Name …"
        data-testid="preset-name-input"
        style={{
          flex:         1,
          background:   "white",
          border:       "1.5px solid var(--border)",
          borderRadius: "6px",
          padding:      "5px 9px",
          fontSize:     "12.5px",
          fontFamily:   "var(--font-body)",
          color:        "var(--text-dark)",
          outline:      "none",
        }}
        // Prevent drag from starting when clicking into the input
        onMouseDown={(e) => e.stopPropagation()}
        onDragStart={(e) => e.preventDefault()}
      />

      {/* Hidden native color picker */}
      <input
        ref={colorInputRef}
        type="color"
        value={preset.color}
        onChange={(e) => onChangeColor(e.target.value)}
        data-testid="preset-color-input"
        style={{
          width:        "36px",
          height:       "30px",
          border:       "1.5px solid var(--border)",
          borderRadius: "6px",
          cursor:       "pointer",
          padding:      "1px",
          background:   "none",
          flexShrink:   0,
        }}
      />

      {/* Delete button */}
      <button
        type="button"
        onClick={onDelete}
        data-testid="preset-delete"
        style={{
          background:  "none",
          border:      "none",
          cursor:      "pointer",
          color:       "var(--text-light)",
          fontSize:    "14px",
          lineHeight:  1,
          flexShrink:  0,
        }}
        className="hover:text-red-warn"
        aria-label="Preset löschen"
      >
        ✕
      </button>
    </div>
  );
}
