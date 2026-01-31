"use client";

import {
  createContext,
  use,
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
  type ReactNode,
  type RefObject,
} from "react";
import { tv } from "tailwind-variants";
import { MultiFileDiff } from "@pierre/diffs/react";
import type { FileContents, SelectedLineRange } from "@pierre/diffs";
import { File, FilePlus, FileX, X, Check } from "lucide-react";
import { TextAreaGroup } from "./textarea-group";

type FileChangeType = "modified" | "created" | "deleted";
type FileStatus = "pending" | "dismissed";

type ReviewableFile = {
  path: string;
  originalContent: string;
  currentContent: string;
  status: FileStatus;
  changeType: FileChangeType;
};

type LineSelection = {
  filePath: string;
  range: SelectedLineRange;
};

type ReviewState = {
  files: ReviewableFile[];
  pendingFiles: ReviewableFile[];
  selection: LineSelection | null;
};

type ReviewActions = {
  dismissFile: (path: string) => void;
  selectLines: (filePath: string, range: SelectedLineRange | null) => void;
  clearSelection: () => void;
  submitFeedback: (feedback: string) => void;
};

type ReviewMeta = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  prevSelectionRef: RefObject<LineSelection | null>;
};

type ReviewContextValue = {
  state: ReviewState;
  actions: ReviewActions;
  meta: ReviewMeta;
};

const ReviewContext = createContext<ReviewContextValue | null>(null);

function useReview() {
  const context = use(ReviewContext);
  if (!context) {
    throw new Error("Review components must be used within Review.Provider");
  }
  return context;
}

type ProviderProps = {
  children: ReactNode;
  files: ReviewableFile[];
  onDismiss: (path: string) => void;
  onSubmitFeedback?: (selection: LineSelection, feedback: string) => void;
};

