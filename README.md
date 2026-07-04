# 📜 SideQuests

> Turn each tiny adventure into another line in your story.

**SideQuests** is a light, fantasy-RPG themed web app that drops you a small
real-world side quest every day. Claim the ones that call to you, track them in
your journal, and forge your own.

## ✨ Features

- **Today** — a fresh side quest each day that resets at midnight. Don't like it?
  You get **one reroll per day**. Add any quest you fancy straight to your journal.
- **Journal** — your active and completed quests. Check quests off as you go and
  watch your hall of triumphs grow.
- **Generate** — forge your own custom side quests (name, task, time, cost,
  spirit, difficulty, icons) and add them to your journal.
- **Day / Night** parchment theme toggle.
- Everything is saved locally in your browser — no account, no backend.

## 🗺️ Getting started

It's a static site — no build step. Just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## 🧱 Structure

| File         | Purpose                                              |
| ------------ | ---------------------------------------------------- |
| `index.html` | Page structure and the three views                   |
| `styles.css` | Parchment / fantasy styling + CSS landscape banner   |
| `app.js`     | Routing, daily quest logic, journal, generate, theme |
| `quests.js`  | The compendium of built-in side quests               |

## 🎲 How the daily quest works

Each day is seeded from the date, so the day's starting quest is deterministic.
Your reroll and any claimed quest are remembered for that day via `localStorage`.
At midnight a new quest appears and your reroll refills.
