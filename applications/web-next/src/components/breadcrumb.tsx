import type { ReactNode } from "react";

function BreadcrumbRoot({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-1">{children}</div>;
}

function BreadcrumbItem({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  const className = muted
    ? "text-text-muted italic text-nowrap overflow-x-hidden truncate"
    : "text-text font-medium text-nowrap overflow-x-hidden truncate";

  return <span className={className}>{children}</span>;
}

function BreadcrumbMutedItem({ children }: { children: ReactNode }) {
  return <span className="text-text-muted text-nowrap overflow-x-hidden truncate">{children}</span>;
}

function BreadcrumbSeparator() {
  return <span className="text-text-muted">/</span>;
}

const Breadcrumb = {
  Root: BreadcrumbRoot,
  Item: BreadcrumbItem,
  MutedItem: BreadcrumbMutedItem,
  Separator: BreadcrumbSeparator,
};

export { Breadcrumb };
