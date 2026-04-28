# ⚽ FutWiki — Society™

> A Wikipedia-style static web page documenting the **Society™** football group, formed by students of the [Instituto de Informática (INF)](https://inf.ufg.br/) at UFG, Goiânia — powered entirely by a single `data.json` export from the App do Fut.

---

## 📖 About

Society™ is an informal futsal/society group that meets every Saturday at the FEF gym (UFG campus). This wiki documents the group's history, rules, players, standings, and monthly highlights in a clean Wikipedia-inspired layout.

All statistics on the page are **calculated dynamically at page load** — just update `data.json` and refresh.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📰 **Wikipedia layout** | Infobox, table of contents, collapsible sections (HTML5 `<details>`) |
| 🏆 **Craque do Mês** | Dynamic Player of the Month engine — groups sessions by month, ranks top-3 by G+A (Goals + Assists), injects monthly winner cards with photo, trivia quote, and podium |
| 🎖️ **Craque Atual sidebar** | Mini-infobox in the sidebar auto-populated with the most recent month's winner |
| 📊 **All-Time Statistics** | Full player table with goals, assists, G+A, matches played, cards — sortable by clicking any column header |
| 📈 **12 Stat Categories** | Top scorers, assists, power ranking (G+A), discipline (cards), own goals, ratings, win rate, Iron Man (attendance), deadly duos, blowout kings, clutch performers, peak goal times |
| 🖼️ **Player Icons** | 3:4 portrait images throughout; coloured initial-letter badge as fallback |
| 📱 **Responsive** | Mobile-friendly layout and collapsible sections |

---

## 🗂️ Project Structure

```
WikiFut/
├── index.html              # Main page — all layout, CSS, and section HTML
├── stats.js                # Statistics engine (12 stat categories)
├── craque_do_mes.js        # Player of the Month engine + sidebar infobox
├── all_time_stats.js       # All-Time player stats table engine
├── data.json               # Match data exported from the App do Fut
├── assets/
│   ├── logo/               # Group logo (logo.jpeg)
│   ├── players_icons/      # Player icon images (referenced in data.json)
│   └── craques_do_mes/     # Monthly winner photos (MM_YYYY.jpeg)
└── TODO.md                 # Open tasks
```

---

## 🚀 Running Locally

The page uses `fetch()` to load `data.json`, so it must be served over HTTP — simply opening `index.html` from the filesystem won't work.

```bash
# Option 1 — Python (built-in)
cd WikiFut
python3 -m http.server 8080
# → open http://localhost:8080

# Option 2 — Node.js
npx serve .

# Option 3 — VS Code
# Install the "Live Server" extension and click "Go Live"
```

---

## 🗃️ Data Format

All match data lives in **`data.json`**, exported directly from the App do Fut. The expected top-level structure is:

```json
{
  "sessions_data": [
    {
      "date": "DD/MM/YYYY",
      "timestamp": "<ISO 8601>",
      "history": [
        {
          "players": {
            "red":   [{ "name": "...", "icon": "assets/players_icons/..." }],
            "white": [{ "name": "...", "icon": "assets/players_icons/..." }]
          },
          "events": [
            { "type": "goal",        "player": "...", "assist": "...", "time": 123 },
            { "type": "yellow_card", "player": "..." },
            { "type": "red_card",    "player": "..." }
          ]
        }
      ]
    }
  ]
}
```

---

## 🖼️ Adding Monthly Winner Photos

To display a Craque do Mês photo in the sidebar and Hall section, add a **3:4 portrait JPEG** to:

```
assets/craques_do_mes/MM_YYYY.jpeg
```

Examples:
```
assets/craques_do_mes/03_2026.jpeg   ← Março 2026
assets/craques_do_mes/04_2026.jpeg   ← Abril 2026
```

If the file is missing, the page displays a coloured placeholder automatically.

---

## ✏️ Adding Player Trivia

Open `craque_do_mes.js` and edit the `playerTrivia` dictionary at the top of the file:

```js
const playerTrivia = {
  "Player Name": [
    "First trivia line (shown as the featured quote).",
    "Optional second line for extra context."
  ],
  // ...
};
```

Players without an entry get a default fallback message.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 (semantic) |
| Styling | Vanilla CSS (CSS custom properties, `aspect-ratio`, `flow-root`) |
| Logic | Vanilla JavaScript (ES2020+, `async/await`, `fetch`) |
| Fonts | [Linux Libertine](https://fonts.google.com/) via Google Fonts |
| Data | JSON (exported from the Society™ Flutter app) |

No frameworks, no build step, no dependencies — just open and run.

---

## 👥 Contributors

| Name | Role |
|---|---|
| **Rafael Batista** | Co-developer of the App do Fut & Wiki |
| **Enzo Marinho** | Co-developer of the App do Fut |
| **Matheus Marques** | Visual identity & "Craque do Jogo" prize design |
| **Igor Pache** | Co-founder of Society™ |
| **Lucas Dalla** | Co-founder of Society™ |

---

## 📄 License

This project is for internal use by the Society™ group.  
*FutWiki · Instituto de Informática · UFG · Goiânia, GO*
