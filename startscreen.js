// startscreen.js — The Cuban Misfire title + diving + loading sequence.

////////////////////////////////

const ctx = document.getElementById("supercanvas").getContext("2d");

function fill(c) {
    if (typeof c === "string") {
        ctx.fillStyle = c;
    } else if (c.levels) {
        const [r, g, b, a] = c.levels;
        ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
    } else {
        ctx.fillStyle = c.toString();
    }
}

function rect(x, y, w, h) {
    ctx.fillRect(x, y, w, h);
}

function translate(x, y) {
    ctx.translate(x, y);
}

function scale(x, y) {
    ctx.scale(x, y ?? x);
}

////////////////////////////////

const SS_W = 320, SS_H = 240;
const WATER_LEVEL = 130;

let phase = "idle";  // "idle" | "diving" | "submerged" | "loading"
let frameCt = 0;
let subY = 110;
let subBob = 0;
let diveTimer = 0;
let waveOffset = 0;
let surfaceDisturbance = 0;
let lastSplashTrigger = -999;
let loadingStarted = false;
let loadingStartTime = 0;
let factIdx = 0;
let factSwapTimer = 0;
let factFadeAlpha = 255;
let factFadingOut = false;
let blinkFlag = true;
let blinkTimer = 0;

const btnW = 100, btnH = 28;
let btnX = SS_W / 2 - btnW / 2;
let btnY = SS_H / 2 + 16;

const clouds = [
    { x: 60,  y: 30 },
    { x: 180, y: 50 },
    { x: 260, y: 25 },
];

const splashes = [];
const bubbles = [];

const facts = [
    "The Cuban Missile Crisis lasted 13 days in October 1962, the closest the world ever came to nuclear war.",
    "Soviet submarine B-59, surrounded by US destroyers, nearly launched a nuclear torpedo. One officer's vote stopped it.",
    "The 'red telephone' wasn't actually a phone — it was a teletype hotline between Washington and Moscow.",
    "U-2 spy planes flew at 70,000 feet, so high their pilots wore pressure suits like astronauts.",
    "The CIA's 'Operation Mongoose' included plots to assassinate Castro with exploding cigars.",
    "The USSR placed missiles in Cuba partly in response to US Jupiter missiles stationed in Turkey.",
    "Vasili Arkhipov, the Soviet officer who refused to fire, is considered by many to have saved the world.",
    "Kennedy's daily intelligence briefings during the crisis ran 60+ pages long.",
    "Khrushchev wrote two letters in 36 hours — one conciliatory, one demanding — confusing US negotiators.",
    "After the crisis, the US secretly removed its Jupiter missiles from Turkey, kept hidden for decades.",
    "Fidel Castro reportedly urged Khrushchev to launch a first strike against the United States.",
    "The 'Cold War' term came from a 1947 speech — a war fought with everything except direct combat.",
    "The KGB and CIA both used dead-drop locations in cities like Vienna and Berlin for spy communications.",
    "Soviet Foxtrot subs like B-59 had no air conditioning. Tropical patrols hit 140°F (60°C) inside.",
];

// Palette (initialized once in initStartScreen)
let C_SKY_TOP, C_SKY_MID, C_SKY_LOW;
let C_SUN, C_SUN_RING;
let C_CLOUD_HI, C_CLOUD_LO;
let C_WATER_HI, C_WATER_MID, C_WATER_LOW, C_WATER_DEEP;
let C_WAVE_FOAM, C_WAVE_CREST;
let C_SUB_BODY, C_SUB_DARK, C_SUB_LIGHT, C_SUB_RED, C_SUB_WIN, C_SUB_WIN_D;
let C_SPLASH_HI, C_SPLASH_MID, C_SPLASH_LO;
let C_TITLE_OUT, C_TITLE_SHADOW, C_TITLE_YELLOW;
let C_BTN_HI, C_BTN_MID, C_BTN_LO, C_BTN_DARK;
let C_LOAD_BG_TOP, C_LOAD_BG_BOT, C_LOAD_TEXT, C_LOAD_DIM, C_LOAD_BAR_BG, C_LOAD_BAR_BORDER;

let palettesInitialized = false;
let done = false;

