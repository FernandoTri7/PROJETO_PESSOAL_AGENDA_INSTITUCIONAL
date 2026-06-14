import { useEffect, useState } from 'react';
import { Slot, router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { loadToken, clearToken } from '../../src/api';
import { loadPrefs, isAdmin, getMe, getPrefs, savePrefs } from '../../src/prefs';
import { requestNotificationPermission } from '../../src/notifications';
import { injectWebCss } from '../../src/webCss';
import { AgendaLockup } from '../../src/brand';
import { brand } from '../../src/theme';

const ROLE_LABEL_PT: Record<string, string> = { GESTOR: 'Gestor', ADMIN: 'Admin', MEMBRO: 'Membro', VISITANTE: 'Visitante' };
const menuItemStyle: any = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: '#0F2A4A', textAlign: 'left' };

// Cabeçalho do usuário (avatar + nome + papel) com menu, e o sino de notificações.
function UserMenu({ me, onLogout }: { me: any; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const [notif, setNotif] = useState(getPrefs().notificationsEnabled);

  async function toggleNotif() {
    if (!notif) {
      const ok = await requestNotificationPermission();
      if (!ok) { alert('Permissão de notificação negada pelo navegador.'); return; }
    }
    const p = await savePrefs({ notificationsEnabled: !notif });
    setNotif(p.notificationsEnabled);
  }

  const name = me?.name || me?.email || 'Usuário';
  const initial = String(name).trim().charAt(0).toUpperCase() || '?';
  const role = ROLE_LABEL_PT[me?.role] || me?.role || '';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
      <button
        onClick={toggleNotif}
        title={notif ? 'Notificações ativadas (clique para desativar)' : 'Ativar notificações'}
        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,.85)', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center' }}
      >
        <Ionicons name={notif ? 'notifications' : 'notifications-outline'} size={20} />
      </button>

      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', padding: '4px 6px', borderRadius: 8 }}
      >
        <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#F4C77E', color: '#5a3d00', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initial}</span>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
          {role ? <span style={{ fontSize: 11, color: 'rgba(255,255,255,.65)' }}>{role}</span> : null}
        </span>
        <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,.7)" />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#fff', borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,.22)', minWidth: 220, zIndex: 50, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #eef0f2' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0F2A4A' }}>{name}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{me?.email}</div>
              {role ? <div style={{ marginTop: 4, fontSize: 11, color: '#0F5C5E', fontWeight: 700 }}>{role}</div> : null}
            </div>
            <button onClick={() => { setOpen(false); toggleNotif(); }} style={menuItemStyle}>
              <Ionicons name={notif ? 'notifications-off-outline' : 'notifications-outline'} size={16} />
              {notif ? 'Desativar notificações' : 'Ativar notificações'}
            </button>
            <button onClick={() => { setOpen(false); onLogout(); }} style={{ ...menuItemStyle, color: '#dc2626' }}>
              <Ionicons name="log-out-outline" size={16} />
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const TABS = [
  { path: '/',           icon: 'calendar-outline',  label: 'Agenda' },
  { path: '/tasks',      icon: 'checkbox-outline',  label: 'Tarefas' },
  { path: '/birthdays',  icon: 'gift-outline',      label: 'Aniversários' },
  { path: '/sessions',   icon: 'leaf-outline',      label: 'Sessões' },
  { path: '/more',       icon: 'settings-outline',  label: 'Mais' },
] as const;

// Itens só para GESTOR/ADMIN.
const ADMIN_TAB = { path: '/acessos', icon: 'shield-checkmark-outline', label: 'Usuários e acessos' } as const;
const ASSOCIADOS_TAB = { path: '/associados', icon: 'people-outline', label: 'Associados' } as const;

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
  const [admin, setAdmin] = useState(false);
  const [me, setMe] = useState<any>(getMe());
  const pathname = usePathname();

  useEffect(() => {
    injectWebCss();
    loadToken().then((t) => {
      if (!t) router.replace('/login');
      else { setReady(true); loadPrefs().then((p) => { setUseInstitutional(p.useInstitutional); setAdmin(isAdmin()); setMe(getMe()); }); }
    });
  }, []);

  // Quando o institucional está desligado, a aba e a ação de Sessões somem.
  const baseTabs = TABS.filter((t) => useInstitutional || t.path !== '/sessions');
  // Insere "Associados" e "Usuários e acessos" antes de "Mais", só para gestor/admin.
  const tabs = admin ? [...baseTabs.slice(0, -1), ASSOCIADOS_TAB, ADMIN_TAB, baseTabs[baseTabs.length - 1]] : baseTabs;
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
          <UserMenu me={me} onLogout={logout} />
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
