// gameOver.js
// Game Over screen for The Cuban Misfire — drawn entirely on the q5 canvas.
// Silhouetted commander against red interrogation backdrop, speech bubble,
// big red "GAME OVER", scanline CRT effect.
//
// Usage (in your main sketch):
//
//   import { GameOverScreen } from './gameOver.js';
//
//   let gameOver;
//
//   function setup() {
//     new Canvas(1600, 900);
//     noSmooth();
//     gameOver = new GameOverScreen({
//       quote: '"YOU FAILED, SOLDIER."',
//       onContinue: () => { /* restart game */ },
//     });
//   }
//
//   function draw() {
//     if (playerIsDead) {
//       gameOver.draw();
//       gameOver.update();   // handles input
//     } else {
//       // normal game render
//     }
//   }
//
// All rendering uses an internal 480×270 resolution that gets scaled up to
// fill the canvas with nearest-neighbor, so pixels stay crisp at any size.

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
    // Try to split at the first comma for a Mario-style two-line bubble
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

  // Public: call this each frame to render the screen
draw() {
    push();
    translate(-camera.x, -camera.y);
    noSmooth();
    noStroke();
    fill(0);
    rect(0, 0, width, height);
    scale(width / this.W, height / this.H);

    this._drawBackdrop();
    this._drawSilhouette();
    this._drawSpeechBubble();
    this._drawGameOverText();
    this._drawSubtitle();
    this._drawScanlines();

    pop();
}
  // =========================================================================
  // BACKDROP - radial red gradient (banded for 8-bit feel)
  // =========================================================================
  _drawBackdrop() {
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
        fill(c);
        rect(bx, by, BLOCK, BLOCK);
      }
    }

    // Dither rings at band boundaries
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x - cx, dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        const t = Math.min(1, d / maxD);
        if ((x + y) % 2 !== 0) continue;
        if (Math.abs(t - 0.15) < 0.015) { fill(this.C.BG_BRIGHT); rect(x, y, 1, 1); }
        else if (Math.abs(t - 0.32) < 0.015) { fill(this.C.BG_MID); rect(x, y, 1, 1); }
        else if (Math.abs(t - 0.55) < 0.015) { fill(this.C.BG_DEEP); rect(x, y, 1, 1); }
      }
    }
  }

  // =========================================================================
  // SILHOUETTE — head, neck, shoulders, suit
  // =========================================================================
  _drawSilhouette() {
    const cx = this.W / 2;
    const headCy = 138;
    const headW = 56;
    const headH = 60;

    // -- HEAD (filled ellipse) --
    fill(this.C.SIL_MAIN);
    this._fillEllipse(cx, headCy, headW, headH);

    // -- MILITARY-STYLE CAP (peaked cap, gives silhouette authority shape) --
    // Cap brim (horizontal slab)
    fill(this.C.SIL_MAIN);
    rect(cx - headW / 2 - 4, headCy - headH / 2 + 4, headW + 8, 5);
    // Cap crown (slightly tapered upward)
    rect(cx - headW / 2 + 2, headCy - headH / 2 - 14, headW - 4, 18);
    // Soften crown top corners
    rect(cx - headW / 2 + 4, headCy - headH / 2 - 18, headW - 8, 4);
    // Cap badge area (small lighter spot — subtle, just a hint)
    fill(this.C.SIL_RIM);
    rect(cx - 4, headCy - headH / 2 - 4, 8, 4);
    fill(this.C.SIL_MAIN);
    rect(cx - 2, headCy - headH / 2 - 3, 4, 2);

    // -- NECK --
    fill(this.C.SIL_MAIN);
    rect(cx - 12, headCy + headH / 2 - 4, 24, 14);

    // -- SHIRT COLLAR (white V peek) --
    fill(this.C.BUBBLE_BG);
    const collarY = headCy + headH / 2 + 8;
    for (let i = 0; i < 9; i++) {
      // left side of V
      rect(cx - 16 + i, collarY + i, 14 - i, 1);
      // right side of V
      rect(cx + 2, collarY + i, 14 - i, 1);
    }

    // -- TIE (dark) --
    fill(this.C.SIL_MAIN);
    // Tie knot triangle
    for (let i = 0; i < 5; i++) {
      rect(cx - 4 - i, collarY + 12 + i, 8 + i * 2, 1);
    }
    // Tie body widening downward
    rect(cx - 6, collarY + 17, 12, 8);

    // -- SHOULDERS / SUIT (expanding trapezoid from neck to bottom) --
    fill(this.C.SIL_MAIN);
    const shoulderTop = collarY + 4;
    const shoulderMaxHalfW = 110;
    for (let y = shoulderTop; y < this.H; y++) {
      const t = (y - shoulderTop) / (this.H - shoulderTop);
      let halfW = 30 + Math.floor(Math.pow(t, 0.6) * (shoulderMaxHalfW - 30));
      // Rounded shoulder shape at the top
      if (y < shoulderTop + 14) {
        const ease = (y - shoulderTop) / 14;
        halfW = Math.floor(halfW * (0.4 + 0.6 * ease));
      }
      // Skip the collar area
      if (y < collarY + 18) {
        // Draw left and right halves around the tie
        rect(cx - halfW, y, halfW - 16, 1);
        rect(cx + 16, y, halfW - 16, 1);
      } else {
        rect(cx - halfW, y, halfW * 2, 1);
      }
    }

    // -- LAPEL LINES (subtle V from collar down into the suit) --
    fill(this.C.SIL_RIM);
    for (let i = 0; i < 22; i++) {
      // Left lapel diagonal
      rect(cx - 18 - i, collarY + 18 + i, 2, 1);
      // Right lapel diagonal
      rect(cx + 16 + i, collarY + 18 + i, 2, 1);
    }

    // -- SHOULDER BOARDS / EPAULETS (small bright accents) --
    fill(this.C.SIL_RIM);
    // Left shoulder
    rect(cx - 50, shoulderTop + 10, 14, 3);
    rect(cx - 50, shoulderTop + 14, 14, 1);
    // Right shoulder
    rect(cx + 36, shoulderTop + 10, 14, 3);
    rect(cx + 36, shoulderTop + 14, 14, 1);

    // -- RIM LIGHTING on top-left edges (light from interrogation lamp) --
    // Simple approach: draw a thin highlight along the upper-left silhouette edges
    fill(this.C.SIL_HI);
    // Cap top-left rim
    rect(cx - headW / 2 + 4, headCy - headH / 2 - 18, 4, 1);
    rect(cx - headW / 2 + 2, headCy - headH / 2 - 14, 2, 8);
    // Cap brim left edge
    rect(cx - headW / 2 - 4, headCy - headH / 2 + 4, 2, 5);
    // Head left edge (upper portion)
    for (let i = 0; i < 12; i++) {
      const y = headCy - headH / 2 + 9 + i;
      const dx = Math.sqrt(1 - Math.pow((y - headCy) / (headH / 2), 2)) * (headW / 2);
      const lx = Math.round(cx - dx);
      rect(lx, y, 1, 1);
    }
    // Shoulder top-left rim
    fill(this.C.SIL_RIM);
    rect(cx - 50, shoulderTop + 8, 18, 2);
    rect(cx + 32, shoulderTop + 8, 18, 2);
  }

  _fillEllipse(cx, cy, w, h) {
    const rx = w / 2;
    const ry = h / 2;
    for (let y = Math.floor(cy - ry); y < cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
        const ndx = (x - cx) / rx;
        const ndy = (y - cy) / ry;
        if (ndx * ndx + ndy * ndy <= 1.0) {
          rect(x, y, 1, 1);
        }
      }
    }
  }

  // =========================================================================
  // SPEECH BUBBLE
  // =========================================================================
  _drawSpeechBubble() {
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
    fill(this.C.BUBBLE_SH);
    rect(bx + 4, by + 4, bw, bh);

    // Main bubble body
    fill(this.C.BUBBLE_BG);
    rect(bx, by, bw, bh);

    // Outline (1px border on all sides + corners rounded by erasing corners)
    fill(this.C.BUBBLE_OL);
    rect(bx, by - 1, bw, 1);
    rect(bx, by + bh, bw, 1);
    rect(bx - 1, by, 1, bh);
    rect(bx + bw, by, 1, bh);

    // Speech bubble tail pointing down-left to the figure's mouth
    const headCx = this.W / 2;
    const headBottom = 138 + 30; // mouth area
    const tailStartX = bx + 20;
    const tailStartY = by + bh;
    const tailEndX = headCx + 16;
    const tailEndY = headBottom - 4;

    // Filled tail
    fill(this.C.BUBBLE_BG);
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const tx = Math.round(tailStartX + (tailEndX - tailStartX) * t);
      const ty = Math.round(tailStartY + (tailEndY - tailStartY) * t);
      const w = Math.max(1, Math.floor((1 - t) * 9));
      rect(tx, ty, w, 2);
    }
    // Tail outline (left and right edges)
    fill(this.C.BUBBLE_OL);
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const tx = Math.round(tailStartX + (tailEndX - tailStartX) * t);
      const ty = Math.round(tailStartY + (tailEndY - tailStartY) * t);
      const w = Math.max(1, Math.floor((1 - t) * 9));
      rect(tx - 1, ty, 1, 1);
      rect(tx + w, ty, 1, 1);
      rect(tx + w + 1, ty + 1, 1, 1);
    }
    // Tail tip
    rect(tailEndX, tailEndY, 2, 1);

    // Bubble text — centered per line
    const textY0 = by + padY;
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      const lw = this._measureText(line, textSize);
      const lx = bx + Math.floor((bw - lw) / 2);
      const ly = textY0 + i * lineH;
      this._drawText(line, lx, ly, textSize, this.C.BUBBLE_OL);
    }
  }

  // =========================================================================
  // GAME OVER big text
  // =========================================================================
  _drawGameOverText() {
    const text = 'GAME OVER';
    const sz = 4;
    const tw = this._measureText(text, sz);
    const tx = (this.W - tw) / 2;
    const ty = 22;

    // Slight pulse based on frameCount (Mania-style brightness wobble)
    const pulse = Math.sin(this.frameCount * 0.08);
    const useHi = pulse > 0.6;

    // Black drop shadow
    this._drawText(text, tx + 2, ty + 4, sz, this.C.GO_BLACK);

    // 8-direction outline pass
    const offs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]];
    for (const [ox, oy] of offs) {
      this._drawText(text, tx + ox, ty + oy, sz, this.C.GO_BLACK);
    }

    // Main letters drawn pixel-by-pixel for two-tone shading (top half lighter)
    for (let i = 0; i < text.length; i++) {
      const ch = text[i].toUpperCase();
      const g = this.FONT[ch] ?? this.FONT[' '];
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (g[row][col] !== '1') continue;
          const px = tx + i * 6 * sz + col * sz;
          const py = ty + row * sz;
          // Top half = brighter base; bottom half = deep red
          fill(row < 4 ? this.C.GO_BASE : this.C.GO_DEEP);
          rect(px, py, sz, sz);
          // Rim highlight on the very top pixels
          if (row === 0 || (row > 0 && g[row - 1][col] === '0' && row < 3)) {
            fill(useHi ? this.C.GO_HI : this.C.GO_BASE);
            rect(px, py, sz, Math.max(1, Math.floor(sz / 2)));
          }
        }
      }
    }
  }

  // =========================================================================
  // SUBTITLE
  // =========================================================================
  _drawSubtitle() {
    if (!this.blinkOn) return;
    const sub = this.subtitle;
    const sz = 1;
    const sw = this._measureText(sub, sz);
    const sx = (this.W - sw) / 2;
    const sy = this.H - 22;
    // Shadow
    this._drawText(sub, sx + 1, sy + 1, sz, this.C.GO_BLACK);
    // Main
    this._drawText(sub, sx, sy, sz, this.C.WHITE);
  }

  // =========================================================================
  // SCANLINES — CRT effect
  // =========================================================================
  _drawScanlines() {
    fill(0, 0, 0, 60); // semi-transparent black
    for (let y = 0; y < this.H; y += 2) {
      rect(0, y, this.W, 1);
    }
  }

  // =========================================================================
  // PIXEL FONT helpers
  // =========================================================================
  _measureText(s, size) {
    return s.length * 6 * size - size;
  }

  _drawText(s, x, y, size, color) {
    fill(color);
    for (let i = 0; i < s.length; i++) {
      const ch = s[i].toUpperCase();
      const g = this.FONT[ch] ?? this.FONT[' '];
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (g[row][col] === '1') {
            rect(x + i * 6 * size + col * size, y + row * size, size, size);
          }
        }
      }
    }
  }
}