// ============================================================
// Public API
// ============================================================
export function initStartScreen() {
    if (!palettesInitialized) {
        C_SKY_TOP    = color("#5fb4e6");
        C_SKY_MID    = color("#7ec8f0");
        C_SKY_LOW    = color("#a8dcf5");
        C_SUN        = color("#ffe066");
        C_SUN_RING   = color("#ffb84d");
        C_CLOUD_HI   = color("#ffffff");
        C_CLOUD_LO   = color("#d8e8f5");
        C_WATER_HI   = color("#3a7ec8");
        C_WATER_MID  = color("#1f5a9e");
        C_WATER_LOW  = color("#0a3370");
        C_WATER_DEEP = color("#031a45");
        C_WAVE_FOAM  = color("#ffffff");
        C_WAVE_CREST = color("#a8dcf5");
        C_SUB_BODY   = color("#3a3a3a");
        C_SUB_DARK   = color("#1a1a1a");
        C_SUB_LIGHT  = color("#6a6a6a");
        C_SUB_RED    = color("#c8242a");
        C_SUB_WIN    = color("#ffe066");
        C_SUB_WIN_D  = color("#aa8830");
        C_SPLASH_HI  = color("#ffffff");
        C_SPLASH_MID = color("#a8dcf5");
        C_SPLASH_LO  = color("#5fb4e6");
        C_TITLE_OUT    = color("#1a1a3a");
        C_TITLE_SHADOW = color("#8a1010");
        C_TITLE_YELLOW = color("#ffe066");
        C_BTN_HI   = color("#ff5560");
        C_BTN_MID  = color("#c8242a");
        C_BTN_LO   = color("#7a1015");
        C_BTN_DARK = color("#1a1a3a");
        C_LOAD_BG_TOP    = color("#0a1a3a");
        C_LOAD_BG_BOT    = color("#03081a");
        C_LOAD_TEXT      = color("#e8f0ff");
        C_LOAD_DIM       = color("#88aacc");
        C_LOAD_BAR_BG    = color("#0a1428");
        C_LOAD_BAR_BORDER = color("#4466aa");
        palettesInitialized = true;
    }
    done = false;
}

export function isStartScreenDone() {
    return done;
}

export function handleStartScreenClick(mx, my) {
    if (phase !== "idle") return;

    // mouseX/mouseY appear to be centered: (0,0) = canvas center.
    // Convert to screen-pixel coords (top-left origin):
    const screenX = mx + width / 2;
    const screenY = my + height / 2;

    // Map to internal 320×240 grid
    const ix = screenX * (SS_W / width);
    const iy = screenY * (SS_H / height);

    if (ix >= btnX && ix <= btnX + btnW && iy >= btnY && iy <= btnY + btnH) {
        phase = "diving";
    }
}

export function updateStartScreen() {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Fill the entire visible canvas with black
    fill(0);
    rect(0, 0, width, height);

    // Stretch 320×240 grid to fill the canvas
    scale(width / SS_W, height / SS_H);

    if (phase === "loading") {
        drawLoadingScreen();
    } else {
        drawWorldScene();
        if (phase === "idle") drawTitleAndButton();
    }

    updatePhase();
    frameCt++;

    ctx.restore();
}
// ============================================================
// World scene
// ============================================================
function drawWorldScene() {
    px(0, 0, SS_W, 40, C_SKY_TOP);
    px(0, 40, SS_W, 30, C_SKY_MID);
    px(0, 70, SS_W, WATER_LEVEL - 70, C_SKY_LOW);

    drawSun(260, 50);

    for (const c of clouds) {
        c.x += 0.08;
        if (c.x > SS_W + 20) c.x = -30;
        drawCloud(c.x, c.y);
    }

    if (phase === "idle") {
        subBob = sin(frameCt * 0.05) * 2;
        drawSubmarine(160, subY + subBob);
    } else if (phase === "diving" || phase === "submerged") {
        drawSubmarine(160, subY);
        if (phase === "diving") {
            const subTop = subY - 16;
            if (subTop > WATER_LEVEL - 4 && subTop < WATER_LEVEL + 4 && lastSplashTrigger < diveTimer - 4) {
                spawnSplash(160 - 50, WATER_LEVEL, 2.5);
                spawnSplash(160 + 50, WATER_LEVEL, 2.5);
                spawnSplash(160 - 30, WATER_LEVEL, 2);
                spawnSplash(160 + 30, WATER_LEVEL, 2);
                lastSplashTrigger = diveTimer;
                surfaceDisturbance = 12;
            }
            if (subTop < WATER_LEVEL && subTop > WATER_LEVEL - 30 && frameCt % 3 === 0) {
                spawnSplash(160 - 55 + random() * 110, WATER_LEVEL, 1.2);
            }
            if (subY > WATER_LEVEL && frameCt % 4 === 0) {
                spawnBubble(160, subY);
            }
        }
    }

    drawWaterBody(waveOffset, surfaceDisturbance);
    drawBubbles(waveOffset);
    drawSplashes();

    surfaceDisturbance *= 0.97;
    waveOffset += 0.6;
}

