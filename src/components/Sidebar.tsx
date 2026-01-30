import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Översikt', icon: HomeIcon },
  { to: '/transactions', label: 'Verifikationer', icon: DocumentIcon },
  { to: '/invoices', label: 'Fakturor', icon: InvoiceIcon },
  { to: '/customers', label: 'Kunder', icon: UsersIcon },
  { to: '/suppliers', label: 'Leverantörer', icon: TruckIcon },
  { to: '/accounts', label: 'Kontoplan', icon: ListIcon },
  { to: '/reports', label: 'Rapporter', icon: ChartIcon },
];

function Sidebar() {
  return (
    <div className="w-72 glass flex flex-col border-r border-dark-700/50">
      <div className="drag-region h-14 flex items-end px-6 pb-3">
        <div className="no-drag flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-pink flex items-center justify-center">
            <span className="text-white font-bold text-sm">AJ</span>
          </div>
          <h1 className="text-xl font-semibold text-white">Bokföring</h1>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 no-drag ${
                isActive
                  ? 'bg-gradient-to-r from-primary-600/20 to-primary-500/10 text-white border border-primary-500/30 shadow-lg shadow-primary-500/10'
                  : 'text-dark-300 hover:text-white hover:bg-dark-700/50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-2 rounded-lg mr-3 transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'bg-dark-700/50 text-dark-400 group-hover:text-primary-400 group-hover:bg-primary-500/10'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                {label}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mx-4 mb-4 rounded-xl bg-gradient-to-r from-primary-600/10 to-accent-cyan/10 border border-primary-500/20">
        <p className="text-xs text-dark-300">AJ Bokföring</p>
        <p className="text-xs text-dark-500 mt-1">Version 1.0.0</p>
      </div>
    </div>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function InvoiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h1m6-11v11m0-11h4l4 4v7a2 2 0 01-2 2h-1m-6-11h4m-2 11a2 2 0 11-4 0m6 0a2 2 0 11-4 0" />
    </svg>
  );
}

export default Sidebar;