function ReviewProvider({ children, files, onDismiss, onSubmitFeedback }: ProviderProps) {
  const [selection, setSelection] = useState<LineSelection | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const prevSelectionRef = useRef<LineSelection | null>(null);

  const pendingFiles = useMemo(() => files.filter((file) => file.status === "pending"), [files]);

  useEffect(() => {
    if (selection) {
      textareaRef.current?.focus();
    }
    prevSelectionRef.current = selection;
  }, [selection]);

  const selectLines = useCallback((filePath: string, range: SelectedLineRange | null) => {
    if (range) {
      setSelection({ filePath, range });
    } else {
      setSelection((prev) => (prev?.filePath === filePath ? null : prev));
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  const submitFeedback = useCallback(
    (feedback: string) => {
      if (selection && onSubmitFeedback) {
        onSubmitFeedback(selection, feedback);
      }
      clearSelection();
    },
    [selection, onSubmitFeedback, clearSelection],
  );

  const state: ReviewState = { files, pendingFiles, selection };
  const actions: ReviewActions = {
    dismissFile: onDismiss,
    selectLines,
    clearSelection,
    submitFeedback,
  };
  const meta: ReviewMeta = { textareaRef, prevSelectionRef };

  const value = useMemo(() => ({ state, actions, meta }), [state, actions, meta]);

  return <ReviewContext value={value}>{children}</ReviewContext>;
}

function ReviewFrame({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col min-h-0 min-w-0">{children}</div>;
}

const emptyState = tv({
  base: "flex-1 flex flex-col items-center justify-center gap-2 text-center",
});

function ReviewEmpty() {
  const { state } = useReview();

  if (state.files.length === 0) {
    return (
      <div className={emptyState()}>
        <Check className="size-8 text-green-500" />
        <span className="text-sm text-text-muted">No files to review</span>
      </div>
    );
  }

  if (state.pendingFiles.length === 0) {
    return (
      <div className={emptyState()}>
        <Check className="size-8 text-green-500" />
        <span className="text-sm text-text-muted">All files reviewed</span>
      </div>
    );
  }

  return null;
}

const diffList = tv({
  base: "flex-1 overflow-auto min-w-0",
});

function ReviewDiffList({ children }: { children: ReactNode }) {
  return <div className={diffList()}>{children}</div>;
}

type DiffItemContextValue = {
  file: ReviewableFile;
};

const DiffItemContext = createContext<DiffItemContextValue | null>(null);

function useDiffItem() {
  const context = use(DiffItemContext);
  if (!context) {
    throw new Error("DiffItem components must be used within Review.DiffItem");
  }
  return context;
}

function ReviewDiffItem({ file, children }: { file: ReviewableFile; children: ReactNode }) {
  return (
    <DiffItemContext value={{ file }}>
      <div className="border-b border-border min-w-0">{children}</div>
    </DiffItemContext>
  );
}

const DIFF_CSS = `
  * { user-select: none; }
  [data-line] { position: relative; }
  [data-column-number] { position: static; cursor: crosshair; }
  [data-column-number]::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
`;

function ReviewDiff() {
  const { state, actions, meta } = useReview();
  const { file } = useDiffItem();

  const oldFile: FileContents = {
    name: file.path,
    contents: file.changeType === "created" ? "" : file.originalContent,
  };

  const newFile: FileContents = {
    name: file.path,
    contents: file.changeType === "deleted" ? "" : file.currentContent,
  };

  const shouldClearSelection =
    meta.prevSelectionRef.current?.filePath === file.path &&
    state.selection?.filePath !== file.path;

  return (
    <MultiFileDiff
      oldFile={oldFile}
      newFile={newFile}
      selectedLines={shouldClearSelection ? null : undefined}
      options={{
        theme: "pierre-light",
        diffStyle: "split",
        hunkSeparators: "line-info",
        lineDiffType: "word-alt",
        overflow: "scroll",
        disableFileHeader: true,
        enableLineSelection: true,
        onLineSelected: (range) => actions.selectLines(file.path, range),
        unsafeCSS: DIFF_CSS,
      }}
      style={{ "--diffs-font-size": "12px", minWidth: 0 } as React.CSSProperties}
    />
  );
}

type FileHeaderContextValue = {
  path: string;
  changeType: FileChangeType;
};

const FileHeaderContext = createContext<FileHeaderContextValue | null>(null);

function useFileHeader() {
  const context = use(FileHeaderContext);
  if (!context) {
    throw new Error("FileHeader components must be used within Review.FileHeader");
  }
  return context;
}

const fileHeader = tv({
  base: "flex items-center gap-1.5 px-2 py-1.5 border-b border-border sticky top-0 bg-bg z-10",
});

function ReviewFileHeader({ children }: { children: ReactNode }) {
  const { file } = useDiffItem();

  return (
    <FileHeaderContext value={{ path: file.path, changeType: file.changeType }}>
      <div className={fileHeader()}>{children}</div>
    </FileHeaderContext>
  );
}

const iconVariants = tv({
  base: "size-3 shrink-0",
  variants: {
    changeType: {
      modified: "text-yellow-500",
      created: "text-green-500",
      deleted: "text-red-500",
    },
  },
});

function ReviewFileHeaderIcon() {
  const { changeType } = useFileHeader();
  const icons = { modified: File, created: FilePlus, deleted: FileX };
  const Icon = icons[changeType];
  return <Icon className={iconVariants({ changeType })} />;
}

function ReviewFileHeaderLabel() {
  const { path } = useFileHeader();
  return <span className="flex-1 truncate text-xs text-text-muted font-mono">{path}</span>;
}

const dismissButton = tv({
  base: "px-1.5 py-0.5 text-xs text-text-muted hover:text-text hover:bg-bg-muted cursor-pointer",
});

function ReviewFileHeaderDismiss() {
  const { actions } = useReview();
  const { path } = useFileHeader();

  return (
    <button type="button" onClick={() => actions.dismissFile(path)} className={dismissButton()}>
      Dismiss
    </button>
  );
}

const feedback = tv({
  base: "border-t border-border",
});

function ReviewFeedback({ children }: { children: ReactNode }) {
  const { state, actions, meta } = useReview();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!state.selection) {
      setValue("");
    }
  }, [state.selection]);

  if (!state.selection) return null;

  const handleSubmit = () => {
    actions.submitFeedback(value);
  };

  return (
    <TextAreaGroup.Provider
      state={{ value }}
      actions={{ onChange: setValue, onSubmit: handleSubmit }}
      meta={{ textareaRef: meta.textareaRef }}
    >
      <div className={feedback()}>{children}</div>
    </TextAreaGroup.Provider>
  );
}

const feedbackHeader = tv({
  base: "flex items-center gap-1.5 px-2 py-1 border-b border-border bg-bg-muted",
});

function ReviewFeedbackHeader({ children }: { children?: ReactNode }) {
  const { actions } = useReview();

  return (
    <div className={feedbackHeader()}>
      {children}
      <span className="flex-1" />
      <button type="button" onClick={actions.clearSelection} className="p-0.5 hover:bg-bg">
        <X className="size-3 text-text-muted" />
      </button>
    </div>
  );
}

function ReviewFeedbackLocation() {
  const { state } = useReview();
  if (!state.selection) return null;

  const { filePath, range } = state.selection;
  const lineText = range.end !== range.start ? `L${range.start}-${range.end}` : `L${range.start}`;

  return (
    <span className="text-xs font-mono text-text-muted">
      {filePath} {lineText}
    </span>
  );
}

const Review = {
  Provider: ReviewProvider,
  Frame: ReviewFrame,
  Empty: ReviewEmpty,
  DiffList: ReviewDiffList,
  DiffItem: ReviewDiffItem,
  Diff: ReviewDiff,
  FileHeader: ReviewFileHeader,
  FileHeaderIcon: ReviewFileHeaderIcon,
  FileHeaderLabel: ReviewFileHeaderLabel,
  FileHeaderDismiss: ReviewFileHeaderDismiss,
  Feedback: ReviewFeedback,
  FeedbackHeader: ReviewFeedbackHeader,
  FeedbackLocation: ReviewFeedbackLocation,
};

export { Review, useReview, type ReviewableFile, type LineSelection, type FileChangeType };
