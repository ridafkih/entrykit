"use client";

import { createContext, use, type ReactNode } from "react";

interface QuestionContextValue {
  reply: (callId: string, answers: string[][]) => Promise<void>;
  reject: (callId: string) => Promise<void>;
  isSubmitting: boolean;
}

const QuestionContext = createContext<QuestionContextValue | null>(null);

interface QuestionProviderProps {
  children: ReactNode;
  onReply: (callId: string, answers: string[][]) => Promise<void>;
  onReject: (callId: string) => Promise<void>;
  isSubmitting: boolean;
}

function QuestionProvider({ children, onReply, onReject, isSubmitting }: QuestionProviderProps) {
  return (
    <QuestionContext value={{ reply: onReply, reject: onReject, isSubmitting }}>
      {children}
    </QuestionContext>
  );
}

function useQuestionActions() {
  const context = use(QuestionContext);
  return context;
}

export { QuestionProvider, useQuestionActions };
