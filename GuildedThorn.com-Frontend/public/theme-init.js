// Applies the saved theme before first paint to avoid a flash of the wrong
// color scheme. Loaded as an external script so the Content-Security-Policy can
// use script-src 'self' (no 'unsafe-inline').
(function () {
	try {
		var t = localStorage.getItem("theme");
		document.documentElement.style.colorScheme =
			t === "light" || t === "dark" ? t : "light dark";
	} catch (e) {}
})();
