/* ============================================================
   RETRO CUP — Motor de simulação 2D (visão de cima / botão)
   - Bola e jogadores com física simples
   - IA por papel (GK/DEF/MID/ATT) + táticas (mentalidade, pressão, ritmo)
   - Rating influencia probabilidades, mas posicionamento e variância decidem
   ============================================================ */

(function () {
  'use strict';

  // ---------- math helpers ----------
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------- constants (sim units = pixels, sim seconds) ----------
  const DT = 1 / 60;
  const MATCH_SIM_SECONDS = 165;     // physics duration of a 90' match
  const PLAYER_R = 9, BALL_R = 6;
  const CONTROL_R = 17;              // distance to gain control of loose ball
  const TACKLE_R = 20;
  const BALL_FRICTION = 0.985;
  // segundos de jogo avançados por segundo real (independe do FPS)
  const SPEED_SCALE = { 0: 0, 1: 0.5, 2: 1.4, 3: 3.0, 4: 6.0 }; // pause/lento/normal/rápido/turbo

  class Match {
    constructor(canvas, teamA, teamB, cb) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      // logical size kept fixed for the sim math; backing store scaled for crisp pixels
      this.W = 900; this.H = 560;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = this.W * dpr; canvas.height = this.H * dpr;
      canvas.style.aspectRatio = this.W + '/' + this.H;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.teams = [teamA, teamB];      // 0 attacks right, 1 attacks left
      this.cb = cb || {};
      this.speed = 2;
      this.running = false;
      this.simTime = 0;
      this.score = [0, 0];
      this.lastTouch = 0;
      this.kickoffSide = 0;
      this.flash = null;                // { text, t }
      this._layout();
      this._buildPlayers();
      this._kickoff(0);
      this._raf = this._raf.bind(this);
    }

    _layout() {
      const w = this.W, h = this.H;
      const mx = 46, my = 30;
      this.f = { x0: mx, y0: my, w: w - mx * 2, h: h - my * 2 };
      this.f.x1 = this.f.x0 + this.f.w;
      this.f.y1 = this.f.y0 + this.f.h;
      this.goalH = this.f.h * 0.30;
      this.goalY0 = this.f.y0 + (this.f.h - this.goalH) / 2;
      this.goalY1 = this.goalY0 + this.goalH;
      this.boxW = this.f.w * 0.16;
      this.boxH = this.f.h * 0.58;
      this.boxY0 = this.f.y0 + (this.f.h - this.boxH) / 2;
    }

    // normalized (nx along attack 0..1, ny across 0..1) -> pixel for a side
    _toPx(side, nx, ny) {
      if (side === 0) return { x: this.f.x0 + nx * this.f.w, y: this.f.y0 + ny * this.f.h };
      return { x: this.f.x0 + (1 - nx) * this.f.w, y: this.f.y0 + (1 - ny) * this.f.h };
    }

    _buildPlayers() {
      this.players = [];
      this.teams.forEach((team, side) => {
        const ps = team.players;
        const m = team.tactics ? team.tactics.mentality : 0; // -1 def, 0, +1 att
        const push = m * 0.06;

        // Se o time tem coordenadas nomeadas (escalação do usuário), usa-as.
        const hasCoords = ps.every(p => typeof p.nx === 'number');
        if (hasCoords) {
          ps.forEach(p => {
            const nx = p.pos === 'GK' ? p.nx : clamp(p.nx + push, 0.05, 0.92);
            this._addPlayer(team, side, p, nx, p.ny, p.pos === 'GK');
          });
          return;
        }

        // Layout genérico por categoria (seleções históricas)
        const gk = ps.find(p => p.pos === 'GK') || ps[0];
        const line = (cat) => ps.filter(p => p.pos === cat && p !== gk);
        const def = line('DEF'), mid = line('MID'), att = line('ATT');
        const place = (arr, nx) => {
          const n = arr.length;
          arr.forEach((p, i) => {
            const ny = n === 1 ? 0.5 : 0.12 + (i / (n - 1)) * 0.76;
            this._addPlayer(team, side, p, nx + push, ny);
          });
        };
        this._addPlayer(team, side, gk, 0.045, 0.5, true);
        place(def, 0.24);
        place(mid, 0.47);
        place(att, 0.70);
      });
    }

    _addPlayer(team, side, p, nx, ny, isGK) {
      const base = this._toPx(side, nx, ny);
      const num = this.players.filter(q => q.team === side).length + 1;
      this.players.push({
        team: side, ref: p, name: p.name, isGK: !!isGK, num,
        baseNx: nx, baseNy: ny,
        x: base.x, y: base.y, vx: 0, vy: 0,
        pac: p.pac, pas: p.pas, sho: p.sho, def: p.def, gk: p.gk,
        decTimer: rnd(0, 0.25), touch: 0, cooldown: 0, chalT: 0, contactT: 0, tvx: 0, tvy: 0,
      });
    }

    _ownGoalX(side) { return side === 0 ? this.f.x0 : this.f.x1; }
    _oppGoalX(side) { return side === 0 ? this.f.x1 : this.f.x0; }

    _kickoff(scoredAgainst) {
      // team that conceded (scoredAgainst) kicks off; reset positions
      this._buildPlayers();
      this.ball = { x: (this.f.x0 + this.f.x1) / 2, y: (this.f.y0 + this.f.y1) / 2, vx: 0, vy: 0, owner: null };
      // give possession to a central midfielder of the kickoff side
      const side = scoredAgainst;
      const mids = this.players.filter(p => p.team === side && !p.isGK);
      let nearest = mids[0], bd = Infinity;
      mids.forEach(p => { const d = dist2(p.x, p.y, this.ball.x, this.ball.y); if (d < bd) { bd = d; nearest = p; } });
      if (nearest) { nearest.x = this.ball.x - (side === 0 ? 16 : -16); nearest.y = this.ball.y; this.ball.owner = nearest; }
      this.lastTouch = side;
    }

    setSpeed(s) {
      const wasRunning = this.running && this.speed > 0;
      this.speed = s;
      if (s > 0 && !wasRunning) this.start();
    }

    setTactics(side, t) { this.teams[side].tactics = t; }

    start() {
      if (this.running) return;
      this.running = true;
      requestAnimationFrame(this._raf);
    }

    destroy() { this.running = false; }

    _raf(ts) {
      if (!this.running) return;
      if (this._lastTs == null) this._lastTs = ts;
      let dtReal = (ts - this._lastTs) / 1000; this._lastTs = ts;
      if (dtReal > 0.1) dtReal = 0.1;          // clamp (troca de aba etc.)
      const scale = SPEED_SCALE[this.speed] || 0;
      this._acc = (this._acc || 0) + dtReal * scale;
      let guard = 0;
      while (this._acc >= DT && guard < 900) {
        if (this.simTime >= MATCH_SIM_SECONDS) { this._finish(); return; }
        this._step();
        this.simTime += DT; this._acc -= DT; guard++;
      }
      this._render();
      if (this.cb.onClock) this.cb.onClock(this.minute());
      if (this.simTime >= MATCH_SIM_SECONDS) { this._finish(); return; }
      requestAnimationFrame(this._raf);
    }

    minute() { return Math.min(90, Math.floor((this.simTime / MATCH_SIM_SECONDS) * 90)); }

    _finish() {
      this.running = false;
      this._render();
      if (this.cb.onEnd) this.cb.onEnd({ score: this.score.slice() });
    }

    // -------------------------------------------------- one physics step
    _step() {
      const b = this.ball;

      // possession context
      const posTeam = b.owner ? b.owner.team : -1;

      // --- decide & move every player
      for (const p of this.players) {
        p.decTimer -= DT;
        if (p.touch > 0) p.touch -= DT;
        if (p.cooldown > 0) p.cooldown -= DT;
        this._think(p, posTeam);
        // suaviza a velocidade (aceleração) → movimento fluido, sem tremer
        p.vx += (p.tvx - p.vx) * 0.16;
        p.vy += (p.tvy - p.vy) * 0.16;
        p.x += p.vx * DT; p.y += p.vy * DT;
        p.x = clamp(p.x, this.f.x0 - 8, this.f.x1 + 8);
        p.y = clamp(p.y, this.f.y0 - 8, this.f.y1 + 8);
      }
      this._separate();

      // --- ball
      if (b.owner) {
        const carrier = b.owner;
        const dir = carrier.team === 0 ? 1 : -1;
        b.x = carrier.x + dir * 12;
        b.y = carrier.y;
        b.vx = b.vy = 0;
        this.lastTouch = carrier.team;
        this._carrierActions(carrier);
        // disputa só após o toque protegido (evita roubada instantânea / livelock)
        if (this.ball.owner === carrier && carrier.touch <= 0) this._challenge(carrier);
      } else {
        b.x += b.vx * DT; b.y += b.vy * DT;
        b.vx *= BALL_FRICTION; b.vy *= BALL_FRICTION;
        this._loosePickup();
        this._bounds();
        this._goalCheck();
      }

      this._watchdog();
    }

    // garante que a bola nunca trava num cluster: se quase não anda por ~2s, libera (falta)
    _watchdog() {
      if (this._shotLock > 0) this._shotLock -= DT;
      const b = this.ball;
      this._wTimer = (this._wTimer || 0) + DT;
      if (this._wTimer < 0.5) return;
      this._wTimer = 0;
      const d = (this._wx == null) ? 999 : dist(b.x, b.y, this._wx, this._wy);
      this._wx = b.x; this._wy = b.y;
      this._stall = d < 12 ? (this._stall || 0) + 1 : 0;
      if (this._stall >= 4) {
        this._stall = 0;
        const recv = b.owner ? (1 - b.owner.team) : (Math.random() < 0.5 ? 0 : 1);
        let near = null, bd = Infinity;
        for (const p of this.players) {
          if (p.team !== recv || p.isGK) continue;
          const dd = dist2(p.x, p.y, b.x, b.y);
          if (dd < bd) { bd = dd; near = p; }
        }
        if (near) { this._giveBall(near, 1.0); this._pushBack(near, 78); if (this.cb.onEvent) this.cb.onEvent('Falta! Bola liberada'); }
      }
    }

    _think(p, posTeam) {
      const b = this.ball;
      const attackX = this._oppGoalX(p.team);
      const ownX = this._ownGoalX(p.team);

      // GK behaviour
      if (p.isGK) {
        const lineX = ownX + (p.team === 0 ? 22 : -22);
        let tx = lineX, ty = clamp(b.y, this.goalY0 + 4, this.goalY1 - 4);
        // antecipa o ponto onde a bola cruza a linha (defesa contra chutes)
        const towardOwn = (p.team === 0 && b.vx < -50) || (p.team === 1 && b.vx > 50);
        if (!b.owner && towardOwn) {
          const tline = (lineX - b.x) / (b.vx || (p.team === 0 ? -1 : 1));
          if (tline > 0 && tline < 2.2) ty = clamp(b.y + b.vy * tline, this.goalY0 + 4, this.goalY1 - 4);
        }
        // sai do gol em bola solta dentro da área
        const inBox = (p.team === 0) ? (b.x < this.f.x0 + this.boxW) : (b.x > this.f.x1 - this.boxW);
        if (!b.owner && inBox && dist(p.x, p.y, b.x, b.y) < 80) { tx = b.x; ty = b.y; }
        this._steer(p, tx, ty, 1.15);
        return;
      }

      const myTeamHasBall = posTeam === p.team;
      const oppHasBall = posTeam >= 0 && posTeam !== p.team;
      const ballLoose = posTeam < 0;
      const tac = this.teams[p.team].tactics || { mentality: 0, pressing: 1, tempo: 1 };

      // home position, shifted by ball x (team compactness follows ball)
      const homePx = this._toPx(p.team, p.baseNx, p.baseNy);
      const ballBias = (b.x - homePx.x) * 0.18;
      let tx = homePx.x + ballBias;
      let ty = homePx.y + (b.y - homePx.y) * 0.22;

      if (b.owner === p) return; // carrier handled elsewhere

      if (myTeamHasBall) {
        // empurra o time pra frente: atacantes sobem muito, meias médio, zaga pouco
        const adv = p.baseNx > 0.55 ? 0.62 : (p.baseNx > 0.35 ? 0.42 : 0.20);
        tx = homePx.x + (attackX - homePx.x) * adv + ballBias * 0.4;
        ty = homePx.y * 0.65 + b.y * 0.35;
        this._steer(p, tx, ty, 0.95);
      } else if (oppHasBall) {
        // colapsa na própria área (atacam perto do meu gol) → quebra a jogada antes do chute
        const defThird = (p.team === 0) ? (b.x < this.f.x0 + this.f.w * 0.30) : (b.x > this.f.x1 - this.f.w * 0.30);
        const pressers = defThird ? 3 : ((tac.pressing | 0) >= 2 ? 2 : 1);
        const rank = this._ballProximityRank(p);
        if (rank < pressers) {
          this._steer(p, b.x, b.y, 0.96);
        } else {
          // mantém a forma defensiva, recuando p/ proteger o gol (compacta a defesa)
          const back = (ownX - homePx.x) * 0.20;
          this._steer(p, tx + back, ty, 0.88);
        }
      } else {
        // bola solta: só o mais próximo de cada time disputa
        const rank = this._ballProximityRank(p);
        if (rank < 1) this._steer(p, b.x, b.y, 1.0);
        else this._steer(p, tx, ty, 0.8);
      }
    }

    _ballProximityRank(p) {
      // how many same-team players are closer to ball than p
      const b = this.ball;
      const my = dist2(p.x, p.y, b.x, b.y);
      let rank = 0;
      for (const q of this.players) {
        if (q.team !== p.team || q.isGK || q === p) continue;
        if (dist2(q.x, q.y, b.x, b.y) < my) rank++;
      }
      return rank;
    }

    _steer(p, tx, ty, speedFactor) {
      const dx = tx - p.x, dy = ty - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const maxV = (95 + p.pac * 1.0) * speedFactor; // px/s
      const arrive = d < 24 ? d / 24 : 1;            // desacelera ao chegar (não tremer no alvo)
      p.tvx = (dx / d) * maxV * arrive;
      p.tvy = (dy / d) * maxV * arrive;
    }

    _separate() {
      // light anti-overlap
      const ps = this.players;
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const a = ps[i], c = ps[j];
          const dx = c.x - a.x, dy = c.y - a.y;
          const d = Math.hypot(dx, dy);
          const min = PLAYER_R * 2;
          if (d > 0 && d < min) {
            const push = (min - d) / 2;
            const ux = dx / d, uy = dy / d;
            a.x -= ux * push; a.y -= uy * push;
            c.x += ux * push; c.y += uy * push;
          }
        }
      }
    }

    // -------------------------------------------------- carrier decisions
    _carrierActions(c) {
      const tac = this.teams[c.team].tactics || { mentality: 0, tempo: 1 };
      const goalX = this._oppGoalX(c.team);
      const goalY = (this.goalY0 + this.goalY1) / 2;
      const dGoal = dist(c.x, c.y, goalX, goalY);
      const range = this.f.w * 0.33;
      const angleOk = Math.abs(c.y - goalY) < this.goalH * 1.2;
      const pressure = this._pressureOn(c);

      const shotLock = (this._shotLock || 0) > 0;
      // dentro da área COM espaço: finaliza (área lotada → passa; e trava-chute evita rajada)
      if (dGoal < this.f.w * 0.15 && Math.abs(c.y - goalY) < this.goalH * 1.1 && pressure < 0.72 && !shotLock) { this._shoot(c); return; }

      // IMPASSE: marcador colado por ~0.5s sem resolução (ou super-colado) → SEMPRE faz algo.
      // Passe de preferência (toque); fallback chute se tem alcance; senão lançamento. Sem ficar empurrando.
      if (pressure > 0.68) c.contactT += DT; else c.contactT = 0;
      if (c.contactT > 0.5 || pressure > 0.85) {
        c.contactT = 0;
        const safe = this._bestPass(c, true);
        if (safe) { this._pass(c, safe); return; }
        if (dGoal < range && angleOk && !shotLock) { this._shoot(c); return; }
        this._clear(c); return;
      }

      // SEM pressão: decide em cadência (constrói a jogada)
      if (c.decTimer > 0) { this._dribble(c); return; }
      c.decTimer = 0.25;

      // chute de média distância (probabilístico)
      if (dGoal < range && angleOk && !shotLock) {
        const close = 1 - dGoal / range;
        let shootP = 0.02 + close * 0.14 + (c.sho / 99) * 0.04 + (tac.mentality || 0) * 0.01;
        if (Math.random() < clamp(shootP, 0.02, 0.4)) { this._shoot(c); return; }
      }

      // passe de construção (mais futebol, menos drible solo)
      const target = this._bestPass(c, false);
      let passP = 0.36 + ((tac.tempo || 1) - 1) * 0.2 - (c.pas / 99) * 0.05;
      if (target && Math.random() < clamp(passP, 0.12, 0.7)) { this._pass(c, target); return; }

      this._dribble(c);
    }

    _pressureOn(c) {
      let nearest = Infinity;
      for (const q of this.players) {
        if (q.team === c.team) continue;
        const d = dist(q.x, q.y, c.x, c.y);
        if (d < nearest) nearest = d;
      }
      return clamp(1 - nearest / 70, 0, 1);
    }

    _bestPass(c, pressured) {
      let best = null, bestScore = -1e9;
      for (const q of this.players) {
        if (q.team !== c.team || q === c || q.isGK) continue;
        const d = dist(c.x, c.y, q.x, q.y);
        if (d < 26 || d > this.f.w * 0.6) continue;
        const progress = (c.team === 0 ? (q.x - c.x) : (c.x - q.x)); // avanço rumo ao gol
        let nearOpp = Infinity;                                       // o quão livre está o alvo
        for (const o of this.players) {
          if (o.team === c.team) continue;
          const od = dist(o.x, o.y, q.x, q.y);
          if (od < nearOpp) nearOpp = od;
        }
        // sob pressão prioriza quem está LIVRE; senão prioriza progressão
        const score = pressured ? (nearOpp * 1.5 + progress * 0.3 - d * 0.08)
                                 : (progress * 1.0 + nearOpp * 0.7 - d * 0.12);
        if (score > bestScore) { bestScore = score; best = q; }
      }
      return best;
    }

    // lançamento p/ frente quando não há opção de passe sob pressão
    _clear(c) {
      const goalX = this._oppGoalX(c.team);
      const tx = goalX, ty = clamp(c.y + rnd(-90, 90), this.f.y0 + 20, this.f.y1 - 20);
      const dx = tx - c.x, dy = ty - c.y, dd = Math.hypot(dx, dy) || 1;
      const speed = 400;
      this.ball.vx = (dx / dd) * speed;
      this.ball.vy = (dy / dd) * speed;
      this.ball.owner = null;
      this.lastTouch = c.team;
      this._lastPasser = c;
      if (this.cb.onEvent) this.cb.onEvent(`${c.name} lança`);
    }

    _pass(c, target) {
      const noise = (1 - c.pas / 99) * 26;
      const tx = target.x + rnd(-noise, noise);
      const ty = target.y + rnd(-noise, noise);
      const d = dist(c.x, c.y, tx, ty);
      const speed = clamp(220 + d * 0.9, 220, 480);
      const dx = tx - c.x, dy = ty - c.y, dd = Math.hypot(dx, dy) || 1;
      this.ball.vx = (dx / dd) * speed;
      this.ball.vy = (dy / dd) * speed;
      this.ball.owner = null;
      this.lastTouch = c.team;
      this._lastPasser = c;
    }

    _shoot(c) {
      const goalX = this._oppGoalX(c.team);
      // mira dentro da meta + pequeno erro proporcional à finalização
      const aimY = (this.goalY0 + this.goalY1) / 2 + rnd(-this.goalH * 0.40, this.goalH * 0.40);
      const miss = (1 - c.sho / 99) * 26;
      const ty = clamp(aimY + rnd(-miss, miss), this.goalY0 - 18, this.goalY1 + 18);
      const tx = goalX + (c.team === 0 ? 12 : -12);
      const dx = tx - c.x, dy = ty - c.y, dd = Math.hypot(dx, dy) || 1;
      const speed = 560 + c.sho * 1.2;
      this.ball.vx = (dx / dd) * speed;
      this.ball.vy = (dy / dd) * speed;
      this.ball.owner = null;
      this.lastTouch = c.team;
      this._shotBy = c;
      this._shotLock = 0.7;                 // trava-chute: evita rajada de finalização no rebote
      if (this.cb.onEvent) this.cb.onEvent(`${c.name} finaliza!`);
    }

    _dribble(c) {
      const goalX = this._oppGoalX(c.team);
      const goalY = (this.goalY0 + this.goalY1) / 2;
      let tx = goalX, ty = goalY * 0.5 + c.y * 0.5;
      // desvia lateralmente do marcador mais próximo (foge do cluster)
      let near = null, nd = 1e9;
      for (const q of this.players) {
        if (q.team === c.team) continue;
        const d = dist(q.x, q.y, c.x, c.y);
        if (d < nd) { nd = d; near = q; }
      }
      if (near && nd < 42) ty += (c.y - near.y) * 0.9 + (c.y < goalY ? -10 : 10);
      const speed = (115 + c.pac * 1.0);
      const dx = tx - c.x, dy = ty - c.y, dd = Math.hypot(dx, dy) || 1;
      c.tvx = (dx / dd) * speed;
      c.tvy = (dy / dd) * speed;
    }

    // dá a posse a um jogador com um "toque protegido" (imunidade curta a disputa)
    _giveBall(p, imm) {
      const b = this.ball;
      b.owner = p; b.vx = b.vy = 0;
      p.touch = imm || 0.35; p.decTimer = Math.max(p.decTimer, 0.15);
      this.lastTouch = p.team; this._shotBy = null;
    }
    // afasta marcadores adversários (tiro livre / bola liberada)
    _pushBack(p, r) {
      for (const q of this.players) {
        if (q.team === p.team) continue;
        const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
        if (d < r) { q.x = p.x + dx / d * r; q.y = p.y + dy / d * r; q.cooldown = Math.max(q.cooldown, 0.6); }
      }
    }
    _foul(victim, offender) {
      offender.cooldown = 1.2;
      this._giveBall(victim, 1.0);          // bola parada, toque protegido longo
      this._pushBack(victim, 70);
      if (this.cb.onEvent) this.cb.onEvent(`Falta! Tiro livre p/ ${this.teams[victim.team].name}`);
    }

    // UM marcador disputa por vez; resolve em cadência; roubada = posse limpa
    _challenge(c) {
      let ch = null, bd = TACKLE_R * TACKLE_R;
      for (const q of this.players) {
        if (q.team === c.team || q.isGK || q.cooldown > 0) continue;
        const d = dist2(q.x, q.y, c.x, c.y);
        if (d < bd) { bd = d; ch = q; }
      }
      if (!ch) { c.chalT = 0; return; }
      c.chalT -= DT;
      if (c.chalT > 0) return;
      c.chalT = 0.28;                        // um lance a cada ~0.28s
      const atk = (c.pac + c.pas) / 2 + c.sho * 0.1 + rnd(0, 34);
      const dfn = ch.def + 8 + rnd(0, 40);
      if (dfn > atk) {
        if (Math.random() < 0.14) { this._foul(c, ch); }   // falta do defensor
        else {                                              // roubada limpa
          this._giveBall(ch, 0.45);
          c.cooldown = 0.6;
          if (this.cb.onEvent) this.cb.onEvent(`${ch.name} rouba a bola`);
        }
      } else if (atk > dfn + 30) {
        ch.cooldown = 0.22;                   // driblou: marcador recua um instante
      } else {
        if (Math.random() < 0.06) this._foul(ch, c);  // falta do atacante
        else ch.cooldown = 0.18;
      }
    }

    // -------------------------------------------------- loose ball
    _loosePickup() {
      const b = this.ball;
      const ballSpeed = Math.hypot(b.vx, b.vy);
      // GK agarra bola lenta na área (chute forte é resolvido na linha por _gkSave)
      if (ballSpeed < 230) {
        for (const p of this.players) {
          if (!p.isGK) continue;
          if (dist(p.x, p.y, b.x, b.y) < CONTROL_R + 4 && Math.random() < 0.5) { this._giveBall(p, 0.4); return; }
        }
      }
      // domínio limpo pelo mais próximo (ignora quem está em cooldown) — sem duelo no mesmo ponto
      const cr = ballSpeed > 300 ? CONTROL_R * 0.5 : CONTROL_R;
      let cand = null, bd = cr * cr;
      for (const p of this.players) {
        if (p.isGK || p.cooldown > 0) continue;
        const d = dist2(p.x, p.y, b.x, b.y);
        if (d < bd) { bd = d; cand = p; }
      }
      if (cand) this._giveBall(cand, 0.3);
    }

    _bounds() {
      const b = this.ball;
      // top/bottom -> throw-in to opponent of last touch
      if (b.y < this.f.y0 || b.y > this.f.y1) {
        b.y = clamp(b.y, this.f.y0 + 6, this.f.y1 - 6);
        b.vy *= -0.3; b.vx *= 0.4;
        this._restart(1 - this.lastTouch, b.x, b.y);
      }
    }

    _goalCheck() {
      const b = this.ball;
      // left goal line (team1 attacks left)
      if (b.x <= this.f.x0) {
        if (b.y > this.goalY0 && b.y < this.goalY1) { if (this._gkSave(0)) return; this._goal(1); return; }
        this._goalLineOut(0, b);
      } else if (b.x >= this.f.x1) {
        if (b.y > this.goalY0 && b.y < this.goalY1) { if (this._gkSave(1)) return; this._goal(0); return; }
        this._goalLineOut(1, b);
      }
    }

    // tentativa de defesa do goleiro quando a bola cruza a linha do gol
    _gkSave(defendSide) {
      const b = this.ball;
      const gk = this.players.find(p => p.isGK && p.team === defendSide);
      if (!gk) return false;
      const dy = Math.abs(gk.y - b.y);
      const power = Math.hypot(b.vx, b.vy) / 760;            // 0..~1 (chutes fortes mais difíceis)
      let save = 0.85 + gk.gk / 320 - (dy / (this.goalH * 0.7)) * 0.34 - power * 0.05;
      if (Math.random() > clamp(save, 0.06, 0.955)) return false; // gol
      // defendeu
      const dir = defendSide === 0 ? 1 : -1;
      b.x = defendSide === 0 ? this.f.x0 + 14 : this.f.x1 - 14;
      b.y = gk.y;
      if (Math.random() < 0.82) {                             // segurou (poucos rebotes)
        this._giveBall(gk, 0.6);
      } else {                                                // espalmou longe, p/ fora da área
        b.owner = null; b.vx = dir * rnd(330, 480); b.vy = rnd(-260, 260);
      }
      this.lastTouch = defendSide;
      if (this._shotBy && this._shotBy.team !== defendSide && this.cb.onEvent) this.cb.onEvent(`${gk.name} defende!`);
      this._shotBy = null;
      return true;
    }

    _goalLineOut(defendSide, b) {
      // ball crossed goal line outside posts
      const x = defendSide === 0 ? this.f.x0 + 6 : this.f.x1 - 6;
      b.y = clamp(b.y, this.f.y0 + 8, this.f.y1 - 8);
      if (this.lastTouch === defendSide) {
        // corner -> attacking team restart from corner
        const cy = b.y < (this.f.y0 + this.f.y1) / 2 ? this.f.y0 + 10 : this.f.y1 - 10;
        this._restart(1 - defendSide, x, cy);
      } else {
        // goal kick -> defending GK
        this._restart(defendSide, defendSide === 0 ? this.f.x0 + 40 : this.f.x1 - 40, (this.f.y0 + this.f.y1) / 2);
      }
    }

    _restart(side, x, y) {
      const b = this.ball;
      b.vx = b.vy = 0; b.x = clamp(x, this.f.x0 + 4, this.f.x1 - 4); b.y = y; b.owner = null;
      // give to nearest player of side
      let near = null, bd = Infinity;
      for (const p of this.players) {
        if (p.team !== side) continue;
        const d = dist2(p.x, p.y, b.x, b.y);
        if (d < bd) { bd = d; near = p; }
      }
      if (near) { near.x = b.x - (side === 0 ? 12 : -12); near.y = b.y; b.owner = near; }
      this.lastTouch = side;
      this._shotBy = null;
    }

    _goal(side) {
      this.score[side]++;
      const scorer = (this._shotBy && this._shotBy.team === side) ? this._shotBy : (this._lastPasser && this._lastPasser.team === side ? this._lastPasser : null);
      this.flash = { text: 'GOL!', t: 1.4, side, scorer: scorer ? scorer.name : '' };
      this._shotBy = null;
      if (this.cb.onGoal) this.cb.onGoal(side, scorer ? scorer.name : '', this.minute());
      this._kickoff(1 - side);
    }

    // -------------------------------------------------- render
    _txtColor(hex) {
      const h = (hex || '#888').replace('#', '');
      if (h.length < 6) return '#fff';
      const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#10233f' : '#ffffff';
    }

    _render() {
      const ctx = this.ctx, f = this.f, cx = (f.x0 + f.x1) / 2, cy = (f.y0 + f.y1) / 2;
      ctx.clearRect(0, 0, this.W, this.H);

      // grass stripes (soft)
      const stripes = 14, sw = f.w / stripes;
      for (let i = 0; i < stripes; i++) {
        ctx.fillStyle = i % 2 ? '#3aa758' : '#329a4f';
        ctx.fillRect(f.x0 + i * sw, f.y0, sw + 1, f.h);
      }
      // lines
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
      ctx.strokeRect(f.x0, f.y0, f.w, f.h);
      ctx.beginPath(); ctx.moveTo(cx, f.y0); ctx.lineTo(cx, f.y1); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, f.h * 0.13, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
      ctx.strokeRect(f.x0, this.boxY0, this.boxW, this.boxH);
      ctx.strokeRect(f.x1 - this.boxW, this.boxY0, this.boxW, this.boxH);
      // goals
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(f.x0, this.goalY0); ctx.lineTo(f.x0, this.goalY1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(f.x1, this.goalY0); ctx.lineTo(f.x1, this.goalY1); ctx.stroke();

      // players
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const p of this.players) {
        const t = this.teams[p.team];
        const col = p.isGK ? '#1b1b1b' : t.color;
        // shadow
        ctx.beginPath(); ctx.ellipse(p.x, p.y + PLAYER_R - 1, PLAYER_R * 0.9, PLAYER_R * 0.45, 0, 0, 7);
        ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fill();
        // body
        ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_R, 0, 7);
        ctx.fillStyle = col; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = p.team === 0 ? '#0b3d91' : '#7a1020'; ctx.stroke();
        // carrier ring
        if (this.ball.owner === p) {
          ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_R + 4, 0, 7);
          ctx.strokeStyle = '#fff200'; ctx.lineWidth = 2.5; ctx.stroke();
        }
        // number
        ctx.fillStyle = p.isGK ? '#fff' : this._txtColor(col);
        ctx.font = 'bold 10px Arial';
        ctx.fillText(p.num, p.x, p.y + 0.5);
      }

      // ball (+shadow)
      const b = this.ball;
      ctx.beginPath(); ctx.ellipse(b.x, b.y + 4, BALL_R, BALL_R * 0.5, 0, 0, 7);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fill();
      ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, 7);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.stroke();

      // goal flash
      if (this.flash) {
        this.flash.t -= 0.016 * ((SPEED_SCALE[this.speed] || 1) + 0.4);
        ctx.save();
        ctx.globalAlpha = clamp(this.flash.t, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,.5)';
        ctx.fillRect(0, this.H / 2 - 46, this.W, 92);
        ctx.fillStyle = '#fff200'; ctx.font = 'bold 54px Arial'; ctx.textAlign = 'center';
        ctx.fillText('⚽ GOL!', this.W / 2, this.H / 2 + 6);
        if (this.flash.scorer) {
          ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Arial';
          ctx.fillText(this.flash.scorer, this.W / 2, this.H / 2 + 34);
        }
        ctx.restore();
        if (this.flash.t <= 0) this.flash = null;
      }
    }
  }

  window.RetroMatch = Match;
})();
