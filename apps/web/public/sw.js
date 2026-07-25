/* global self, caches, URL, fetch */

const CACHE_NAME = "campustest-shell-v1";
const SHELL_URLS = ["/login", "/offline", "/pricing", "/status", "/icons/app-icon.svg"];
const SENSITIVE_PATHS = [
  "/api/",
  "/attempts",
  "/student/exams",
  "/proctor",
  "/reports",
  "/reviews",
  "/coding",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    SENSITIVE_PATHS.some((path) => url.pathname.startsWith(path))
  ) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && SHELL_URLS.includes(url.pathname)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached ?? caches.match("/offline"))),
  );
});
