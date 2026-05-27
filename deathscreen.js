// gameOver.js
// Game Over screen for The Cuban Misfire — drawn on an overlaid canvas/graphics context layer.
// Silhouetted commander against red interrogation backdrop, speech bubble,
// big red "GAME OVER", scanline CRT effect.

export class GameOverScreen {
  constructor(opts = {}) {
    // Internal pixel-art resolution
    this.W = 480;
    this.H = 270;

    // Speech bubble text — split into lines
    const rawQuote = opts.quote ?? '"YOU FAILED, SOLDIER."';
    this.lines = this._splitQuote(rawQuote);

    this.subtitle = opts.subtitle ?? 'PRESS START TO CONTINUE';
    this.onContinue = opts.onContinue ?? null;

    // Animation state
    this.frameCount = 0;
    this.blinkOn = true;
    this.blinkTimer = 0;

    // Pixel font - 5x7 glyphs, '1' = pixel on
    this.FONT = {
      'A':["01110","10001","10001","11111","10001","10001","10001"],
      'B':["11110","10001","10001","11110","10001","10001","11110"],
      'C':["01111","10000","10000","10000","10000","10000","01111"],
      'D':["11110","10001","10001","10001","10001","10001","11110"],
      'E':["11111","10000","10000","11110","10000","10000","11111"],
      'F':["11111","10000","10000","11110","10000","10000","10000"],
      'G':["01111","10000","10000","10011","10001","10001","01111"],
      'H':["10001","10001","10001","11111","10001","10001","10001"],
      'I':["11111","00100","00100","00100","00100","00100","11111"],
      'J':["00001","00001","00001","00001","00001","10001","01110"],
      'K':["10001","10010","10100","11000","10100","10010","10001"],
      'L':["10000","10000","10000","10000","10000","10000","11111"],
      'M':["10001","11011","10101","10001","10001","10001","10001"],
      'N':["10001","11001","10101","10011","10001","10001","10001"],
      'O':["01110","10001","10001","10001","10001","10001","01110"],
      'P':["11110","10001","10001","11110","10000","10000","10000"],
      'Q':["01110","10001","10001","10001","10101","10010","01101"],
      'R':["11110","10001","10001","11110","10100","10010","10001"],
      'S':["01111","10000","10000","01110","00001","00001","11110"],
      'T':["11111","00100","00100","00100","00100","00100","00100"],
      'U':["10001","10001","10001","10001","10001","10001","01110"],
      'V':["10001","10001","10001","10001","10001","01010","00100"],
      'W':["10001","10001","10001","10001","10101","11011","10001"],
      'X':["10001","10001","01010","00100","01010","10001","10001"],
      'Y':["10001","10001","10001","01010","00100","00100","00100"],
      'Z':["11111","00001","00010","00100","01000","10000","11111"],
      ' ':["00000","00000","00000","00000","00000","00000","00000"],
      '.':["00000","00000","00000","00000","00000","01100","01100"],
      ',':["00000","00000","00000","00000","01100","00100","01000"],
      '!':["00100","00100","00100","00100","00100","00000","00100"],
      '?':["01110","10001","00001","00010","00100","00000","00100"],
      "'":["00100","00100","00000","00000","00000","00000","00000"],
      '"':["01010","01010","01010","00000","00000","00000","00000"],
      '-':["00000","00000","00000","11111","00000","00000","00000"],
      ':':["00000","01100","01100","00000","01100","01100","00000"],
    };

    // Colors stored as q5 color strings (hex)
    this.C = {
      BG_DEEP:   '#28080c',
      BG_MID:    '#5f1216',
      BG_BRIGHT: '#a51e23',
      BG_HOT:    '#d23237',
      SIL_OUT:   '#000000',
      SIL_MAIN:  '#080a10',
      SIL_RIM:   '#2d3246',
      SIL_HI:    '#5a6482',
      BUBBLE_BG: '#f5f0e1',
      BUBBLE_SH: '#b4a582',
      BUBBLE_OL: '#1c1612',
      GO_DEEP:   '#6e0c0f',
      GO_BASE:   '#c81e23',
      GO_HI:     '#ff5a5a',
      GO_BLACK:  '#0f080a',
      WHITE:     '#fff0e1',
    };
  }

  _splitQuote(s) {
    const idx = s.indexOf(',');
    if (idx > 0 && idx < s.length - 2) {
      return [s.slice(0, idx + 1), s.slice(idx + 1).trim()];
    }
    return [s];
  }

