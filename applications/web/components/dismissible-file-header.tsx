import type { ReactNode } from "react";
import { cn } from "@lab/ui/utils/cn";
import { Copy } from "@lab/ui/components/copy";
import { File, FilePlus, FileX } from "lucide-react";

export type FileChangeType = "modified" | "created" | "deleted";

const changeTypeIcons = {
  modified: File,
  created: FilePlus,
  deleted: FileX,
};

const changeTypeColors = {
  modified: "text-warning",
  created: "text-success",
  deleted: "text-destructive",
};

interface DismissibleFileHeaderProps {
  children: ReactNode;
}

interface DismissibleFileHeaderCheckboxProps {
  onDismiss: () => void;
}

interface DismissibleFileHeaderIconProps {
  changeType: FileChangeType;
}

interface DismissibleFileHeaderLabelProps {
  children: ReactNode;
}

export function DismissibleFileHeader({ children }: DismissibleFileHeaderProps) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border sticky top-0 bg-background z-10">
      {children}
    </div>
  );
}

export function DismissibleFileHeaderCheckbox({ onDismiss }: DismissibleFileHeaderCheckboxProps) {
  return (
    <button
      type="button"
      onClick={onDismiss}
      className="size-3 shrink-0 border border-muted-foreground flex items-center justify-center"
    />
  );
}

export function DismissibleFileHeaderIcon({ changeType }: DismissibleFileHeaderIconProps) {
  const Icon = changeTypeIcons[changeType];
  return <Icon className={cn("size-3 shrink-0", changeTypeColors[changeType])} />;
}

export function DismissibleFileHeaderLabel({ children }: DismissibleFileHeaderLabelProps) {
  return (
    <Copy size="xs" muted className="flex-1 truncate">
      {children}
    </Copy>
  );
}
