/* sw.js — 오프라인 지원 (저장소 루트에 둔다. 부록 E-4에서 검증).
   전략: 같은 출처 GET은 "네트워크 우선 → 실패·시간 초과면 캐시".
   온라인이면 항상 최신 파일을 받으므로 배포 후 옛 파일이 남는 문제가 없고, 오프라인이면 마지막으로 받은 파일로 동작한다. */
const VERSION = "tdg-v1";                 // 캐시 이름. PRECACHE 목록을 바꿀 때만 올린다.
const PRECACHE = [                        // 모두 상대 경로(GitHub Pages 하위 경로 /Tonguedrum_Game/ 대응)
  "./", "index.html", "style.css", "manifest.webmanifest",
  "js/config.js", "js/tongues.js", "js/storage.js", "js/audio.js", "js/effects.js",
  "js/rules.js", "js/songs.js", "js/game.js", "js/ui.js", "js/debug.js", "js/main.js",
  "assets/tonguedrum-1024.webp", "assets/tonguedrum-2048.webp",
  "assets/mole.png", "assets/hammer.png", "assets/star.png",
  "assets/og-image.jpg",
  "assets/icons/favicon-32.png", "assets/icons/apple-touch-icon.png",
  "assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // addAll은 파일 하나만 없어도 전체가 실패하므로 하나씩 넣고, 실패한 파일은 콘솔에만 알린다
    const results = await Promise.allSettled(PRECACHE.map((u) => cache.add(new Request(u, { cache: "reload" }))));
    results.forEach((r, i) => { if (r.status === "rejected") console.warn("[sw] 미리 저장 실패:", PRECACHE[i]); });
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("tdg-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      // cache: "no-cache" = 브라우저 HTTP 캐시가 있어도 서버에 "바뀌었나?"를 물어본다(안 바뀌었으면 304로 가볍게 끝남).
      // 이게 없으면 GitHub Pages의 10분 캐시 때문에 새 index.html과 옛 js가 섞일 수 있다.
      const res = await Promise.race([fetch(req, { cache: "no-cache" }), timeout(req.mode === "navigate" ? 4000 : 8000)]);
      if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
      return res;
    } catch (_) {
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      if (req.mode === "navigate") {
        const shell = (await cache.match("index.html")) || (await cache.match("./"));
        if (shell) return shell;
      }
      return new Response("오프라인이에요. 인터넷에 연결한 뒤 다시 열어 주세요.", {
        status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  })());
});
