import { useEffect, useState } from 'react';
import { Slot, router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { loadToken, clearToken } from '../../src/api';
import { loadPrefs } from '../../src/prefs';
import { injectWebCss } from '../../src/webCss';
import { AgendaLockup } from '../../src/brand';
import { brand } from '../../src/theme';

const TABS = [
  { path: '/',           icon: 'calendar-outline',  label: 'Agenda' },
  { path: '/tasks',      icon: 'checkbox-outline',  label: 'Tarefas' },
  { path: '/birthdays',  icon: 'gift-outline',      label: 'Aniversários' },
  { path: '/sessions',   icon: 'leaf-outline',      label: 'Sessões' },
  { path: '/more',       icon: 'settings-outline',  label: 'Mais' },
] as const;

// Ações de "criar" do sistema — para um novo cadastro, adicione um item aqui.
// Cada ação navega para a rota com ?new=<ts>; a tela abre seu modal ao detectar o param.
const CREATE_ACTIONS = [
  { label: 'Novo evento',      icon: 'calendar-outline', route: '/' },
  { label: 'Nova tarefa',      icon: 'checkbox-outline', route: '/tasks' },
  { label: 'Novo aniversário', icon: 'gift-outline',     route: '/birthdays' },
  { label: 'Nova sessão',      icon: 'leaf-outline',     route: '/sessions' },
] as const;

function WebSpeedDial({ actions }: { actions: readonly { label: string; icon: string; route: string }[] }) {
  const [open, setOpen] = useState(false);

  function go(route: string) {
    setOpen(false);
    router.push({ pathname: route as any, params: { new: String(Date.now()) } });
  }

  return (
    <>
      {open && <div className="sd-backdrop" onClick={() => setOpen(false)} />}
      <div className="sd-wrap">
        {open && (
          <div className="sd-actions">
            {actions.map(a => (
              <div key={a.label} className="sd-item" onClick={() => go(a.route)}>
                <span className="sd-label">{a.label}</span>
                <button className="sd-btn" aria-label={a.label}><Ionicons name={a.icon as any} size={20} /></button>
              </div>
            ))}
          </div>
        )}
        <button
          className={`sd-fab${open ? ' open' : ''}`}
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Fechar' : 'Criar'}
          aria-expanded={open}
          title="Criar"
        >＋</button>
      </div>
    </>
  );
}

export default function WebLayout() {
  const [ready, setReady] = useState(false);
  const [useInstitutional, setUseInstitutional] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    injectWebCss();
    loadToken().then((t) => {
      if (!t) router.replace('/login');
      else { setReady(true); loadPrefs().then((p) => setUseInstitutional(p.useInstitutional)); }
    });
  }, []);

  // Quando o institucional está desligado, a aba e a ação de Sessões somem.
  const tabs = TABS.filter((t) => useInstitutional || t.path !== '/sessions');
  const createActions = CREATE_ACTIONS.filter((a) => useInstitutional || a.route !== '/sessions');

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: brand.teal, color: 'white', fontFamily: 'DM Sans, sans-serif', fontSize: 16 }}>
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
        <span className="topbar-brand"><AgendaLockup markSize={32} wordColor="#FFFFFF" accent={brand.orange} /></span>
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
          {tabs.map(t => (
            <div
              key={t.path}
              className={`nav-item${isActive(t.path) ? ' active' : ''}`}
              onClick={() => router.push(t.path as any)}
            >
              <span className="nav-icon"><Ionicons name={t.icon as any} size={18} /></span>
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
        {tabs.map(t => (
          <button
            key={t.path}
            className={`mob-tab${isActive(t.path) ? ' active' : ''}`}
            onClick={() => router.push(t.path as any)}
          >
            <span className="mob-tab-icon"><Ionicons name={t.icon as any} size={20} /></span>
            {t.label}
          </button>
        ))}
      </div>

      {/* FAB global de criação — visível em todos os módulos */}
      <WebSpeedDial actions={createActions} />
    </div>
  );
}
