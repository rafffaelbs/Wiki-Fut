/**
 * all_time_stats.js — Society™ Wiki · Estatísticas Gerais dos Jogadores
 *
 * Parses data.json → aggregates per-player totals across ALL sessions →
 * renders a sortable wiki-table into #alltime-stats-body.
 *
 * Stats collected per player:
 *   Matches Played  — appearances in players.red / players.white arrays
 *   Icon            — first non-null icon found in players arrays
 *   Goals           — events[type === "goal"].player
 *   Assists         — events[type === "goal"].assist
 *   GA              — Goals + Assists
 *   Yellow Cards    — events[type === "yellow_card"].player
 *   Red Cards       — events[type === "red_card"].player
 */

// ─── Entry Point ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    initAllTimeStats(data);
  } catch (err) {
    console.error('[AllTimeStats] Failed to load data.json:', err);
    const tbody = document.getElementById('alltime-stats-body');
    const loading = document.getElementById('alltime-stats-loading');
    if (loading) loading.style.display = 'none';
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="num" style="color:var(--wiki-red);font-style:italic;">
            Erro ao carregar dados: ${err.message}
          </td>
        </tr>`;
    }
  }
});

// ─── Data Aggregation ──────────────────────────────────────────────────────────

function aggregatePlayers(data) {
  const map = new Map(); // name → raw stats

  function get(name) {
    if (!map.has(name)) {
      map.set(name, {
        name,
        icon: null,
        matches: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
      });
    }
    return map.get(name);
  }

  for (const session of data.sessions_data ?? []) {
    for (const match of session.history ?? []) {

      // ── Matches Played ──────────────────────────────────────
      const sides = [
        ...(match.players?.red ?? []),
        ...(match.players?.white ?? []),
      ];
      for (const p of sides) {
        if (!p?.name) continue;
        const ps = get(p.name);
        ps.matches++;
        if (!ps.icon && p.icon) ps.icon = p.icon; // keep first found icon
      }

      // ── Events ──────────────────────────────────────────────
      for (const ev of match.events ?? []) {
        switch (ev.type) {
          case 'goal':
            if (ev.player) get(ev.player).goals++;
            if (ev.assist) get(ev.assist).assists++;
            break;
          case 'yellow_card':
            if (ev.player) get(ev.player).yellowCards++;
            break;
          case 'red_card':
            if (ev.player) get(ev.player).redCards++;
            break;
        }
      }
    }
  }

  // Materialise GA and return as a plain array
  return Array.from(map.values()).map(p => ({
    ...p,
    ga: p.goals + p.assists,
  }));
}

// ─── Sorting ───────────────────────────────────────────────────────────────────

/** Map of data-sort attribute values → accessor functions */
const SORT_FN = {
  'sort-name': p => p.name,
  'sort-matches': p => p.matches,
  'sort-goals': p => p.goals,
  'sort-assists': p => p.assists,
  'sort-ga': p => p.ga,
  'sort-yellow': p => p.yellowCards,
  'sort-red': p => p.redCards,
};

function sortPlayers(players, key, asc) {
  const fn = SORT_FN[key];
  if (!fn) return [...players];
  return [...players].sort((a, b) => {
    const va = fn(a), vb = fn(b);
    if (typeof va === 'string') {
      return asc ? va.localeCompare(vb, 'pt') : vb.localeCompare(va, 'pt');
    }
    return asc ? va - vb : vb - va;
  });
}

// ─── Icon Cell ─────────────────────────────────────────────────────────────────

/** Deterministic colour for a player without an icon */
const PALETTE = [
  '#2980b9', '#27ae60', '#8e44ad', '#e67e22', '#c0392b',
  '#16a085', '#d35400', '#2c3e50', '#f39c12', '#1abc9c',
];

function playerColour(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function buildIconCell(player) {
  const colour = playerColour(player.name);
  const initial = player.name.charAt(0).toUpperCase();

  // No icon at all → always show coloured badge
  if (!player.icon) {
    return `<span class="at-icon-fb" style="background:${colour};">${initial}</span>`;
  }

  // Render img + hidden fallback side-by-side.
  // onerror hides the img and reveals the next sibling — no HTML injection needed.
  return `<img src="${player.icon}" alt="" class="at-icon" loading="lazy"
    onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex';"
  ><span class="at-icon-fb" style="background:${colour};display:none;">${initial}</span>`;
}

// ─── Row Rendering ─────────────────────────────────────────────────────────────

function renderBody(players, tbody) {
  tbody.innerHTML = players.map((p, i) => {
    const yellow = p.yellowCards > 0
      ? `<span class="card card-yellow"></span> ${p.yellowCards}`
      : '—';
    const red = p.redCards > 0
      ? `<span class="card card-red"></span> ${p.redCards}`
      : '—';

    return `
      <tr>
        <td class="rank">${i + 1}</td>
        <td class="at-icon-cell">${buildIconCell(p)}</td>
        <td class="at-name">${p.name}</td>
        <td class="num">${p.matches}</td>
        <td class="num">${p.goals}</td>
        <td class="num">${p.assists}</td>
        <td class="num"><strong>${p.ga}</strong></td>
        <td class="num">${yellow}</td>
        <td class="num">${red}</td>
      </tr>`;
  }).join('');
}

// ─── Sort Indicators ──────────────────────────────────────────────────────────

function setIndicator(headers, activeKey, asc) {
  headers.forEach(th => {
    const arrow = th.querySelector('.at-sort-arrow');
    if (arrow) arrow.remove();
  });
  const active = [...headers].find(th => th.dataset.sort === activeKey);
  if (!active) return;
  const arrow = document.createElement('span');
  arrow.className = 'at-sort-arrow';
  arrow.textContent = asc ? ' ▲' : ' ▼';
  arrow.style.cssText = 'font-size:0.7em;color:var(--wiki-blue);';
  active.appendChild(arrow);
}

// ─── Init ──────────────────────────────────────────────────────────────────────

function initAllTimeStats(data) {
  const table = document.getElementById('table-alltime-stats');
  const tbody = document.getElementById('alltime-stats-body');
  const loading = document.getElementById('alltime-stats-loading');

  if (!table || !tbody) return;

  // 1. Build master array
  const allPlayers = aggregatePlayers(data);

  // 2. Default sort: GA descending
  let currentKey = 'sort-ga';
  let asc = false;
  let sorted = sortPlayers(allPlayers, currentKey, asc);

  // 3. Initial render
  renderBody(sorted, tbody);
  if (loading) loading.style.display = 'none';

  // 4. Header click handlers
  const headers = table.querySelectorAll('th[data-sort]');

  // Set initial indicator
  setIndicator(headers, currentKey, asc);

  headers.forEach(th => {
    th.style.cursor = 'pointer';
    th.title = 'Clique para ordenar';
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (key === currentKey) {
        asc = !asc;                         // toggle direction
      } else {
        currentKey = key;
        asc = (key === 'sort-name');        // names default asc; numbers default desc
      }
      sorted = sortPlayers(allPlayers, currentKey, asc);
      renderBody(sorted, tbody);
      setIndicator(headers, currentKey, asc);
    });
  });
}
