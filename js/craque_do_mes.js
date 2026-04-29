/**
 * craque_do_mes.js — Society™ Wiki · "Craque do Mês" Engine
 *
 * Reads data.json → groups sessions by Month/Year → calculates top-3 GA
 * (Goals + Assists) per month → injects all HTML into #craque-do-mes-container.
 *
 * No hardcoded trivia in data.json or in the HTML — configure it below.
 */

// ─── Configuration ─────────────────────────────────────────────────────────────

/**
 * Map player names to one or more trivia strings.
 * The first string is displayed as the featured quote.
 * Add as many players as needed; unknown players get the default below.
 */
const playerTrivia = {
  "Rafael El Craque": [
    "Desenvolvedor do App do Fut e meia-organizador por excelência — quando não está no app, está distribuindo assistências.",
    "Co-criador do sistema de estatísticas junto a Enzo Marinho."
  ],
  "Rian": [
    "Detentor atual do título de Craque do Mês (Abril 2026). Sua foto reina no grupo do WhatsApp.",
    "Especialista em gols decisivos nos últimos minutos de jogo."
  ],
  "Basiado": [
    "Gabriel 'Baseado' Melo — o primeiro Craque do Mês da história do grupo, um título histórico inédito.",
    "Atacante instintivo, suas finalizações são cirúrgicas e imprevisíveis."
  ],
  "Paulo": [
    "Meia/Atacante com faro de gol e visão para o passe — primeiro campeão com G+A contando (Fevereiro 2026).",
    "Conhecido pelo chute de longa distância que todo mundo viu mas ninguém esperava."
  ],
  "Enzo": [
    "Co-desenvolvedor do App do Fut. Em campo, distribui assistências com a mesma precisão com que escreve código.",
    "Cria jogadas do nada e encontra espaços que ninguém mais enxerga."
  ],
  "Lucas Dalla": [
    "Co-fundador do Society™. Lidera pelo exemplo — dentro e fora de campo.",
    "Sempre presente para completar o placar nos momentos certos."
  ],
  "Marcos dos Anjos": [
    "Assistente-mor do time. Os números de assistências falam por si só.",
    "Prefere dar o passe que faz o gol a dar o gol em si — generosidade rara."
  ],
  "Arthur da Mata": [
    "Presença constante nas sessões. Marcações fortes e gols quando menos se espera.",
  ],
  "Matheus Marques": [
    "Designer do prêmio 'Craque do Jogo' — cria a identidade visual e ainda faz gols.",
    "Combina criatividade de fora e de dentro de campo."
  ],
  "Darlei": [
    "Velocidade e finalização. Difícil de marcar quando entra em velocidade.",
  ],
  "Pedro Lukas": [
    "Jogador versátil que aparece nos momentos decisivos do placar.",
  ],
  "José": [
    "Sempre presente nas sessões, distribuindo bem a bola no meio-campo.",
  ],
  "Igor": [
    "Assistedor nato — quando está em forma, o time todo melhora.",
  ],
  "Alberto": [
    "Sólido no meio-campo, equilibra defesa e ataque com naturalidade.",
  ],
  "Kesley": [
    "Criativo e habilidoso, frequentemente o diferencial nas partidas truncadas.",
  ],
  "Danilo": [
    "Participação consistente; traz equilíbrio e seriedade ao time.",
  ],
  "Dudu": [
    "Sempre presente e comprometido — o tipo de jogador que todo time quer ter.",
  ],
  "Gustavo Costa": [
    "Intensidade máxima em campo — força física aliada ao jogo coletivo.",
  ],
  "Luis": [
    "Participa com dedicação em cada sessão, disputando cada bola.",
  ],
};

/** Shown when a player has no entry in playerTrivia */
const DEFAULT_TRIVIA = "Um dos destaques do Fut do INF — os números falam por si só.";

// ─── Month helpers ─────────────────────────────────────────────────────────────

const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

/**
 * Parse the session date string "DD/MM/YYYY" or fall back to ISO timestamp.
 * Returns { month: 1-12, year: YYYY } or null.
 */
