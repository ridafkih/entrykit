import type { ReactNode } from "react";
import { cn } from "@lab/ui/utils/cn";
import { Copy } from "@lab/ui/components/copy";
import { Check, File, FilePlus, FileX } from "lucide-react";

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

interface FileStatusItemProps {
  children: ReactNode;
}

interface FileStatusItemCheckboxProps {
  checked: boolean;
  onChange: () => void;
}

interface FileStatusItemIconProps {
  changeType: FileChangeType;
}

interface FileStatusItemLabelProps {
  children: ReactNode;
  dismissed?: boolean;
  muted?: boolean;
}

export function FileStatusItem({ children }: FileStatusItemProps) {
  return <div className="flex items-center gap-1.5">{children}</div>;
}

export function FileStatusItemCheckbox({ checked, onChange }: FileStatusItemCheckboxProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "w-3 h-3 flex-shrink-0 border flex items-center justify-center",
        checked ? "border-foreground bg-foreground text-background" : "border-muted-foreground",
      )}
    >
      {checked && <Check className="w-2 h-2" />}
    </button>
  );
}

export function FileStatusItemIcon({ changeType }: FileStatusItemIconProps) {
  const Icon = changeTypeIcons[changeType];
  return <Icon className={cn("w-3 h-3 flex-shrink-0", changeTypeColors[changeType])} />;
}

export function FileStatusItemLabel({ children, dismissed, muted }: FileStatusItemLabelProps) {
  return (
    <Copy
      size="xs"
      className={cn(
        "flex-1 truncate",
        dismissed && "line-through text-muted-foreground",
        muted && "text-muted-foreground",
      )}
    >
      {children}
    </Copy>
  );
}
