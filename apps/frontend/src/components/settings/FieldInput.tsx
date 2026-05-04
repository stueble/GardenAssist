/**
 * Shared form field components matching the mockup's .field-* styles.
 */

import { cn } from "@/lib/utils";

interface FieldLabelProps {
  children: React.ReactNode;
  htmlFor?: string;
}

export function FieldLabel({ children, htmlFor }: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[10px] font-bold tracking-[0.7px] uppercase text-text-light mb-[6px]"
    >
      {children}
    </label>
  );
}

interface FieldInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

export function FieldInput({ mono, className, ...props }: FieldInputProps) {
  return (
    <input
      className={cn(
        "w-full bg-green-mist border-[1.5px] border-border rounded-[8px] px-3 py-2 text-[13px] font-body text-text-dark outline-none transition-colors focus:border-green-mid focus:bg-white",
        mono && "font-mono tracking-[0.5px]",
        className
      )}
      {...props}
    />
  );
}

interface FieldSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function FieldSelect({ className, children, ...props }: FieldSelectProps) {
  return (
    <select
      className={cn(
        "w-full bg-green-mist border-[1.5px] border-border rounded-[8px] px-3 py-2 text-[13px] font-body text-text-dark outline-none transition-colors focus:border-green-mid focus:bg-white",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-text-light mt-[5px] leading-[1.4]">{children}</p>
  );
}

export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="mb-[14px] last:mb-0">{children}</div>;
}

interface ListEntryProps {
  value:    string;
  onChange: (val: string) => void;
  onDelete: () => void;
  placeholder?: string;
}

export function ListEntry({ value, onChange, onDelete, placeholder }: ListEntryProps) {
  return (
    <div className="flex items-center gap-2 bg-green-mist border-[1.5px] border-border rounded-[8px] px-[10px] py-[7px]">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-white border-[1.5px] border-border rounded-[6px] px-[9px] py-[5px] text-[12.5px] font-body text-text-dark outline-none focus:border-green-mid"
      />
      <button
        type="button"
        onClick={onDelete}
        className="text-text-light text-[14px] leading-none hover:text-red-warn transition-colors"
        aria-label="Eintrag löschen"
      >
        ✕
      </button>
    </div>
  );
}

export function AddRowButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-[6px] w-full bg-none border-[1.5px] border-dashed border-border rounded-[8px] px-3 py-[7px] text-[12px] font-medium font-body text-text-light cursor-pointer transition-colors hover:border-green-mid hover:text-green-deep hover:bg-green-mist"
    >
      {children}
    </button>
  );
}
