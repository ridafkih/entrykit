"use client";

import { createContext, use, useState, type ReactNode } from "react";

type AppView = "projects" | "settings";

type AppViewContextValue = {
  view: AppView;
  setView: (view: AppView) => void;
};

const AppViewContext = createContext<AppViewContextValue | null>(null);

function useAppView() {
  const context = use(AppViewContext);
  if (!context) {
    throw new Error("useAppView must be used within AppView.Provider");
  }
  return context;
}

function AppViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AppView>("projects");

  return <AppViewContext value={{ view, setView }}>{children}</AppViewContext>;
}

const AppView = {
  Provider: AppViewProvider,
};

export { AppView, useAppView, type AppView as AppViewType };
