(function () {
  "use strict";

  const STORAGE_KEY = "cookie-clicker-clone-bakery-v1";
  const SAVE_INTERVAL_MS = 2000;
  const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;

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

  const achievements = [
    { id: "first-click", name: "First Crumb", copy: "Click the Cookie once.", earned: (bakery) => bakery.manualClicks >= 1 },
    { id: "click-100", name: "Finger Warmup", copy: "Click the Cookie 100 times.", earned: (bakery) => bakery.manualClicks >= 100 },
    { id: "cookies-100", name: "Snack Stack", copy: "Bake 100 lifetime Cookies.", earned: (bakery) => bakery.lifetimeCookies >= 100 },
    { id: "cookies-10000", name: "Jar With Ambition", copy: "Bake 10,000 lifetime Cookies.", earned: (bakery) => bakery.lifetimeCookies >= 10000 },
    { id: "building-1", name: "Help Arrives", copy: "Own any Building.", earned: (bakery) => totalBuildingsOwned(bakery) >= 1 },
    { id: "building-25", name: "Busy Counter", copy: "Own 25 Buildings.", earned: (bakery) => totalBuildingsOwned(bakery) >= 25 },
    { id: "upgrade-1", name: "Recipe Notes", copy: "Buy an Upgrade.", earned: (bakery) => bakery.purchasedUpgrades.length >= 1 },
    { id: "production-100", name: "Cookie Weather", copy: "Reach 100 Cookie Production.", earned: (bakery) => bakery.cookieProduction >= 100 }
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
    earnedAchievements: [],
    soundEnabled: false,
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
    upgradeHint: document.getElementById("upgrade-hint"),
    lifetimeCookies: document.getElementById("lifetime-cookies"),
    manualClicks: document.getElementById("manual-clicks"),
    buildingsOwned: document.getElementById("buildings-owned"),
    upgradesBought: document.getElementById("upgrades-bought"),
    achievementList: document.getElementById("achievement-list"),
    soundButton: document.getElementById("sound-button")
  };

  let bakery = loadBakery();
  let lastTick = performance.now();
  let lastPassiveRender = 0;
  let feedbackTimer = 0;
  let audioContext = null;

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
        globalMultiplier: Math.max(1, Number(parsed.globalMultiplier) || 1),
        earnedAchievements: Array.isArray(parsed.earnedAchievements) ? parsed.earnedAchievements : [],
        soundEnabled: Boolean(parsed.soundEnabled)
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

  function totalBuildingsOwned(targetBakery = bakery) {
    return buildings.reduce((total, building) => total + (targetBakery.buildings[building.id] || 0), 0);
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
    playTone(260, 0.04, "sine");
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
    playTone(180, 0.08, "triangle");
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
    playTone(420, 0.1, "square");
  }

  function applyOfflineProgress() {
    const elapsedMs = Date.now() - (Number(bakery.lastSavedAt) || Date.now());
    if (elapsedMs < 60000 || bakery.cookieProduction <= 0) {
      return;
    }

    const cappedMs = Math.min(elapsedMs, OFFLINE_CAP_MS);
    const earned = bakery.cookieProduction * (cappedMs / 1000);
    addCookies(earned);
    showToast(`While away for ${formatDuration(cappedMs)}, the Bakery made ${formatNumber(earned)} Cookies.`);
  }

  function formatDuration(ms) {
    const minutes = Math.max(1, Math.floor(ms / 60000));
    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
  }

  function toggleSound() {
    bakery.soundEnabled = !bakery.soundEnabled;
    renderSoundButton();
    saveBakery();
    if (bakery.soundEnabled) {
      playTone(520, 0.08, "sine");
      showToast("Sound on. The Cookie hums approvingly.");
    } else {
      showToast("Sound off. Quiet crumbs only.");
    }
  }

  function playTone(frequency, duration, type) {
    if (!bakery.soundEnabled) {
      return;
    }

    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      return;
    }

    audioContext = audioContext || new AudioCtor();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration + 0.01);
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
      if (now - lastPassiveRender > 250) {
        lastPassiveRender = now;
        render();
      }
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
    elements.lifetimeCookies.textContent = formatNumber(bakery.lifetimeCookies);
    elements.manualClicks.textContent = formatNumber(bakery.manualClicks);
    elements.buildingsOwned.textContent = formatNumber(totalBuildingsOwned());
    elements.upgradesBought.textContent = formatNumber(bakery.purchasedUpgrades.length);
    renderBuildings();
    renderUpgrades();
    renderAchievements();
    renderSoundButton();
    checkAchievements();
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

  function renderAchievements(newAchievementId = "") {
    elements.achievementList.replaceChildren(...achievements.map((achievement) => {
      const earned = bakery.earnedAchievements.includes(achievement.id);
      const badge = document.createElement("article");
      badge.className = `achievement-badge${earned ? " is-earned" : ""}${achievement.id === newAchievementId ? " is-new" : ""}`;
      badge.innerHTML = `
        <span class="achievement-name">${earned ? achievement.name : "???"}</span>
        <span class="achievement-copy">${earned ? achievement.copy : "Keep baking to discover this one."}</span>
      `;
      return badge;
    }));
  }

  function checkAchievements() {
    const newlyEarned = achievements.filter((achievement) => {
      return !bakery.earnedAchievements.includes(achievement.id) && achievement.earned(bakery);
    });

    if (!newlyEarned.length) {
      return;
    }

    for (const achievement of newlyEarned) {
      bakery.earnedAchievements.push(achievement.id);
      showToast(`Achievement unlocked: ${achievement.name}`);
      renderAchievements(achievement.id);
    }
    saveBakery();
  }

  function renderSoundButton() {
    elements.soundButton.textContent = bakery.soundEnabled ? "Sound On" : "Sound Off";
    elements.soundButton.setAttribute("aria-pressed", String(bakery.soundEnabled));
  }

  elements.cookieButton.addEventListener("click", bakeCookie);
  elements.resetButton.addEventListener("click", resetBakery);
  elements.soundButton.addEventListener("click", toggleSound);

  window.addEventListener("beforeunload", saveBakery);
  window.setInterval(saveBakery, SAVE_INTERVAL_MS);

  bakery.cookieProduction = calculateCookieProduction();
  applyOfflineProgress();
  render();
  showToast("Oven warm. Cookie ready.");
  window.requestAnimationFrame(tick);
})();
