import type { WorkspaceTab } from '../dsp/types';

interface HeaderBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  isRunning: boolean;
  onToggleRunning: () => void;
}

const NAV_ITEMS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'workbench', label: 'Workbench' },
  { id: 'tutorials', label: 'Tutorials' },
  { id: 'methods', label: 'Methods' },
  { id: 'cybersecurity', label: 'Security' },
  { id: 'formulae', label: 'Formulae' },
  { id: 'cheatsheet', label: 'Cheatsheet' },
];

export function HeaderBar({
  activeTab,
  onSelectTab,
  isRunning,
  onToggleRunning,
}: HeaderBarProps) {
  return (
    <header className="border-b border-slate-800 bg-[#0B0F17] px-4 sm:px-6">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-8 sm:h-14 sm:flex-nowrap">
        <a
          href="#workbench"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('workbench');
          }}
          className="py-3 sm:py-0 text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          SpectraLab SDR
        </a>

        <div className="order-2 sm:order-3 shrink-0">
          <button
            type="button"
            onClick={onToggleRunning}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
              isRunning
                ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25'
                : 'border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
            }`}
          >
            {isRunning ? 'Pause Stream' : 'Resume Stream'}
          </button>
        </div>

        <nav
          aria-label="Primary workspace navigation"
          className="order-3 sm:order-2 flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2.5 sm:gap-6 border-t border-slate-800/80 sm:border-t-0 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-2.5 sm:py-4 text-[11px] sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  isActive
                    ? 'text-cyan-300'
                    : 'text-slate-300 hover:text-slate-100'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-cyan-400"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
