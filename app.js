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

  /* ---------- toast ---------- */
  let toastTimer = null;
  const toastEl = document.getElementById("toast");
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2600);
  }

  /* ============================================================
     Theme
     ============================================================ */
  const themeToggle = document.getElementById("theme-toggle");
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.setAttribute("aria-checked", theme === "night" ? "true" : "false");
    save(STORE.theme, theme);
  }
  applyTheme(load(STORE.theme, "light"));
  themeToggle.addEventListener("click", () => {
    const next =
      document.documentElement.getAttribute("data-theme") === "night"
        ? "light"
        : "night";
    applyTheme(next);
  });

  /* ============================================================
     Routing
     ============================================================ */
  const tabs = Array.from(document.querySelectorAll(".nav__tab"));
  const views = {
    today: document.getElementById("view-today"),
    journal: document.getElementById("view-journal"),
    generate: document.getElementById("view-generate"),
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
    if (location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  tabs.forEach((t) => t.addEventListener("click", () => route(t.dataset.route)));

  /* ============================================================
     Journal state
     ============================================================ */
  function getJournal() {
    return load(STORE.journal, []);
  }
  function setJournal(list) {
    save(STORE.journal, list);
    updateBadge();
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
      ? `Completed ${escapeHtml(q.completedAt || "")}`
      : `Claimed ${escapeHtml(q.addedAt || "")}`;
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
    if (q.status === "active") {
      q.status = "done";
      q.completedAt = todayKey();
      toast("🏆 Quest complete — glory is yours!");
    } else {
      q.status = "active";
      q.completedAt = null;
    }
    setJournal(list);
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
    addToJournal(quest, null);
    form.reset();
    toast("✧ Your quest is forged and added to the journal!");
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

  updateBadge();
  renderToday();
  const initial = (location.hash || "#today").replace("#", "");
  route(initial);
})();