function parseSessionDate(session) {
  if (session.date) {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(session.date)) {
      const [, mm, yyyy] = session.date.split('/').map(Number);
      return { month: mm, year: yyyy };
    }
    const d = new Date(session.date);
    if (!isNaN(d)) return { month: d.getMonth() + 1, year: d.getFullYear() };
  }
  if (session.timestamp) {
    const d = new Date(session.timestamp);
    if (!isNaN(d)) return { month: d.getMonth() + 1, year: d.getFullYear() };
  }
  return null;
}

/** "YYYY-MM" sort key */
function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** "April 2026" → "04_2026" → image path */
function imagePathForMonth(month, year) {
  const mm = String(month).padStart(2, '0');
  return `assets/craques_do_mes/${mm}_${year}.jpeg`;
}

// ─── Data Processing ───────────────────────────────────────────────────────────

/**
 * Groups all session matches by month and tallies GA per player.
 * Returns a Map keyed by "YYYY-MM" → { month, year, players: Map<name, {goals, assists}> }
 */
function groupByMonth(data) {
  const months = new Map();

  for (const [dataKey, value] of Object.entries(data)) {
    if (!dataKey.startsWith('match_history_')) continue;
    let history = [];
    try {
      history = JSON.parse(value);
    } catch (e) {
      continue;
    }
    if (history.length === 0) continue;
    const dateInfo = parseSessionDate(history[0]);
    if (!dateInfo) continue;

    const { month, year } = dateInfo;
    const key = monthKey(year, month);

    if (!months.has(key)) {
      months.set(key, { month, year, players: new Map() });
    }

    const monthData = months.get(key);

    for (const match of history) {
      for (const ev of match.events ?? []) {
        if (ev.type === 'goal' && ev.player) {
          const p = getOrCreatePlayer(monthData.players, ev.player);
          p.goals++;

          if (ev.assist) {
            const a = getOrCreatePlayer(monthData.players, ev.assist);
            a.assists++;
          }
        }
      }
    }
  }

  return months;
}

function getOrCreatePlayer(playerMap, name) {
  if (!playerMap.has(name)) {
    playerMap.set(name, { name, goals: 0, assists: 0 });
  }
  return playerMap.get(name);
}

/**
 * For a month entry, returns top-3 players sorted by GA desc, goals desc (tiebreak).
 */
function rankMonth(monthData) {
  return Array.from(monthData.players.values())
    .map(p => ({ ...p, ga: p.goals + p.assists }))
    .filter(p => p.ga > 0)
    .sort((a, b) => b.ga - a.ga || b.goals - a.goals)
    .slice(0, 3);
}

/**
 * Counts all-time 1st-place wins per player across all months.
 * Returns Map<playerName, titlesCount>
 */
function countAllTimeTitles(rankedMonths) {
  const titles = new Map();
  for (const { ranked } of rankedMonths) {
    if (ranked.length === 0) continue;
    // Handle shared 1st place (same GA and goals)
    const first = ranked[0];
    const coWinners = ranked.filter(
      p => p.ga === first.ga && p.goals === first.goals
    );
    for (const winner of coWinners) {
      titles.set(winner.name, (titles.get(winner.name) ?? 0) + 1);
    }
  }
  return titles;
}

// ─── HTML Builders ─────────────────────────────────────────────────────────────

/** Returns the trivia string for a player (first item in array, or default) */
function getTrivia(playerName) {
  const entries = playerTrivia[playerName];
  if (!entries || entries.length === 0) return DEFAULT_TRIVIA;
  return entries[0];
}

/** Medal emoji for position index (0-based) */
function medalEmoji(i) {
  return ['🥇', '🥈', '🥉'][i] ?? `${i + 1}º`;
}

/** Medal CSS class for position index */
function medalClass(i) {
  return ['gold', 'silver', 'bronze'][i] ?? '';
}

/**
 * Builds the HTML string for a single monthly subtopic block.
 */
