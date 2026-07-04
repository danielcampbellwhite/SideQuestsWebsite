/* ============================================================
   SideQuests — application logic
   Persistence: localStorage. No backend required.
   ============================================================ */
(function () {
  "use strict";

  const STORE = {
    theme: "sq.theme",
    today: "sq.today",
    journal: "sq.journal",
  };

  /* ============================================================
     Gamification config
     ============================================================ */
  // XP earned when a quest is completed.
  const XP_BY_DIFFICULTY = { Easy: 10, Medium: 20, Hard: 35 };
  const LEGENDARY_BONUS = 50;

  // Cumulative XP thresholds and fantasy rank titles.
  const RANKS = [
    { level: 1, title: "Novice Wanderer", xp: 0 },
    { level: 2, title: "Curious Traveller", xp: 60 },
    { level: 3, title: "Apprentice Adventurer", xp: 150 },
    { level: 4, title: "Seasoned Explorer", xp: 280 },
    { level: 5, title: "Trailblazer", xp: 460 },
    { level: 6, title: "Quest Seeker", xp: 700 },
    { level: 7, title: "Pathfinder", xp: 1000 },
    { level: 8, title: "Wayfarer Knight", xp: 1380 },
    { level: 9, title: "Master Adventurer", xp: 1850 },
    { level: 10, title: "Legendary Hero", xp: 2450 },
    { level: 11, title: "Grand Voyager", xp: 3200 },
    { level: 12, title: "Mythic Champion", xp: 4200 },
  ];
  const RANK_STEP = 1500; // XP per level beyond the table

  // Cosmetic themes, each unlocked at a level. light + night are free.
  const THEMES = {
    light: { label: "Daylight", icon: "☀️", level: 1, mode: "light" },
    night: { label: "Nightfall", icon: "🌙", level: 1, mode: "dark" },
    forest: { label: "Enchanted Forest", icon: "🌲", level: 3, mode: "light" },
    royal: { label: "Royal Court", icon: "👑", level: 6, mode: "dark" },
    arcane: { label: "Arcane Sanctum", icon: "🔮", level: 10, mode: "dark" },
  };

  // Achievements are derived from your journal — no separate bookkeeping needed.
  const ACHIEVEMENTS = [
    { id: "first-steps", icon: "🌱", name: "First Steps", desc: "Complete your first quest.", check: (s) => s.completed >= 1 },
    { id: "getting-hang", icon: "⚔️", name: "Getting the Hang of It", desc: "Complete 5 quests.", check: (s) => s.completed >= 5 },
    { id: "dedicated", icon: "🛡️", name: "Dedicated Adventurer", desc: "Complete 25 quests.", check: (s) => s.completed >= 25 },
    { id: "centurion", icon: "🏆", name: "Centurion", desc: "Complete 100 quests.", check: (s) => s.completed >= 100 },
    { id: "legend-slayer", icon: "🐉", name: "Legend Slayer", desc: "Complete a Legendary quest.", check: (s) => s.hasLegendary },
    { id: "many-trades", icon: "🧭", name: "Jack of Many Trades", desc: "Complete quests in 5 categories.", check: (s) => s.categories.size >= 5 },
    { id: "renaissance", icon: "🌈", name: "Renaissance Hero", desc: "Complete a quest in every category.", check: (s) => s.categories.size >= Object.keys(CATEGORIES).length },
    { id: "forger", icon: "✨", name: "Quest Forger", desc: "Forge your own custom quest.", check: (s) => s.hasCustom },
    { id: "on-a-roll", icon: "🔥", name: "On a Roll", desc: "Reach a 3-day streak.", check: (s) => s.streak >= 3 },
    { id: "unstoppable", icon: "⚡", name: "Unstoppable", desc: "Reach a 7-day streak.", check: (s) => s.streak >= 7 },
    { id: "rising-star", icon: "⭐", name: "Rising Star", desc: "Reach Level 5.", check: (s) => s.level >= 5 },
    { id: "living-legend", icon: "👑", name: "Living Legend", desc: "Reach Level 10.", check: (s) => s.level >= 10 },
  ];

  /* ---------- storage helpers ---------- */
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage may be unavailable; app still works for the session */
    }
  }

  /* ---------- date helpers ---------- */
  function todayKey() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }
  // deterministic hash so everyone sharing a day starts from the same quest
  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }
  function uid() {
    return "q_" + hashString(todayKey() + performance.now() + Math.round(performance.now() * 997)) + "_" +
      Math.floor(performance.now() % 100000);
  }

  /* ---------- toast (queued) ---------- */
  let toastTimer = null;
  let toastActive = false;
  const toastQueue = [];
  const toastEl = document.getElementById("toast");
  function toast(msg, type) {
    toastQueue.push({ msg: msg, type: type || "normal" });
    if (!toastActive) nextToast();
  }
  function nextToast() {
    if (!toastQueue.length) {
      toastActive = false;
      return;
    }
    toastActive = true;
    const item = toastQueue.shift();
    toastEl.textContent = item.msg;
    toastEl.className = "toast is-visible" + (item.type === "epic" ? " toast--epic" : "");
    const dur = item.type === "epic" ? 3600 : 2300;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("is-visible");
      setTimeout(nextToast, 260);
    }, dur);
  }

  /* ============================================================
     Theme
     ============================================================ */
  const themeToggle = document.getElementById("theme-toggle");
  function applyTheme(theme) {
    if (!THEMES[theme]) theme = "light";
    const mode = THEMES[theme].mode;
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-mode", mode);
    themeToggle.setAttribute("aria-checked", mode === "dark" ? "true" : "false");
    save(STORE.theme, theme);
    // keep the Hero theme picker in sync if it is on screen
    if (views.hero && !views.hero.hidden) renderHeroThemes();
  }
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }
  // The banner switch is a quick day/night flip between the two base looks.
  themeToggle.addEventListener("click", () => {
    const dark = THEMES[currentTheme()].mode === "dark";
    applyTheme(dark ? "light" : "night");
  });

  /* ============================================================
     Routing
     ============================================================ */
  const tabs = Array.from(document.querySelectorAll(".nav__tab"));
  const views = {
    today: document.getElementById("view-today"),
    journal: document.getElementById("view-journal"),
    generate: document.getElementById("view-generate"),
    hero: document.getElementById("view-hero"),
  };
  function route(name) {
    if (!views[name]) name = "today";
    Object.keys(views).forEach((key) => {
      const active = key === name;
      views[key].hidden = !active;
      views[key].classList.toggle("is-active", active);
    });
    tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.route === name));
    if (name === "journal") renderJournal();
    if (name === "hero") renderHero();
    if (location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  tabs.forEach((t) => t.addEventListener("click", () => route(t.dataset.route)));
  document
    .getElementById("hero-bar")
    .addEventListener("click", () => route("hero"));

  /* ============================================================
     Journal state
     ============================================================ */
  function getJournal() {
    return load(STORE.journal, []);
  }
  function setJournal(list) {
    save(STORE.journal, list);
    updateBadge();
    refreshHeroBar();
  }
  function updateBadge() {
    const list = getJournal();
    const active = list.filter((q) => q.status === "active").length;
    const badge = document.getElementById("journal-count");
    badge.textContent = active;
    badge.hidden = active === 0;
  }
  function inJournal(sourceId) {
    return getJournal().some((q) => q.sourceId && q.sourceId === sourceId);
  }
  function addToJournal(quest, sourceId) {
    const list = getJournal();
    list.unshift({
      uid: uid(),
      sourceId: sourceId || null,
      title: quest.title,
      description: quest.description,
      icons: quest.icons || [],
      category: quest.category || "random",
      rarity: quest.rarity || "common",
      time: quest.time,
      cost: quest.cost,
      difficulty: quest.difficulty,
      status: "active",
      addedAt: todayKey(),
      completedAt: null,
    });
    setJournal(list);
  }

  /* ============================================================
     Tag rendering
     ============================================================ */
  function tagHtml(quest) {
    let html = "";
    const cat = CATEGORIES[quest.category];
    if (cat) {
      html +=
        `<span class="tag tag--category" style="border-color:${cat.color}">` +
        `<span class="tag__dot" style="background:${cat.color}"></span>` +
        `${cat.icon} ${escapeHtml(cat.label)}</span>`;
    }
    const items = [
      ["time", quest.time],
      ["cost", quest.cost],
      ["diff", quest.difficulty],
    ];
    html += items
      .filter((i) => i[1])
      .map(
        (i) =>
          `<span class="tag tag--${i[0]}"><span class="tag__dot"></span>${escapeHtml(
            i[1]
          )}</span>`
      )
      .join("");
    return html;
  }

  function legendaryBadge(quest) {
    return quest.rarity === "legendary"
      ? `<span class="legendary-badge">★ Legendary Quest ★</span>`
      : "";
  }
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ============================================================
     Gamification — XP, levels, stats, Hero page
     ============================================================ */
  function questXp(q) {
    const base = XP_BY_DIFFICULTY[q.difficulty] || 20;
    return base + (q.rarity === "legendary" ? LEGENDARY_BONUS : 0);
  }

  // Level + progress from a total XP value (extrapolates past the rank table).
  function levelInfo(totalXp) {
    let cur = RANKS[0];
    for (let i = 0; i < RANKS.length; i++) {
      if (totalXp >= RANKS[i].xp) cur = RANKS[i];
      else break;
    }
    const last = RANKS[RANKS.length - 1];
    let level = cur.level;
    let title = cur.title;
    let baseXp = cur.xp;
    let nextXp;
    if (cur.level < last.level) {
      nextXp = RANKS[cur.level].xp; // next entry (levels are sequential)
    } else {
      const over = totalXp - last.xp;
      const extra = Math.floor(over / RANK_STEP);
      level = last.level + extra;
      baseXp = last.xp + extra * RANK_STEP;
      nextXp = baseXp + RANK_STEP;
    }
    const into = totalXp - baseXp;
    const span = nextXp - baseXp;
    return {
      level: level,
      title: title,
      into: into,
      span: span,
      progress: span > 0 ? Math.max(0, Math.min(1, into / span)) : 1,
      toNext: Math.max(0, nextXp - totalXp),
      nextLevel: level + 1,
    };
  }

  // Consecutive-day completion streak, counting up to today (or yesterday).
  function computeStreak(doneQuests) {
    const days = new Set(doneQuests.map((q) => q.completedAt).filter(Boolean));
    if (!days.size) return 0;
    const fmt = (dt) => {
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      return `${dt.getFullYear()}-${m}-${d}`;
    };
    const cursor = new Date();
    if (!days.has(fmt(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
      if (!days.has(fmt(cursor))) return 0;
    }
    let streak = 0;
    while (days.has(fmt(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function computeStats() {
    const list = getJournal();
    const done = list.filter((q) => q.status === "done");
    const totalXp = done.reduce((sum, q) => sum + questXp(q), 0);
    const info = levelInfo(totalXp);
    return {
      list: list,
      done: done,
      completed: done.length,
      totalXp: totalXp,
      info: info,
      level: info.level,
      categories: new Set(done.map((q) => q.category).filter(Boolean)),
      hasLegendary: done.some((q) => q.rarity === "legendary"),
      hasCustom: list.some((q) => !q.sourceId),
      streak: computeStreak(done),
    };
  }

  function achUnlocked(stats) {
    return ACHIEVEMENTS.filter((a) => a.check(stats));
  }

  /* ---------- hero progress bar ---------- */
  function refreshHeroBar() {
    const s = computeStats();
    document.getElementById("hb-level").textContent = s.info.level;
    document.getElementById("hb-rank").textContent = s.info.title;
    document.getElementById("hb-fill").style.width =
      Math.round(s.info.progress * 100) + "%";
    document.getElementById("hb-xp").textContent = s.totalXp + " XP";
  }

  /* ---------- Hero page ---------- */
  function renderHero() {
    const s = computeStats();
    const info = s.info;
    const unlocked = achUnlocked(s).length;

    document.getElementById("hero-profile").innerHTML = `
      <div class="profile">
        <div class="profile__badge">
          <span class="profile__lvl-label">Level</span>
          <span class="profile__lvl">${info.level}</span>
        </div>
        <div class="profile__main">
          <div class="profile__rank">${escapeHtml(info.title)}</div>
          <div class="profile__bar">
            <div class="profile__fill" style="width:${Math.round(info.progress * 100)}%"></div>
          </div>
          <div class="profile__xp">
            <strong>${s.totalXp} XP</strong> · ${info.toNext} XP to Level ${info.nextLevel}
          </div>
        </div>
      </div>
      <div class="stat-tiles">
        ${statTile("⭐", s.totalXp, "Total XP")}
        ${statTile("✅", s.completed, s.completed === 1 ? "Quest Done" : "Quests Done")}
        ${statTile("🔥", s.streak, "Day Streak")}
        ${statTile("🎖️", unlocked + "/" + ACHIEVEMENTS.length, "Badges")}
      </div>`;

    renderHeroThemes();

    document.getElementById("ach-count").textContent = `${unlocked}/${ACHIEVEMENTS.length}`;
    document.getElementById("hero-achievements").innerHTML = ACHIEVEMENTS.map(
      (a) => achCard(a, a.check(s))
    ).join("");
  }

  function statTile(icon, value, label) {
    return `
      <div class="stat-tile">
        <span class="stat-tile__icon">${icon}</span>
        <span class="stat-tile__value">${escapeHtml(value)}</span>
        <span class="stat-tile__label">${escapeHtml(label)}</span>
      </div>`;
  }

  function renderHeroThemes() {
    const container = document.getElementById("hero-themes");
    if (!container) return;
    const s = computeStats();
    const active = currentTheme();
    container.innerHTML = Object.keys(THEMES)
      .map((key) => {
        const t = THEMES[key];
        const unlocked = s.level >= t.level;
        const isActive = active === key;
        const state = isActive
          ? "Equipped"
          : unlocked
          ? "Equip"
          : "🔒 Level " + t.level;
        return `
        <button type="button"
          class="theme-card${unlocked ? "" : " is-locked"}${isActive ? " is-equipped" : ""}"
          data-theme-pick="${key}" ${unlocked ? "" : "disabled"}>
          <span class="theme-card__swatch tswatch-${key}"></span>
          <span class="theme-card__name">${t.icon} ${escapeHtml(t.label)}</span>
          <span class="theme-card__state">${state}</span>
        </button>`;
      })
      .join("");
    Array.from(container.querySelectorAll("[data-theme-pick]")).forEach((el) => {
      el.addEventListener("click", () => {
        const key = el.dataset.themePick;
        if (computeStats().level < THEMES[key].level) return;
        applyTheme(key);
        toast(`${THEMES[key].icon} ${THEMES[key].label} equipped.`);
      });
    });
  }

  function achCard(a, unlocked) {
    return `
      <div class="ach${unlocked ? " is-unlocked" : " is-locked"}">
        <span class="ach__icon">${unlocked ? a.icon : "🔒"}</span>
        <span class="ach__text">
          <span class="ach__name">${escapeHtml(a.name)}</span>
          <span class="ach__desc">${escapeHtml(a.desc)}</span>
        </span>
      </div>`;
  }

  // Celebrate level-ups, theme unlocks, and new achievements after a change.
  function announceProgress(before, after) {
    if (after.info.level > before.info.level) {
      toast(
        `⬆️ Level Up! You are now Level ${after.info.level} — ${after.info.title}`,
        "epic"
      );
      Object.keys(THEMES).forEach((k) => {
        const lvl = THEMES[k].level;
        if (lvl > before.info.level && lvl <= after.info.level) {
          toast(`🎨 New look unlocked: ${THEMES[k].label} — equip it on the Hero page!`, "epic");
        }
      });
    }
    ACHIEVEMENTS.forEach((a) => {
      if (a.check(after) && !a.check(before)) {
        toast(`🎖️ Achievement: ${a.name}`, "epic");
      }
    });
  }

  /* ============================================================
     TODAY
     ============================================================ */
  const todayQuestEl = document.getElementById("today-quest");
  const rerollBtn = document.getElementById("reroll-btn");
  const rerollHint = document.getElementById("reroll-hint");
  const MAX_REROLLS = 1;

  // Legendary quests drop rarely (~1 in 7 days); the rest are drawn from commons.
  function pickQuestIndex(seedStr) {
    const seed = hashString(seedStr);
    const commons = [];
    const legends = [];
    QUEST_POOL.forEach((q, i) => {
      (q.rarity === "legendary" ? legends : commons).push(i);
    });
    if (legends.length && seed % 7 === 0) {
      return legends[seed % legends.length];
    }
    return commons[seed % commons.length];
  }

  function getTodayState() {
    const key = todayKey();
    let state = load(STORE.today, null);
    if (!state || state.date !== key) {
      // new day → fresh quest, reroll refilled
      state = {
        date: key,
        index: pickQuestIndex(key),
        rerollsUsed: 0,
      };
      save(STORE.today, state);
    }
    return state;
  }

  function renderToday() {
    const state = getTodayState();
    const quest = QUEST_POOL[state.index];
    const claimed = inJournal("daily:" + state.date + ":" + quest.id);

    const iconsHtml = (quest.icons || [])
      .map((i) => `<span>${escapeHtml(i)}</span>`)
      .join("");

    todayQuestEl.innerHTML = `
      <article class="scroll${quest.rarity === "legendary" ? " scroll--legendary" : ""}">
        ${legendaryBadge(quest)}
        <h3 class="quest__title">${escapeHtml(quest.title)}</h3>
        <div class="quest__icons">${iconsHtml}</div>
        <div class="quest__tags">${tagHtml(quest)}</div>
        <p class="quest__desc">${escapeHtml(quest.description)}</p>
        <div class="quest__cta">
          ${
            claimed
              ? `<button class="btn btn--ghost" type="button" disabled>✓ In Your Journal</button>`
              : `<button class="btn btn--primary" id="claim-btn" type="button"><span aria-hidden="true">✦</span> Add to Journal</button>`
          }
        </div>
        ${
          claimed
            ? `<p class="quest__claimed">This adventure has been recorded. Fare well, traveller.</p>`
            : ""
        }
      </article>`;

    if (!claimed) {
      document.getElementById("claim-btn").addEventListener("click", () => {
        addToJournal(quest, "daily:" + state.date + ":" + quest.id);
        toast("⚔️ Quest added to your journal!");
        renderToday();
      });
    }

    // reroll availability
    const left = MAX_REROLLS - state.rerollsUsed;
    rerollBtn.disabled = left <= 0;
    rerollHint.textContent = left > 0 ? `(${left} left today)` : "(none left today)";
  }

  rerollBtn.addEventListener("click", () => {
    const state = getTodayState();
    if (state.rerollsUsed >= MAX_REROLLS) return;
    // draw a fresh quest (still able to surprise you with a legendary)
    let next = pickQuestIndex(state.date + "-reroll");
    if (next === state.index) next = (next + 1) % QUEST_POOL.length;
    state.index = next;
    state.rerollsUsed += 1;
    save(STORE.today, state);
    toast("🎲 The dice are cast — a new quest appears.");
    renderToday();
  });

  /* ============================================================
     JOURNAL
     ============================================================ */
  let journalFilter = "all";

  function renderFilters(list) {
    const container = document.getElementById("journal-filters");
    if (!list.length) {
      container.innerHTML = "";
      journalFilter = "all";
      return;
    }
    const counts = {};
    list.forEach((q) => {
      counts[q.category] = (counts[q.category] || 0) + 1;
    });
    // if the active filter no longer exists in the journal, fall back to All
    if (journalFilter !== "all" && !counts[journalFilter]) journalFilter = "all";

    const cats = Object.keys(CATEGORIES).filter((c) => counts[c]);
    let html = filterChip("all", "All", "", list.length, null);
    cats.forEach((c) => {
      html += filterChip(
        c,
        CATEGORIES[c].label,
        CATEGORIES[c].icon,
        counts[c],
        CATEGORIES[c].color
      );
    });
    container.innerHTML = html;
    Array.from(container.querySelectorAll("[data-filter]")).forEach((el) => {
      el.addEventListener("click", () => {
        journalFilter = el.dataset.filter;
        renderJournal();
      });
    });
  }

  function filterChip(key, label, icon, count, color) {
    const active = journalFilter === key;
    const style = color ? ` style="--chip:${color}"` : "";
    return (
      `<button type="button" class="filter-chip${active ? " is-active" : ""}"` +
      ` data-filter="${key}"${style}>` +
      `${icon ? icon + " " : ""}${escapeHtml(label)}` +
      `<span class="filter-chip__n">${count}</span></button>`
    );
  }

  function renderJournal() {
    const list = getJournal();
    renderFilters(list);
    const scoped =
      journalFilter === "all"
        ? list
        : list.filter((q) => q.category === journalFilter);
    const active = scoped.filter((q) => q.status === "active");
    const done = scoped.filter((q) => q.status === "done");

    const activeList = document.getElementById("active-list");
    const doneList = document.getElementById("done-list");
    activeList.innerHTML = active.map((q) => cardHtml(q)).join("");
    doneList.innerHTML = done.map((q) => cardHtml(q)).join("");

    const label =
      journalFilter === "all" ? "" : " " + CATEGORIES[journalFilter].label;
    const activeEmpty = document.getElementById("active-empty");
    const doneEmpty = document.getElementById("done-empty");
    activeEmpty.hidden = active.length > 0;
    doneEmpty.hidden = done.length > 0;
    if (journalFilter !== "all") {
      activeEmpty.innerHTML = `No active${escapeHtml(label)} quests right now.`;
      doneEmpty.innerHTML = `No completed${escapeHtml(label)} quests yet.`;
    } else {
      activeEmpty.innerHTML =
        "No quests underway. Claim one from <em>Today</em> or forge your own in <em>Generate</em>.";
      doneEmpty.innerHTML = "Your hall of triumphs awaits its first tale.";
    }
    document.getElementById("active-tally").textContent = active.length;
    document.getElementById("done-tally").textContent = done.length;

    // wire events
    Array.from(document.querySelectorAll("[data-toggle]")).forEach((el) => {
      el.addEventListener("change", () => toggleComplete(el.dataset.toggle));
    });
    Array.from(document.querySelectorAll("[data-remove]")).forEach((el) => {
      el.addEventListener("click", () => removeQuest(el.dataset.remove));
    });
  }

  function cardHtml(q) {
    const done = q.status === "done";
    const iconsHtml = (q.icons || []).join(" ");
    const stamp = done
      ? `Completed ${escapeHtml(q.completedAt || "")} · +${questXp(q)} XP`
      : `Claimed ${escapeHtml(q.addedAt || "")} · ${questXp(q)} XP`;
    return `
      <li>
        <article class="card${q.rarity === "legendary" ? " card--legendary" : ""}">
          <div class="card__top">
            <input class="card__check" type="checkbox" ${done ? "checked" : ""}
              data-toggle="${q.uid}" aria-label="Mark '${escapeHtml(q.title)}' complete" />
            <div class="card__body">
              ${q.rarity === "legendary" ? `<span class="legendary-badge legendary-badge--sm">★ Legendary</span>` : ""}
              <h4 class="card__title">${escapeHtml(q.title)}</h4>
              ${iconsHtml ? `<div class="card__icons">${escapeHtml(iconsHtml)}</div>` : ""}
              <p class="card__desc">${escapeHtml(q.description)}</p>
              <div class="card__meta">${tagHtml(q)}</div>
              <div class="card__foot">
                <span class="card__stamp">${stamp}</span>
                <button class="card__remove" type="button" data-remove="${q.uid}">Discard</button>
              </div>
            </div>
          </div>
        </article>
      </li>`;
  }

  function toggleComplete(uidVal) {
    const list = getJournal();
    const q = list.find((x) => x.uid === uidVal);
    if (!q) return;
    const before = computeStats(); // reads storage = pre-change state
    if (q.status === "active") {
      q.status = "done";
      q.completedAt = todayKey();
      setJournal(list);
      toast(`🏆 Quest complete · +${questXp(q)} XP`);
      announceProgress(before, computeStats());
    } else {
      q.status = "active";
      q.completedAt = null;
      setJournal(list);
      toast(`Quest returned to active · −${questXp(q)} XP`);
    }
    renderJournal();
  }

  function removeQuest(uidVal) {
    const list = getJournal().filter((x) => x.uid !== uidVal);
    setJournal(list);
    renderJournal();
    renderToday(); // in case a claimed daily quest was discarded
    toast("The quest fades from your journal.");
  }

  /* ============================================================
     GENERATE
     ============================================================ */
  const form = document.getElementById("generate-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("f-title").value.trim();
    const description = document.getElementById("f-desc").value.trim();
    if (!title || !description) return;

    // parse icons: split emoji / characters, cap at 5
    const rawIcons = document.getElementById("f-icons").value.trim();
    const icons = rawIcons
      ? Array.from(
          rawIcons.match(/\p{Extended_Pictographic}(‍\p{Extended_Pictographic})*|\S/gu) || []
        ).slice(0, 5)
      : ["✦"];

    const quest = {
      title,
      description,
      icons,
      category: document.getElementById("f-category").value,
      time: document.getElementById("f-time").value,
      cost: document.getElementById("f-cost").value,
      difficulty: document.getElementById("f-diff").value,
    };
    const before = computeStats();
    addToJournal(quest, null);
    form.reset();
    toast("✧ Your quest is forged and added to the journal!");
    announceProgress(before, computeStats());
    route("journal");
  });

  /* ============================================================
     Init
     ============================================================ */
  // populate the Generate category dropdown from the compendium
  (function fillCategorySelect() {
    const sel = document.getElementById("f-category");
    if (!sel) return;
    sel.innerHTML = Object.keys(CATEGORIES)
      .map(
        (c, idx) =>
          `<option value="${c}"${idx === 0 ? " selected" : ""}>${
            CATEGORIES[c].icon
          } ${CATEGORIES[c].label}</option>`
      )
      .join("");
  })();

  document.getElementById("foot-date").textContent = new Date().toLocaleDateString(
    undefined,
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  // Restore the saved theme, but only if the player has unlocked it.
  (function initTheme() {
    const saved = load(STORE.theme, "light");
    const level = computeStats().level;
    applyTheme(THEMES[saved] && level >= THEMES[saved].level ? saved : "light");
  })();

  updateBadge();
  refreshHeroBar();
  renderToday();
  const initial = (location.hash || "#today").replace("#", "");
  route(initial);
})();
