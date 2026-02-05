import type { ImageAnalyzerContext } from "@lab/subagents/vision";

// Lazily created ImageAnalyzerContext singleton (promise-based to prevent race conditions)
let visionContextPromise: Promise<ImageAnalyzerContext | undefined> | null = null;

export function getVisionContext(): Promise<ImageAnalyzerContext | undefined> {
  if (visionContextPromise) return visionContextPromise;
  visionContextPromise = (async () => {
    try {
      const { createVisionContextFromEnv } = await import("@lab/subagents/vision");
      const ctx = createVisionContextFromEnv();
      if (ctx) {
        console.log("[ChatOrchestrator] VisionContext initialized for image analysis");
      } else {
        console.log("[ChatOrchestrator] No vision API key configured, analyzeImage tool disabled");
      }
      return ctx;
    } catch (error) {
      console.warn("[ChatOrchestrator] Failed to initialize VisionContext:", error);
      return undefined;
    }
  })();
  return visionContextPromise;
}
