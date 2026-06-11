const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}

/* Tokens do design system (teal + laranja). Nomes --navy/--gold mantidos por compatibilidade das classes. */
:root{
  --navy:#0F5C5E;--navy-d:#073C3E;--navy-l:#14706F;
  --gold:#F5A018;--gold-l:#F8B84A;
  --bg:#F5F7F8;--white:#FFFFFF;--border:#DCE2E5;
  --text:#1F2933;--muted:#52606D;--ring:#F5A018;
  --sidebar:240px;--topbar:60px;
}

/* Shell */
.web-shell{display:flex;flex-direction:column;height:100vh;overflow:hidden}
.topbar{height:var(--topbar);background:var(--navy);color:white;display:flex;align-items:center;padding:0 20px;justify-content:space-between;flex-shrink:0;gap:12px}
.topbar-brand{font-family:'DM Sans',sans-serif;font-size:18px;letter-spacing:.4px;white-space:nowrap}
.topbar-right{display:flex;align-items:center;gap:8px}
.web-body{display:flex;flex:1;overflow:hidden}
.sidebar{width:var(--sidebar);background:var(--navy-d);overflow-y:auto;flex-shrink:0;display:flex;flex-direction:column}
.content{flex:1;overflow-y:auto;background:var(--bg)}

/* Nav */
.nav-section{padding:20px 16px 4px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,.3)}
.nav-item{display:flex;align-items:center;gap:12px;padding:11px 16px;color:rgba(255,255,255,.65);text-decoration:none;cursor:pointer;border-left:3px solid transparent;transition:all .2s;font-size:14px;font-weight:500;user-select:none}
.nav-item:hover{background:rgba(255,255,255,.07);color:white}
.nav-item.active{background:rgba(201,149,42,.18);color:var(--gold-l);border-left-color:var(--gold)}
.nav-icon{font-size:17px;width:22px;text-align:center}
.sidebar-footer{margin-top:auto;padding:12px}

/* Page */
.page{padding:24px;max-width:1280px}
.page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}
.page-title{font-family:'DM Sans',sans-serif;font-size:22px;color:var(--navy)}

/* Cards */
.card{background:var(--white);border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,.07);padding:20px}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:24px}
.stat-card{background:var(--white);border-radius:10px;padding:16px 18px;border-left:4px solid var(--navy);box-shadow:0 1px 4px rgba(0,0,0,.07);cursor:default}
.stat-label{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:4px}
.stat-value{font-size:26px;font-weight:700;color:var(--navy)}
.stat-sub{font-size:12px;color:var(--muted);margin-top:2px}

