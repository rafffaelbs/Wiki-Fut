/**
 * stats.js — Society™ Wiki Statistics Engine
 * Fetches data.json, aggregates all leaderboards, and injects results into the DOM.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "MM:SS" → total seconds */
function timeToSeconds(timeStr) {
  if (!timeStr) return Infinity;
  const [m, s] = timeStr.split(':').map(Number);
  return m * 60 + s;
}

/** rank class: gold / silver / bronze / '' */
function rankClass(i) {
  return ['gold', 'silver', 'bronze'][i] ?? '';
}

/** Build a <tbody> from an array of row-arrays */
function buildTbody(rows) {
  return rows
    .map((cells, i) => {
      const cls = rankClass(i);
      const rankTd = `<td class="rank ${cls}">${i + 1}</td>`;
      const dataTds = cells.map((c, ci) =>
        `<td class="${ci > 0 ? 'num' : ''}">${c ?? '—'}</td>`
      ).join('');
      return `<tr>${rankTd}${dataTds}</tr>`;
    })
    .join('');
}

/** Replace all <tbody> rows of a table */
function fillTable(tableId, rows) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return;
  tbody.innerHTML = rows.length ? buildTbody(rows) : `<tr><td colspan="10" class="num" style="color:var(--wiki-muted);font-style:italic;">Sem dados suficientes</td></tr>`;
}

/** Set text of an element by id */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '—';
}

// ─── Data Collection ──────────────────────────────────────────────────────────

/**
 * Walk every session → every match and call:
 *   onMatch(match, sessionId)
 */
function walkMatches(data, onMatch) {
  for (const session of data.sessions_data ?? []) {
    const sessionId = session.session_id ?? session.session_date ?? Math.random();
    for (const match of session.history ?? []) {
      onMatch(match, sessionId);
    }
  }
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

function aggregate(data) {
  // Per-player stats map
  const players = {}; // name → stats object

  function getPlayer(name) {
    if (!name) return null;
    if (!players[name]) {
      players[name] = {
        name,
        goals: 0,
        assists: 0,
        cards: { yellow: 0, red: 0, total: 0 },
        ownGoals: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        matchesPlayed: 0,
        ratingSum: 0,
        ratingCount: 0,
        sessions: new Set(),
        blowoutWins: 0,
      };
    }
    return players[name];
  }

  // Goal duo tracking: "A→B" → count
  const duos = {};

  // All goal events with timestamps (for fastest / clutch)
  const goalEvents = [];

  // All match-end timestamps (for average match length)
  const matchDurations = [];

  // Peak goal time buckets (2-min intervals)
  const timeBuckets = {};

  walkMatches(data, (match, sessionId) => {
    const events = match.events ?? [];
    const redPlayers = (match.players?.red ?? []).map(p => p.name);
    const whitePlayers = (match.players?.white ?? []).map(p => p.name);
    const allMatchPlayers = [...redPlayers, ...whitePlayers];

    // Count score
    let redScore = 0, whiteScore = 0;
    for (const ev of events) {
      if (ev.type === 'goal') {
        if (ev.team?.toLowerCase().startsWith('verm') || ev.team?.toLowerCase() === 'red') redScore++;
        else whiteScore++;
      }
      if (ev.type === 'own_goal') {
        // own goal counts for the other team
        if (ev.team?.toLowerCase().startsWith('verm') || ev.team?.toLowerCase() === 'red') whiteScore++;
        else redScore++;
      }
    }

    const scoreDiff = Math.abs(redScore - whiteScore);
    const isBlowout = scoreDiff >= 3;

    // Track match-end time (last event timestamp)
    const timedEvents = events.filter(e => e.time);
    if (timedEvents.length > 0) {
      const lastTime = timedEvents[timedEvents.length - 1].time;
      matchDurations.push(timeToSeconds(lastTime));
    }

    // Per-player match participation
    for (const name of allMatchPlayers) {
      const p = getPlayer(name);
      if (!p) continue;
      p.matchesPlayed++;
      p.sessions.add(sessionId);

      const isRed = redPlayers.includes(name);
      const myScore = isRed ? redScore : whiteScore;
      const oppScore = isRed ? whiteScore : redScore;

      if (myScore > oppScore) {
        p.wins++;
        if (isBlowout) p.blowoutWins++;
      } else if (myScore < oppScore) {
        p.losses++;
      } else {
        p.draws++;
      }
    }

    // Per-player ratings
    for (const sideKey of ['red', 'white']) {
      for (const pData of match.players?.[sideKey] ?? []) {
        const p = getPlayer(pData.name);
        if (!p || pData.rating == null) continue;
        p.ratingSum += pData.rating;
        p.ratingCount++;
      }
    }

    // Events
    for (const ev of events) {
      if (ev.type === 'goal') {
        const scorer = getPlayer(ev.player);
        if (scorer) scorer.goals++;

        if (ev.assist) {
          const assister = getPlayer(ev.assist);
          if (assister) assister.assists++;

          // Duo tracking
          const duoKey = [ev.assist, ev.player].join(' → ');
          duos[duoKey] = (duos[duoKey] ?? 0) + 1;
        }

        // Goal events for time analysis
        goalEvents.push({ player: ev.player, time: ev.time, secs: timeToSeconds(ev.time) });

        // Time bucket
        if (ev.time) {
          const secs = timeToSeconds(ev.time);
          const bucket = Math.floor(secs / 120) * 2; // 2-min bucket start (minutes)
          const label = `${bucket}–${bucket + 2} min`;
          timeBuckets[label] = (timeBuckets[label] ?? 0) + 1;
        }
      }

      if (ev.type === 'own_goal') {
        const p = getPlayer(ev.player);
        if (p) p.ownGoals++;
      }

      if (ev.type === 'card') {
        const p = getPlayer(ev.player);
        if (!p) continue;
        const colour = (ev.colour ?? ev.color ?? '').toLowerCase();
        if (colour === 'yellow' || colour === 'amarelo') p.cards.yellow++;
        else if (colour === 'red' || colour === 'vermelho') p.cards.red++;
        else p.cards.yellow++; // default to yellow if unspecified
        p.cards.total++;
      }
    }
  });

  return { players, duos, goalEvents, matchDurations, timeBuckets };
}

// ─── Leaderboard Builders ─────────────────────────────────────────────────────

function buildTopScorers(players, n = 5) {
  return Object.values(players)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, n)
    .map(p => [p.name, p.goals, p.matchesPlayed, (p.goals / Math.max(p.matchesPlayed, 1)).toFixed(2)]);
}

