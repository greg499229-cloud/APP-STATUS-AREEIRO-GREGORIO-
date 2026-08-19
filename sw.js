// Service worker do app Status Areeiro PIAL.
// Faz cache só da "casca" do app (HTML/ícones), pra abrir mesmo sem internet.
// Os dados (Firestore) continuam sempre buscados da rede — nunca ficam
// desatualizados por causa do cache.

const CACHE_NOME = 'areeiro-pial-v1';
const ARQUIVOS_CASCA = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NOME).then((cache) => cache.addAll(ARQUIVOS_CASCA))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes.filter((nome) => nome !== CACHE_NOME).map((nome) => caches.delete(nome))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url);

  // Nunca cacheia chamadas ao Firestore/Firebase — dados sempre em tempo real.
  if (url.hostname.indexOf('firestore') !== -1 || url.hostname.indexOf('firebase') !== -1 || url.hostname.indexOf('googleapis') !== -1) {
    return;
  }

  // Só trata pedidos do mesmo site (GET); CDNs externos (Chart.js etc.) passam direto pra rede.
  if (evento.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  evento.respondWith(
    caches.match(evento.request).then((respostaCache) => {
      const buscaRede = fetch(evento.request)
        .then((respostaRede) => {
          caches.open(CACHE_NOME).then((cache) => cache.put(evento.request, respostaRede.clone()));
          return respostaRede;
        })
        .catch(() => respostaCache); // sem internet: usa o que tiver em cache

      return respostaCache || buscaRede;
    })
  );
});
