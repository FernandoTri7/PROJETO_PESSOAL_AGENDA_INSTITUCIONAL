// Google Picker (somente web) para escolher um arquivo do Drive.
// Importado apenas por telas .web.tsx; usa window/document.

let scriptPromise: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return reject(new Error('sem DOM'));
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('falha ao carregar ' + src));
    document.head.appendChild(s);
  });
}

export type DriveFile = { id: string; name: string; url: string; mimeType?: string };

// Abre o Picker e resolve com o arquivo escolhido (ou null se cancelado).
export async function pickDriveFile(accessToken: string, apiKey: string): Promise<DriveFile | null> {
  if (!scriptPromise) scriptPromise = loadScript('https://apis.google.com/js/api.js');
  await scriptPromise;
  const gapi = (window as any).gapi;
  await new Promise<void>((resolve) => gapi.load('picker', resolve));

  return new Promise((resolve) => {
    const google = (window as any).google;
    const view = new google.picker.DocsView(google.picker.ViewId.DOCS).setIncludeFolders(true);
    const builder = new google.picker.PickerBuilder()
      .setOAuthToken(accessToken)
      .addView(view)
      .setCallback((data: any) => {
        if (data.action === google.picker.Action.PICKED) {
          const d = data.docs[0];
          resolve({
            id: d.id,
            name: d.name,
            url: d.url || `https://drive.google.com/file/d/${d.id}/view`,
            mimeType: d.mimeType,
          });
        } else if (data.action === google.picker.Action.CANCEL) {
          resolve(null);
        }
      });
    if (apiKey) builder.setDeveloperKey(apiKey);
    builder.build().setVisible(true);
  });
}