function drawTitleAndButton() {
    const titleY = 38;
    drawPixelText("THE CUBAN", SS_W / 2, titleY, 3, C_WAVE_FOAM, C_TITLE_OUT, C_TITLE_SHADOW);
    drawPixelText("MISFIRE", SS_W / 2, titleY + 22, 3, C_WAVE_FOAM, C_TITLE_OUT, C_TITLE_SHADOW);
    drawPixelText("* A COLD WAR ADVENTURE *", SS_W / 2, titleY + 44, 1, C_TITLE_YELLOW, C_TITLE_OUT, null);

    drawStartButton(btnX, btnY, btnW, btnH);

    blinkTimer++;
    if (blinkTimer > 30) { blinkFlag = !blinkFlag; blinkTimer = 0; }
    if (blinkFlag) {
        drawPixelText("PRESS START", SS_W / 2, btnY + btnH + 14, 1, C_WAVE_FOAM, C_TITLE_OUT, null);
    }
}

function drawStartButton(x, y, w, h) {
    px(x - 2, y - 2, w + 4, h + 4, C_BTN_DARK);
    px(x - 2, y + h + 2, w + 4, 4, C_BTN_DARK);
    px(x, y, w, h, C_BTN_MID);
    px(x, y, w, 3, C_BTN_HI);
    px(x, y + h - 3, w, 3, C_BTN_LO);
    px(x, y, 3, h, C_BTN_HI);
    px(x, y + 3, 3, h - 3, lerpColor(C_BTN_HI, C_BTN_MID, 0.5));
    px(x + w - 3, y, 3, h, C_BTN_LO);
    drawPixelText(">START", x + w / 2, y + h / 2 - 3, 1, C_WAVE_FOAM, C_BTN_LO, null);
}

function drawLoadingScreen() {
    for (let i = 0; i < 20; i++) {
        const t = i / 19;
        const c = lerpColor(C_LOAD_BG_TOP, C_LOAD_BG_BOT, t);
        px(0, i * 12, SS_W, 12, c);
    }

    drawPixelText("v DIVING v", SS_W / 2, 30, 2, C_TITLE_YELLOW, C_TITLE_OUT, null);
    drawPixelText("- COLD WAR FILE -", SS_W / 2, 70, 1, C_LOAD_DIM, null, null);

    factSwapTimer++;
    if (!factFadingOut && factSwapTimer > 210) {
        factFadingOut = true;
        factSwapTimer = 0;
    }
    if (factFadingOut) {
        factFadeAlpha = max(0, factFadeAlpha - 15);
        if (factFadeAlpha === 0) {
            factIdx = (factIdx + 1) % facts.length;
            factFadingOut = false;
        }
    } else {
        factFadeAlpha = min(255, factFadeAlpha + 15);
    }
    const factLines = wrapText(facts[factIdx], 36);
    const factC = color(red(C_LOAD_TEXT), green(C_LOAD_TEXT), blue(C_LOAD_TEXT), factFadeAlpha);
    for (let i = 0; i < factLines.length; i++) {
        drawPixelText(factLines[i], SS_W / 2, 90 + i * 10, 1, factC, null, null);
    }

    const elapsed = millis() - loadingStartTime;
    const totalMs = 12000;
    const pct = min(100, (elapsed / totalMs) * 100);
    const wobble = sin(elapsed * 0.003) * 1.5;
    const display = constrain(pct + wobble, 0, 100);

    const barY = SS_H - 30;
    drawPixelText("LOADING", 26, barY - 10, 1, C_LOAD_DIM, null, null, "left");
    const pctText = pct >= 99.9 ? "READY" : floor(display) + "%";
    drawPixelText(pctText, SS_W - 26, barY - 10, 1, C_LOAD_DIM, null, null, "right");

    const bx = 24, bw = SS_W - 48, bh = 14;
    px(bx - 2, barY - 2, bw + 4, bh + 4, C_LOAD_BAR_BORDER);
    px(bx, barY, bw, bh, C_LOAD_BAR_BG);
    const fillW = floor((display / 100) * (bw - 4));
    px(bx + 2, barY + 2, fillW, bh - 4, C_WAVE_FOAM);

    if (pct >= 100) {
        drawPixelText("SUBMARINE BREACH DETECTED", SS_W / 2, SS_H - 60, 1, C_SUB_RED, C_TITLE_OUT, null);
        drawPixelText("ESCAPE SEQUENCE INITIATED", SS_W / 2, SS_H - 50, 1, C_TITLE_YELLOW, C_TITLE_OUT, null);

        // After a brief beat, signal completion. The dispatcher then switches to "playing".
        if (elapsed > 13000) {
            done = true;
        }
    }
}

