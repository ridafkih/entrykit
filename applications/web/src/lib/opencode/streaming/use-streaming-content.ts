"use client";

import { useState, useCallback } from "react";

interface UseStreamingContentResult {
  content: string | null;
  appendDelta: (delta: string) => void;
  reset: () => void;
}

export function useStreamingContent(): UseStreamingContentResult {
  const [content, setContent] = useState<string | null>(null);

  const appendDelta = useCallback((delta: string) => {
    setContent((prev) => (prev ?? "") + delta);
  }, []);

  const reset = useCallback(() => {
    setContent(null);
  }, []);

  return {
    content,
    appendDelta,
    reset,
  };
}
