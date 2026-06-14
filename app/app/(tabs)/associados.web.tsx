import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api, apiUpload } from '../../src/api';
import { isAdmin as getIsAdmin, loadPrefs } from '../../src/prefs';
import { mascararCpf } from '../../src/documento';
import { injectWebCss } from '../../src/webCss';

// Detalhe somente-leitura: o cadastro vem da fonte externa (importação); não é editável aqui.
function AssociadoModal({ assoc, onClose }: any) {
  const Row = ({ label, value }: any) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ fontSize: 14, color: 'var(--text)', padding: '4px 0' }}>{value || '—'}</div>
    </div>
  );
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Associado</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <Row label="Nome" value={assoc.nome} />
          <div className="form-row">
            <Row label="Grau" value={assoc.grau} />
            <Row label="CPF" value={assoc.cpf ? mascararCpf(assoc.cpf) : ''} />
          </div>
          <div className="form-row">
            <Row label="Telefone" value={assoc.celular} />
            <Row label="Situação" value={assoc.ativo ? 'Ativo' : 'Inativo'} />
          </div>
          <Row label="E-mail" value={assoc.email} />
          <div className="form-hint">O cadastro é gerenciado pela fonte externa (importação) e não é editável aqui.</div>
        </div>
        <div className="modal-footer">
          <span style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

export default function AssociadosWeb() {
  useEffect(() => { injectWebCss(); }, []);
  const [list, setList] = useState<any[]>([]);
  const [graus, setGraus] = useState<string[]>([]);
  const [counts, setCounts] = useState({ ativos: 0, inativos: 0 });
  const [query, setQuery] = useState('');
  const [grauF, setGrauF] = useState('');
  const [ativoF, setAtivoF] = useState<'true' | 'false'>('true'); // aba: Ativos por padrão
  const [modal, setModal] = useState<any>(null);
  const [admin, setAdmin] = useState(getIsAdmin());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (grauF) params.set('grau', grauF);
      if (ativoF) params.set('ativo', ativoF);
      setList(await api(`/associados?${params}`));
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }
  // Graus distintos + contagens (ativos/inativos) — busca única, sem filtros.
  async function loadMeta() {
    try {
      const all = await api('/associados');
      setGraus([...new Set(all.map((a: any) => a.grau).filter(Boolean) as string[])].sort());
      setCounts({ ativos: all.filter((a: any) => a.ativo).length, inativos: all.filter((a: any) => !a.ativo).length });
    } catch { /* ignora */ }
  }
  useEffect(() => { load(); loadMeta(); loadPrefs().then(() => setAdmin(getIsAdmin())); }, []);
  useEffect(() => { load(); }, [grauF, ativoF]);

  async function onPickFile(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportMsg('');
    try {
      const r = await apiUpload('/associados/import', file);
      setImportMsg(`Importação: ${r.created} novos, ${r.updated} atualizados${r.inativados ? `, ${r.inativados} inativados (ausentes na planilha)` : ''}${r.naoFrequente ? `, ${r.naoFrequente} não-frequentes ignorados` : ''}${r.cpfInvalido ? `, ${r.cpfInvalido} com CPF inválido` : ''} (de ${r.total} linhas).`);
      load(); loadMeta();
    } catch (err: any) { setImportMsg('Falha: ' + err.message); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">👥 Associados</h1>
        {admin && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input ref={fileRef} type="file" accept=".xls,.xlsx,.csv" style={{ display: 'none' }} onChange={onPickFile} />
            <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={importing}>
              <Ionicons name="cloud-upload-outline" size={14} color="#fff" /> {importing ? 'Importando...' : 'Importar planilha'}
            </button>
          </div>
        )}
      </div>

      {importMsg && <div className="card" style={{ marginBottom: 14, padding: 12, borderLeft: '4px solid var(--gold)', fontSize: 13 }}>{importMsg}</div>}

      {/* Abas: Ativos / Inativos (inativos = ausentes na última importação) */}
      <div className="view-tabs" style={{ display: 'inline-flex', marginBottom: 14 }}>
        <button className={`view-tab${ativoF === 'true' ? ' active' : ''}`} onClick={() => setAtivoF('true')}>Ativos ({counts.ativos})</button>
        <button className={`view-tab${ativoF === 'false' ? ' active' : ''}`} onClick={() => setAtivoF('false')}>Inativos ({counts.inativos})</button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <div className="search-wrap" style={{ flex: '1 1 240px' }}>
          <span className="search-icon"><Ionicons name="search-outline" size={16} color="#52606D" /></span>
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Buscar por nome, e-mail ou CPF..." />
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={grauF} onChange={e => setGrauF(e.target.value)}>
          <option value="">Todos os graus</option>
          {graus.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {loading && <div style={{ color: 'var(--muted)', marginBottom: 12, fontSize: 13 }}>Carregando...</div>}

      {list.length === 0 && !loading
        ? <div className="empty"><div className="empty-icon"><Ionicons name="people-outline" size={36} color="#9AA0A6" /></div><div className="empty-text">Nenhum associado. {admin ? 'Importe uma planilha (.xls/.xlsx/.csv).' : ''}</div></div>
        : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="sess-table">
              <thead>
                <tr>
                  <th>Nome</th><th>Grau</th><th style={{ whiteSpace: 'nowrap' }}>CPF</th><th style={{ whiteSpace: 'nowrap' }}>Telefone</th><th>E-mail</th>
                </tr>
              </thead>
              <tbody>
                {list.map(a => (
                  <tr key={a.id} onClick={() => setModal(a)} style={{ opacity: a.ativo ? 1 : 0.55 }}>
                    <td style={{ fontWeight: 600 }}>{a.nome}</td>
                    <td>{a.grau || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{a.cpf ? mascararCpf(a.cpf) : '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{a.celular || '—'}</td>
                    <td>{a.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {modal && <AssociadoModal assoc={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
