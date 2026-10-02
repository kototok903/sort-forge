import { PanelRightCloseIcon, PanelRightOpenIcon } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { useSidebar } from "@/components/ui/sidebar";

export function Header() {
  const { isMobile, open, openMobile, toggleSidebar } = useSidebar();
  const expanded = isMobile ? openMobile : open;
  return (
    <header className="flex h-10 shrink-0 items-center justify-between gap-3 border-b bg-card px-3">
      <h1 className="text-lg font-semibold tracking-tight">SortForge</h1>
      <div className="flex items-center gap-1">
        <ActionButton
          label="GitHub"
          variant="ghost"
          size="icon-sm"
          render={
            <a
              href="https://github.com/kototok903/sort-forge"
              target="_blank"
              rel="noopener noreferrer"
            />
          }
          nativeButton={false}
          role="link"
        >
          <svg
            data-icon="inline-start"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        </ActionButton>
        <ActionButton
          label={expanded ? "Hide settings" : "Show settings"}
          variant="ghost"
          size="icon-sm"
          aria-expanded={expanded}
          aria-controls="sort-settings"
          onClick={toggleSidebar}
        >
          {expanded ? (
            <PanelRightCloseIcon data-icon="inline-start" />
          ) : (
            <PanelRightOpenIcon data-icon="inline-start" />
          )}
        </ActionButton>
      </div>
    </header>
  );
}