function wrapText(str, maxChars) {
    const words = str.split(" ");
    const lines = [];
    let cur = "";
    for (const w of words) {
        if ((cur + " " + w).trim().length > maxChars) {
            lines.push(cur.trim());
            cur = w;
        } else {
            cur += " " + w;
        }
    }
    if (cur.trim()) lines.push(cur.trim());
    return lines;
}

function updatePhase() {
    if (phase === "diving") {
        diveTimer++;
        if (diveTimer < 220) {
            subY += 0.4 + diveTimer * 0.012;
        }
        if (subY > SS_H + 40) {
            phase = "loading";
            if (!loadingStarted) {
                loadingStarted = true;
                loadingStartTime = millis();
                factIdx = floor(random(facts.length));
            }
        }
    }
}

// ============================================================
// Primitives, sun, cloud, submarine, water, splashes, bubbles, font
// (Identical to the original — kept inline so this module is self-contained)
// ============================================================
function px(x, y, w, h, c) { fill(c); rect(floor(x), floor(y), w, h); }
function dot(x, y, c, size) { size = size || 1; fill(c); rect(floor(x), floor(y), size, size); }

function drawSun(cx, cy) {
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TWO_PI;
        const x = cx + cos(a) * 26;
        const y = cy + sin(a) * 26;
        dot(x - 1, y - 1, C_SUN, 3);
    }
    px(cx - 14, cy - 10, 28, 20, C_SUN);
    px(cx - 10, cy - 14, 20, 28, C_SUN);
    px(cx - 12, cy - 12, 24, 24, C_SUN);
    px(cx - 12, cy - 12, 24, 2, C_SUN_RING);
    px(cx - 12, cy + 10, 24, 2, C_SUN_RING);
    px(cx - 14, cy - 8, 2, 16, C_SUN_RING);
    px(cx + 12, cy - 8, 2, 16, C_SUN_RING);
}

function drawCloud(cx, cy) {
    px(cx - 12, cy - 2, 24, 6, C_CLOUD_HI);
    px(cx - 8, cy - 6, 16, 4, C_CLOUD_HI);
    px(cx - 16, cy, 4, 4, C_CLOUD_HI);
    px(cx + 12, cy, 4, 4, C_CLOUD_HI);
    px(cx - 12, cy + 4, 24, 2, C_CLOUD_LO);
}

