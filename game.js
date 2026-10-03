(function () {
  "use strict";

  const STORAGE_KEY = "cookie-clicker-clone-bakery-v1";
  const SAVE_INTERVAL_MS = 2000;

  const buildings = [
    { id: "cursor", name: "Cursor", copy: "A dutiful pointer with buttery ambition.", baseCost: 15, production: 0.1 },
    { id: "grandma", name: "Grandma", copy: "Knows the recipe and several suspicious shortcuts.", baseCost: 100, production: 1 },
    { id: "oven", name: "Oven", copy: "Hot enough to make the counter nervous.", baseCost: 550, production: 5 },
    { id: "farm", name: "Farm", copy: "Rows of wheat doing their best impression of destiny.", baseCost: 3200, production: 22 },
    { id: "factory", name: "Factory", copy: "Turns dough logistics into a lifestyle.", baseCost: 14000, production: 95 },
    { id: "bank", name: "Bank", copy: "Compounds interest, then compounds frosting.", baseCost: 68000, production: 410 },
    { id: "temple", name: "Temple", copy: "A solemn place for worshipping the golden crumb.", baseCost: 330000, production: 1700 },
    { id: "lab", name: "Lab", copy: "Asks whether cookies can think. Receives crumbs.", baseCost: 1500000, production: 7200 }
  ];

  const upgrades = [
    { id: "double-click", name: "Reinforced Rolling Pin", copy: "Manual clicks make twice as many Cookies.", cost: 50, unlock: (bakery) => bakery.manualClicks >= 20, apply: (bakery) => { bakery.clickPower *= 2; } },
    { id: "cursor-gloves", name: "Cursor Gloves", copy: "Cursors produce twice as many Cookies.", cost: 250, unlock: (bakery) => bakery.buildings.cursor >= 5, buildingId: "cursor", multiplier: 2 },
    { id: "grandma-aprons", name: "Aprons of Mild Authority", copy: "Grandmas produce twice as many Cookies.", cost: 1200, unlock: (bakery) => bakery.buildings.grandma >= 3, buildingId: "grandma", multiplier: 2 },
    { id: "oven-thermostat", name: "Optimistic Thermostat", copy: "Ovens produce twice as many Cookies.", cost: 6500, unlock: (bakery) => bakery.buildings.oven >= 2, buildingId: "oven", multiplier: 2 },
    { id: "bakery-ledger", name: "Crumb Ledger", copy: "All Cookie Production rises by 15%.", cost: 18000, unlock: (bakery) => bakery.lifetimeCookies >= 10000, globalMultiplier: 1.15 }
  ];

  const defaultBakery = {
    cookies: 0,
    lifetimeCookies: 0,
    clickPower: 1,
    cookieProduction: 0,
    manualClicks: 0,
    buildings: {},
    purchasedUpgrades: [],
    buildingMultipliers: {},
    globalMultiplier: 1,
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
    toastRegion: document.getElementById("toast-region"),
    buildingList: document.getElementById("building-list"),
    upgradeList: document.getElementById("upgrade-list"),
    upgradeHint: document.getElementById("upgrade-hint")
  };

  let bakery = loadBakery();
  let lastTick = performance.now();
  let feedbackTimer = 0;

  function cloneDefaultBakery() {
    return {
      ...defaultBakery,
      buildings: Object.fromEntries(buildings.map((building) => [building.id, 0])),
      purchasedUpgrades: [],
      buildingMultipliers: Object.fromEntries(buildings.map((building) => [building.id, 1])),
      lastSavedAt: Date.now()
    };
  }

  function loadBakery() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return cloneDefaultBakery();
      }

      const parsed = JSON.parse(saved);
      const fallback = cloneDefaultBakery();
      return {
        ...cloneDefaultBakery(),
        ...parsed,
        cookies: Number(parsed.cookies) || 0,
        lifetimeCookies: Number(parsed.lifetimeCookies) || 0,
        clickPower: Math.max(1, Number(parsed.clickPower) || 1),
        cookieProduction: Math.max(0, Number(parsed.cookieProduction) || 0),
        manualClicks: Math.max(0, Number(parsed.manualClicks) || 0),
        buildings: { ...fallback.buildings, ...(parsed.buildings || {}) },
        purchasedUpgrades: Array.isArray(parsed.purchasedUpgrades) ? parsed.purchasedUpgrades : [],
        buildingMultipliers: { ...fallback.buildingMultipliers, ...(parsed.buildingMultipliers || {}) },
        globalMultiplier: Math.max(1, Number(parsed.globalMultiplier) || 1)
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

  function buildingCost(building) {
    return Math.ceil(building.baseCost * Math.pow(1.15, bakery.buildings[building.id]));
  }

  function calculateCookieProduction() {
    const baseProduction = buildings.reduce((total, building) => {
      const owned = bakery.buildings[building.id];
      const multiplier = bakery.buildingMultipliers[building.id] || 1;
      return total + owned * building.production * multiplier;
    }, 0);
    return baseProduction * bakery.globalMultiplier;
  }

  function spendCookies(cost) {
    if (bakery.cookies < cost) {
      return false;
    }

    bakery.cookies -= cost;
    return true;
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

  function buyBuilding(buildingId) {
    const building = buildings.find((candidate) => candidate.id === buildingId);
    if (!building) {
      return;
    }

    const cost = buildingCost(building);
    if (!spendCookies(cost)) {
      showToast(`${formatNumber(cost - bakery.cookies)} more Cookies needed for ${building.name}.`);
      return;
    }

    bakery.buildings[building.id] += 1;
    bakery.cookieProduction = calculateCookieProduction();
    render();
    saveBakery();
    showToast(`${building.name} joined the Bakery.`);
  }

  function buyUpgrade(upgradeId) {
    const upgrade = upgrades.find((candidate) => candidate.id === upgradeId);
    if (!upgrade || bakery.purchasedUpgrades.includes(upgrade.id) || !upgrade.unlock(bakery)) {
      return;
    }

    if (!spendCookies(upgrade.cost)) {
      showToast(`${formatNumber(upgrade.cost - bakery.cookies)} more Cookies needed for ${upgrade.name}.`);
      return;
    }

    bakery.purchasedUpgrades.push(upgrade.id);
    if (upgrade.apply) {
      upgrade.apply(bakery);
    }
    if (upgrade.buildingId) {
      bakery.buildingMultipliers[upgrade.buildingId] *= upgrade.multiplier;
    }
    if (upgrade.globalMultiplier) {
      bakery.globalMultiplier *= upgrade.globalMultiplier;
    }
    bakery.cookieProduction = calculateCookieProduction();
    render();
    saveBakery();
    showToast(`${upgrade.name} purchased.`);
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
    bakery.cookieProduction = calculateCookieProduction();
    elements.cookieTotal.textContent = formatNumber(bakery.cookies);
    elements.clickPower.textContent = formatNumber(bakery.clickPower);
    elements.cookieProduction.textContent = formatRate(bakery.cookieProduction);
    renderBuildings();
    renderUpgrades();
  }

  function renderBuildings() {
    elements.buildingList.replaceChildren(...buildings.map((building) => {
      const cost = buildingCost(building);
      const owned = bakery.buildings[building.id];
      const affordable = bakery.cookies >= cost;
      const button = document.createElement("button");
      button.className = "shop-item";
      button.type = "button";
      button.disabled = !affordable;
      button.setAttribute("data-building-id", building.id);
      button.setAttribute("aria-label", `${building.name}, owned ${owned}, costs ${formatNumber(cost)} Cookies`);
      button.innerHTML = `
        <span class="item-topline">
          <span class="item-name">${building.name}</span>
          <span class="item-count">Owned ${owned}</span>
        </span>
        <span class="item-copy">${building.copy}</span>
        <span class="item-cost">${formatNumber(cost)} Cookies · +${formatRate(building.production * (bakery.buildingMultipliers[building.id] || 1))}</span>
        <span class="item-status">${affordable ? "Ready" : `Need ${formatNumber(cost - bakery.cookies)} more`}</span>
      `;
      button.addEventListener("click", () => buyBuilding(building.id));
      return button;
    }));
  }

  function renderUpgrades() {
    const availableUpgrades = upgrades.filter((upgrade) => {
      return !bakery.purchasedUpgrades.includes(upgrade.id) && upgrade.unlock(bakery);
    });

    elements.upgradeHint.textContent = availableUpgrades.length
      ? "Unlocked upgrades wait here until the jar can afford them."
      : "Upgrades appear when the Bakery smells ready.";

    if (!availableUpgrades.length) {
      const empty = document.createElement("p");
      empty.className = "shop-hint";
      empty.textContent = "No upgrades yet. Keep clicking; the dough is listening.";
      elements.upgradeList.replaceChildren(empty);
      return;
    }

    elements.upgradeList.replaceChildren(...availableUpgrades.map((upgrade) => {
      const affordable = bakery.cookies >= upgrade.cost;
      const button = document.createElement("button");
      button.className = "shop-item";
      button.type = "button";
      button.disabled = !affordable;
      button.setAttribute("data-upgrade-id", upgrade.id);
      button.setAttribute("aria-label", `${upgrade.name}, costs ${formatNumber(upgrade.cost)} Cookies`);
      button.innerHTML = `
        <span class="item-topline">
          <span class="item-name">${upgrade.name}</span>
          <span class="item-count">One-time</span>
        </span>
        <span class="item-copy">${upgrade.copy}</span>
        <span class="item-cost">${formatNumber(upgrade.cost)} Cookies</span>
        <span class="item-status">${affordable ? "Ready to buy" : `Need ${formatNumber(upgrade.cost - bakery.cookies)} more`}</span>
      `;
      button.addEventListener("click", () => buyUpgrade(upgrade.id));
      return button;
    }));
  }

  elements.cookieButton.addEventListener("click", bakeCookie);
  elements.resetButton.addEventListener("click", resetBakery);

  window.addEventListener("beforeunload", saveBakery);
  window.setInterval(saveBakery, SAVE_INTERVAL_MS);

  render();
  showToast("Oven warm. Cookie ready.");
  window.requestAnimationFrame(tick);
})();