/* Buttons */
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:7px;border:none;cursor:pointer;font-size:13px;font-weight:600;transition:all .15s;font-family:inherit}
.btn-primary{background:var(--navy);color:white}.btn-primary:hover{background:var(--navy-l)}
.btn-gold{background:var(--gold);color:white}.btn-gold:hover{background:var(--gold-l)}
.btn-danger{background:#ef4444;color:white}.btn-danger:hover{background:#dc2626}
.btn-outline{background:transparent;border:1px solid var(--border);color:var(--text)}.btn-outline:hover{background:var(--bg)}
.btn-ghost{background:transparent;border:none;color:var(--muted)}.btn-ghost:hover{color:var(--text);background:var(--bg)}
.btn-sm{padding:5px 11px;font-size:12px}
.fab{position:fixed;bottom:28px;right:28px;width:54px;height:54px;border-radius:50%;background:var(--gold);color:white;font-size:26px;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;transition:transform .15s;z-index:100}
.fab:hover{transform:scale(1.07)}

/* View toggle */
.view-tabs{display:flex;gap:2px;background:#ede9e0;border-radius:8px;padding:3px}
.view-tab{padding:6px 14px;border-radius:6px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:500;color:var(--muted);transition:all .15s;font-family:inherit}
.view-tab.active{background:var(--white);color:var(--navy);box-shadow:0 1px 3px rgba(0,0,0,.1)}

/* Search */
.search-wrap{display:flex;align-items:center;background:var(--white);border:1px solid var(--border);border-radius:8px;padding:0 12px;gap:8px;min-width:220px}
.search-wrap input{border:none;outline:none;background:none;padding:8px 0;font-size:13px;flex:1;font-family:inherit;color:var(--text)}
.search-wrap input::placeholder{color:var(--muted)}

/* Calendar */
.cal-header{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;gap:12px}
.cal-nav-title{font-family:'DM Sans',sans-serif;font-size:20px;color:var(--navy);min-width:180px}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--border);gap:1px}
.cal-wday{background:var(--navy);color:rgba(255,255,255,.8);text-align:center;padding:8px 4px;font-size:11px;font-weight:600;letter-spacing:.5px}
.cal-cell{background:var(--white);min-height:86px;padding:6px;cursor:pointer;transition:background .1s;vertical-align:top}
.cal-cell:hover{background:#faf9f6}
.cal-cell.selected{background:#eef2ff}
.cal-cell.other-month{background:#f9f8f4;opacity:.65}
.cal-cell.today .day-num{background:var(--navy);color:white;border-radius:50%;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-size:12px}
.day-num{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;font-size:12px;font-weight:500;color:var(--text)}
.day-evs{margin-top:3px;display:flex;flex-direction:column;gap:1px}
.day-ev{font-size:10px;padding:1px 5px;border-radius:3px;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:15px}
.day-more{font-size:9px;color:var(--muted);padding-left:4px;margin-top:1px}

/* Event list items */
.ev-list{display:flex;flex-direction:column;gap:6px}
.ev-item{display:flex;gap:10px;background:var(--white);border-radius:8px;padding:11px 14px;cursor:pointer;transition:box-shadow .15s;align-items:center}
.ev-item:hover{box-shadow:0 2px 8px rgba(0,0,0,.09)}
.ev-bar{width:4px;min-width:4px;border-radius:2px;align-self:stretch}
.ev-info{flex:1;min-width:0}
.ev-title{font-weight:600;font-size:14px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ev-meta{font-size:12px;color:var(--muted);margin-top:2px}
.ev-cat{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;margin-left:6px;vertical-align:middle}

/* Day panel */
.day-panel{background:var(--white);border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,.07);overflow:hidden;height:100%}
.day-panel-header{padding:14px 16px;border-bottom:1px solid var(--border);background:var(--navy);color:white}
.day-panel-title{font-family:'DM Sans',sans-serif;font-size:16px}
.day-panel-sub{font-size:12px;opacity:.7;margin-top:2px}
.day-panel-body{padding:12px}

/* Badge */
.badge{display:inline-flex;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}

/* Modal */
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px}
.modal{background:var(--white);border-radius:14px;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.25)}
.modal-lg{max-width:700px}
.modal-header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px 0}
.modal-title{font-family:'DM Sans',sans-serif;font-size:18px;color:var(--navy)}
.modal-close{background:none;border:none;font-size:20px;cursor:pointer;color:var(--muted);width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%}
.modal-close:hover{background:var(--bg)}
.modal-body{padding:16px 24px 20px}
.modal-footer{display:flex;gap:8px;justify-content:flex-end;padding:0 24px 20px;border-top:1px solid var(--border);padding-top:16px;margin-top:4px}