function drawSubmarine(cx, cy) {
    const bw = 120, bh = 32;
    const x0 = cx - bw / 2, y0 = cy - bh / 2;
    px(x0 + 4, y0 + bh, bw - 8, 2, C_SUB_DARK);
    px(x0 + 8, y0, bw - 16, bh, C_SUB_BODY);
    px(x0 + bw - 16, y0 + 4, 12, bh - 8, C_SUB_BODY);
    px(x0 + bw - 12, y0 + 6, 12, bh - 12, C_SUB_BODY);
    px(x0 + bw - 8, y0 + 10, 8, bh - 20, C_SUB_BODY);
    px(x0 + 4, y0 + 4, 12, bh - 8, C_SUB_BODY);
    px(x0 - 4, y0 + 6, 12, bh - 12, C_SUB_BODY);
    px(x0 - 8, y0 + 10, 8, bh - 20, C_SUB_BODY);
    px(x0 + 8, y0 + 2, bw - 16, 3, C_SUB_LIGHT);
    px(x0 + 4, y0 + 6, 4, 2, C_SUB_LIGHT);
    px(x0 + bw - 8, y0 + 6, 4, 2, C_SUB_LIGHT);
    px(x0 + 12, y0 + bh - 8, bw - 24, 3, C_SUB_RED);
    px(x0 + 8, y0 + bh - 3, bw - 16, 3, C_SUB_DARK);

    const tw = 28, th = 18;
    const tx = cx - tw / 2 - 4, ty = y0 - th + 2;
    px(tx, ty, tw, th, C_SUB_BODY);
    px(tx + 2, ty + 2, tw - 4, 2, C_SUB_LIGHT);
    px(tx + 2, ty + th - 2, tw - 4, 2, C_SUB_DARK);
    px(tx - 2, ty + 4, 2, th - 6, C_SUB_BODY);
    px(tx + tw, ty + 4, 2, th - 6, C_SUB_BODY);
    px(cx - 6, ty - 8, 2, 8, C_SUB_DARK);
    px(cx - 7, ty - 9, 4, 2, C_SUB_DARK);
    px(cx - 9, ty - 10, 8, 2, C_SUB_DARK);
    px(tx + 10, ty + 6, 8, 2, C_SUB_RED);
    px(tx + 12, ty + 4, 4, 6, C_SUB_RED);

    for (let i = 0; i < 4; i++) {
        const wx = x0 + 20 + i * 22;
        px(wx, y0 + 12, 8, 8, C_SUB_DARK);
        px(wx + 1, y0 + 13, 6, 6, C_SUB_WIN);
        px(wx + 2, y0 + 14, 4, 4, C_SUB_WIN_D);
        px(wx + 2, y0 + 14, 2, 2, C_SUB_WIN);
    }
    px(x0 - 12, y0 + 12, 4, 8, C_SUB_DARK);
    px(x0 - 14, y0 + 10, 2, 12, C_SUB_DARK);
    px(x0 - 16, y0 + 14, 2, 4, C_SUB_LIGHT);
    px(x0 + bw - 2, y0 + bh - 4, 4, 4, C_SUB_DARK);
}

function waveYAt(x, offset, amp) {
    if (amp === undefined) amp = 2;
    return WATER_LEVEL + sin((x + offset) * 0.08) * amp + sin((x + offset * 1.3) * 0.15) * (amp * 0.5);
}

function drawWaterBody(offset, disturbance) {
    const bands = [
        { from: 0,   to: 18,  c: C_WATER_HI },
        { from: 18,  to: 48,  c: C_WATER_MID },
        { from: 48,  to: 100, c: C_WATER_LOW },
        { from: 100, to: 300, c: C_WATER_DEEP },
    ];
    for (let x = 0; x < SS_W; x++) {
        const distFromCenter = abs(x - 160);
        const distAmp = disturbance > 0 ? max(0, disturbance * (1 - distFromCenter / 80)) : 0;
        const wy = waveYAt(x, offset, 2 + distAmp);
        dot(x, wy, C_WAVE_FOAM);
        dot(x, wy + 1, C_WAVE_FOAM);
        dot(x, wy + 2, C_WAVE_CREST);
        for (const b of bands) {
            const top = max(wy + 3 + b.from, 0);
            const bot = min(wy + 3 + b.to, SS_H);
            if (bot > top) {
                fill(b.c);
                rect(x, floor(top), 1, ceil(bot - top));
            }
        }
    }
    for (let x = 0; x < SS_W; x += 8) {
        const o = (x + offset * 2) % 40;
        if (o < 16) {
            const baseWy = waveYAt(x + o, offset);
            px(x + o, baseWy + 8, 6, 1, C_WAVE_FOAM);
        }
    }
}

function spawnSplash(x, y, intensity) {
    const count = floor(2 + intensity * 4);
    for (let i = 0; i < count; i++) {
        splashes.push({
            x: x + (random() - 0.5) * 24,
            y: y,
            vx: (random() - 0.5) * (2 + intensity),
            vy: -1.5 - random() * (2 + intensity * 1.5),
            gravity: 0.18,
            life: 40 + random() * 30,
            maxLife: 70,
            size: random() < 0.4 ? 2 : 1,
        });
    }
}

function drawSplashes() {
    for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.x += s.vx; s.y += s.vy; s.vy += s.gravity; s.life--;
        if (s.life <= 0 || s.y > WATER_LEVEL + 4) { splashes.splice(i, 1); continue; }
        const t = s.life / s.maxLife;
        const c = t > 0.7 ? C_SPLASH_HI : t > 0.3 ? C_SPLASH_MID : C_SPLASH_LO;
        dot(s.x, s.y, c, s.size);
    }
}

