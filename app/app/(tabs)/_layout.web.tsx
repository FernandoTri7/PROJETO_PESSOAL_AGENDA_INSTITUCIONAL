import { useEffect, useState } from 'react';
import { Slot, router, usePathname } from 'expo-router';
import { loadToken, clearToken } from '../../src/api';
import { injectWebCss } from '../../src/webCss';

const TABS = [
  { path: '/',           icon: '📅', label: 'Agenda' },
  { path: '/tasks',      icon: '✅', label: 'Tarefas' },
  { path: '/birthdays',  icon: '🎂', label: 'Aniversários' },
  { path: '/sessions',   icon: '🌿', label: 'Sessões' },
  { path: '/more',       icon: '⚙️', label: 'Mais' },
];

export default function WebLayout() {
  const [ready, setReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    injectWebCss();
    loadToken().then((t) => {
      if (!t) router.replace('/login');
      else setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0F2A4A', color: 'white', fontFamily: 'DM Sans, sans-serif', fontSize: 16 }}>
        Carregando...
      </div>
    );
  }

  async function logout() {
    await clearToken();
    router.replace('/login');
  }

  function isActive(path: string) {
    if (path === '/') return pathname === '/' || pathname === '';
    return pathname.startsWith(path);
  }

  return (
    <div className="web-shell">
      {/* Topbar */}
      <div className="topbar">
        <span className="topbar-brand">⛩ Agenda Institucional</span>
        <div className="topbar-right">
          <button className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,.7)', fontSize: 12 }} onClick={logout}>
            Sair
          </button>
        </div>
      </div>

      <div className="web-body">
        {/* Sidebar */}
        <nav className="sidebar">
          <div className="nav-section">Principal</div>
          {TABS.map(t => (
            <div
              key={t.path}
              className={`nav-item${isActive(t.path) ? ' active' : ''}`}
              onClick={() => router.push(t.path as any)}
            >
              <span className="nav-icon">{t.icon}</span>
              {t.label}
            </div>
          ))}
          <div className="sidebar-footer">
            <button
              className="btn btn-outline btn-sm"
              style={{ width: '100%', color: 'rgba(255,255,255,.5)', borderColor: 'rgba(255,255,255,.15)', background: 'transparent', justifyContent: 'center' }}
              onClick={logout}
            >
              Sair
            </button>
          </div>
        </nav>

        {/* Main content */}
        <main className="content">
          <Slot />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="mob-tabs">
        {TABS.map(t => (
          <button
            key={t.path}
            className={`mob-tab${isActive(t.path) ? ' active' : ''}`}
            onClick={() => router.push(t.path as any)}
          >
            <span className="mob-tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
