import { useTranslation } from "react-i18next";
import { FieldHint } from "./FieldInput";

interface BackupProps {
  onExportBackup: () => void;
  onImportBackup: () => void;
  onExportCsv:    () => void;
}

interface ResetProps {
  onDeleteAll:       () => void;
  onInstallDefaults: () => void;
}

/** @deprecated Use DataBackupSection + DataResetSection instead */
export interface DataSectionProps extends BackupProps, ResetProps {}

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

export function DataBackupSection({ onExportBackup, onImportBackup, onExportCsv }: BackupProps) {
  const { t } = useTranslation("settings");

  return (
    <div>
      <SectionGroupLabel>{t("data.backup_group")}</SectionGroupLabel>
      <div className="flex gap-2">
        <ActionBtn onClick={onExportBackup}>{t("data.export_backup")}</ActionBtn>
        <ActionBtn onClick={onImportBackup}>{t("data.import_backup")}</ActionBtn>
      </div>
      <FieldHint>{t("data.backup_hint")}</FieldHint>

      <Divider />

      <SectionGroupLabel>{t("data.plant_list_group")}</SectionGroupLabel>
      <div className="flex gap-2">
        <ActionBtn onClick={onExportCsv}>{t("data.export_csv")}</ActionBtn>
      </div>
    </div>
  );
}

export function DataResetSection({ onDeleteAll, onInstallDefaults }: ResetProps) {
  const { t } = useTranslation("settings");

  return (
    <div>
      <SectionGroupLabel>{t("data.reset_group")}</SectionGroupLabel>
      <div className="flex gap-2">
        <ActionBtn onClick={onDeleteAll} danger>{t("data.delete_all")}</ActionBtn>
        <ActionBtn onClick={onInstallDefaults}>{t("data.install_defaults")}</ActionBtn>
      </div>
      <FieldHint>{t("data.delete_all_hint")}</FieldHint>
      <FieldHint>{t("data.install_defaults_hint")}</FieldHint>
    </div>
  );
}

/** @deprecated kept for backwards compat — use DataBackupSection + DataResetSection */
export function DataSection({ onExportBackup, onImportBackup, onExportCsv, onDeleteAll, onInstallDefaults }: DataSectionProps) {
  return (
    <>
      <DataBackupSection onExportBackup={onExportBackup} onImportBackup={onImportBackup} onExportCsv={onExportCsv} />
      <div className="h-px bg-border my-4" />
      <DataResetSection onDeleteAll={onDeleteAll} onInstallDefaults={onInstallDefaults} />
    </>
  );
}