  // Public: call once per frame after draw()
  update() {
    this.frameCount++;
    this.blinkTimer++;
    if (this.blinkTimer > 30) {
      this.blinkOn = !this.blinkOn;
      this.blinkTimer = 0;
    }
    // Input handling
    if (typeof kb !== 'undefined') {
      if (kb.presses('space') || kb.presses('enter')) {
        if (this.onContinue) this.onContinue();
      }
    }
  }

  // Public: Render the game over elements onto your custom context layer
  draw(ctx) {
    ctx.push();
    ctx.noSmooth();
    ctx.noStroke();
    
    // Wipe overlay canvas background
    ctx.fill(0);
    ctx.rect(0, 0, ctx.width, ctx.height);
    
    // Dynamic aspect-scaling matching your target buffer size
    ctx.scale(ctx.width / this.W, ctx.height / this.H);

    this._drawBackdrop(ctx);
    this._drawSilhouette(ctx);
    this._drawSpeechBubble(ctx);
    this._drawGameOverText(ctx);
    this._drawSubtitle(ctx);
    this._drawScanlines(ctx);

    ctx.pop();
  }

  // =========================================================================
  // BACKDROP - radial red gradient (banded for 8-bit feel)
  // =========================================================================
  _drawBackdrop(ctx) {
    const W = this.W, H = this.H;
    const cx = W / 2;
    const cy = H / 2 + 30;
    const maxD = Math.sqrt(W * W + H * H) / 2;

    // Use 4x4 blocks for chunky 8-bit gradient quantization
    const BLOCK = 4;
    for (let by = 0; by < H; by += BLOCK) {
      for (let bx = 0; bx < W; bx += BLOCK) {
        const dx = bx - cx;
        const dy = by - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        const t = Math.min(1, d / maxD);
        let c;
        if (t < 0.15) c = this.C.BG_HOT;
        else if (t < 0.32) c = this.C.BG_BRIGHT;
        else if (t < 0.55) c = this.C.BG_MID;
        else c = this.C.BG_DEEP;
        ctx.fill(c);
        ctx.rect(bx, by, BLOCK, BLOCK);
      }
    }

    // Dither rings at band boundaries
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x - cx, dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        const t = Math.min(1, d / maxD);
        if ((x + y) % 2 !== 0) continue;
        if (Math.abs(t - 0.15) < 0.015) { ctx.fill(this.C.BG_BRIGHT); ctx.rect(x, y, 1, 1); }
        else if (Math.abs(t - 0.32) < 0.015) { ctx.fill(this.C.BG_MID); ctx.rect(x, y, 1, 1); }
        else if (Math.abs(t - 0.55) < 0.015) { ctx.fill(this.C.BG_DEEP); ctx.rect(x, y, 1, 1); }
      }
    }
  }

  // =========================================================================
  // SILHOUETTE — head, neck, shoulders, suit
  // =========================================================================
  _drawSilhouette(ctx) {
    const cx = this.W / 2;
    const headCy = 138;
    const headW = 56;
    const headH = 60;

    // -- HEAD --
    ctx.fill(this.C.SIL_MAIN);
    this._fillEllipse(ctx, cx, headCy, headW, headH);

    // -- MILITARY-STYLE CAP --
    ctx.fill(this.C.SIL_MAIN);
    ctx.rect(cx - headW / 2 - 4, headCy - headH / 2 + 4, headW + 8, 5);
    ctx.rect(cx - headW / 2 + 2, headCy - headH / 2 - 14, headW - 4, 18);
    ctx.rect(cx - headW / 2 + 4, headCy - headH / 2 - 18, headW - 8, 4);
    
    ctx.fill(this.C.SIL_RIM);
    ctx.rect(cx - 4, headCy - headH / 2 - 4, 8, 4);
    ctx.fill(this.C.SIL_MAIN);
    ctx.rect(cx - 2, headCy - headH / 2 - 3, 4, 2);

    // -- NECK --
    ctx.fill(this.C.SIL_MAIN);
    ctx.rect(cx - 12, headCy + headH / 2 - 4, 24, 14);

    // -- SHIRT COLLAR --
    ctx.fill(this.C.BUBBLE_BG);
    const collarY = headCy + headH / 2 + 8;
    for (let i = 0; i < 9; i++) {
      ctx.rect(cx - 16 + i, collarY + i, 14 - i, 1);
      ctx.rect(cx + 2, collarY + i, 14 - i, 1);
    }

    // -- TIE --
    ctx.fill(this.C.SIL_MAIN);
    for (let i = 0; i < 5; i++) {
      ctx.rect(cx - 4 - i, collarY + 12 + i, 8 + i * 2, 1);
    }
    ctx.rect(cx - 6, collarY + 17, 12, 8);

    // -- SHOULDERS / SUIT --
    ctx.fill(this.C.SIL_MAIN);
    const shoulderTop = collarY + 4;
    const shoulderMaxHalfW = 110;
    for (let y = shoulderTop; y < this.H; y++) {
      const t = (y - shoulderTop) / (this.H - shoulderTop);
      let halfW = 30 + Math.floor(Math.pow(t, 0.6) * (shoulderMaxHalfW - 30));
      if (y < shoulderTop + 14) {
        const ease = (y - shoulderTop) / 14;
        halfW = Math.floor(halfW * (0.4 + 0.6 * ease));
      }
      if (y < collarY + 18) {
        ctx.rect(cx - halfW, y, halfW - 16, 1);
        ctx.rect(cx + 16, y, halfW - 16, 1);
      } else {
        ctx.rect(cx - halfW, y, halfW * 2, 1);
      }
    }

    // -- LAPEL LINES --
    ctx.fill(this.C.SIL_RIM);
    for (let i = 0; i < 22; i++) {
      ctx.rect(cx - 18 - i, collarY + 18 + i, 2, 1);
      ctx.rect(cx + 16 + i, collarY + 18 + i, 2, 1);
    }

    // -- SHOULDER BOARDS --
    ctx.fill(this.C.SIL_RIM);
    ctx.rect(cx - 50, shoulderTop + 10, 14, 3);
    ctx.rect(cx - 50, shoulderTop + 14, 14, 1);
    ctx.rect(cx + 36, shoulderTop + 10, 14, 3);
    ctx.rect(cx + 36, shoulderTop + 14, 14, 1);

    // -- RIM LIGHTING --
    ctx.fill(this.C.SIL_HI);
    ctx.rect(cx - headW / 2 + 4, headCy - headH / 2 - 18, 4, 1);
    ctx.rect(cx - headW / 2 + 2, headCy - headH / 2 - 14, 2, 8);
    ctx.rect(cx - headW / 2 - 4, headCy - headH / 2 + 4, 2, 5);
    for (let i = 0; i < 12; i++) {
      const y = headCy - headH / 2 + 9 + i;
      const dx = Math.sqrt(1 - Math.pow((y - headCy) / (headH / 2), 2)) * (headW / 2);
      const lx = Math.round(cx - dx);
      ctx.rect(lx, y, 1, 1);
    }
    ctx.fill(this.C.SIL_RIM);
    ctx.rect(cx - 50, shoulderTop + 8, 18, 2);
    ctx.rect(cx + 32, shoulderTop + 8, 18, 2);
  }

  _fillEllipse(ctx, cx, cy, w, h) {
    const rx = w / 2;
    const ry = h / 2;
    for (let y = Math.floor(cy - ry); y < cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
        const ndx = (x - cx) / rx;
        const ndy = (y - cy) / ry;
        if (ndx * ndx + ndy * ndy <= 1.0) {
          ctx.rect(x, y, 1, 1);
        }
      }
    }
  }

  // =========================================================================
  // SPEECH BUBBLE
  // =========================================================================
  _drawSpeechBubble(ctx) {
    const textSize = 2;
    const lineH = 7 * textSize + 3;
    let maxLineW = 0;
    for (const line of this.lines) {
      const w = this._measureText(line, textSize);
      if (w > maxLineW) maxLineW = w;
    }
    const padX = 12;
    const padY = 10;
    const bw = maxLineW + padX * 2;
    const bh = this.lines.length * lineH + padY * 2 - 3;
    const bx = this.W - bw - 28;
    const by = 72;

    // Drop shadow
    ctx.fill(this.C.BUBBLE_SH);
    ctx.rect(bx + 4, by + 4, bw, bh);

    // Main bubble body
    ctx.fill(this.C.BUBBLE_BG);
    ctx.rect(bx, by, bw, bh);

    // Outline
    ctx.fill(this.C.BUBBLE_OL);
    ctx.rect(bx, by - 1, bw, 1);
    ctx.rect(bx, by + bh, bw, 1);
    ctx.rect(bx - 1, by, 1, bh);
    ctx.rect(bx + bw, by, 1, bh);

    // Tail calculations
    const headCx = this.W / 2;
    const headBottom = 138 + 30; 
    const tailStartX = bx + 20;
    const tailStartY = by + bh;
    const tailEndX = headCx + 16;
    const tailEndY = headBottom - 4;

    // Filled tail
    ctx.fill(this.C.BUBBLE_BG);
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const tx = Math.round(tailStartX + (tailEndX - tailStartX) * t);
      const ty = Math.round(tailStartY + (tailEndY - tailStartY) * t);
      const w = Math.max(1, Math.floor((1 - t) * 9));
      ctx.rect(tx, ty, w, 2);
    }
    // Tail outline
    ctx.fill(this.C.BUBBLE_OL);
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const tx = Math.round(tailStartX + (tailEndX - tailStartX) * t);
      const ty = Math.round(tailStartY + (tailEndY - tailStartY) * t);
      const w = Math.max(1, Math.floor((1 - t) * 9));
      ctx.rect(tx - 1, ty, 1, 1);
      ctx.rect(tx + w, ty, 1, 1);
      ctx.rect(tx + w + 1, ty + 1, 1, 1);
    }
    ctx.rect(tailEndX, tailEndY, 2, 1);

    // Bubble text strings
    const textY0 = by + padY;
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      const lw = this._measureText(line, textSize);
      const lx = bx + Math.floor((bw - lw) / 2);
      const ly = textY0 + i * lineH;
      this._drawText(line, lx, ly, textSize, this.C.BUBBLE_OL, ctx);
    }
  }

  // =========================================================================
  // GAME OVER big text
  // =========================================================================
  _drawGameOverText(ctx) {
    const text = 'GAME OVER';
    const sz = 4;
    const tw = this._measureText(text, sz);
    const tx = (this.W - tw) / 2;
    const ty = 22;

    const pulse = Math.sin(this.frameCount * 0.08);
    const useHi = pulse > 0.6;

    // Black drop shadow
    this._drawText(text, tx + 2, ty + 4, sz, this.C.GO_BLACK, ctx);

    // 8-direction outline pass
    const offs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]];
    for (const [ox, oy] of offs) {
      this._drawText(text, tx + ox, ty + oy, sz, this.C.GO_BLACK, ctx);
    }

    // Two-tone text rasterization
    for (let i = 0; i < text.length; i++) {
      const ch = text[i].toUpperCase();
      const g = this.FONT[ch] ?? this.FONT[' '];
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (g[row][col] !== '1') continue;
          const px = tx + i * 6 * sz + col * sz;
          const py = ty + row * sz;
          
          ctx.fill(row < 4 ? this.C.GO_BASE : this.C.GO_DEEP);
          ctx.rect(px, py, sz, sz);
          
          if (row === 0 || (row > 0 && g[row - 1][col] === '0' && row < 3)) {
            ctx.fill(useHi ? this.C.GO_HI : this.C.GO_BASE);
            ctx.rect(px, py, sz, Math.max(1, Math.floor(sz / 2)));
          }
        }
      }
    }
  }

  // =========================================================================
  // SUBTITLE
  // =========================================================================
  _drawSubtitle(ctx) {
    if (!this.blinkOn) return;
    const sub = this.subtitle;
    const sz = 1;
    const sw = this._measureText(sub, sz);
    const sx = (this.W - sw) / 2;
    const sy = this.H - 22;
    
    // Shadow
    this._drawText(sub, sx + 1, sy + 1, sz, this.C.GO_BLACK, ctx);
    // Main
    this._drawText(sub, sx, sy, sz, this.C.WHITE, ctx);
  }

  // =========================================================================
  // SCANLINES — CRT effect
  // =========================================================================
  _drawScanlines(ctx) {
    ctx.fill(0, 0, 0, 60);
    for (let y = 0; y < this.H; y += 2) {
      ctx.rect(0, y, this.W, 1);
    }
  }

  // =========================================================================
  // PIXEL FONT helpers
  // =========================================================================
  _measureText(s, size) {
    return s.length * 6 * size - size;
  }

  _drawText(s, x, y, size, color, ctx) {
    ctx.fill(color);
    for (let i = 0; i < s.length; i++) {
      const ch = s[i].toUpperCase();
      const g = this.FONT[ch] ?? this.FONT[' '];
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (g[row][col] === '1') {
            ctx.rect(x + i * 6 * size + col * size, y + row * size, size, size);
          }
        }
      }
    }
  }
}
