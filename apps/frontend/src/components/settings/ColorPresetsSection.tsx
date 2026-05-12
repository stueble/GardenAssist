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
  const dragIndexRef = useRef<number | null>(null);
  // insertBefore: the index before which the dragged item will be inserted.
  // null = no active drag. presets.length = insert after last element.
  const [insertBefore, setInsertBefore] = useState<number | null>(null);

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    // Determine insert position: top half → insert before index, bottom half → insert before index+1
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mid  = rect.top + rect.height / 2;
    setInsertBefore(e.clientY < mid ? index : index + 1);
  }

  function handleDragLeaveList() {
    setInsertBefore(null);
  }

  function handleDropOnList(e: React.DragEvent) {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || insertBefore === null) {
      dragIndexRef.current = null;
      setInsertBefore(null);
      return;
    }
    // Normalise: if inserting after the dragged item's original position
    // the effective index shifts by -1
    const to = insertBefore > from ? insertBefore - 1 : insertBefore;
    dragIndexRef.current = null;
    setInsertBefore(null);
    if (from === to) return;
    const updated = [...presets];
    const [item] = updated.splice(from, 1);
    updated.splice(to, 0, item);
    onUpdate(updated);
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setInsertBefore(null);
  }

  function updatePreset(index: number, patch: Partial<Omit<ColorPreset, "schedule_type">>) {
    onUpdate(presets.map((p, i) => i === index ? { ...p, ...patch } : p));
  }

  function deletePreset(index: number) {
    onUpdate(presets.filter((_, i) => i !== index));
  }

  function addPreset() {
    onUpdate([...presets, { schedule_type: scheduleType, name: "", color: randomColor() }]);
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

      {/* Preset entries — drop target is the list container */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={handleDragLeaveList}
        onDrop={handleDropOnList}
        style={{ marginBottom: "10px" }}
        data-testid={`preset-entries-${scheduleType}`}
      >
        {presets.map((preset, index) => (
          <div key={index}>
            {/* Insert indicator line — shown ABOVE this item */}
            <InsertLine visible={insertBefore === index && dragIndexRef.current !== index} />
            <PresetEntry
              preset={preset}
              isDragging={dragIndexRef.current === index && insertBefore !== null}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onChangeName={(name) => updatePreset(index, { name })}
              onChangeColor={(color) => updatePreset(index, { color })}
              onDelete={() => deletePreset(index)}
            />
          </div>
        ))}
        {/* Insert indicator line — shown AFTER last item */}
        <InsertLine visible={insertBefore === presets.length && dragIndexRef.current !== presets.length - 1} />
      </div>

      <AddRowButton onClick={addPreset}>{addLabel}</AddRowButton>
    </div>
  );
}

// ── InsertLine ────────────────────────────────────────────────────────────────

function InsertLine({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      style={{
        height:       "2px",
        background:   "var(--green-mid)",
        borderRadius: "2px",
        margin:       "2px 0",
        position:     "relative",
      }}
    >
      {/* Dot at the left end */}
      <div style={{
        position:     "absolute",
        left:         "-3px",
        top:          "50%",
        transform:    "translateY(-50%)",
        width:        "8px",
        height:       "8px",
        borderRadius: "50%",
        background:   "var(--green-mid)",
      }} />
    </div>
  );
}

// ── PresetEntry ───────────────────────────────────────────────────────────────

interface PresetEntryProps {
  preset:      ColorPreset;
  isDragging:  boolean;
  draggable:   boolean;
  onDragStart: () => void;
  onDragOver:  (e: React.DragEvent) => void;
  onDragEnd:   () => void;
  onChangeName:  (name: string) => void;
  onChangeColor: (color: string) => void;
  onDelete:    () => void;
}

function PresetEntry({
  preset, isDragging,
  draggable, onDragStart, onDragOver, onDragEnd,
  onChangeName, onChangeColor, onDelete,
}: PresetEntryProps) {
  const { t } = useTranslation("settings");
  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      // The row itself is NOT draggable — only the handle is.
      // This prevents the browser from intercepting mousedown on inputs.
      onDragOver={onDragOver}
      data-testid="preset-entry"
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "8px",
        background:   "var(--green-mist)",
        border:       "1.5px solid var(--border)",
        borderRadius: "8px",
        padding:      "7px 10px",
        opacity:      isDragging ? 0.4 : 1,
        transition:   "opacity .15s",
      }}
    >
      {/* Drag handle — only this element is draggable */}
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        title={t("color_presets_section.drag_handle")}
        data-testid="preset-drag-handle"
        style={{
          flexShrink:  0,
          cursor:      "grab",
          color:       "var(--text-light)",
          fontSize:    "14px",
          lineHeight:  1,
          padding:     "2px 4px 2px 0",
          userSelect:  "none",
        }}
      >
        ⠿
      </div>

      {/* Color swatch — clicking it opens the hidden color input */}
      <div
        onClick={() => colorInputRef.current?.click()}
        title={t("color_presets_section.change_color")}
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

      {/* Name input — value is translated for display; user edits overwrite the key */}
      <input
        type="text"
        value={t(`defaults.color_presets.${preset.name}`, { defaultValue: preset.name, ns: "settings" })}
        onChange={(e) => onChangeName(e.target.value)}
        placeholder={t("color_presets_section.name_placeholder")}
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
      />

      {/* Color picker — fully hidden, opened via swatch click */}
      <input
        ref={colorInputRef}
        type="color"
        value={preset.color}
        onChange={(e) => onChangeColor(e.target.value)}
        data-testid="preset-color-input"
        style={{ display: "none" }}
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
        aria-label={t("color_presets_section.delete_aria")}
      >
        ✕
      </button>
    </div>
  );
}