function buildMonthSubtopic(month, year, ranked, sectionIndex) {
  const monthName = MONTH_NAMES_PT[month - 1];
  const fullLabel = `${monthName} ${year}`;
  const imgPath = imagePathForMonth(month, year);
  const headingId = `craque-${String(month).padStart(2, '0')}-${year}`;

  if (ranked.length === 0) {
    return `
      <div class="cdm-month-block" id="${headingId}">
        <div class="section-header" style="border-bottom:none; margin-top:.5rem;">
          <h3>${sectionIndex} ${fullLabel}</h3>
        </div>
        <p style="color:var(--wiki-muted); font-style:italic;">Sem dados de gols para este mês.</p>
      </div>`;
  }

  const winner = ranked[0];
  const triviaText = getTrivia(winner.name);

  // Runner-up and third-place lines
  const runnersUp = ranked.slice(1).map((p, i) =>
    `<li>
      <span class="${medalClass(i + 1)}">${medalEmoji(i + 1)} ${p.name}</span>
      — ${p.goals} Gols, ${p.assists} Assists (<strong>${p.ga} G+A</strong>)
    </li>`
  ).join('');

  return `
    <div class="cdm-month-block" id="${headingId}">
      <div class="section-header" style="border-bottom:none; margin-top:.8rem;">
        <h3>${sectionIndex} ${fullLabel}</h3>
      </div>

      <div class="cdm-winner-card">
        <div class="cdm-winner-photo-wrap">
          <img
            class="cdm-winner-photo"
            src="${imgPath}"
            alt="Craque do Mês de ${fullLabel}"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          >
          <div class="cdm-photo-placeholder" style="display:none;">
            🏆<span>${winner.name.split(' ')[0]}</span>
          </div>
        </div>

        <div class="cdm-winner-info">
          <div class="cdm-winner-name">
            🏆 ${winner.name}
            <span class="cdm-month-badge">${fullLabel}</span>
          </div>

          <div class="cdm-winner-stats">
            ${winner.goals} Gols, ${winner.assists} Assists
            <strong>(${winner.ga} Total G+A)</strong>
          </div>

          <blockquote class="cdm-trivia">
            <span class="cdm-trivia-icon">💬</span>
            <em>${triviaText}</em>
          </blockquote>

          ${ranked.length > 1 ? `
          <div class="cdm-runners-up">
            <span class="cdm-runners-label">Restante do pódio:</span>
            <ul class="cdm-runners-list">${runnersUp}</ul>
          </div>` : ''}
        </div>
      </div>
    </div>`;
}

/**
 * Builds the "Monthly Summary" wiki-style table HTML.
 * Columns: Ano | Mês | Vencedor (G+A) | 2º Lugar | 3º Lugar
 */
