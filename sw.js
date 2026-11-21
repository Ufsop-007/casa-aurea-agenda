// Deixa o app abrir sem internet: guarda os arquivos do app no aparelho.
// As festas não passam por aqui (ficam no armazenamento do navegador).
// Ao publicar uma versão nova, aumente VERSAO para o celular baixar os arquivos novos.
const VERSAO = 'casa-aurea-v1.1.5';
const ARQUIVOS = [
  './', './index.html', './styles.css?v=1.1.5', './manifest.webmanifest',
  './js/config.js?v=1.1.5', './js/regras.js?v=1.1.5', './js/armazenamento.js?v=1.1.5', './js/arquivos.js?v=1.1.5',
  './js/telas.js?v=1.1.5', './js/resumo.js?v=1.1.5', './js/app.js?v=1.1.5',
  './icones/icone-192.png', './icones/icone-512.png', './icones/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(nomes => Promise.all(nomes.filter(n => n !== VERSAO).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

// Arquivos do app: usa a internet quando tem (pega a versão nova) e o guardado quando não tem.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(resp => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(VERSAO).then(c => c.put(req, copia));
        }
        return resp;
      })
      .catch(() => caches.match(req, { ignoreSearch: false }).then(r => r || caches.match('./index.html')))
  );
});
