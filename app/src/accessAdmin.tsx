// Seção de administração de acessos (identidade central) — web.
// Só é renderizada para quem é elevado (GESTOR/ADMIN) no projeto.
// Lista "Meus projetos", gerencia vínculos do projeto selecionado (papel, ativo),
// habilita pessoas por e-mail e transfere a gestão. Endpoints em /api/projects.
import { useEffect, useState } from 'react';
import { api } from './api';
import { getMe, loadPrefs } from './prefs';
import { titleCaseNome } from './format';

type Project = { key: string; name: string; role: string; isOwner: boolean };
type Associado = { id: string; nome: string; grau?: string | null };
type Member = {
  userId: string;
  role: string;
  active: boolean;
  user?: { id: string; name: string; email: string; kind: string };
  associadoId?: string | null;
  associado?: Associado | null;
};

// Busca/seleção de um Associado da base (somente leitura do cadastro). Usado para vincular ao usuário.
function AssociadoLink({ value, onPick, disabled }: { value?: Associado | null; onPick: (a: Associado | null) => void; disabled?: boolean }) {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState<Associado[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const t = setTimeout(async () => {
      const params = new URLSearchParams({ ativo: 'true', pageSize: '20' });
      if (q.trim()) params.set('q', q.trim());
      try { const list = await api(`/associados?${params.toString()}`); if (alive) setOpts(list || []); }
      catch { if (alive) setOpts([]); }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q, open]);

  if (value) {
    return (
      <span className="pill" style={{ background: '#0F5C2E18', color: '#0F5C2E', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
        {titleCaseNome(value.nome)}{value.grau ? ` · ${value.grau}` : ''}
        {!disabled && <span style={{ cursor: 'pointer', fontWeight: 700 }} title="Desvincular" onClick={() => onPick(null)}>✕</span>}
      </span>
    );
  }
  return (
    <div style={{ position: 'relative', width: 200 }}>
      <input
        className="form-input" style={{ height: 34, padding: '4px 8px' }}
        value={q} placeholder="Vincular associado…" disabled={disabled}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && opts.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 6px 20px rgba(0,0,0,.12)' }}>
          {opts.map((a) => (
            <div key={a.id} onMouseDown={() => { onPick(a); setQ(''); setOpen(false); }}
                 style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}
                 onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                 onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>
              <span>{titleCaseNome(a.nome)}</span>
              {a.grau && <span style={{ color: 'var(--muted)', fontSize: 11 }}>{a.grau}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ASSIGNABLE = ['VISITANTE', 'MEMBRO', 'ADMIN']; // GESTOR só por transferência
const ROLE_LABEL: Record<string, string> = {
  GESTOR: 'Gestor', ADMIN: 'Admin', MEMBRO: 'Membro', VISITANTE: 'Visitante',
};
const KIND_LABEL: Record<string, string> = { FUNCIONARIO: 'Funcionário', FAMILIAR: 'Familiar' };

export function AccessAdmin() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selKey, setSelKey] = useState('agenda');
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [meId, setMeId] = useState<string | null>(getMe()?.id || null);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState('MEMBRO');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Projetos em que sou elevado (posso gerenciar).
  const manageable = projects.filter((p) => p.role === 'GESTOR' || p.role === 'ADMIN');
  const selProject = projects.find((p) => p.key === selKey);
  const iAmOwner = !!(meId && ownerUserId === meId);

  async function loadProjects() {
    const me = getMe() || (await loadPrefs(), getMe());
    setMeId(me?.id || null);
    const list: Project[] = await api('/projects');
    setProjects(list);
    // Garante uma seleção válida (algum projeto gerenciável).
    const mng = list.filter((p) => p.role === 'GESTOR' || p.role === 'ADMIN');
    if (mng.length && !mng.some((p) => p.key === selKey)) setSelKey(mng[0].key);
  }

  // Não limpa msg/erro aqui: é chamada logo após operações (run) para recarregar a lista
  // sem apagar a confirmação recém-exibida. A limpeza acontece na troca de projeto (efeito abaixo).
  async function loadMembers(key: string) {
    try {
      const data = await api(`/projects/${key}/members`);
      setOwnerUserId(data.ownerUserId);
      setMembers(data.members);
    } catch (e: any) {
      setMembers([]); setOwnerUserId(null); setError(e.message);
    }
  }

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { setMsg(''); setError(''); if (selKey) loadMembers(selKey); }, [selKey]);

  async function run(fn: () => Promise<any>, okMsg: string) {
    setLoading(true); setError(''); setMsg('');
    try { await fn(); setMsg(okMsg); await loadMembers(selKey); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function changeRole(m: Member, role: string) {
    run(() => api(`/projects/${selKey}/members/${m.userId}`, { method: 'PATCH', body: { role } }),
      `Papel de ${m.user?.email} atualizado para ${ROLE_LABEL[role]}.`);
  }
  function toggleActive(m: Member) {
    const active = !m.active;
    run(() => api(`/projects/${selKey}/members/${m.userId}`, { method: 'PATCH', body: { active } }),
      `${m.user?.email} ${active ? 'habilitado' : 'desabilitado'} no projeto.`);
  }
  function setAssociado(m: Member, a: Associado | null) {
    run(() => api(`/projects/${selKey}/members/${m.userId}`, { method: 'PATCH', body: { associadoId: a ? a.id : null } }),
      a ? `${m.user?.email} vinculado ao associado ${titleCaseNome(a.nome)}.` : `Vínculo de associado removido de ${m.user?.email}.`);
  }
  function addMember() {
    if (!addEmail.trim()) { setError('Informe o e-mail da pessoa.'); return; }
    run(async () => {
      await api(`/projects/${selKey}/members`, { method: 'POST', body: { email: addEmail.trim(), role: addRole } });
      setAddEmail('');
    }, `Pessoa habilitada no projeto.`);
  }
  async function transfer(m: Member) {
    if (!confirm(`Transferir a GESTÃO de "${selProject?.name}" para ${m.user?.email}?\n\nVocê passa a ser ADMIN. Esta ação só pode ser desfeita por uma nova transferência.`)) return;
    await run(async () => {
      await api(`/projects/${selKey}/transfer-ownership`, { method: 'POST', body: { userId: m.userId } });
      await loadProjects();
      await loadPrefs(); // meu papel mudou — atualiza o cache do app
    }, `Gestão transferida para ${m.user?.email}.`);
  }

  return (
    <>
      {/* Meus projetos */}
      <div className="section-label">Meus projetos</div>
      <div className="card" style={{ marginBottom: 24 }}>
        {projects.length === 0
          ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhum projeto.</div>
          : <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {projects.map((p) => (
                <span key={p.key} className="pill" style={{ background: '#0F5C5E18', color: '#0F5C5E', fontSize: 12, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  {p.name}
                  <strong style={{ fontWeight: 700 }}>{ROLE_LABEL[p.role] || p.role}</strong>
                  {p.isOwner && <span title="Você é o gestor">⭐</span>}
                </span>
              ))}
            </div>
        }
      </div>

      {/* Usuários e acessos */}
      <div className="section-label">Usuários e acessos</div>
      <div className="card" style={{ marginBottom: 24 }}>
        {manageable.length === 0
          ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>Você não administra nenhum projeto.</div>
          : <>
            {/* Seletor só aparece quando há mais de um projeto para gerenciar. */}
            {manageable.length > 1 && (
              <div className="form-row" style={{ alignItems: 'flex-end', marginBottom: 8 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Projeto</label>
                  <select className="form-select" value={selKey} onChange={(e) => setSelKey(e.target.value)}>
                    {manageable.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {error && <div className="form-error">{error}</div>}
            {msg && <div className="form-hint" style={{ color: '#0F5C2E', marginBottom: 8 }}>{msg}</div>}

            {/* Lista de membros */}
            {members.map((m) => {
              const isOwner = m.userId === ownerUserId;
              return (
                <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {m.user?.name || m.user?.email}
                      {isOwner && <span title="Gestor" style={{ marginLeft: 6 }}>⭐</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {m.user?.email} · {KIND_LABEL[m.user?.kind || ''] || m.user?.kind}
                    </div>
                  </div>

                  <AssociadoLink value={m.associado} disabled={loading} onPick={(a) => setAssociado(m, a)} />

                  {isOwner
                    ? <span className="pill" style={{ background: '#C8901A22', color: '#9A6B00', fontSize: 11 }}>Gestor</span>
                    : <>
                        <select
                          className="form-select"
                          style={{ width: 130, height: 34, padding: '4px 8px' }}
                          value={ASSIGNABLE.includes(m.role) ? m.role : 'MEMBRO'}
                          disabled={loading}
                          onChange={(e) => changeRole(m, e.target.value)}
                          title="Papel no projeto"
                        >
                          {ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                        </select>
                        <button
                          className={`btn btn-sm ${m.active ? 'btn-outline' : 'btn-primary'}`}
                          disabled={loading}
                          onClick={() => toggleActive(m)}
                          title={m.active ? 'Remover acesso a este projeto' : 'Habilitar neste projeto'}
                        >{m.active ? 'Desabilitar' : 'Habilitar'}</button>
                        {iAmOwner && m.active && (
                          <button className="btn btn-ghost btn-sm" disabled={loading} onClick={() => transfer(m)} title="Transferir a gestão para esta pessoa">
                            Tornar gestor
                          </button>
                        )}
                      </>
                  }
                  {!m.active && <span className="pill" style={{ background: '#9993', color: 'var(--muted)', fontSize: 10 }}>inativo</span>}
                </div>
              );
            })}

            {/* Adicionar pessoa existente */}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 12 }}>
              <div className="form-row" style={{ alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Habilitar pessoa (e-mail de quem já tem cadastro)</label>
                  <input className="form-input" type="email" value={addEmail} placeholder="pessoa@tri7.com.br" onChange={(e) => setAddEmail(e.target.value)} />
                </div>
                <div className="form-group" style={{ width: 140 }}>
                  <label className="form-label">Papel</label>
                  <select className="form-select" value={addRole} onChange={(e) => setAddRole(e.target.value)}>
                    {ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </div>
                <button className="btn btn-primary btn-sm" disabled={loading} onClick={addMember} style={{ marginBottom: 16 }}>Habilitar</button>
              </div>
              <div className="form-hint">A pessoa precisa já ter conta (cadastro na tela de login). Aqui você dá acesso a este projeto.</div>
            </div>
          </>
        }
      </div>
    </>
  );
}