function buildMonthlySummaryTable(rankedMonths) {
  if (rankedMonths.length === 0) {
    return `<p style="color:var(--wiki-muted); font-style:italic;">Sem dados suficientes.</p>`;
  }

  const rows = rankedMonths.map(({ month, year, ranked }) => {
    const monthName = MONTH_NAMES_PT[month - 1];
    const winner = ranked[0] ? `${ranked[0].name} (${ranked[0].ga})` : '—';
    const second = ranked[1] ? `${ranked[1].name} (${ranked[1].ga})` : '—';
    const third = ranked[2] ? `${ranked[2].name} (${ranked[2].ga})` : '—';
    return `
      <tr>
        <td class="num">${year}</td>
        <td>${monthName}</td>
        <td><span class="gold">🥇</span> ${winner}</td>
        <td><span class="silver">🥈</span> ${second}</td>
        <td><span class="bronze">🥉</span> ${third}</td>
      </tr>`;
  }).join('');

  return `
    <div class="wiki-table-wrap">
      <table class="wiki-table" id="table-monthly-summary">
        <caption>Resumo Mensal — Top 3 Craques por Mês</caption>
        <thead>
          <tr>
            <th class="num">Ano</th>
            <th>Mês</th>
            <th>🥇 1º Lugar (G+A)</th>
            <th>🥈 2º Lugar (G+A)</th>
            <th>🥉 3º Lugar (G+A)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/**
 * Builds the "All-Time Titles" wiki-style table HTML.
 * Columns: # | Jogador | Títulos Conquistados
 */
function buildAllTimeTitlesTable(titlesMap) {
  if (titlesMap.size === 0) {
    return `<p style="color:var(--wiki-muted); font-style:italic;">Sem dados suficientes.</p>`;
  }

  const sorted = Array.from(titlesMap.entries())
    .sort(([, a], [, b]) => b - a);

  const medalClasses = ['gold', 'silver', 'bronze'];

  const rows = sorted.map(([name, count], i) => {
    const cls = medalClasses[i] ?? '';
    return `
      <tr>
        <td class="rank ${cls}">${i + 1}</td>
        <td>${name}</td>
        <td class="num"><strong>${count}</strong></td>
      </tr>`;
  }).join('');

  return `
    <div class="wiki-table-wrap">
      <table class="wiki-table" id="table-all-time-titles">
        <caption>Hall da Fama — Títulos de Craque do Mês (Histórico)</caption>
        <thead>
          <tr>
            <th class="rank">#</th>
            <th>Jogador</th>
            <th class="num">Títulos 🏆</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ─── CSS Injection ─────────────────────────────────────────────────────────────

function injectCraqueDoMesStyles() {
  if (document.getElementById('cdm-styles')) return; // already injected
  const style = document.createElement('style');
  style.id = 'cdm-styles';
  style.textContent = `
    /* ─── Craque do Mês — Block Layout ───────────────────────── */
    .cdm-month-block {
      margin-bottom: 2rem;
    }

    .cdm-winner-card {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      border: 1px solid var(--wiki-border);
      background: var(--wiki-surface);
      padding: 0.85rem;
      margin-top: 0.5rem;
    }

    /* ─── Photo / Placeholder ──────────────────────────────────── */
    .cdm-winner-photo-wrap {
      flex-shrink: 0;
    }

    .cdm-winner-photo {
      width: 150px;
      height: 200px; /* 3⁄4 portrait */
      object-fit: cover;
      border: 2px solid var(--wiki-border);
      display: block;
    }

    .cdm-photo-placeholder {
      width: 150px;
      height: 200px; /* 3⁄4 portrait */
      background: linear-gradient(135deg, #1a5276, #2980b9);
      border: 2px solid var(--wiki-border);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 3rem;
      gap: 0.2rem;
    }

    .cdm-photo-placeholder span {
      font-size: 0.7rem;
      font-family: var(--font-ui);
      text-align: center;
      padding: 0 0.4rem;
    }

    /* ─── Winner Info Column ───────────────────────────────────── */
    .cdm-winner-info {
      flex: 1;
      min-width: 0;
    }

    .cdm-winner-name {
      font-size: 1.05rem;
      font-weight: bold;
      font-family: var(--font-ui);
      margin-bottom: 0.3rem;
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .cdm-month-badge {
      font-size: 0.72rem;
      font-weight: normal;
      background: var(--wiki-infohead);
      border: 1px solid var(--wiki-border);
      padding: 0.05rem 0.4rem;
      border-radius: 2px;
      color: var(--wiki-muted);
      font-family: var(--font-ui);
    }

    .cdm-winner-stats {
      font-family: var(--font-ui);
      font-size: 0.875rem;
      color: var(--wiki-text);
      margin-bottom: 0.5rem;
    }

    /* ─── Trivia Quote ─────────────────────────────────────────── */
    .cdm-trivia {
      border-left: 3px solid var(--wiki-infohead);
      padding: 0.35rem 0.65rem;
      margin: 0.4rem 0 0.6rem;
      background: white;
      font-size: 0.85rem;
      color: var(--wiki-muted);
      display: flex;
      gap: 0.4rem;
      align-items: flex-start;
    }

    .cdm-trivia-icon {
      flex-shrink: 0;
      font-style: normal;
    }

    /* ─── Runners-up ───────────────────────────────────────────── */
    .cdm-runners-up {
      margin-top: 0.4rem;
      font-family: var(--font-ui);
      font-size: 0.83rem;
    }

    .cdm-runners-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--wiki-muted);
      display: block;
      margin-bottom: 0.25rem;
    }

    .cdm-runners-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .cdm-runners-list li {
      padding: 0.1rem 0;
      border-bottom: 1px dotted var(--wiki-border);
    }

    .cdm-runners-list li:last-child {
      border-bottom: none;
    }

    /* ─── Responsive ───────────────────────────────────────────── */
    @media (max-width: 500px) {
      .cdm-winner-card {
        flex-direction: column;
      }
      .cdm-winner-photo,
      .cdm-photo-placeholder {
        width: 90px;
        height: 120px; /* maintain 3⁄4 on mobile */
      }
    }
  `;
  document.head.appendChild(style);
}

// ─── Sidebar Infobox Injection ─────────────────────────────────────────────────

/**
 * Finds the player icon path from the sessions data for a given player name.
 * Searches all matches in the most-recent month's sessions for a matching player entry.
 */
function findPlayerIcon(data, playerName, month, year) {
  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith('match_history_')) continue;
    let history = [];
    try {
      history = JSON.parse(value);
    } catch (e) {
      continue;
    }
    if (history.length === 0) continue;
    const dateInfo = parseSessionDate(history[0]);
    if (!dateInfo || dateInfo.month !== month || dateInfo.year !== year) continue;
    for (const match of history) {
      for (const side of ['red', 'white']) {
        const found = (match.players?.[side] ?? []).find(p => p.name === playerName);
        if (found?.icon) return found.icon;
      }
    }
  }
  return null;
}

