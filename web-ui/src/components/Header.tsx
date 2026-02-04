interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

/**
 * Minimal header with logo and sidebar toggle.
 */
export function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  return (
    <header className="header">
      <h1 className="text-lg font-semibold tracking-tight">SortForge</h1>

      <div className="flex items-center gap-1">
        <button
          onClick={() =>
            window.open("https://github.com/kototok903/sort-forge", "_blank")
          }
          className="btn btn-ghost btn-icon"
          title="GitHub"
          aria-label="GitHub"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        </button>

        <button
          onClick={onToggleSidebar}
          className="btn btn-ghost btn-icon"
          title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {sidebarOpen ? (
              // Sidebar open icon
              <>
                <rect x="2" y="2" width="12" height="12" rx="2" />
                <line x1="10" y1="2" x2="10" y2="14" />
                <polyline points="6,6 8,8 6,10" />
              </>
            ) : (
              // Sidebar closed icon
              <>
                <rect x="2" y="2" width="12" height="12" rx="2" />
                <line x1="10" y1="2" x2="10" y2="14" />
                <polyline points="8,6 6,8 8,10" />
              </>
            )}
          </svg>
        </button>
      </div>
    </header>
  );
}
