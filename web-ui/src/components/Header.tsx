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
      <h1 className="text-lg font-semibold tracking-tight">
        SortForge
      </h1>

      <button
        onClick={onToggleSidebar}
        className="btn btn-ghost btn-icon"
        title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
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
    </header>
  );
}
