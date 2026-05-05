import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useGardenPlan } from "@/hooks/useGardenPlan";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];
const ACCEPTED_EXTS  = ".png,.jpg,.jpeg,.svg";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

export function GardenPlanSection() {
  const { t } = useTranslation("settings");
  const {
    planUrl, planName,
    uploading, removing, loading,
    error, upload, remove,
  } = useGardenPlan();

  const inputRef        = useRef<HTMLInputElement>(null);
  const dragActiveRef   = useRef(false);

  function openPicker() {
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void upload(file);
    // reset so same file can be re-selected
    e.target.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    dragActiveRef.current = true;
  }

  function handleDragLeave() {
    dragActiveRef.current = false;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragActiveRef.current = false;
    const file = e.dataTransfer.files?.[0];
    if (file && ACCEPTED_TYPES.includes(file.type)) {
      void upload(file);
    }
  }

  if (loading) {
    return (
      <div className="text-[12px] text-text-light py-2">
        Gartenplan wird geladen …
      </div>
    );
  }

  return (
    <div>
      {/* Error banner */}
      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-soft border-[1.5px] border-red-warn text-[12px] text-red-warn">
          {error}
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

      {planUrl ? (
        /* ── Preview row ── */
        <PlanPreview
          planUrl={planUrl}
          planName={planName}
          removing={removing}
          onRemove={() => void remove()}
          uploadedOn={t("garden_plan.uploaded_on")}
          removeLabel={t("garden_plan.remove_label")}
          removingLabel={t("garden_plan.removing")}
        />
      ) : (
        /* ── Dropzone ── */
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openPicker()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          data-testid="garden-plan-dropzone"
          style={{
            background:    "var(--green-mist)",
            border:        "2px dashed var(--border)",
            borderRadius:  "10px",
            padding:       "28px",
            textAlign:     "center",
            cursor:        uploading ? "wait" : "pointer",
            transition:    "all .2s",
            marginBottom:  "10px",
          }}
          className="hover:border-[color:var(--green-mid)] hover:bg-white"
        >
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>
            {uploading ? "⏳" : "📂"}
          </div>
          <div
            className="text-text-dark"
            style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}
          >
            {uploading
              ? t("garden_plan.uploading")
              : t("garden_plan.dropzone_title")}
          </div>
          {!uploading && (
            <div className="text-text-light" style={{ fontSize: "11px" }}>
              {t("garden_plan.dropzone_sub")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Preview row sub-component ─────────────────────────────────────────────────

interface PlanPreviewProps {
  planUrl:       string;
  planName:      string | null;
  removing:      boolean;
  onRemove:      () => void;
  uploadedOn:    string;
  removeLabel:   string;
  removingLabel: string;
}

function PlanPreview({
  planUrl, planName, removing, onRemove,
  uploadedOn, removeLabel, removingLabel,
}: PlanPreviewProps) {
  const displayName = planName ?? planUrl.split("/").pop() ?? "plan";
  const ext = displayName.split(".").pop()?.toUpperCase() ?? "";
  const today = formatDate(new Date());

  return (
    <div
      data-testid="garden-plan-preview"
      style={{
        display:       "flex",
        alignItems:    "center",
        gap:           "12px",
        background:    "var(--green-mist)",
        border:        "1.5px solid var(--border)",
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
        <img
          src={planUrl}
          alt={displayName}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
            (e.currentTarget.parentElement as HTMLElement).textContent = "🗺️";
          }}
        />
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div
          className="text-text-dark"
          style={{ fontSize: "13px", fontWeight: 500 }}
        >
          {displayName}
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
        disabled={removing}
        title={removeLabel}
        data-testid="garden-plan-remove"
        style={{
          background: "none",
          border:     "none",
          cursor:     removing ? "wait" : "pointer",
          color:      "var(--text-light)",
          fontSize:   "16px",
          flexShrink: 0,
          lineHeight: 1,
        }}
        className="hover:text-red-warn disabled:opacity-50"
        aria-label={removing ? removingLabel : removeLabel}
      >
        {removing ? "⏳" : "✕"}
      </button>
    </div>
  );
}
