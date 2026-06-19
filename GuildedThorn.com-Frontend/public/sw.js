/* GuildedThorn service worker — handles Web Push for "going live" alerts.
   Served from the site root (/sw.js) so its scope covers the whole origin. */

self.addEventListener("install", () => {
  // Activate this worker immediately instead of waiting for old tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "GuildedThorn Radio", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "GuildedThorn Radio";
  const options = {
    body: data.body || "",
    icon: "/images/FullLogo.jpg",
    badge: "/images/Logo.svg",
    tag: "radio-live", // collapse repeats into one notification
    renotify: true,
    data: { url: data.url || "/radio" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/radio";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus an existing tab if one is open, otherwise open a new one.
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
