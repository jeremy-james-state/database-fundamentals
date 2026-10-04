(function setFavicons() {
  const href = document.documentElement.classList.contains("dark")
    ? "/logo/icon-dark.svg"
    : "/logo/icon-light.svg";

  function apply() {
    const icons = [...document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')];
    const already = icons.length === 1 && icons[0].getAttribute("href") === href;
    if (already) {
      return;
    }
    for (const link of icons) {
      link.remove();
    }
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = href;
    document.head.appendChild(link);
  }

  apply();
  new MutationObserver(apply).observe(document.head, { childList: true });
})();
