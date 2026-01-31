import { tv } from "tailwind-variants";
import { useAppView, type AppViewType } from "./app-view";

const nav = tv({
  slots: {
    root: "flex gap-4 px-3 py-2 whitespace-nowrap font-medium border-b border-neutral-200",
    link: "text-text-secondary hover:text-text cursor-pointer",
  },
  variants: {
    active: {
      true: {
        link: "text-text",
      },
    },
  },
});

type NavItem = {
  label: string;
  href: string;
  view?: AppViewType;
};

type NavProps = {
  items: NavItem[];
  activeHref?: string;
};

export function Nav({ items, activeHref }: NavProps) {
  const styles = nav();
  const { view, setView } = useAppView();

  const getIsActive = (item: NavItem) => {
    if (item.view) {
      return view === item.view;
    }
    return activeHref === item.href;
  };

  const handleClick = (item: NavItem) => {
    if (item.view) {
      setView(item.view);
    }
  };

  return (
    <nav className={styles.root()}>
      {items.map((item) => (
        <span
          key={item.href}
          onClick={() => handleClick(item)}
          className={nav({ active: getIsActive(item) }).link()}
        >
          {item.label}
        </span>
      ))}
    </nav>
  );
}