function spawnBubble(x, y) {
    bubbles.push({
        x: x + (random() - 0.5) * 80,
        y: y,
        vy: -0.3 - random() * 0.5,
        vx: (random() - 0.5) * 0.2,
        size: random() < 0.5 ? 2 : 3,
        life: 80 + random() * 60,
    });
}

function drawBubbles(offset) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.x += b.vx; b.y += b.vy; b.life--;
        const surfaceY = waveYAt(b.x, offset);
        if (b.life <= 0 || b.y < surfaceY) {
            if (b.y < surfaceY && b.y > surfaceY - 4) spawnSplash(b.x, surfaceY, 0.3);
            bubbles.splice(i, 1);
            continue;
        }
        dot(b.x, b.y, C_SPLASH_MID, b.size);
        dot(b.x, b.y, C_SPLASH_HI);
    }
}

const FONT = {
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
    '0':["01110","10001","10011","10101","11001","10001","01110"],
    '1':["00100","01100","00100","00100","00100","00100","01110"],
    '2':["01110","10001","00001","00010","00100","01000","11111"],
    '3':["01110","10001","00001","00110","00001","10001","01110"],
    '4':["00010","00110","01010","10010","11111","00010","00010"],
    '5':["11111","10000","11110","00001","00001","10001","01110"],
    '6':["00110","01000","10000","11110","10001","10001","01110"],
    '7':["11111","00001","00010","00100","01000","01000","01000"],
    '8':["01110","10001","10001","01110","10001","10001","01110"],
    '9':["01110","10001","10001","01111","00001","00010","01100"],
    ' ':["00000","00000","00000","00000","00000","00000","00000"],
    '*':["00000","00100","10101","01110","10101","00100","00000"],
    '-':["00000","00000","00000","11111","00000","00000","00000"],
    '.':["00000","00000","00000","00000","00000","01100","01100"],
    ',':["00000","00000","00000","00000","01100","00100","01000"],
    '!':["00100","00100","00100","00100","00100","00000","00100"],
    '?':["01110","10001","00001","00010","00100","00000","00100"],
    "'":["00100","00100","00000","00000","00000","00000","00000"],
    '(':["00010","00100","01000","01000","01000","00100","00010"],
    ')':["01000","00100","00010","00010","00010","00100","01000"],
    ':':["00000","01100","01100","00000","01100","01100","00000"],
    '>':["10000","01000","00100","00010","00100","01000","10000"],
    '<':["00001","00010","00100","01000","00100","00010","00001"],
    'v':["00000","00000","10001","10001","01010","01010","00100"],
    '/':["00001","00010","00010","00100","01000","01000","10000"],
};

function drawPixelText(str, x, y, size, fillC, outlineColor, shadowColor, anchor) {
    size = size || 1;
    anchor = anchor || "center";
    const charW = 5 * size;
    const charH = 7 * size;
    const gap = 1 * size;
    const totalW = str.length * (charW + gap) - gap;

    let startX;
    if (anchor === "center") startX = floor(x - totalW / 2);
    else if (anchor === "left") startX = floor(x);
    else startX = floor(x - totalW);
    const startY = floor(y - charH / 2);

    if (shadowColor) {
        for (let i = 0; i < str.length; i++) {
            let ch = str.charAt(i).toUpperCase();
            if (ch === "V" && str.charAt(i) === "v") ch = "v";
            drawGlyph(ch, startX + i * (charW + gap), startY + 2 * size, size, shadowColor);
        }
    }

    if (outlineColor) {
        const offs = [
            [-size, 0], [size, 0], [0, -size], [0, size],
            [-size, -size], [size, -size], [-size, size], [size, size]
        ];
        for (const off of offs) {
            for (let i = 0; i < str.length; i++) {
                const ch = str.charAt(i);
                const key = ch === "v" ? "v" : ch.toUpperCase();
                drawGlyph(key, startX + i * (charW + gap) + off[0], startY + off[1], size, outlineColor);
            }
        }
    }

    for (let i = 0; i < str.length; i++) {
        const ch = str.charAt(i);
        const key = ch === "v" ? "v" : ch.toUpperCase();
        drawGlyph(key, startX + i * (charW + gap), startY, size, fillC);
    }
}

function drawGlyph(ch, x, y, size, c) {
    const glyph = FONT[ch] || FONT[" "];
    fill(c);
    for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
            if (glyph[row].charAt(col) === "1") {
                rect(x + col * size, y + row * size, size, size);
            }
        }
    }
} 
