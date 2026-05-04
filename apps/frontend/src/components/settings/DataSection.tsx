import { FieldHint } from "./FieldInput";

interface Props {
  onExportJson:  () => void;
  onExportCsv:   () => void;
  onImportJson:  () => void;
  onDeleteAll:   () => void;
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

export function DataSection({ onExportJson, onExportCsv, onImportJson, onDeleteAll }: Props) {
  return (
    <div>
      <SectionGroupLabel>Export</SectionGroupLabel>
      <div className="flex gap-2">
        <ActionBtn onClick={onExportJson}>📥 Alle Daten als JSON exportieren</ActionBtn>
        <ActionBtn onClick={onExportCsv}>📄 Pflanzenliste als CSV</ActionBtn>
      </div>

      <Divider />

      <SectionGroupLabel>Import</SectionGroupLabel>
      <div className="flex gap-2">
        <ActionBtn onClick={onImportJson}>📤 JSON importieren</ActionBtn>
      </div>
      <FieldHint>Beim Import werden bestehende Daten zusammengeführt, nicht überschrieben.</FieldHint>

      <Divider />

      <SectionGroupLabel>Zurücksetzen</SectionGroupLabel>
      <div className="flex gap-2">
        <ActionBtn onClick={onDeleteAll} danger>⚠️ Alle Daten löschen</ActionBtn>
      </div>
      <FieldHint>Dieser Vorgang kann nicht rückgängig gemacht werden. Erstelle zuerst einen Export.</FieldHint>
    </div>
  );
}
