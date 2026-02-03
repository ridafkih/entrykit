"use client";

import { createContext, use, useState, type ReactNode } from "react";
import { tv } from "tailwind-variants";
import { cn } from "@/lib/cn";

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

type TabsRootProps<T extends string> =
  | { children: ReactNode; defaultTab: T; active?: never; onActiveChange?: never }
  | { children: ReactNode; active: T; onActiveChange: (tab: T) => void; defaultTab?: never };

function TabsRoot<T extends string>(props: TabsRootProps<T>) {
  const { children } = props;
  const isControlled = "active" in props && props.active !== undefined;

  const [internalActive, setInternalActive] = useState<T>(
    isControlled ? props.active : props.defaultTab!,
  );

  const active = isControlled ? props.active : internalActive;
  const setActive = isControlled
    ? (props.onActiveChange as (tab: T) => void)
    : setInternalActive;

  return (
    <TabsContext
      value={{ state: { active }, actions: { setActive: setActive as (tab: string) => void } }}
    >
      {children}
    </TabsContext>
  );
}

function TabsList({ children, grow }: { children: ReactNode; grow?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-px px-0 border-b border-border",
        grow && "*:flex-1",
      )}
    >
      {children}
    </div>
  );
}

const tab = tv({
  base: "px-2 py-1 text-xs cursor-pointer border-b max-w-full",
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
    <div className="px-1 min-w-0">
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