function buildTopAssists(players, n = 5) {
  return Object.values(players)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals)
    .slice(0, n)
    .map(p => [p.name, p.assists, p.matchesPlayed, (p.assists / Math.max(p.matchesPlayed, 1)).toFixed(2)]);
}

function buildPowerRanking(players, n = 5) {
  return Object.values(players)
    .map(p => ({ ...p, ga: p.goals + p.assists }))
    .sort((a, b) => b.ga - a.ga)
    .slice(0, n)
    .map(p => [p.name, p.goals, p.assists, p.ga, p.matchesPlayed]);
}

function buildDiscipline(players, n = 5) {
  return Object.values(players)
    .filter(p => p.cards.total > 0)
    .sort((a, b) => b.cards.total - a.cards.total)
    .slice(0, n)
    .map(p => [p.name, p.cards.yellow, p.cards.red, p.cards.total]);
}

function buildOwnGoals(players, n = 5) {
  return Object.values(players)
    .filter(p => p.ownGoals > 0)
    .sort((a, b) => b.ownGoals - a.ownGoals)
    .slice(0, n)
    .map(p => [p.name, p.ownGoals]);
}

function buildAvgRating(players, minMatches = 3, n = 10) {
  return Object.values(players)
    .filter(p => p.ratingCount >= minMatches)
    .map(p => ({ ...p, avgRating: p.ratingSum / p.ratingCount }))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, n)
    .map(p => [p.name, p.avgRating.toFixed(1), p.ratingCount]);
}

function buildWinRate(players, n = 10) {
  return Object.values(players)
    .filter(p => p.matchesPlayed >= 3)
    .map(p => ({ ...p, winPct: (p.wins / p.matchesPlayed) * 100 }))
    .sort((a, b) => b.winPct - a.winPct)
    .slice(0, n)
    .map(p => [p.name, `${p.winPct.toFixed(1)}%`, p.wins, p.matchesPlayed]);
}

function buildIronMan(players, n = 10) {
  return Object.values(players)
    .sort((a, b) => b.sessions.size - a.sessions.size || b.matchesPlayed - a.matchesPlayed)
    .slice(0, n)
    .map(p => [p.name, p.sessions.size, p.matchesPlayed]);
}

function buildBlowoutKings(players, n = 5) {
  return Object.values(players)
    .filter(p => p.blowoutWins > 0)
    .sort((a, b) => b.blowoutWins - a.blowoutWins)
    .slice(0, n)
    .map(p => [p.name, p.blowoutWins, p.matchesPlayed]);
}

