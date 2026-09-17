/* グラスブロックくずし — Meta Ray-Ban Display 用ブロックくずし
   入力: タップ(Enter) と D-pad(矢印キー) のみ。Escape は PC 確認用の補助。 */
(function () {
  'use strict';

  var DEMO = /[?&]demo=1/.test(location.search);
  var seed = 20260917;
  function rnd() {
    if (!DEMO) return Math.random();
    seed = (seed * 1664525 + 1013904223) >>> 0; // デモ録画用: 乱数固定
    return seed / 4294967296;
  }

  var W = 600, H = 600, TOP = 40, BOTTOM = 560;
  var COLS = 10, BW = 54, BH = 20, GAP = 6, OX = 3, OY = 62;
  var PADDLE_Y = 540, PADDLE_H = 12, PAD_W = 96, PAD_WIDE = 150, BALL_R = 6;
  var ROW_COLORS = ['#ff6b6b', '#ffa94d', '#ffd166', '#4ade80', '#38bdf8', '#a78bfa', '#f472b6', '#e6e9f0'];
  var SILVER = '#b0b8c8';

  // ステージ: 8行×10列。'1' 通常 / '2' 銀（2回） / '.' なし
  var STAGES = [
    ['1111111111', '1111111111', '1111111111', '1111111111', '1111111111', '..........', '..........', '..........'],
    ['1.1.1.1.1.', '.1.1.1.1.1', '1.1.1.1.1.', '.1.1.1.1.1', '1.1.1.1.1.', '.1.1.1.1.1', '..........', '..........'],
    ['....11....', '...1111...', '..111111..', '.11111111.', '1111111111', '.11111111.', '..111111..', '...1111...'],
    ['1111111111', '2........2', '1.222222.1', '1.2....2.1', '1.222222.1', '2........2', '1111111111', '..........'],
    ['.11....11.', '1111..1111', '1111111111', '1111111111', '.11111111.', '..111111..', '...1111...', '....11....'],
  ];
  var POWERS = ['W', 'M', 'S', 'L'];
  var POWER_COLOR = { W: '#38bdf8', M: '#a78bfa', S: '#4ade80', L: '#ff6b6b' };

  /* ---------- 状態 ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('field'), ctx = cv.getContext('2d');
  var hudStage = $('hud-stage'), hudScore = $('hud-score'), hudLives = $('hud-lives'), hint = $('hint');
  var overlays = { title: $('title'), help: $('help'), clear: $('clear'), result: $('result') };
  var state = 'title'; // title | help | play | clear | result
  var menuIdx = 0, startStage = 1, resIdx = 0;
  var g = null; // ゲーム中の状態

  var KEY = 'glass-kuzushi-best';
  function loadBest() { try { return parseInt(localStorage.getItem(KEY) || '0', 10) || 0; } catch (e) { return 0; } }
  function saveBest(v) { if (DEMO) return; try { localStorage.setItem(KEY, String(v)); } catch (e) { /* ignore */ } }

  function showOverlay(name) { Object.keys(overlays).forEach(function (k) { overlays[k].classList.toggle('hidden', k !== name); }); }
  function setHint(t, hot) { hint.textContent = t; hint.classList.toggle('hot', !!hot); }
  function setCur(list, idx) { list.forEach(function (el, i) { el.classList.toggle('cur', i === idx); }); }

  /* ---------- タイトル ---------- */
  var menuBtns = Array.prototype.slice.call(document.querySelectorAll('#title .rail-btn'));
  function toTitle() {
    state = 'title'; g = null;
    showOverlay('title');
    setCur(menuBtns, menuIdx);
    $('m-stage').textContent = startStage;
    $('t-rec').textContent = 'ハイスコア ' + loadBest();
    hudStage.textContent = '🧱 グラスブロックくずし'; hudScore.textContent = ''; hudLives.textContent = '';
    setHint('↑↓ でえらんで タップ');
    drawFrame();
  }
  function toHelp() { state = 'help'; showOverlay('help'); setHint('タップで とじる'); }

  /* ---------- ゲーム ---------- */
  function newGame(stageNo) {
    g = { stage: stageNo, score: 0, lives: 3, bricks: [], balls: [], powers: [], padX: W / 2, padTarget: W / 2, padW: PAD_W,
      wideT: 0, slowT: 0, speed: 0, launched: false, remain: 0, flash: 0, shake: 0, particles: [] };
    loadStage();
    state = 'play'; showOverlay(null);
    updateHud();
  }
  function loadStage() {
    var layout = STAGES[(g.stage - 1) % STAGES.length];
    var loop = Math.floor((g.stage - 1) / STAGES.length);
    g.bricks = []; g.remain = 0;
    for (var r = 0; r < layout.length; r++) for (var c = 0; c < COLS; c++) {
      var ch = layout[r][c]; if (ch === '.') continue;
      g.bricks.push({ r: r, c: c, x: OX + c * (BW + GAP), y: OY + r * (BH + GAP), hp: ch === '2' ? 2 : 1, silver: ch === '2', alive: true });
      g.remain++;
    }
    g.speed = Math.min(560, 300 + (g.stage - 1) * 28 + loop * 40);
    g.powers = []; g.wideT = 0; g.slowT = 0; g.padW = PAD_W;
    resetBall();
  }
  function resetBall() {
    g.balls = [{ x: g.padX, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0 }];
    g.launched = false;
    setHint('←→ パドル　タップで発射', true);
  }
  function launch() {
    var b = g.balls[0], a = (-60 + rnd() * 120) * Math.PI / 180;
    b.vx = Math.sin(a) * g.speed; b.vy = -Math.cos(a) * g.speed;
    g.launched = true; setHint('');
  }
  function updateHud() {
    hudStage.textContent = '🧱 ステージ ' + g.stage;
    hudScore.textContent = String(g.score);
    var s = ''; for (var i = 0; i < g.lives; i++) s += '❤️'; hudLives.textContent = s;
  }
  function addScore(n) { g.score += n; hudScore.textContent = String(g.score); }

  function spawnPower(x, y) {
    if (rnd() > 0.2) return;
    var t = POWERS[Math.floor(rnd() * POWERS.length)];
    if (t === 'L' && rnd() < 0.5) t = 'W'; // ライフは出にくく
    g.powers.push({ x: x, y: y, t: t, vy: 120 });
  }
  function applyPower(t) {
    if (t === 'W') { g.padW = PAD_WIDE; g.wideT = 12; }
    else if (t === 'S') { g.slowT = 8; }
    else if (t === 'L') { if (g.lives < 5) g.lives++; updateHud(); }
    else if (t === 'M') {
      var add = [];
      g.balls.forEach(function (b) {
        if (add.length + g.balls.length >= 9) return;
        [-0.5, 0.5].forEach(function (da) {
          var sp = Math.hypot(b.vx, b.vy) || g.speed, an = Math.atan2(b.vy, b.vx) + da;
          add.push({ x: b.x, y: b.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp });
        });
      });
      g.balls = g.balls.concat(add);
    }
    addScore(50); g.flash = 0.25;
  }
  function burst(x, y, color) {
    for (var i = 0; i < 6; i++) { var a = rnd() * Math.PI * 2, s = 60 + rnd() * 120; g.particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.4, c: color }); }
  }

  function step(dt) {
    // パドル（デモ時はボールを自動追尾）
    if (DEMO && g.launched) {
      var tgt = null; g.balls.forEach(function (b) { if (b.vy > 0 && (!tgt || b.y > tgt.y)) tgt = b; });
      if (tgt) g.padTarget = tgt.x + (tgt.x - W / 2) * 0.12;
    }
    var half = g.padW / 2;
    g.padTarget = Math.max(half, Math.min(W - half, g.padTarget));
    g.padX += (g.padTarget - g.padX) * Math.min(1, dt * 14);
    if (g.wideT > 0) { g.wideT -= dt; if (g.wideT <= 0) g.padW = PAD_W; }
    if (g.slowT > 0) g.slowT -= dt;
    var mul = g.slowT > 0 ? 0.65 : 1;

    if (!g.launched) { g.balls[0].x = g.padX; g.balls[0].y = PADDLE_Y - BALL_R - 1; }

    // ボール
    for (var i = g.balls.length - 1; i >= 0; i--) {
      var b = g.balls[i];
      if (!g.launched) continue;
      var sub = Math.ceil(Math.hypot(b.vx, b.vy) * mul * dt / 4); // すり抜け防止
      for (var s = 0; s < sub; s++) {
        b.x += b.vx * mul * dt / sub; b.y += b.vy * mul * dt / sub;
        if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx); }
        if (b.x > W - BALL_R) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx); }
        if (b.y < TOP + BALL_R) { b.y = TOP + BALL_R; b.vy = Math.abs(b.vy); }
        // パドル
        if (b.vy > 0 && b.y + BALL_R >= PADDLE_Y && b.y - BALL_R <= PADDLE_Y + PADDLE_H && b.x >= g.padX - half - BALL_R && b.x <= g.padX + half + BALL_R) {
          var rel = (b.x - g.padX) / half, ang = rel * 65 * Math.PI / 180, sp = Math.hypot(b.vx, b.vy);
          b.vx = Math.sin(ang) * sp; b.vy = -Math.cos(ang) * sp; b.y = PADDLE_Y - BALL_R;
        }
        // ブロック
        var c = Math.floor((b.x - OX) / (BW + GAP)), r = Math.floor((b.y - OY) / (BH + GAP)), hit = false;
        for (var dr = -1; dr <= 1 && !hit; dr++) for (var dc = -1; dc <= 1 && !hit; dc++) {
          var br = brickAt(r + dr, c + dc); if (!br || !br.alive) continue;
          var nx = Math.max(br.x, Math.min(b.x, br.x + BW)), ny = Math.max(br.y, Math.min(b.y, br.y + BH));
          var dx = b.x - nx, dy = b.y - ny;
          if (dx * dx + dy * dy > BALL_R * BALL_R) continue;
          if (Math.abs(dx) > Math.abs(dy)) b.vx = dx > 0 ? Math.abs(b.vx) : -Math.abs(b.vx); else b.vy = dy > 0 ? Math.abs(b.vy) : -Math.abs(b.vy);
          hitBrick(br); hit = true; s = sub;
        }
      }
      if (b.y > H + BALL_R) g.balls.splice(i, 1);
    }
    if (g.launched && g.balls.length === 0) loseLife();

    // パワーアップ
    for (var p = g.powers.length - 1; p >= 0; p--) {
      var pw = g.powers[p]; pw.y += pw.vy * dt;
      if (pw.y + 10 >= PADDLE_Y && pw.y - 10 <= PADDLE_Y + PADDLE_H && Math.abs(pw.x - g.padX) < half + 14) { applyPower(pw.t); g.powers.splice(p, 1); }
      else if (pw.y > H + 20) g.powers.splice(p, 1);
    }
    for (var q = g.particles.length - 1; q >= 0; q--) { var pt = g.particles[q]; pt.t -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; if (pt.t <= 0) g.particles.splice(q, 1); }
    if (g.flash > 0) g.flash -= dt;
    if (g.shake > 0) g.shake -= dt;
  }
  var brickIndex = {};
  function brickAt(r, c) { return brickIndex[r + ',' + c]; }
  function rebuildIndex() { brickIndex = {}; g.bricks.forEach(function (b) { brickIndex[b.r + ',' + b.c] = b; }); }
  function hitBrick(br) {
    br.hp--;
    if (br.hp > 0) { addScore(10); return; }
    br.alive = false; g.remain--;
    addScore(br.silver ? 100 : 20 + br.r * 5);
    burst(br.x + BW / 2, br.y + BH / 2, br.silver ? SILVER : ROW_COLORS[br.r]);
    spawnPower(br.x + BW / 2, br.y + BH / 2);
    if (g.remain === 0) stageClear();
  }
  function loseLife() {
    g.lives--; updateHud(); g.shake = 0.3; g.powers = []; g.padW = PAD_W; g.wideT = 0; g.slowT = 0;
    if (g.lives <= 0) return gameOver();
    resetBall();
  }
  function stageClear() {
    state = 'clear';
    addScore(200);
    $('c-title').textContent = '✨ ステージ' + g.stage + ' クリア！';
    $('c-sub').textContent = 'スコア ' + g.score;
    showOverlay('clear'); setHint('タップで つぎへ');
  }
  function nextStage() { g.stage++; loadStage(); state = 'play'; showOverlay(null); updateHud(); }
  function gameOver() {
    state = 'result';
    var best = loadBest(), isBest = g.score > best;
    if (isBest) { best = g.score; saveBest(best); }
    $('r-title').textContent = isBest && g.score > 0 ? '🏆 ハイスコア更新！' : '💥 ゲームオーバー';
    $('r-score').textContent = String(g.score);
    $('r-sub').textContent = 'ステージ ' + g.stage + ' まで到達　ハイスコア ' + best;
    resIdx = 0; setCur(resBtns, 0);
    showOverlay('result'); setHint('↑↓ でえらんで タップ');
  }

  /* ---------- 描画 ---------- */
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawFrame() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (g && g.shake > 0) ctx.translate((rnd() - 0.5) * 8, (rnd() - 0.5) * 8);
    // フィールド枠
    ctx.strokeStyle = '#2e3340'; ctx.lineWidth = 2; ctx.strokeRect(1, TOP, W - 2, BOTTOM - TOP);
    if (!g) {
      // タイトル背景の飾りブロック
      for (var r = 0; r < 3; r++) for (var c = 0; c < COLS; c++) { ctx.fillStyle = ROW_COLORS[r]; ctx.globalAlpha = 0.35; roundRect(OX + c * (BW + GAP), OY + r * (BH + GAP), BW, BH, 4); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.restore(); return;
    }
    // ブロック
    g.bricks.forEach(function (b) {
      if (!b.alive) return;
      var col = b.silver ? (b.hp === 2 ? SILVER : '#6c7484') : ROW_COLORS[b.r];
      ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8;
      roundRect(b.x, b.y, BW, BH, 4); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(b.x + 3, b.y + 3, BW - 6, 3);
    });
    // パーティクル
    g.particles.forEach(function (p) { ctx.globalAlpha = Math.max(0, p.t / 0.4); ctx.fillStyle = p.c; ctx.fillRect(p.x - 3, p.y - 3, 6, 6); });
    ctx.globalAlpha = 1;
    // パワーアップ
    g.powers.forEach(function (p) {
      ctx.fillStyle = POWER_COLOR[p.t]; ctx.shadowColor = POWER_COLOR[p.t]; ctx.shadowBlur = 10;
      roundRect(p.x - 16, p.y - 10, 32, 20, 10); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#0a0a0f'; ctx.font = '700 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.t === 'L' ? '♥' : p.t, p.x, p.y + 1);
    });
    // パドル
    var half = g.padW / 2, pc = g.wideT > 0 ? '#38bdf8' : '#ffd166';
    ctx.fillStyle = pc; ctx.shadowColor = pc; ctx.shadowBlur = 14;
    roundRect(g.padX - half, PADDLE_Y, g.padW, PADDLE_H, 6); ctx.fill(); ctx.shadowBlur = 0;
    // ボール
    g.balls.forEach(function (b) {
      ctx.fillStyle = g.slowT > 0 ? '#4ade80' : '#ffffff'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    });
    // 効果の残り時間
    ctx.font = '700 14px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    var ty = TOP + 6;
    if (g.wideT > 0) { ctx.fillStyle = '#38bdf8'; ctx.fillText('W ' + Math.ceil(g.wideT), W - 8, ty); ty += 16; }
    if (g.slowT > 0) { ctx.fillStyle = '#4ade80'; ctx.fillText('S ' + Math.ceil(g.slowT), W - 8, ty); }
    if (g.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (g.flash * 0.4) + ')'; ctx.fillRect(0, TOP, W, BOTTOM - TOP); }
    ctx.restore();
  }

  /* ---------- ループ ---------- */
  var last = 0;
  function loop(ts) {
    var dt = Math.min(0.033, (ts - last) / 1000 || 0); last = ts;
    if (state === 'play') { rebuildIndex(); step(dt); }
    drawFrame();
    requestAnimationFrame(loop);
  }

  /* ---------- 入力 ---------- */
  var resBtns = Array.prototype.slice.call(document.querySelectorAll('#result .rail-btn'));
  var helpBtn = document.querySelector('#help .rail-btn');
  function onKey(e) {
    var k = e.key;
    if (k === 'Escape') { if (state !== 'title') toTitle(); e.preventDefault(); return; } // PC確認用の補助
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].indexOf(k) < 0) return;
    e.preventDefault();
    var tap = k === 'Enter' || k === ' ';
    if (state === 'title') {
      if (k === 'ArrowUp') menuIdx = (menuIdx + 2) % 3;
      else if (k === 'ArrowDown') menuIdx = (menuIdx + 1) % 3;
      else if (menuIdx === 1 && (k === 'ArrowLeft' || k === 'ArrowRight')) { startStage = ((startStage - 1 + (k === 'ArrowRight' ? 1 : STAGES.length - 1)) % STAGES.length) + 1; $('m-stage').textContent = startStage; }
      else if (tap) { if (menuIdx === 0) newGame(startStage); else if (menuIdx === 1) newGame(startStage); else toHelp(); return; }
      setCur(menuBtns, menuIdx);
    } else if (state === 'help') { if (tap) toTitle(); }
    else if (state === 'play') {
      if (k === 'ArrowLeft') g.padTarget -= 44;
      else if (k === 'ArrowRight') g.padTarget += 44;
      else if (tap && !g.launched) launch();
    } else if (state === 'clear') { if (tap) nextStage(); }
    else if (state === 'result') {
      if (k === 'ArrowUp' || k === 'ArrowDown') { resIdx ^= 1; setCur(resBtns, resIdx); }
      else if (tap) { if (resIdx === 0) newGame(startStage); else toTitle(); }
    }
  }
  document.addEventListener('keydown', onKey);
  // PC確認用: クリック操作
  menuBtns.forEach(function (b, i) { b.addEventListener('click', function () { menuIdx = i; setCur(menuBtns, i); onKey({ key: 'Enter', preventDefault: function () {} }); }); });
  helpBtn.addEventListener('click', toTitle);
  overlays.clear.addEventListener('click', function () { if (state === 'clear') nextStage(); });
  resBtns.forEach(function (b, i) { b.addEventListener('click', function () { resIdx = i; onKey({ key: 'Enter', preventDefault: function () {} }); }); });
  cv.addEventListener('click', function (e) { if (state !== 'play') return; if (!g.launched) launch(); else g.padTarget = e.offsetX; });

  toTitle();
  requestAnimationFrame(loop);
})();
