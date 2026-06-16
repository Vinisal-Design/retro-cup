/* ============================================================
   RETRO CUP — Fluxo do jogo
   Formato: Copa do Mundo — 2 grupos de 5 (pontos corridos, 4 jogos),
   2 melhores de cada grupo → Semifinais → Final.
   Draft FUT (mistura países/eras), só o XI titular (sem reservas).
   ============================================================ */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sample = (a, n) => shuffle(a).slice(0, n);

  const FORMATIONS = {
    '4-4-2': { DEF: 4, MID: 4, ATT: 2 },
    '4-3-3': { DEF: 4, MID: 3, ATT: 3 },
    '3-5-2': { DEF: 3, MID: 5, ATT: 2 },
    '4-5-1': { DEF: 4, MID: 5, ATT: 1 },
    '5-3-2': { DEF: 5, MID: 3, ATT: 2 },
  };
  const GROUP_SIZE = 5; // pontos corridos => 4 jogos por seleção

  // Formações com posições NOMEADAS + coordenadas (nx ataca p/ direita, ny topo->base)
  // cat = categoria do jogador que ocupa (GK/DEF/MID/ATT)
  const ROLE_FORMATIONS = {
    '4-4-2': [
      { role: 'GOL', cat: 'GK', nx: 0.06, ny: 0.50 },
      { role: 'LE', cat: 'DEF', nx: 0.25, ny: 0.15 }, { role: 'ZAG', cat: 'DEF', nx: 0.18, ny: 0.38 },
      { role: 'ZAG', cat: 'DEF', nx: 0.18, ny: 0.62 }, { role: 'LD', cat: 'DEF', nx: 0.25, ny: 0.85 },
      { role: 'ME', cat: 'MID', nx: 0.47, ny: 0.15 }, { role: 'VOL', cat: 'MID', nx: 0.40, ny: 0.40 },
      { role: 'MC', cat: 'MID', nx: 0.44, ny: 0.62 }, { role: 'MD', cat: 'MID', nx: 0.47, ny: 0.85 },
      { role: 'CA', cat: 'ATT', nx: 0.71, ny: 0.40 }, { role: 'CA', cat: 'ATT', nx: 0.71, ny: 0.60 },
    ],
    '4-3-3': [
      { role: 'GOL', cat: 'GK', nx: 0.06, ny: 0.50 },
      { role: 'LE', cat: 'DEF', nx: 0.25, ny: 0.15 }, { role: 'ZAG', cat: 'DEF', nx: 0.18, ny: 0.38 },
      { role: 'ZAG', cat: 'DEF', nx: 0.18, ny: 0.62 }, { role: 'LD', cat: 'DEF', nx: 0.25, ny: 0.85 },
      { role: 'VOL', cat: 'MID', nx: 0.40, ny: 0.50 }, { role: 'MC', cat: 'MID', nx: 0.46, ny: 0.30 },
      { role: 'MEI', cat: 'MID', nx: 0.46, ny: 0.70 },
      { role: 'PE', cat: 'ATT', nx: 0.72, ny: 0.18 }, { role: 'CA', cat: 'ATT', nx: 0.74, ny: 0.50 },
      { role: 'PD', cat: 'ATT', nx: 0.72, ny: 0.82 },
    ],
    '3-5-2': [
      { role: 'GOL', cat: 'GK', nx: 0.06, ny: 0.50 },
      { role: 'ZAG', cat: 'DEF', nx: 0.19, ny: 0.30 }, { role: 'ZAG', cat: 'DEF', nx: 0.16, ny: 0.50 },
      { role: 'ZAG', cat: 'DEF', nx: 0.19, ny: 0.70 },
      { role: 'ALE', cat: 'MID', nx: 0.44, ny: 0.12 }, { role: 'VOL', cat: 'MID', nx: 0.38, ny: 0.40 },
      { role: 'MC', cat: 'MID', nx: 0.44, ny: 0.55 }, { role: 'MEI', cat: 'MID', nx: 0.52, ny: 0.72 },
      { role: 'ALD', cat: 'MID', nx: 0.44, ny: 0.88 },
      { role: 'CA', cat: 'ATT', nx: 0.72, ny: 0.42 }, { role: 'CA', cat: 'ATT', nx: 0.72, ny: 0.58 },
    ],
    '4-5-1': [
      { role: 'GOL', cat: 'GK', nx: 0.06, ny: 0.50 },
      { role: 'LE', cat: 'DEF', nx: 0.25, ny: 0.15 }, { role: 'ZAG', cat: 'DEF', nx: 0.18, ny: 0.38 },
      { role: 'ZAG', cat: 'DEF', nx: 0.18, ny: 0.62 }, { role: 'LD', cat: 'DEF', nx: 0.25, ny: 0.85 },
      { role: 'ME', cat: 'MID', nx: 0.47, ny: 0.14 }, { role: 'VOL', cat: 'MID', nx: 0.38, ny: 0.40 },
      { role: 'MC', cat: 'MID', nx: 0.44, ny: 0.60 }, { role: 'MEI', cat: 'MID', nx: 0.52, ny: 0.72 },
      { role: 'MD', cat: 'MID', nx: 0.47, ny: 0.86 },
      { role: 'CA', cat: 'ATT', nx: 0.72, ny: 0.50 },
    ],
    '5-3-2': [
      { role: 'GOL', cat: 'GK', nx: 0.06, ny: 0.50 },
      { role: 'ALE', cat: 'DEF', nx: 0.27, ny: 0.12 }, { role: 'ZAG', cat: 'DEF', nx: 0.18, ny: 0.32 },
      { role: 'ZAG', cat: 'DEF', nx: 0.15, ny: 0.50 }, { role: 'ZAG', cat: 'DEF', nx: 0.18, ny: 0.68 },
      { role: 'ALD', cat: 'DEF', nx: 0.27, ny: 0.88 },
      { role: 'VOL', cat: 'MID', nx: 0.42, ny: 0.40 }, { role: 'MC', cat: 'MID', nx: 0.46, ny: 0.60 },
      { role: 'MEI', cat: 'MID', nx: 0.50, ny: 0.30 },
      { role: 'CA', cat: 'ATT', nx: 0.72, ny: 0.42 }, { role: 'CA', cat: 'ATT', nx: 0.72, ny: 0.58 },
    ],
  };

  const surname = n => { const w = n.replace('.', '').trim().split(' '); return w[w.length - 1]; };

  // mini-campo reutilizável (draft e review)
  function renderPitch(container, slots, opts) {
    opts = opts || {};
    container.innerHTML = '';
    const pitch = el('div', 'mini-pitch');
    slots.forEach((s, i) => {
      const placeable = !s.player && opts.highlightCat && s.cat === opts.highlightCat;
      const dot = el('div', 'mslot ' + (s.player ? 'filled' : 'empty') + (placeable ? ' hi' : ''));
      // campo VERTICAL: ataca pra cima (GOL embaixo). nx->vertical, ny->horizontal
      dot.style.left = (s.ny * 100) + '%';
      dot.style.top = ((1 - s.nx) * 100) + '%';
      dot.innerHTML = `<span class="m-role">${s.role}</span><span class="m-name">${s.player ? surname(s.player.name) : ''}</span>`;
      if (placeable && opts.onPlace) dot.onclick = () => opts.onPlace(s, i);
      pitch.appendChild(dot);
    });
    container.appendChild(pitch);
  }

  // apito do juiz via Web Audio (sem arquivo de áudio)
  let _ac = null;
  function whistle() {
    try {
      _ac = _ac || new (window.AudioContext || window.webkitAudioContext)();
      const ac = _ac, now = ac.currentTime;
      [[0, 0.13], [0.20, 0.13], [0.43, 0.5]].forEach(([t, dur]) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'square'; o.frequency.setValueAtTime(2150, now + t);
        const lfo = ac.createOscillator(), lg = ac.createGain();
        lfo.frequency.value = 30; lg.gain.value = 130;
        lfo.connect(lg).connect(o.frequency); lfo.start(now + t); lfo.stop(now + t + dur);
        g.gain.setValueAtTime(0.0001, now + t);
        g.gain.exponentialRampToValueAtTime(0.22, now + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + dur);
        o.connect(g).connect(ac.destination);
        o.start(now + t); o.stop(now + t + dur + 0.02);
      });
    } catch (e) { /* áudio indisponível — segue sem som */ }
  }

  // ---------- Poisson + sim rápida de IA ----------
  function poisson(lambda) {
    const L = Math.exp(-lambda); let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  }
  function quickScore(a, b) {
    const ra = a.rating, rb = b.rating;
    return {
      ga: poisson(Math.max(0.25, 1.30 + (ra - rb) / 16)),
      gb: poisson(Math.max(0.25, 1.30 + (rb - ra) / 16)),
    };
  }

  // ============================================================
  const G = {
    formation: '4-4-2', mode: 'nutella',
    userTeam: null,
    groups: [], round: 0, totalRounds: 0,
    phase: 'group', ko: [], koRound: 0,
    koNames: ['Semifinais', 'Final'],
    currentTie: null,
  };

  function show(name) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
  }

  // ---------------------------------------------------------- HOME
  function initHome() {
    $('#btn-start').onclick = startDraft;
    $('#teams-count').textContent = TEAMS.length;
    G.mode = 'nutella';
    $$('.mode-card').forEach(b => b.onclick = () => {
      G.mode = b.dataset.mode;
      $$('.mode-card').forEach(x => x.classList.toggle('on', x === b));
    });
  }

  // ---------------------------------------------------------- DRAFT
  // Mecânica: cai uma seleção completa da época; você escolhe 1 jogador dela.
  // Mesmo país+ano pode cair de novo → aí escolhe outro. Sem reservas.
  const catLabel = c => ({ GK: 'Goleiro', DEF: 'Defensor', MID: 'Meio-campo', ATT: 'Atacante' }[c]);
  const hidden = () => G.mode === 'michelob';

  const openSlots = cat => G.slots.filter(s => s.cat === cat && !s.player);
  const needCount = cat => openSlots(cat).length;
  const filledCount = () => G.slots.filter(s => s.player).length;

  function startDraft() {
    G.userName = ($('#input-team-name').value || 'Meu Dream Team').slice(0, 22);
    G.userColor = $('#input-color').value || '#e11d48';
    G.formation = $('#select-formation').value;
    G.slots = ROLE_FORMATIONS[G.formation].map(s => Object.assign({}, s, { player: null }));
    G.totalSlots = G.slots.length;
    G.pickedUids = new Set();
    G.pending = null;
    show('draft');
    $('#draft-mode-tag').textContent = hidden() ? '🥃 Michelob — às escuras' : '🍫 Nutella';
    $('#draft-mode-tag').className = 'mode-tag ' + G.mode;
    drawTeam();
  }

  function drawTeam(attempt) {
    attempt = attempt || 0;
    G.pending = null;
    const team = TEAMS[Math.floor(Math.random() * TEAMS.length)];
    const eligible = team.players.some(p => needCount(p.pos) > 0 && !G.pickedUids.has(team.id + '|' + p.name));
    if (!eligible && attempt < 40) { drawTeam(attempt + 1); return; }
    G.draw = team;
    renderDraftRound();
  }

  function renderDraftRound() {
    const team = G.draw;
    $('#draft-progress').textContent = `Jogador ${filledCount() + 1} de ${G.totalSlots} — ${G.formation}`;
    $('#draft-team-name').textContent = `${team.name} ${team.year}`;

    // barra de escolha de posição (quando há jogador pendente p/ escalar)
    const sc = $('#slot-choice'); sc.innerHTML = '';
    if (G.pending) {
      const open = openSlots(G.pending.p.pos);
      sc.appendChild(el('span', 'sc-label', `Onde escalar <b>${G.pending.p.name}</b>?`));
      open.forEach(slot => {
        const chip = el('button', 'sc-chip', slot.role);
        chip.onclick = () => placePlayer(G.pending.p, G.pending.team, slot);
        sc.appendChild(chip);
      });
      const cancel = el('button', 'sc-cancel', '✕');
      cancel.onclick = () => { G.pending = null; renderDraftRound(); };
      sc.appendChild(cancel);
    }

    const wrap = $('#draft-team-players'); wrap.innerHTML = '';
    team.players.forEach(p => {
      const mine = G.pickedUids.has(team.id + '|' + p.name);
      const elig = needCount(p.pos) > 0 && !mine;
      const isPending = G.pending && G.pending.p === p;
      const card = el('div', 'pcard' + (elig ? '' : ' disabled') + (hidden() ? ' dark' : '') + (isPending ? ' picking' : ''));
      card.appendChild(playerCardInner(p, mine));
      if (elig) card.onclick = () => choosePlayer(p, team);
      wrap.appendChild(card);
    });

    const needTxt = ['GK', 'DEF', 'MID', 'ATT'].filter(c => needCount(c) > 0)
      .map(c => `${needCount(c)} ${catLabel(c)}${needCount(c) > 1 ? 's' : ''}`).join(' · ');
    $('#draft-hint').textContent = needTxt ? 'Ainda faltam: ' + needTxt
      : (G.pending ? 'Clique numa posição (no campo ou nos botões acima).' : '');

    renderSquadPreview();
  }

  function statBars(p) {
    const rows = p.pos === 'GK'
      ? [['VEL', p.pac], ['PAS', p.pas], ['GOL', p.gk]]
      : [['VEL', p.pac], ['PAS', p.pas], ['FIN', p.sho], ['DEF', p.def]];
    return rows.map(([k, v]) =>
      `<div class="bar"><span>${k}</span><div class="track"><i style="width:${v}%"></i></div><b>${v}</b></div>`).join('');
  }
  function playerCardInner(p, mine) {
    const c = el('div', 'pcard-in');
    c.innerHTML = `
      <div class="pcard-top">
        <div class="ovr">${hidden() ? '<span class="hid">' + p.pos + '</span>' : p.ovr}</div>
        <div class="pmeta"><div class="pname">${p.name}${mine ? ' <span class="mine-tag">✓ no elenco</span>' : ''}</div>
          <div class="porigin">${catLabel(p.pos)}</div></div>
      </div>
      ${hidden() ? '' : `<div class="bars">${statBars(p)}</div>`}`;
    return c;
  }

  function choosePlayer(p, team) {
    const open = openSlots(p.pos);
    if (open.length === 1) { placePlayer(p, team, open[0]); return; }
    G.pending = { p, team };          // várias posições possíveis → usuário escolhe
    renderDraftRound();
  }
  function placePlayer(p, team, slot) {
    slot.player = Object.assign({}, p, {
      role: slot.role, nx: slot.nx, ny: slot.ny, origin: `${team.short} ${team.year}`,
    });
    G.pickedUids.add(team.id + '|' + p.name);
    G.pending = null;
    if (filledCount() >= G.totalSlots) finishDraft();
    else drawTeam();
  }

  function renderSquadPreview() {
    const strip = $('#needs-strip'); strip.innerHTML = '';
    ['GK', 'DEF', 'MID', 'ATT'].forEach(c => {
      const tot = G.slots.filter(s => s.cat === c).length;
      if (!tot) return;
      const got = tot - needCount(c);
      strip.appendChild(el('span', 'need-chip' + (got === tot ? ' full' : ''), `${c} ${got}/${tot}`));
    });
    renderPitch($('#draft-pitch'), G.slots, {
      highlightCat: G.pending ? G.pending.p.pos : null,
      onPlace: G.pending ? slot => placePlayer(G.pending.p, G.pending.team, slot) : null,
    });
    const filled = G.slots.filter(s => s.player);
    const rating = filled.length ? Math.round(filled.reduce((a, s) => a + s.player.ovr, 0) / filled.length) : 0;
    $('#squad-rating').textContent = hidden() ? '??' : (rating || '--');
  }

  function finishDraft() {
    const players = G.slots.map(s => Object.assign({}, s.player));
    G.userTeam = {
      id: 'user', name: G.userName, short: 'EU', year: '★',
      color: G.userColor, color2: '#ffffff',
      players, isUser: true, tactics: { mentality: 0, pressing: 1, tempo: 1 },
    };
    G.userTeam.rating = Math.round(players.reduce((a, p) => a + p.ovr, 0) / players.length);
    showReview();
  }

  // ---------------------------------------------------------- REVIEW
  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  function showReview() {
    show('review');
    $('#review-name').textContent = G.userName;
    renderPitch($('#review-pitch'), G.slots, {});
    const gk = G.slots.find(s => s.cat === 'GK').player;
    const ata = avg(G.slots.filter(s => s.cat === 'ATT' || s.cat === 'MID').map(s => s.player.sho));
    const def = avg(G.slots.filter(s => s.cat === 'DEF' || s.cat === 'MID').map(s => s.player.def).concat([gk.gk]));
    $('#rev-ata').textContent = hidden() ? '??' : ata;
    $('#rev-def').textContent = hidden() ? '??' : def;
    $('#rev-ovr').textContent = hidden() ? '??' : G.userTeam.rating;
    const list = $('#review-list'); list.innerHTML = '';
    G.slots.forEach(s => {
      const p = s.player;
      const row = el('div', 'squad-row filled');
      row.innerHTML = `<span class="pos">${s.role}</span><span class="nm">${p.name}<small>${p.origin}</small></span><span class="ov">${hidden() ? '·' : p.ovr}</span>`;
      list.appendChild(row);
    });
    $('#btn-to-cup').onclick = () => { buildTournament(); G.phase = 'group'; show('group'); renderGroup(); };
  }

  // ---------------------------------------------------------- TOURNAMENT
  function randTactics() {
    return { mentality: [-1, 0, 0, 1][Math.floor(Math.random() * 4)], pressing: Math.random() < .5 ? 1 : 2, tempo: Math.random() < .5 ? 1 : 1.3 };
  }
  function makeTie(a, b, ko, group) {
    return { a, b, ga: null, gb: null, pa: 0, pb: 0, winner: null, played: false, ko: !!ko, group: group || null };
  }
  // circle-method round robin -> rounds of pairs (indices), bye omitted
  function roundRobin(n) {
    const idx = Array.from({ length: n }, (_, i) => i);
    if (n % 2) idx.push(-1);
    const m = idx.length, rounds = [];
    for (let r = 0; r < m - 1; r++) {
      const pairs = [];
      for (let i = 0; i < m / 2; i++) {
        const t1 = idx[i], t2 = idx[m - 1 - i];
        if (t1 >= 0 && t2 >= 0) pairs.push([t1, t2]);
      }
      rounds.push(pairs);
      idx.splice(1, 0, idx.pop());
    }
    return rounds;
  }

  function buildTournament() {
    const opps = sample(TEAMS, GROUP_SIZE * 2 - 1).map(t => Object.assign({}, t, { tactics: randTactics() }));
    const entrants = shuffle([G.userTeam, ...opps]);
    // ensure user lands in group A
    const userIdx = entrants.findIndex(t => t.isUser);
    if (userIdx >= GROUP_SIZE) { const sw = entrants[0]; entrants[0] = entrants[userIdx]; entrants[userIdx] = sw; }

    G.groups = [];
    for (let g = 0; g < 2; g++) {
      const teams = entrants.slice(g * GROUP_SIZE, g * GROUP_SIZE + GROUP_SIZE);
      const sched = roundRobin(GROUP_SIZE).map(pairs =>
        pairs.map(([i, j]) => makeTie(teams[i], teams[j], false, null))
      );
      const group = {
        name: 'ABCD'[g], teams,
        table: teams.map(t => ({ team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 })),
        sched,
      };
      sched.forEach(round => round.forEach(t => t.group = group));
      G.groups.push(group);
    }
    G.totalRounds = G.groups[0].sched.length;
    G.round = 0;
  }

  function rec(group, t) { return group.table.find(r => r.team === t); }
  function applyResult(group, tie) {
    const ra = rec(group, tie.a), rb = rec(group, tie.b);
    ra.p++; rb.p++;
    ra.gf += tie.ga; ra.ga += tie.gb; rb.gf += tie.gb; rb.ga += tie.ga;
    if (tie.ga > tie.gb) { ra.w++; ra.pts += 3; rb.l++; }
    else if (tie.gb > tie.ga) { rb.w++; rb.pts += 3; ra.l++; }
    else { ra.d++; rb.d++; ra.pts++; rb.pts++; }
  }
  function sortedTable(group) {
    return group.table.slice().sort((x, y) =>
      y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || y.team.rating - x.team.rating);
  }
  function simGroupTie(tie) {
    if (tie.played) return;
    const r = quickScore(tie.a, tie.b);
    tie.ga = r.ga; tie.gb = r.gb; tie.played = true;
    applyResult(tie.group, tie);
  }
  function userTieThisRound() {
    return G.groups[0].sched[G.round].find(t => t.a.isUser || t.b.isUser) ||
           G.groups[1].sched[G.round].find(t => t.a.isUser || t.b.isUser);
  }

  function renderGroup() {
    show('group');
    $('#group-round').textContent = G.round + 1;
    $('#group-rounds').textContent = G.totalRounds;
    // tables
    ['A', 'B'].forEach((nm, gi) => {
      const group = G.groups[gi];
      const box = $('#group' + nm); box.innerHTML = '';
      box.appendChild(el('h4', null, 'Grupo ' + group.name));
      const tbl = el('div', 'gtable');
      tbl.appendChild(el('div', 'gt-head', `<span>#</span><span class="gt-name">Seleção</span><span>P</span><span>V</span><span>E</span><span>D</span><span>SG</span><span>Pts</span>`));
      sortedTable(group).forEach((r, i) => {
        const row = el('div', 'gt-row' + (r.team.isUser ? ' me' : '') + (i < 2 ? ' qual' : ''));
        row.innerHTML = `<span>${i + 1}</span><span class="gt-name">${r.team.name}<small>${r.team.year}</small></span>
          <span>${r.p}</span><span>${r.w}</span><span>${r.d}</span><span>${r.l}</span>
          <span>${(r.gf - r.ga) > 0 ? '+' : ''}${r.gf - r.ga}</span><b>${r.pts}</b>`;
        tbl.appendChild(row);
      });
      box.appendChild(tbl);
    });
    // fixtures of the round
    const fx = $('#round-fixtures'); fx.innerHTML = '';
    G.groups.forEach(group => group.sched[G.round].forEach(tie => {
      const isUser = tie.a.isUser || tie.b.isUser;
      const f = el('div', 'fx' + (isUser ? ' me' : '') + (tie.played ? ' done' : ''));
      f.innerHTML = `<span>${tie.a.name}</span><b>${tie.played ? tie.ga + ' - ' + tie.gb : 'vs'}</b><span>${tie.b.name}</span>`;
      fx.appendChild(f);
    }));

    const userTie = userTieThisRound();
    const btn = $('#btn-group-action');
    if (userTie && !userTie.played) {
      btn.textContent = `▶ Jogar — ${opp(userTie).name} ${opp(userTie).year}`;
      btn.onclick = () => goTactics(userTie);
    } else {
      btn.textContent = G.round + 1 < G.totalRounds ? '▶ Simular rodada' : '🏁 Encerrar fase de grupos';
      btn.onclick = () => { simRoundRest(); advanceGroupRound(); };
    }
  }

  function simRoundRest() {
    G.groups.forEach(group => group.sched[G.round].forEach(simGroupTie));
  }
  function advanceGroupRound() {
    G.round++;
    if (G.round >= G.totalRounds) finishGroups();
    else renderGroup();
  }

  function finishGroups() {
    const [A, B] = G.groups.map(sortedTable);
    const A1 = A[0].team, A2 = A[1].team, B1 = B[0].team, B2 = B[1].team;
    G.ko = [[makeTie(A1, B2, true), makeTie(B1, A2, true)], []];
    G.phase = 'ko'; G.koRound = 0;
    if (!userInKo()) { simKnockoutToEnd(); return; }
    renderKnockout();
  }

  // ---------------------------------------------------------- KNOCKOUT
  function simKoTie(tie) {
    if (tie.played) return;
    const r = quickScore(tie.a, tie.b);
    tie.ga = r.ga; tie.gb = r.gb;
    if (r.ga === r.gb) { const p = penaltyShootout(tie.a, tie.b); tie.pa = p.a; tie.pb = p.b; tie.winner = p.a > p.b ? tie.a : tie.b; }
    else tie.winner = r.ga > r.gb ? tie.a : tie.b;
    tie.played = true;
  }
  function userInKo() { return G.ko[G.koRound].some(t => t.a.isUser || t.b.isUser); }
  function champion() { return G.ko[1][0] && G.ko[1][0].winner; }
  function findUserKoTie() { return G.ko[G.koRound].find(t => (t.a.isUser || t.b.isUser) && !t.winner); }

  function buildFinal() {
    const w = G.ko[0].map(t => t.winner);
    G.ko[1] = [makeTie(w[0], w[1], true)];
    G.koRound = 1;
  }
  function simKnockoutToEnd() {
    G.ko[0].forEach(simKoTie);
    if (!G.ko[1].length) buildFinal();
    G.ko[1].forEach(simKoTie);
    showChampion();
  }

  function renderKnockout() {
    show('bracket');
    $('#bracket-round').textContent = G.koNames[G.koRound];
    const wrap = $('#bracket-rounds'); wrap.innerHTML = '';
    G.koNames.forEach((nm, r) => {
      const col = el('div', 'bcol');
      col.appendChild(el('h4', null, nm));
      (G.ko[r] || []).forEach(tie => col.appendChild(tieCard(tie, r === G.koRound)));
      if (r === 1 && champion()) col.appendChild(el('div', 'champion-tag', '🏆 ' + champion().name));
      wrap.appendChild(col);
    });
    const userTie = findUserKoTie();
    const btn = $('#btn-play-round');
    if (userTie) { btn.style.display = 'inline-block'; btn.textContent = `▶ Jogar — ${opp(userTie).name}`; btn.onclick = () => goTactics(userTie); }
    else if (champion()) { btn.style.display = 'inline-block'; btn.textContent = '🏆 Ver resultado'; btn.onclick = showChampion; }
    else { btn.style.display = 'none'; }
  }
  function tieCard(tie, active) {
    const c = el('div', 'tie' + (active ? ' active' : '') + (tie.played ? ' done' : ''));
    if (tie.a.isUser || tie.b.isUser) c.classList.add('mytie');
    const line = (t, g, p) => `<div class="tl ${tie.winner === t ? 'win' : ''} ${t.isUser ? 'me' : ''}">
        <span class="tn">${t.name}<small>${t.year}</small></span>
        <span class="tg">${g == null ? '' : g}${p ? ' (' + p + ')' : ''}</span></div>`;
    c.innerHTML = line(tie.a, tie.ga, tie.pa) + line(tie.b, tie.gb, tie.pb);
    return c;
  }
  function opp(tie) { return tie.a.isUser ? tie.b : tie.a; }

  // ---------------------------------------------------------- TACTICS
  function goTactics(tie) { G.currentTie = tie; show('tactics'); renderTactics(); }
  function renderTactics() {
    const o = opp(G.currentTie);
    $('#tac-opp').textContent = o.name + ' ' + o.year;
    $('#tac-opp-rating').textContent = hidden() ? '??' : o.rating;
    $('#tac-my-rating').textContent = hidden() ? '??' : G.userTeam.rating;
    $('#tac-stage').textContent = G.phase === 'group' ? `Grupo · Rodada ${G.round + 1}` : G.koNames[G.koRound];
    syncTac();
    $$('.tac-opt').forEach(b => b.onclick = () => { G.userTeam.tactics[b.dataset.k] = parseFloat(b.dataset.v); syncTac(); });
    $('#btn-kickoff').onclick = () => startMatch(G.currentTie);
  }
  function syncTac() {
    $$('.tac-opt').forEach(b => b.classList.toggle('on', G.userTeam.tactics[b.dataset.k] === parseFloat(b.dataset.v)));
  }

  // ---------------------------------------------------------- MATCH
  function startMatch(tie) {
    show('match');
    const home = tie.a.isUser ? tie.a : tie.b;   // user is always home (side 0)
    const away = tie.a.isUser ? tie.b : tie.a;
    G._home = home; G._away = away; G._tie = tie;
    if (!away.tactics) away.tactics = randTactics();

    $('#sb-home').textContent = home.name;
    $('#sb-away').textContent = away.name;
    $('#sb-home').style.color = home.color;
    $('#sb-away').style.color = away.color === '#ffffff' ? '#ddd' : away.color;
    $('#sb-score').textContent = '0 - 0';
    $('#sb-clock').textContent = "0'";
    $('#match-events').innerHTML = '';
    $('#match-end').style.display = 'none';

    G.match = new RetroMatch($('#pitch'), home, away, {
      onGoal: (side, scorer, min) => {
        $('#sb-score').textContent = `${G.match.score[0]} - ${G.match.score[1]}`;
        addEvent(`⚽ ${min}' GOL ${(side === 0 ? home : away).name}${scorer ? ' — ' + scorer : ''}`);
      },
      onEvent: txt => addEvent('· ' + txt, true),
      onClock: m => { $('#sb-clock').textContent = m + "'"; },
      onEnd: res => endMatch(res),
    });
    bindMatchControls();
    G.match._render();                 // pinta o time escalado, parado, aguardando o apito

    // overlay de apito — a bola só rola quando o juiz apitar
    const ov = $('#kickoff-overlay');
    ov.style.display = 'flex';
    $('#ko-teams').textContent = `${home.name} × ${away.name}`;
    $$('.spd').forEach(b => b.classList.toggle('on', false));
    $('#btn-whistle').onclick = () => {
      whistle();
      ov.style.display = 'none';
      setSpeed(2);
    };
  }
  function addEvent(txt, faint) {
    const log = $('#match-events');
    log.prepend(el('div', 'ev' + (faint ? ' faint' : ''), txt));
    while (log.children.length > 14) log.removeChild(log.lastChild);
  }
  function setSpeed(s) {
    if (G.match) G.match.setSpeed(s);
    $$('.spd').forEach(b => b.classList.toggle('on', parseInt(b.dataset.s) === s));
  }
  function bindMatchControls() {
    $$('.spd').forEach(b => b.onclick = () => setSpeed(parseInt(b.dataset.s)));
    $$('.mtac').forEach(b => {
      b.classList.toggle('on', G.userTeam.tactics[b.dataset.k] === parseFloat(b.dataset.v));
      b.onclick = () => {
        const k = b.dataset.k;
        G.userTeam.tactics[k] = parseFloat(b.dataset.v);
        G.match.setTactics(0, G.userTeam.tactics); // user is side 0
        $$('.mtac').forEach(x => { if (x.dataset.k === k) x.classList.toggle('on', x === b); });
        addEvent('🧠 ' + b.textContent, true);
      };
    });
  }

  function endMatch() {
    const tie = G._tie;
    const ga = G.match.score[0], gb = G.match.score[1]; // 0=home(user), 1=away
    const sa = (tie.a === G._home) ? ga : gb;   // tie.a goals
    const sb = (tie.b === G._home) ? ga : gb;   // tie.b goals
    tie.ga = sa; tie.gb = sb; tie.played = true;

    $('#me-score').textContent = `${tie.a.name} ${sa} - ${sb} ${tie.b.name}`;
    const uGoals = tie.a.isUser ? sa : sb, oGoals = tie.a.isUser ? sb : sa;

    if (tie.ko) {
      if (sa === sb) {
        const p = penaltyShootout(tie.a, tie.b);
        tie.pa = p.a; tie.pb = p.b; tie.winner = p.a > p.b ? tie.a : tie.b;
        $('#me-pens').textContent = `Pênaltis: ${tie.a.name} ${p.a} x ${p.b} ${tie.b.name}`;
        $('#me-pens').style.display = 'block';
      } else { $('#me-pens').style.display = 'none'; tie.winner = sa > sb ? tie.a : tie.b; }
      $('#me-result').textContent = tie.winner.isUser ? '✅ Classificado!' : '❌ Eliminado.';
    } else {
      applyResult(tie.group, tie);
      $('#me-pens').style.display = 'none';
      $('#me-result').textContent = uGoals > oGoals ? '✅ Vitória! +3' : uGoals === oGoals ? '🤝 Empate. +1' : '❌ Derrota.';
    }
    $('#match-end').style.display = 'flex';
    $('#btn-continue').onclick = afterUserMatch;
  }

  function penaltyShootout(a, b) {
    const kickers = t => shuffle(t.players.filter(p => p.pos !== 'GK')).slice(0, 5);
    const gkOf = t => t.players.find(p => p.pos === 'GK') || { gk: 60 };
    const ka = kickers(a), kb = kickers(b), gka = gkOf(a), gkb = gkOf(b);
    const sp = (sho, gk) => Math.min(0.93, Math.max(0.45, 0.72 + (sho - gk) / 200));
    let sa = 0, sb = 0;
    for (let i = 0; i < 5; i++) {
      if (Math.random() < sp(ka[i % ka.length].sho, gkb.gk)) sa++;
      if (Math.random() < sp(kb[i % kb.length].sho, gka.gk)) sb++;
    }
    let i = 0;
    while (sa === sb && i < 20) {
      if (Math.random() < sp(ka[i % ka.length].sho, gkb.gk)) sa++;
      if (Math.random() < sp(kb[i % kb.length].sho, gka.gk)) sb++;
      i++;
    }
    if (sa === sb) (a.rating >= b.rating ? sa++ : sb++);
    return { a: sa, b: sb };
  }

  function afterUserMatch() {
    if (G.match) { G.match.destroy(); G.match = null; }
    if (G.phase === 'group') {
      simRoundRest();
      advanceGroupRound();
    } else {
      G.ko[G.koRound].forEach(simKoTie);
      if (G.koRound === 0) {
        buildFinal();
        if (!userInKo()) { G.ko[1].forEach(simKoTie); showChampion(); return; }
        renderKnockout();
      } else {
        showChampion();
      }
    }
  }

  function showChampion() {
    const champ = champion();
    show('champion');
    const won = champ && champ.isUser;
    $('#champ-title').textContent = won ? '🏆 CAMPEÃO DO MUNDO!' : 'Fim de torneio';
    $('#champ-name').textContent = champ ? champ.name + (champ.year ? ' ' + champ.year : '') : '';
    $('#champ-name').style.color = champ && champ.color === '#ffffff' ? '#eee' : (champ ? champ.color : '#fff');
    $('#champ-sub').textContent = won
      ? 'Seu Dream Team levantou a taça da Retro Cup!'
      : `${champ ? champ.name : ''} foi campeão. Tente de novo!`;
    $('#btn-restart').onclick = () => location.reload();
  }

  window.addEventListener('DOMContentLoaded', initHome);
})();
