import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { GardenPlanState } from "@/hooks/useGardenPlan";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];
const ACCEPTED_EXTS  = ".png,.jpg,.jpeg,.svg";

function formatDate(date: Date): string {
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  plan: GardenPlanState;
}

export function GardenPlanSection({ plan }: Props) {
  const { t } = useTranslation("settings");
  const inputRef = useRef<HTMLInputElement>(null);

  // Show dropzone when: pending remove, or no plan at all
  const showDropzone =
    plan.pending?.type === "remove" ||
    (!plan.pending && !plan.previewUrl);

  function openPicker() {
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) plan.selectFile(file);
    e.target.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && ACCEPTED_TYPES.includes(file.type)) {
      plan.selectFile(file);
    }
  }

  if (plan.loading) {
    return (
      <div className="text-[12px] text-text-light py-2">
        Gartenplan wird geladen …
      </div>
    );
  }

  return (
    <div>
      {/* Error banner */}
      {plan.error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-soft border-[1.5px] border-red-warn text-[12px] text-red-warn">
          {plan.error}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTS}
        className="hidden"
        onChange={handleFileChange}
        data-testid="garden-plan-input"
      />

      {showDropzone ? (
        /* ── Dropzone ── */
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openPicker()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          data-testid="garden-plan-dropzone"
          style={{
            background:   "var(--green-mist)",
            border:       "2px dashed var(--border)",
            borderRadius: "10px",
            padding:      "28px",
            textAlign:    "center",
            cursor:       "pointer",
            transition:   "all .2s",
            marginBottom: "10px",
          }}
          className="hover:border-[color:var(--green-mid)] hover:bg-white"
        >
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📂</div>
          <div
            className="text-text-dark"
            style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}
          >
            {t("garden_plan.dropzone_title")}
          </div>
          <div className="text-text-light" style={{ fontSize: "11px" }}>
            {t("garden_plan.dropzone_sub")}
          </div>
        </div>
      ) : (
        /* ── Preview row ── */
        <PlanPreview
          previewUrl={plan.previewUrl}
          displayName={plan.previewName ?? "plan"}
          isPending={plan.pending?.type === "upload"}
          saving={plan.saving}
          onRemove={plan.markRemove}
          uploadedOn={t("garden_plan.uploaded_on")}
          removeLabel={t("garden_plan.remove_label")}
        />
      )}
    </div>
  );
}

// ── Preview row sub-component ─────────────────────────────────────────────────

interface PlanPreviewProps {
  previewUrl:   string | null;
  displayName:  string;
  isPending:    boolean;
  saving:       boolean;
  onRemove:     () => void;
  uploadedOn:   string;
  removeLabel:  string;
}

function PlanPreview({
  previewUrl, displayName, isPending, saving, onRemove,
  uploadedOn, removeLabel,
}: PlanPreviewProps) {
  const ext = displayName.split(".").pop()?.toUpperCase() ?? "";
  const today = formatDate(new Date());
  // Track img load errors in React state to avoid direct DOM mutation bugs
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [previewUrl]);

  return (
    <div
      data-testid="garden-plan-preview"
      style={{
        display:       "flex",
        alignItems:    "center",
        gap:           "12px",
        background:    "var(--green-mist)",
        border:        isPending
          ? "1.5px dashed var(--green-mid)"
          : "1.5px solid var(--border)",
        borderRadius:  "8px",
        padding:       "10px 12px",
        marginBottom:  "10px",
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width:          "60px",
          height:         "44px",
          background:     "#c8d8b8",
          borderRadius:   "6px",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontSize:       "20px",
          flexShrink:     0,
          overflow:       "hidden",
        }}
      >
        {previewUrl && !imgError ? (
          <img
            src={previewUrl}
            alt={displayName}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setImgError(true)}
          />
        ) : (
          "🗺️"
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div
          className="text-text-dark"
          style={{ fontSize: "13px", fontWeight: 500 }}
        >
          {displayName}
          {isPending && (
            <span
              className="text-text-light"
              style={{ fontSize: "11px", fontWeight: 400, marginLeft: "6px" }}
            >
              (nicht gespeichert)
            </span>
          )}
        </div>
        <div
          className="text-text-light"
          style={{ fontSize: "11px", marginTop: "2px" }}
        >
          {ext && `${ext} · `}{uploadedOn} {today}
        </div>
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        disabled={saving}
        title={removeLabel}
        data-testid="garden-plan-remove"
        style={{
          background: "none",
          border:     "none",
          cursor:     saving ? "wait" : "pointer",
          color:      "var(--text-light)",
          fontSize:   "16px",
          flexShrink: 0,
          lineHeight: 1,
        }}
        className="hover:text-red-warn disabled:opacity-50"
        aria-label={removeLabel}
      >
        ✕
      </button>
    </div>
  );
}