function buildDeadlyDuos(duos, n = 5) {
  return Object.entries(duos)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([pair, count], i) => {
      const [provider, scorer] = pair.split(' → ');
      return [provider, scorer, count];
    });
}

function buildClutch(goalEvents, clutchSecs = 360, n = 5) {
  // Goals after clutchSecs (default 6:00 = 360s)
  const clutchGoals = goalEvents.filter(e => e.secs !== Infinity && e.secs >= clutchSecs);
  const counts = {};
  for (const e of clutchGoals) counts[e.player] = (counts[e.player] ?? 0) + 1;
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([name, cnt]) => [name, cnt]);
}

function buildPeakTimes(timeBuckets, n = 5) {
  return Object.entries(timeBuckets)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([label, count]) => [label, count]);
}

// ─── DOM Injection ────────────────────────────────────────────────────────────

function injectStats({ players, duos, goalEvents, matchDurations, timeBuckets }) {
  // ── Artilheiros
  fillTable('table-gols', buildTopScorers(players));

  // ── Assistências
  fillTable('table-assist', buildTopAssists(players));

  // ── Power Ranking (G+A)
  fillTable('table-power', buildPowerRanking(players));

  // ── Disciplina (Cartões)
  fillTable('table-cartoes', buildDiscipline(players));

  // ── Gols Contra
  fillTable('table-contra', buildOwnGoals(players));

  // ── Média de Avaliação
  fillTable('table-rating', buildAvgRating(players));

  // ── Win Rate
  fillTable('table-winrate', buildWinRate(players));

  // ── Iron Man (presença)
  fillTable('table-ironman', buildIronMan(players));

  // ── Blowout Kings
  fillTable('table-blowout', buildBlowoutKings(players));

  // ── Deadly Duos
  fillTable('table-duos', buildDeadlyDuos(duos));

  // ── Clutch performers
  fillTable('table-clutch', buildClutch(goalEvents));

  // ── Peak goal times
  fillTable('table-peak-times', buildPeakTimes(timeBuckets));

  // ──────────────────────────────────────────────
  // Highlight cards (single-value callouts)
  // ──────────────────────────────────────────────

  // Fastest goal
  const fastestGoalEvent = goalEvents
    .filter(e => e.secs !== Infinity)
    .sort((a, b) => a.secs - b.secs)[0];
  setText('callout-fastest-goal-player', fastestGoalEvent?.player);
  setText('callout-fastest-goal-time', fastestGoalEvent?.time);

  // Average match length
  if (matchDurations.length > 0) {
    const avgSecs = matchDurations.reduce((s, v) => s + v, 0) / matchDurations.length;
    const avgMin = Math.floor(avgSecs / 60);
    const avgSec = Math.round(avgSecs % 60);
    setText('callout-avg-match-length', `${avgMin}:${String(avgSec).padStart(2, '0')}`);
    setText('callout-avg-matches-count', `(${matchDurations.length} partidas)`);
  }

  // Pé Frio (lowest win rate, min 3 games)
  const peFrioList = Object.values(players)
    .filter(p => p.matchesPlayed >= 3)
    .map(p => ({ ...p, winPct: p.wins / p.matchesPlayed }))
    .sort((a, b) => a.winPct - b.winPct);
  if (peFrioList.length > 0) {
    const peFrio = peFrioList[0];
    setText('callout-pe-frio-name', peFrio.name);
    setText('callout-pe-frio-rate', `${(peFrio.winPct * 100).toFixed(1)}%`);
  }

  // Top peak goal time interval
  const topBucket = Object.entries(timeBuckets).sort(([, a], [, b]) => b - a)[0];
  if (topBucket) {
    setText('callout-peak-time-label', topBucket[0]);
    setText('callout-peak-time-goals', `${topBucket[1]} gols`);
  }

  // Top deadly duo
  const topDuo = Object.entries(duos).sort(([, a], [, b]) => b - a)[0];
  if (topDuo) {
    const [pair, count] = topDuo;
    setText('callout-duo-pair', pair.replace(' → ', ' ➜ '));
    setText('callout-duo-count', `${count} gols em parceria`);
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function loadStats() {
  const loadingEl = document.getElementById('stats-loading');
  const errorEl = document.getElementById('stats-error');

  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const aggregated = aggregate(data);
    injectStats(aggregated);
    if (loadingEl) loadingEl.style.display = 'none';
  } catch (err) {
    console.error('Society™ stats error:', err);
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'flex';
    // Show a descriptive error so devs know what's wrong
    const errMsg = document.getElementById('stats-error-msg');
    if (errMsg) errMsg.textContent = err.message;
  }
}

document.addEventListener('DOMContentLoaded', loadStats);