/**
 * Populates the #infobox-craque-atual sidebar widget with the most-recent month's winner.
 */
function injectCurrentCraqueInfobox(data, rankedMonths) {
  const box = document.getElementById('infobox-craque-atual');
  if (!box) return;

  // Most recent month is the last in the chronologically sorted array
  const latest = rankedMonths[rankedMonths.length - 1];
  if (!latest || latest.ranked.length === 0) return;

  const { month, year, ranked } = latest;
  const monthName = MONTH_NAMES_PT[month - 1];
  const winner = ranked[0];

  // Set month title
  const monthTitleEl = document.getElementById('cdm-infobox-month-title');
  if (monthTitleEl) monthTitleEl.textContent = `${monthName} ${year}`;

  // Winner photo — try player icon from JSON, then CDM photo, then placeholder emoji
  const photoWrap = document.getElementById('cdm-infobox-photo-wrap');
  if (photoWrap) {
    const iconPath = findPlayerIcon(data, winner.name, month, year);
    const cdmPhoto = imagePathForMonth(month, year);

    // Prefer the CDM monthly photo; fall back to player icon; fall back to emoji
    const img = document.createElement('img');
    img.className = 'cdm-infobox-photo';
    img.alt = winner.name;

    // Try CDP photo first, then player icon, then placeholder
    img.src = cdmPhoto;
    img.onerror = function () {
      if (iconPath && img.src !== iconPath) {
        img.src = iconPath;
        img.onerror = function () { showPlaceholder(); };
      } else {
        showPlaceholder();
      }
    };

    function showPlaceholder() {
      img.remove();
      const ph = document.createElement('div');
      ph.className = 'cdm-infobox-photo-placeholder';
      ph.textContent = '🏆';
      photoWrap.appendChild(ph);
    }

    photoWrap.appendChild(img);
  }

  // Winner name
  const nameEl = document.getElementById('cdm-infobox-winner-name');
  if (nameEl) nameEl.textContent = `🏆 ${winner.name}`;

  // Stats
  const statsEl = document.getElementById('cdm-infobox-stats');
  if (statsEl) statsEl.textContent = `${winner.goals} Gols, ${winner.assists} Assists (${winner.ga} G+A)`;

  // Runners-up
  const runnersEl = document.getElementById('cdm-infobox-runners');
  if (runnersEl) {
    const medals = ['🥈', '🥉'];
    const labels = ['2º Lugar', '3º Lugar'];
    runnersEl.innerHTML = ranked.slice(1, 3).map((p, i) =>
      `<p><span class="${medalClass(i + 1)}">${medals[i]} ${labels[i]}:</span> ${p.name} <small style="color:var(--wiki-muted);">(${p.ga} G+A)</small></p>`
    ).join('');
  }

  // Show the infobox (it starts hidden)
  box.style.display = '';
}

// ─── Main Injection ────────────────────────────────────────────────────────────