/* Form */
.form-group{margin-bottom:13px}
.form-label{display:block;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.form-input,.form-select,.form-textarea{width:100%;padding:9px 11px;border:1px solid var(--border);border-radius:7px;font-size:14px;color:var(--text);font-family:inherit;background:var(--white);transition:border-color .15s}
.form-input:focus,.form-select:focus,.form-textarea:focus{outline:none;border-color:var(--gold);box-shadow:0 0 0 3px rgba(245,160,24,.22)}
.form-textarea{resize:vertical;min-height:70px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.form-error{color:#ef4444;font-size:13px;margin-bottom:12px;padding:9px 12px;background:#fef2f2;border-radius:7px;border-left:3px solid #ef4444}
.form-hint{font-size:11px;color:var(--muted);margin-top:3px}
.chip-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.chip{padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:2px solid transparent;transition:all .15s;background:var(--bg);color:var(--text)}
.chip.selected{border-color:var(--navy);color:var(--navy);background:rgba(15,42,74,.07)}

/* Annual view */
.year-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.mini-cal-title{font-size:12px;font-weight:700;color:var(--navy);text-align:center;margin-bottom:6px;font-family:'DM Sans',sans-serif}
.mini-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:6px;overflow:hidden}
.mini-wday{background:#e8e4da;text-align:center;font-size:9px;color:var(--muted);line-height:17px;font-weight:600}
.mini-cell{background:var(--white);text-align:center;font-size:10px;padding:2px;line-height:16px;cursor:pointer}
.mini-cell:hover{background:#f0f4ff}
.mini-cell.has-ev{font-weight:700;color:var(--navy)}
.mini-cell.today{background:var(--navy);color:white}
.mini-cell.other{opacity:.4}

/* Category view */
.cat-section{margin-bottom:24px}
.cat-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:8px;cursor:pointer;margin-bottom:8px;color:white}
.cat-count{font-size:13px;opacity:.85}
.cat-bar-wrap{background:var(--border);border-radius:4px;height:6px;margin-bottom:12px}
.cat-bar-fill{height:100%;border-radius:4px;transition:width .5s}

/* Sessions */
.sess-table{width:100%;border-collapse:collapse}
.sess-table th{text-align:left;padding:9px 14px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);border-bottom:2px solid var(--border);white-space:nowrap}
.sess-table td{padding:9px 14px;border-bottom:1px solid var(--border);font-size:13px;vertical-align:middle}
.sess-table tr:hover td{background:#faf9f6;cursor:pointer}

/* Birthday */
.bd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
.bd-card{background:var(--white);border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:box-shadow .15s}
.bd-card:hover{box-shadow:0 2px 10px rgba(0,0,0,.1)}
.bd-avatar{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.bd-name{font-weight:600;font-size:14px}
.bd-info{font-size:12px;color:var(--muted);margin-top:2px}

/* Empty state */
.empty{text-align:center;padding:40px 20px;color:var(--muted)}
.empty-icon{font-size:36px;margin-bottom:10px}
.empty-text{font-size:14px}

/* Divider */
.section-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin:20px 0 10px}

/* Mobile tabs */
.mob-tabs{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--navy-d);z-index:200;height:54px;border-top:1px solid rgba(255,255,255,.08)}
.mob-tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:rgba(255,255,255,.55);text-decoration:none;font-size:10px;gap:1px;cursor:pointer;border:none;background:none;font-family:inherit}
.mob-tab.active{color:var(--gold-l)}
.mob-tab-icon{font-size:18px;line-height:1}

/* Split layout for calendar */
.cal-split{display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start}

/* Misc */
.text-navy{color:var(--navy)}
.text-gold{color:var(--gold)}
.text-muted{color:var(--muted)}
.font-serif{font-family:'DM Sans',sans-serif}
.divider{height:1px;background:var(--border);margin:16px 0}
.pill{display:inline-flex;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
.tag{display:inline-flex;align-items:center;padding:2px 9px;border-radius:4px;font-size:11px;font-weight:600}
.recurrence-badge{font-size:11px;color:var(--muted);display:inline-flex;align-items:center;gap:3px}

@media(max-width:900px){
  .sidebar{display:none}
  .mob-tabs{display:flex}
  .content{padding-bottom:54px}
  .year-grid{grid-template-columns:repeat(3,1fr)}
  .cal-split{grid-template-columns:1fr}
  .form-row{grid-template-columns:1fr}
}
@media(max-width:600px){
  .year-grid{grid-template-columns:repeat(2,1fr)}
  .stat-grid{grid-template-columns:1fr 1fr}
  .page{padding:14px}
  .cal-cell{min-height:56px}
}
`;

export function injectWebCss() {
  if (typeof document === 'undefined') return;
  const id = '__agenda_css';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = CSS;
  document.head.appendChild(style);

  if (!document.getElementById('__agenda_fonts')) {
    const link = document.createElement('link');
    link.id = '__agenda_fonts';
    link.rel = 'preconnect';
    link.href = 'https://fonts.googleapis.com';
    document.head.prepend(link);
  }
}

// Categorias e helpers vêm da fonte única em theme.ts (reexportados aqui por compatibilidade dos imports do web).
export { NAV_CATS, getCatColor, getCatLabel } from './theme';

export const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
export const WDAYS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
export const WDAYS_SHORT = ['D','S','T','Q','Q','S','S'];

export function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
export function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
export function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
