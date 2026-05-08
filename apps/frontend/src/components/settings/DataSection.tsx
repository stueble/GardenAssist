import { FieldHint } from "./FieldInput";

interface Props {
  onExportBackup:  () => void;
  onImportBackup:  () => void;
  onExportCsv:     () => void;
  onDeleteAll:     () => void;
}

function SectionGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold tracking-[0.8px] uppercase text-text-light mb-[10px] mt-4 first:mt-0">
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border my-4" />;
}

function ActionBtn({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-[8px] text-[13px] font-medium font-body border-[1.5px] transition-colors cursor-pointer ${
        danger
          ? "text-red-warn border-red-warn hover:bg-red-soft"
          : "text-text-mid border-border bg-none hover:border-green-mid hover:text-green-deep"
      }`}
    >
      {children}
    </button>
  );
}

export function DataSection({ onExportBackup, onImportBackup, onExportCsv, onDeleteAll }: Props) {
  return (
    <div>
      <SectionGroupLabel>Backup & Wiederherstellung</SectionGroupLabel>
      <div className="flex gap-2">
        <ActionBtn onClick={onExportBackup}>💾 Vollständiges Backup exportieren</ActionBtn>
        <ActionBtn onClick={onImportBackup}>🔄 Backup wiederherstellen</ActionBtn>
      </div>
      <FieldHint>Das Backup enthält alle Daten inkl. Fotos und Dateien. Der API-Schlüssel wird nicht exportiert.</FieldHint>

      <Divider />

      <SectionGroupLabel>Pflanzenliste</SectionGroupLabel>
      <div className="flex gap-2">
        <ActionBtn onClick={onExportCsv}>📄 Pflanzenliste als CSV</ActionBtn>
      </div>

      <Divider />

      <SectionGroupLabel>Zurücksetzen</SectionGroupLabel>
      <div className="flex gap-2">
        <ActionBtn onClick={onDeleteAll} danger>⚠️ Alle Daten löschen</ActionBtn>
      </div>
      <FieldHint>Dieser Vorgang kann nicht rückgängig gemacht werden. Erstelle zuerst ein Backup.</FieldHint>
    </div>
  );
}
