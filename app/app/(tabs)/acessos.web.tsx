// Tela dedicada "Usuários e acessos" (identidade central) — item próprio do menu.
// Visível só para GESTOR/ADMIN; quem não é elevado é mandado de volta para a Agenda.
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { injectWebCss } from '../../src/webCss';
import { loadPrefs, isAdmin } from '../../src/prefs';
import { AccessAdmin } from '../../src/accessAdmin';

export default function AcessosWeb() {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    injectWebCss();
    loadPrefs().then(() => { setAllowed(isAdmin()); setReady(true); });
  }, []);

  if (!ready) return null;
  if (!allowed) {
    if (typeof window !== 'undefined') router.replace('/');
    return null;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Ionicons name="shield-checkmark-outline" size={20} /> Usuários e acessos
        </h1>
      </div>
      <AccessAdmin />
    </div>
  );
}
