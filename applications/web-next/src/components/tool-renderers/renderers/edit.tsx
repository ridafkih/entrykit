"use client";

import { FilePath, ContentDiff, ContentError, getString, getBoolean } from "../shared";
import type { ToolRendererProps } from "../types";

function EditRenderer({ input, error }: ToolRendererProps) {
  const filePath = getString(input, "filePath");
  const oldString = getString(input, "oldString") ?? "";
  const newString = getString(input, "newString") ?? "";
  const replaceAll = getBoolean(input, "replaceAll");

  return (
    <div className="flex flex-col">
      {filePath && (
        <div className="px-4 py-2 flex items-center gap-2 bg-bg-muted">
          <FilePath path={filePath} changeType="modified" />
          {replaceAll && <span className="text-xs text-text-muted">(replace all)</span>}
        </div>
      )}
      {(oldString || newString) && (
        <div className="w-0 min-w-full overflow-x-auto max-h-80 overflow-y-auto">
          <ContentDiff
            oldContent={oldString}
            newContent={newString}
            filename={filePath ?? "file"}
          />
        </div>
      )}
      {error && (
        <div className="px-4 py-2 bg-bg-muted w-0 min-w-full">
          <ContentError>{error}</ContentError>
        </div>
      )}
    </div>
  );
}

export { EditRenderer };
