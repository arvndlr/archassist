import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = {
  student: [
    { to: '/projects/new', label: 'New analysis', match: (p) => p.startsWith('/projects') || p.startsWith('/reports') },
    { to: '/history', label: 'History', match: (p) => p.startsWith('/history') },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', match: (p) => p === '/admin' },
    { to: '/admin/knowledge', label: 'Knowledge base', match: (p) => p.startsWith('/admin/knowledge') },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const items = NAV[user.role] ?? NAV.student;
  const shortName = (() => {
    const parts = user.name.trim().split(/\s+/);
    return parts.length > 1 ? `${parts[0][0]}. ${parts[parts.length - 1]}` : parts[0];
  })();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-20 border-b-2 border-ink bg-paper">
        <div className="mx-auto flex h-[58px] w-full max-w-[1236px] items-stretch justify-between gap-6 px-4 md:px-7">
          <div className="flex items-center gap-4 md:gap-8">
            <span className="text-base leading-none font-extrabold tracking-[-.02em]">ARCHASSIST</span>
            <nav className="flex items-stretch self-stretch">
              {items.map((item) => {
                const active = item.match(pathname);
                return (
                  <NavLink key={item.to} to={item.to}
                    className={`flex items-center border-b-[3px] px-2.5 text-[13px] leading-none no-underline md:px-3.5 ${
                      active ? 'border-accent font-extrabold text-ink hover:text-ink' : 'border-transparent font-semibold text-muted hover:text-ink'
                    }`}>
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-[10px] leading-none tracking-[.12em] uppercase text-muted sm:inline">
              {user.role === 'admin' ? 'Admin · Knowledge base' : `Student · ${shortName}`}
            </span>
            <span className="hidden h-[22px] w-0.5 bg-rule sm:block" />
            <button onClick={logout}
              className="cursor-pointer border-0 bg-transparent px-1 py-2 text-xs text-muted underline underline-offset-[3px] hover:text-accent">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col"><Outlet /></main>
    </div>
  );
}
