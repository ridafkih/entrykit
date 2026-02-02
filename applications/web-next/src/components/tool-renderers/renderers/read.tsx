"use client";

import { useMemo } from "react";
import {
  FilePath,
  ContentCode,
  ContentError,
  parseFileOutput,
  getString,
  getNumber,
} from "../shared";
import type { ToolRendererProps } from "../types";

function ReadRenderer({ input, output, error, status }: ToolRendererProps) {
  const filePath = getString(input, "filePath");
  const offset = getNumber(input, "offset");
  const limit = getNumber(input, "limit");
  const hasRange = offset !== undefined || limit !== undefined;

  const parsedContent = useMemo(() => {
    if (!output) return null;
    return parseFileOutput(output);
  }, [output]);

  return (
    <div className="flex flex-col">
      {filePath && (
        <div className="px-4 py-2 flex items-center gap-2 bg-bg-muted">
          <FilePath path={filePath} changeType="read" />
          {hasRange && (
            <span className="text-xs text-text-muted">
              {offset !== undefined && `from line ${offset}`}
              {offset !== undefined && limit !== undefined && ", "}
              {limit !== undefined && `${limit} lines`}
            </span>
          )}
        </div>
      )}
      {parsedContent && status === "completed" && (
        <div className="w-0 min-w-full overflow-x-auto max-h-80 overflow-y-auto">
          <ContentCode content={parsedContent} filename={filePath} />
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

export { ReadRenderer };