function injectCraqueDoMes(data) {
  // Always inject CSS and populate the sidebar infobox
  injectCraqueDoMesStyles();

  // 1. Group sessions by month and tally GA
  const monthMap = groupByMonth(data);

  // 2. Sort months chronologically
  const sortedKeys = Array.from(monthMap.keys()).sort();

  // 3. Rank top-3 for each month
  const rankedMonths = sortedKeys.map(key => {
    const m = monthMap.get(key);
    return { month: m.month, year: m.year, ranked: rankMonth(m) };
  });

  // 4. All-time titles count
  const allTimeTitles = countAllTimeTitles(rankedMonths);

  // 5. Always populate the sidebar — works even when Hall is hardcoded
  injectCurrentCraqueInfobox(data, rankedMonths);

  // 6. Dynamic Hall — skip if container is absent (hardcoded content in use)
  const container = document.getElementById('craque-do-mes-container');
  if (!container) {
    console.info('[CraqueDoMes] Hall container not found — using hardcoded content.');
    return;
  }

  // 7. Build HTML
  let html = '';

  // — Monthly subtopics
  rankedMonths.forEach(({ month, year, ranked }, i) => {
    html += buildMonthSubtopic(month, year, ranked, `6.${i + 1}`);
  });

  // — Separator
  html += `
    <div class="section-header" style="margin-top:1.5rem; border-bottom:1px solid var(--wiki-border);">
      <h3 style="font-size:1.05rem; font-weight:bold; padding-bottom:0.2rem;">
        📋 Tabela Resumo Mensal
      </h3>
    </div>`;

  // — Monthly summary table
  html += buildMonthlySummaryTable(rankedMonths);

  // — Separator
  html += `
    <div class="section-header" style="margin-top:1.5rem; border-bottom:1px solid var(--wiki-border);">
      <h3 style="font-size:1.05rem; font-weight:bold; padding-bottom:0.2rem;">
        🏛️ Hall da Fama — Títulos Acumulados
      </h3>
    </div>`;

  // — All-time titles table
  html += buildAllTimeTitlesTable(allTimeTitles);

  container.innerHTML = html;

  // Hide the loading banner
  const loadingBanner = document.getElementById('cdm-loading');
  if (loadingBanner) loadingBanner.style.display = 'none';

  // Make the dynamically created tables sortable (reuse the pattern from index.html)
  container.querySelectorAll('.wiki-table').forEach(table => {
    const headers = table.querySelectorAll('th');
    headers.forEach((th, colIdx) => {
      th.style.cursor = 'pointer';
      th.title = 'Clique para ordenar';
      let asc = true;
      th.addEventListener('click', () => {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        rows.sort((a, b) => {
          const cellA = a.cells[colIdx]?.textContent.trim() ?? '';
          const cellB = b.cells[colIdx]?.textContent.trim() ?? '';
          const numA = parseFloat(cellA.replace(/[^0-9.\-]/g, ''));
          const numB = parseFloat(cellB.replace(/[^0-9.\-]/g, ''));
          if (!isNaN(numA) && !isNaN(numB)) return asc ? numA - numB : numB - numA;
          return asc ? cellA.localeCompare(cellB, 'pt') : cellB.localeCompare(cellA, 'pt');
        });
        rows.forEach(r => tbody.appendChild(r));
        headers.forEach(h => (h.textContent = h.textContent.replace(/ [▲▼]$/, '')));
        th.textContent += asc ? ' ▲' : ' ▼';
        asc = !asc;
      });
    });
  });
}

// ─── Entry Point ───────────────────────────────────────────────────────────────

/**
 * Loads data.json (reuses the same file used by stats.js) and injects content.
 * Safe to call independently — does not interfere with stats.js.
 */
async function loadCraqueDoMes() {
  try {
    const { fetchFutData } = await import('./firebase_setup.js');
    const data = await fetchFutData();
    injectCraqueDoMes(data);
  } catch (err) {
    console.error('[CraqueDoMes] Erro ao carregar data.json:', err);
    const container = document.getElementById('craque-do-mes-container');
    if (container) {
      container.innerHTML = `
        <div class="notice" style="border-color:#d33; background:#fef;">
          <span class="icon">⚠️</span>
          <span>Não foi possível carregar os dados do Craque do Mês: <em>${err.message}</em></span>
        </div>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', loadCraqueDoMes);
