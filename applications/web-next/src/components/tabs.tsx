"use client";

import { createContext, use, useState, type ReactNode } from "react";
import { tv } from "tailwind-variants";

type TabsContextValue<T extends string = string> = {
  state: { active: T };
  actions: { setActive: (tab: T) => void };
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs<T extends string = string>() {
  const context = use(TabsContext) as TabsContextValue<T> | null;
  if (!context) {
    throw new Error("Tabs components must be used within Tabs.Root");
  }
  return context;
}

function TabsRoot<T extends string>({
  children,
  defaultTab,
}: {
  children: ReactNode;
  defaultTab: T;
}) {
  const [active, setActive] = useState<T>(defaultTab);

  return (
    <TabsContext
      value={{ state: { active }, actions: { setActive: setActive as (tab: string) => void } }}
    >
      {children}
    </TabsContext>
  );
}

function TabsList({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-px px-0 border-b border-border">{children}</div>;
}

const tab = tv({
  base: "px-2 py-1 text-xs cursor-pointer border-b",
  variants: {
    active: {
      true: "text-text border-text",
      false: "text-text-muted border-transparent hover:text-text-secondary",
    },
  },
});

function TabsTab<T extends string>({ value, children }: { value: T; children: ReactNode }) {
  const { state, actions } = useTabs<T>();
  const isActive = state.active === value;

  return (
    <div className="px-1">
      <button
        type="button"
        onClick={() => actions.setActive(value)}
        className={tab({ active: isActive })}
      >
        {children}
      </button>
    </div>
  );
}

function TabsContent<T extends string>({ value, children }: { value: T; children: ReactNode }) {
  const { state } = useTabs<T>();
  if (state.active !== value) return null;
  return <>{children}</>;
}

const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Tab: TabsTab,
  Content: TabsContent,
};

export { Tabs, useTabs };
