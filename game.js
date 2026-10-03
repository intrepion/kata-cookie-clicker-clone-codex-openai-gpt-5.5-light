(function () {
  "use strict";

  const STORAGE_KEY = "cookie-clicker-clone-bakery-v1";
  const SAVE_INTERVAL_MS = 2000;

  const defaultBakery = {
    cookies: 0,
    lifetimeCookies: 0,
    clickPower: 1,
    cookieProduction: 0,
    manualClicks: 0,
    lastSavedAt: Date.now()
  };

  const elements = {
    cookieButton: document.getElementById("cookie-button"),
    cookieTotal: document.getElementById("cookie-total"),
    clickPower: document.getElementById("click-power"),
    cookieProduction: document.getElementById("cookie-production"),
    clickFeedback: document.getElementById("click-feedback"),
    resetButton: document.getElementById("reset-button"),
    saveState: document.getElementById("save-state"),
    toastRegion: document.getElementById("toast-region")
  };

  let bakery = loadBakery();
  let lastTick = performance.now();
  let feedbackTimer = 0;

  function cloneDefaultBakery() {
    return { ...defaultBakery, lastSavedAt: Date.now() };
  }

  function loadBakery() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return cloneDefaultBakery();
      }

      const parsed = JSON.parse(saved);
      return {
        ...cloneDefaultBakery(),
        ...parsed,
        cookies: Number(parsed.cookies) || 0,
        lifetimeCookies: Number(parsed.lifetimeCookies) || 0,
        clickPower: Math.max(1, Number(parsed.clickPower) || 1),
        cookieProduction: Math.max(0, Number(parsed.cookieProduction) || 0),
        manualClicks: Math.max(0, Number(parsed.manualClicks) || 0)
      };
    } catch (error) {
      console.warn("Saved bakery could not be loaded.", error);
      return cloneDefaultBakery();
    }
  }

  function saveBakery() {
    bakery.lastSavedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bakery));
    elements.saveState.textContent = "Saved";
  }

  function formatNumber(value) {
    if (value < 1000) {
      return Math.floor(value).toLocaleString();
    }

    const suffixes = ["K", "M", "B", "T", "Qa", "Qi"];
    let scaled = value;
    let suffixIndex = -1;

    while (scaled >= 1000 && suffixIndex < suffixes.length - 1) {
      scaled /= 1000;
      suffixIndex += 1;
    }

    const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
    return `${scaled.toFixed(digits)}${suffixes[suffixIndex]}`;
  }

  function formatRate(value) {
    return `${formatNumber(value)}/sec`;
  }

  function addCookies(amount) {
    bakery.cookies += amount;
    bakery.lifetimeCookies += amount;
  }

  function bakeCookie() {
    addCookies(bakery.clickPower);
    bakery.manualClicks += 1;
    showClickFeedback(`+${formatNumber(bakery.clickPower)} cookie`);
    elements.cookieButton.classList.add("is-pressed");
    window.setTimeout(() => elements.cookieButton.classList.remove("is-pressed"), 100);
    render();
    saveBakery();
  }

  function showClickFeedback(message) {
    window.clearTimeout(feedbackTimer);
    elements.clickFeedback.textContent = message;
    feedbackTimer = window.setTimeout(() => {
      elements.clickFeedback.textContent = "";
    }, 700);
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    elements.toastRegion.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3200);
  }

  function tick(now) {
    const elapsedSeconds = Math.max(0, (now - lastTick) / 1000);
    lastTick = now;

    if (bakery.cookieProduction > 0) {
      addCookies(bakery.cookieProduction * elapsedSeconds);
      render();
    }

    window.requestAnimationFrame(tick);
  }

  function resetBakery() {
    const confirmed = window.confirm("Reset this bakery and start again?");
    if (!confirmed) {
      return;
    }

    bakery = cloneDefaultBakery();
    saveBakery();
    render();
    showToast("Fresh bakery, clean counter.");
  }

  function render() {
    elements.cookieTotal.textContent = formatNumber(bakery.cookies);
    elements.clickPower.textContent = formatNumber(bakery.clickPower);
    elements.cookieProduction.textContent = formatRate(bakery.cookieProduction);
  }

  elements.cookieButton.addEventListener("click", bakeCookie);
  elements.resetButton.addEventListener("click", resetBakery);

  window.addEventListener("beforeunload", saveBakery);
  window.setInterval(saveBakery, SAVE_INTERVAL_MS);

  render();
  showToast("Oven warm. Cookie ready.");
  window.requestAnimationFrame(tick);
})();
