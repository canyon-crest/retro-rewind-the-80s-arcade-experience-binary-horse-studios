window.exe = _ => eval(_);

function loadPNG(src) {
    return new Promise((resolve, reject) => {
        const img = document.createElement("img");
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = e => reject(e);
    });
}

await Canvas(window.innerWidth, window.innerHeight);
noSmooth();

// q5play copies `world`, `allSprites`, etc. onto `window`, but it does NOT
// expose `camera` as a global under plain q5 (only in its p5 fallback). The
// camera still lives on the q5 instance, so bridge it to a global here —
// otherwise every `camera.x` below throws "camera is not defined".
if (typeof camera === "undefined" || !camera) {
    window.camera = window.q5.instances[0].camera;
}

canvas.style.position = "fixed";
canvas.style.left = "0";
canvas.style.top = "0";
canvas.style.width = "100vw";
canvas.style.height = "100vh";

window.onresize = function() {
    resizeCanvas(window.innerWidth, window.innerHeight);
    camera.x = width / 2;
    camera.y = height / 2;
};
window.onresize();

allSprites.everyFrame = {};
allSprites.autoCull = false;

camera.zoom = 1;
camera.x = width / 2;
camera.y = height / 2;
world.gravity.y = 37;

// Cache-busted imports — the browser will otherwise happily serve an old
// startscreen.js / items.js / deathscreen.js that doesn't have a newly-added
// export, throwing "does not provide an export named X". Bump these when the
// exports of those modules change (the server also sends no-cache headers).
import { createProjectile, handleProjectileHit } from "./items.js?v=2";
import {
    initStartScreen,
    updateStartScreen,
    handleStartScreenClick,
    isStartScreenDone,
    drawPixelText,
} from "./startscreen.js?v=2";
import { GameOverScreen } from "./deathscreen.js?v=2";

// ============================================================
// Animator
// ============================================================
function createAnimator(sprite, frames, sequences) {
    const state = {
        baseName: null, baseFrame: 0, baseTimer: 0,
        oneShotName: null, oneShotFrame: 0, oneShotTimer: 0, oneShotOnComplete: null,
    };

    function primeTimer(name) { return sequences[name].blocks[0].duration; }

    function playBase(name) {
        if (state.baseName === name) return;
        if (!sequences[name]) { console.warn(`Animation "${name}" not found`); return; }
        state.baseName = name;
        state.baseFrame = 0;
        state.baseTimer = primeTimer(name);
    }

    function playOneShot(name, onComplete = null) {
        if (!sequences[name]) { console.warn(`Animation "${name}" not found`); return; }
        state.oneShotName = name;
        state.oneShotFrame = 0;
        state.oneShotTimer = primeTimer(name);
        state.oneShotOnComplete = onComplete;
    }

    function isOneShotPlaying() { return state.oneShotName !== null; }

    function advance(nameKey, frameKey, timerKey, loop, onEnd) {
        if (state[nameKey] === null) return;
        state[timerKey]--;
        if (state[timerKey] > 0) return;

        state[frameKey]++;
        const seq = sequences[state[nameKey]];

        if (state[frameKey] >= seq.blocks.length) {
            if (loop) {
                state[frameKey] = 0;
                state[timerKey] = seq.blocks[0].duration;
            } else {
                const cb = onEnd;
                state[nameKey] = null;
                state[frameKey] = 0;
                if (cb) cb();
            }
        } else {
            state[timerKey] = seq.blocks[state[frameKey]].duration;
        }
    }

    function update() {
        advance("baseName", "baseFrame", "baseTimer", true, null);
        const cb = state.oneShotOnComplete;
        advance("oneShotName", "oneShotFrame", "oneShotTimer", false, () => {
            state.oneShotOnComplete = null;
            if (cb) cb();
        });
    }

    function render() {
        const activeName = state.oneShotName || state.baseName;
        const activeFrame = state.oneShotName ? state.oneShotFrame : state.baseFrame;
        if (!activeName) { sprite.img = "\u{1f98a}"; return; }
        const list = frames[activeName];
        if (!list || list.length === 0) { sprite.img = "\u{1f98a}"; return; }
        sprite.img = list[activeFrame];
        sprite.scale.x = sprite.facingRight ? 1 : -1;
    }

    return { playBase, playOneShot, isOneShotPlaying, update, render };
}

// ============================================================
// Frame extraction
// ============================================================
async function extractFrameAsImage(sheetImage, srcX, srcY, frameWidth, frameHeight) {
    const c = document.createElement("canvas");
    c.width = frameWidth;
    c.height = frameHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    try {
        ctx.drawImage(sheetImage, srcX, srcY, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
    } catch (e) {
        console.warn("Failed to extract frame:", e);
        return null;
    }
    const img = await loadImage(c.toDataURL());
    img.resize(frameWidth * 20/3, frameHeight * 20/3);
    return img;
}

async function buildAnimationFrames(sheets, sequences) {
    const out = {};
    for (const [animName, seq] of Object.entries(sequences)) {
        out[animName] = [];
        for (const block of seq.blocks) {
            const sheet = sheets[block.sheet];
            if (!sheet || !sheet.image) { out[animName].push("\u{1f98a}"); continue; }
            let { x: sx, y: sy } = block.framePos;
            if (sx < 20 && sy < 20) { sx *= sheet.frameWidth; sy *= sheet.frameHeight; }
            const img = await extractFrameAsImage(sheet.image, sx, sy, sheet.frameWidth, sheet.frameHeight);
            out[animName].push(img || "\u{1f98a}");
        }
    }
    return out;
}

// ============================================================
// Asset data
// ============================================================
const spritesheets = {
    usIdle: { image: await loadPNG("./idle.png"), frameWidth: 31, frameHeight: 73 },
    usRun:  { image: await loadPNG("./run.png"),  frameWidth: 46, frameHeight: 70 },
    usFire: { image: await loadPNG("./fire.png"), frameWidth: 50, frameHeight: 73 },
};

const animationSequences = {
    "player.idle": { blocks: [
        { sheet: "usIdle", framePos: { x: 0, y: 0 }, duration: 10 },
        { sheet: "usIdle", framePos: { x: 1, y: 0 }, duration: 10 },
    ]},
    "player.run": { blocks: [
        { sheet: "usRun", framePos: { x: 2, y: 0 }, duration: 6 },
        { sheet: "usRun", framePos: { x: 1, y: 1 }, duration: 4 },
        { sheet: "usRun", framePos: { x: 2, y: 1 }, duration: 4 },
        { sheet: "usRun", framePos: { x: 0, y: 1 }, duration: 6 },
        { sheet: "usRun", framePos: { x: 0, y: 0 }, duration: 10 },
    ]},
    "player.ground_punch.startup":  { blocks: [{ sheet: "usRun",  framePos: {x:1,y:0}, duration: 5 }] },
    "player.air_forward.startup":   { blocks: [{ sheet: "usRun",  framePos: {x:2,y:0}, duration: 5 }] },
    "player.air_explosion.startup": { blocks: [
        { sheet: "usFire", framePos: {x:3,y:0}, duration: 8 },
        { sheet: "usFire", framePos: {x:4,y:0}, duration: 7 },
    ]},
    "player.molotov_throw.startup": { blocks: [
        { sheet: "usRun", framePos: {x:1,y:0}, duration: 2 },
        { sheet: "usRun", framePos: {x:2,y:0}, duration: 5 },
        { sheet: "usRun", framePos: {x:1,y:1}, duration: 5 },
    ]},
    "player.beer_throw.startup": { blocks: [
        { sheet: "usRun", framePos: {x:1,y:0}, duration: 2 },
        { sheet: "usRun", framePos: {x:2,y:0}, duration: 5 },
        { sheet: "usRun", framePos: {x:1,y:1}, duration: 5 },
    ]},
    "player.bullet.startup": { blocks: [
        { sheet: "usFire", framePos: {x:0,y:2}, duration: 2 },
        { sheet: "usFire", framePos: {x:2,y:0}, duration: 2 },
        { sheet: "usFire", framePos: {x:0,y:2}, duration: 2 },
    ]},
};

const animationFrames = await buildAnimationFrames(spritesheets, animationSequences);

const corridorBG = await loadImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAAAoCAYAAADAOHfQAAAFCklEQVR4AexdPY4UPRD116Rf9mX7BdyAcCRyUqQl4hpcg7sQzAEgQwR7CoTQRpAiNmHxW7ZaNaZcbve6Sz3wpH7rnyq/Z5dd3b07I5gOh8MtwRjwDJzXGUgp3QLT1dVVKnFxcZGAsn9tG1yANR79gGVb0wcuoDYWNqBm7+0HF2CNQz9g2db0gQuojYUNqNl7+8EFWOPQD1i2NX3gAmpjYQNq9t5+cAHWOPQDlm1NH7iANWMxJifq3YU6gEa+4aJI091P/mAEGIHdRqBMWt02E/h4PA5djMfn2dZMosXXsvdqenyerVcH/i2+lh0cPfD4PFuPhvi2+Fp24VlaenyebSm/9hvBp5MW3NI2ExgOfwG4REbgrCIgSasnbSbw5eWl9nlw3ePzbGuEW3wte6+mx+fZenXg3+Jr2cHRA4/Ps/VoiG+Lr2UXnqWlx+fZlvJrv9F8mttMYO3AOiPACOw3AmYCP+id/dGrlDJub26SwOPzbM2wZZ0eLfBF6kVqcW2IQAWd5yR63yqzrnbLX6DhYCYwDDPuF49EWYQ88Pbb6/xzxRWphelF6kVqtdd2d5M92c88hvuWg1Be0ftW6httfCQlSWwm8PzOjslnAmxsD/KQk2vmO+n91ZhtAVpQjNSL1OLaXifvjCI+GvPe6M77+mwLOpP3sqsKM4E1E4Ki21vWI7Wwjki9SC2uDREYg+h9WzprPIXhayaw/A5w+fxjevHy5YMBoRoitTCHSL1ILa6t75wiXjVE71ttHq1+JLGZwDIQCxkF4ayVo3TAU9PQ/fAbBc1r1UfpgMfiL/vgNwold9kepQOekttqw++BSDLe4td94jei1Lwj62YCz78DDFLy+DzbGvkWX8veq+nxebZeHfi3+Fp2cPTA4/NsPRri2+Jr2YVnaenxebal/NpvNJ/mNhNYO7DOCDAC+42AmcB4ZRg5ZY/Ps62ZQ4uvZe/V9Pg8W68O/Ft8LTs4euDxebYeDfFt8bXswrO09Pg821J+7TeaT3ObCawduuv403uGfIkDZTfH0gFZB59lQkOwdOgqv0i9SC0EI1IvUusPX5uZwCfv7PfBRqKkR7++ZeXWc8DKP72f8GW7vk5sG2tBN1IvUotrc85mDs6ez2Se3urLTOCZDQmVG1h8D/KQ/itSC7OL1IvU4trML3QgLN2I3reOCV5fXyfATGD9zo7E7eA1XTVf6aBtW2tBO1IvUotrQwSWQ+9NOUrbIs5kqb+0Xf0cWF79Rn2RQ/isiYktQgv6kXqRWlxb3xc5ZG8QtxJiizqTpf6SNpIXftUnMO5CowHBEqM1hK/UkbbY+8vj/AWA4/H4W134dXk0/Eb0aQ1dH8FtcWgNqVt+I/qEvyxHcFscpQ7alt+IPnCPhpnAo0XIxwgwAttEgAm8TVzJygiERIAJHBJmijAC20SACbxNXP8wVi5nTxHAx0cyHyawRIIlI7DzCMi/woF/nVKSmAm8803j9BgBREAnL9oC/N9ICUbiwDgcGIO95gESFk9elADqeApPb66+J4Ix4BmonYH99H9KT5IG9mx6+v/XRDAGPAPneQb4OzDeRwhG4EwjMH3+8jgRjAHPwHmegendv+/TPzcfEkvGgefg/PJgevZ1Sm//+5E2KcnLuPJ8bZpfE5OXNy/evM/3IcYnMJ8Qmz4heHPY9ubAJzBf8/maf8Y3cT6Bt9o88vLJHvBw4BM4IMh8jdz2NfJvju9PAAAA//+D7uq9AAAABklEQVQDABKMPA4wFkJmAAAAAElFTkSuQmCC");

// ============================================================
// Crate / turret / key art. These are individual PNGs (with spaces in
// some filenames). We round-trip each through a canvas + data URL so we
// always end up with a real q5 image at the display size — the same
// trick extractFrameAsImage() uses for the player sprite sheets.
// ============================================================
async function loadGameImage(src, w, h) {
    const dom = await loadPNG(encodeURI(src));
    const c = document.createElement("canvas");
    c.width = dom.naturalWidth;
    c.height = dom.naturalHeight;
    c.getContext("2d").drawImage(dom, 0, 0);
    const img = await loadImage(c.toDataURL());
    img.resize(w, h);
    return img;
}

// Same as loadGameImage but also measures how many transparent rows sit at the
// bottom of the source PNG. Used to ground sprites whose art has empty padding
// (the sprite's collider sits on the floor, but the *visible* part of the art
// stops short of the collider bottom, making it look like it's floating).
// Returned `bottomPad` is in OUTPUT pixels (scaled to the requested h).
async function loadGameImageGrounded(src, w, h) {
    const dom = await loadPNG(encodeURI(src));
    const c = document.createElement("canvas");
    c.width = dom.naturalWidth;
    c.height = dom.naturalHeight;
    const ctx = c.getContext("2d");
    ctx.drawImage(dom, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let lastVisibleRow = c.height - 1;
    for (let r = c.height - 1; r >= 0; r--) {
        let any = false;
        for (let col = 0; col < c.width; col++) {
            if (data[(r * c.width + col) * 4 + 3] > 8) { any = true; break; }
        }
        if (any) { lastVisibleRow = r; break; }
    }
    const padPx = c.height - 1 - lastVisibleRow;
    const bottomPad = padPx * (h / c.height);
    const img = await loadImage(c.toDataURL());
    img.resize(w, h);
    return { img, bottomPad };
}

// q5play only renders a sprite's IMG, not a plain `.color` fill — so generated
// projectiles/debris need a real image to be visible. These build one on a
// scratch canvas and hand back a q5 image.
async function makeCircleImg(d, coreColor, edgeColor) {
    const c = document.createElement("canvas");
    c.width = d; c.height = d;
    const ctx = c.getContext("2d");
    ctx.fillStyle = edgeColor;
    ctx.beginPath(); ctx.arc(d / 2, d / 2, d / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = coreColor;
    ctx.beginPath(); ctx.arc(d / 2, d / 2, d * 0.32, 0, Math.PI * 2); ctx.fill();
    return await loadImage(c.toDataURL());
}
async function makeSquareImg(d, color, edgeColor) {
    const c = document.createElement("canvas");
    c.width = d; c.height = d;
    const ctx = c.getContext("2d");
    ctx.fillStyle = edgeColor; ctx.fillRect(0, 0, d, d);
    ctx.fillStyle = color; ctx.fillRect(2, 2, d - 4, d - 4);
    return await loadImage(c.toDataURL());
}

// Sized to read at roughly the player's scale so attacks (especially the
// flat bullet, which travels at ~player chest height) actually intersect them.
const CRATE_W = 150, CRATE_H = 170;
const TURRET_W = 260, TURRET_H = 240;   // big, grounded, player-tracking turrets
const KEY_W = 80, KEY_H = 46;

const crateFrames = {
    full:   await loadGameImage("./crate.png",        CRATE_W, CRATE_H),
    hit:    await loadGameImage("./crate hit 2.png",  CRATE_W, CRATE_H),
    broken: await loadGameImage("./crate broken.png", CRATE_W, CRATE_H),
};
const turretFrames = {
    idle:      await loadGameImage("./turret idle.png",      TURRET_W, TURRET_H),
    fire:      await loadGameImage("./turret fire 2.png",    TURRET_W, TURRET_H),
    destroyed: await loadGameImage("./turret destroyed.png", TURRET_W, TURRET_H),
};

// Empirical floor-nudge for the turret. The art has faint pixels in its lower
// rows (probably a soft drop shadow) so an automatic transparent-row scan only
// finds ~6 px of bottom padding — but the user-visible turret base actually
// ends ~57 px above the image bottom. This number was measured against the
// canvas after rendering (player floats 1 px, turret floated 57 px) and drops
// the turret onto the floor so its treads sit on the red surface line.
// Push the turret's visible base INTO the floor strip so it reads as planted
// (matching how the player's boots extend slightly past the red surface line)
// rather than barely-touching-the-edge, which looks like floating.
const TURRET_FLOOR_NUDGE = 95;
const keyImg = await loadGameImage("./key.png", KEY_W, KEY_H);

// Generated art for things q5play won't draw from a .color alone.
const DEBRIS_COLORS = ["#8a5a2b", "#6b4423", "#a9712f"];
const turretShotImg = await makeCircleImg(52, "#fff1a8", "#ff5a1a");  // glowing enemy shell
const debrisImgs = await Promise.all(DEBRIS_COLORS.map((col) => makeSquareImg(18, col, "#241405")));

// Damage by attack type for turrets (100 HP, no visible bar). Shooting is
// the most lethal, thrown bottles second, melee (ground/air) the least.
// Crates ignore this table — they always break in 3 hits regardless.
const ATTACK_DAMAGE = {
    bullet: 34,
    beer_throw: 20,
    molotov_explosion: 22,
    ground_punch: 8,
    air_forward: 8,
    air_explosion: 6,
};

// ============================================================
// World setup
// ============================================================
let player;
let ground;
let walls = [];
let doors = [];
let surfaceY;

{
    window.worldAnchor = Sprite.withSensor(0, 0, 37, 37, "static");

    window.terrain = new Group();
    terrain.physics = "static";
    terrain.bounciness = 0;

    // Floor is invisible; the player visually stands on the black bar with red
    // outlines painted into the background. That bar's top red line sits at
    // row 29 of the 40px-tall background image, which is scaled to fill the
    // screen height, so the walkable surface is height * (29/40).
    surfaceY = height * (29 / 40);
    const doorHeight = 200;

    ground = new terrain.Sprite(37000, surfaceY + 37, 80000, 74);
    ground.visible = false;

    for (let i = 0; i <= 12; i++) {
        walls[i] = new terrain.Sprite((i * 6) * height - width * 0.5, (surfaceY - doorHeight) * 0.5, 74, surfaceY - doorHeight);
        doors[i] = new terrain.Sprite((i * 6) * height - width * 0.5, surfaceY - doorHeight * 0.5, 67, doorHeight);
        doors[i].color = "#bababa";
    }

    player = new Sprite(0, 300, 100, 180);
    player.facingRight = true;
    player.color = "white";
    player.rotationLock = true;
    player.friction = 0;
    player.bounciness = 0;

    // Destructible crates and rising turrets. Members are created lazily in
    // spawnLevelEntities() (called on each playthrough) so a restart always
    // gets a fresh, fully-repaired layout.
    window.crates = new Group();
    window.turrets = new Group();
    window.turretShots = new Group();   // shells fired BY active turrets at the player
}

// ============================================================
// Player state + animator
// ============================================================
let pdata = {
    attackCooldown: 0,
    groundedTimer: 0,
    activeAttacks: new Group(),
    pendingAttack: null,
    inventory: [],
    airborne: false,
    hp: 100,
};

const anim = createAnimator(player, animationFrames, animationSequences);
anim.playBase("player.idle");

pdata.activeAttacks.overlaps(crates, handleHit);
pdata.activeAttacks.overlaps(turrets, handleHit);
pdata.activeAttacks.overlaps(terrain, handleHit);
player.passes(pdata.activeAttacks);

// Active turrets shoot the player (sensor shells), and the player boots crates
// around like a soccer ball just by walking into them (crates are solid bodies).
player.overlaps(turretShots, onPlayerShot);
player.collides(crates, kickCrate);

// ============================================================
// Screen state machine
// ============================================================
let gameState = "startscreen"; // "startscreen" | "playing" | "gameover"

initStartScreen();
let gameOverScreen = null;
let stashedSprites = [];

function setWorldVisible(visible) {
    console.log("setWorldVisible:", visible);
    
    if (!visible) {
        // Move everything far away so it doesn't render
        for (const s of allSprites) {
            stashedSprites.push({
                sprite: s,
                x: s.x,
                y: s.y,
                vx: s.vel ? s.vel.x : 0,
                vy: s.vel ? s.vel.y : 0,
                visible: s.visible,
            });
            s.x = -999999;
            s.y = -999999;
            if (s.vel) { s.vel.x = 0; s.vel.y = 0; }
            s.visible = false;
        }
    } else {
        // Restore everything
        for (const stash of stashedSprites) {
            stash.sprite.x = stash.x;
            stash.sprite.y = stash.y;
            if (stash.sprite.vel) {
                stash.sprite.vel.x = stash.vx;
                stash.sprite.vel.y = stash.vy;
            }
            // Restore the sprite's prior visibility rather than forcing it
            // visible, so intentionally-hidden sprites (e.g. the invisible
            // ground) stay hidden after the title screen.
            stash.sprite.visible = stash.visible;
        }
        stashedSprites = [];
        // Also clear active attacks if any
        for (const a of [...pdata.activeAttacks]) a.delete();
    }
}
setWorldVisible(false); // start hidden during the title screen

// p5/q5 dispatches mouse clicks to a global mousePressed function
window.mousePressed = function() {
    if (gameState === "startscreen") {
        handleStartScreenClick(mouseX, mouseY);
    } else if (gameState === "gameover" && gameOverScreen && gameOverScreen.onContinue) {
        // Click anywhere on the death screen to respawn (matches space/enter).
        gameOverScreen.onContinue();
    }
};

function resetGameplayPositions() {
    // Player back to spawn
    player.x = 0;
    player.y = 300;
    player.vel.x = 0;
    player.vel.y = 0;
    player.color = "white";

    // Fresh run: zero the score, back to level 1, and reset the level to its
    // pre-trip-line state (nothing spawned until the player crosses the line).
    score = 0;
    levelNum = 1;
    resetLevel();

    // Camera back to start
    camera.x = width / 2;
}
function restartGame() {
    // Re-enable the sprite-draw pass that gameover turned off.
    allSprites._autoDraw = true;

    // Drop any leftover stash so the player isn't bounced to its death spot,
    // and CLEAR every in-flight attack/turret-shot so nothing hits us on frame 1.
    stashedSprites = [];
    for (const a of [...pdata.activeAttacks]) a.delete();
    for (const s of [...turretShots]) s.delete();

    // Player back to a known good state — explicit position, zero velocity,
    // upright, visible, full hp.
    player.x = 0;
    player.y = 300;
    player.vel.x = 0;
    player.vel.y = 0;
    player.rotation = 0;
    player.scale.x = 1; player.scale.y = 1;
    player.color = "white";
    player.facingRight = true;
    player.visible = true;
    delete player.everyFrame.hurt;       // clear any in-progress damage flash

    pdata.hp = 100;
    pdata.attackCooldown = 0;
    pdata.pendingAttack = null;
    pdata.groundedTimer = 0;
    pdata.airborne = false;

    // Fresh score/level/level-state.
    score = 0;
    levelNum = 1;
    resetLevel();

    // Camera back to start, animator back to idle.
    camera.x = width / 2;
    camera.y = height / 2;
    anim.playBase("player.idle");
}
// ============================================================
// Input -> intended actions
// ============================================================
function computePlayerActions(pdata, player, kb) {
    const actions = { moveX: 0, facingRight: player.facingRight, jump: false, attack: null };

    if (kb.pressing("left"))       { actions.moveX = -10; actions.facingRight = false; }
    else if (kb.pressing("right")) { actions.moveX =  10; actions.facingRight = true;  }

    if (kb.presses("up") && pdata.groundedTimer > 0) actions.jump = true;

    if (kb.presses("space") && pdata.attackCooldown === 0) {
        const isGrounded = pdata.groundedTimer > 0;
        const holdingForward = (player.facingRight && kb.pressing("right")) || (!player.facingRight && kb.pressing("left"));
        if (isGrounded)        actions.attack = "ground_punch";
        else if (holdingForward) actions.attack = "air_forward";
        else                     actions.attack = "air_explosion";
    }

    if (kb.presses("z") && pdata.attackCooldown === 0) actions.attack = "molotov_throw";
    if (kb.presses("x") && pdata.attackCooldown === 0) actions.attack = "beer_throw";
    if (kb.presses("c") && pdata.attackCooldown === 0) actions.attack = "bullet";

    return actions;
}

// ============================================================
// Dispatcher
// ============================================================
q5.update = function () {
   if (gameState === "startscreen") {
    updateStartScreen();
    if (isStartScreenDone()) {
        gameState = "playing";
        setWorldVisible(true);
        // Sprites have been falling under gravity during the start screen. Reset them.
        resetGameplayPositions();
    }
    return;
}

    if (gameState === "playing") {
        updatePlaying();
        if (pdata.hp <= 0) {
            // Enter the death screen WITHOUT stashing sprite positions (that
            // dance left the player's box2d body unable to move on respawn).
            // Instead just tell q5play to skip its automatic sprite-draw pass
            // — the death screen is opaque and we don't want gameplay sprites
            // rendered on top of it. restartGame() flips it back on.
            gameState = "gameover";
            allSprites._autoDraw = false;
            gameOverScreen = new GameOverScreen({
                quote: '"YOU FAILED, SOLDIER."',
                onContinue: () => {
                    restartGame();
                    gameState = "playing";
                    gameOverScreen = null;
                },
            });
        }
        return;
    }

    if (gameState === "gameover") {
    // Wipe the gameplay rendering first
    push();
    translate(-camera.x, -camera.y);
    fill(0);
    rect(0, 0, width, height);
    pop();
    
    gameOverScreen.draw();
    gameOverScreen.update();
    return;
}
};

// ============================================================
// Gameplay update (the old q5.update body)
// ============================================================
function updatePlaying() {
    // Background scroll
    const positionAlongCorridor = camera.x % (height * 6);
    image(corridorBG, (3 * height - width * 0.5) - positionAlongCorridor, 0, height * 6, height);
    if (positionAlongCorridor < 0) {
        image(corridorBG, (-3 * height - width * 0.5) - positionAlongCorridor, 0, height * 6, height);
    } else if (positionAlongCorridor > height * 6 - width) {
        image(corridorBG, (9 * height - width * 0.5) - positionAlongCorridor, 0, height * 6, height);
    }

    // Grounded check
    const touchingTerrain = player.colliding(terrain) > 0;
    const restingVertically = Math.abs(player.vel.y) < 1.0;
    if (touchingTerrain) {
        pdata.groundedTimer = 8;
        pdata.airborne = false;
    } else if (restingVertically && !pdata.airborne) {
        pdata.groundedTimer = 8;
    } else if (pdata.groundedTimer > 0) {
        pdata.groundedTimer--;
    }

    const actions = computePlayerActions(pdata, player, kb);
    player.vel.x = actions.moveX;
    player.facingRight = actions.facingRight;

    if (actions.jump) {
        player.vel.y = -16;
        pdata.groundedTimer = 0;
        pdata.airborne = true;
    }

    camera.x += (player.x - camera.x) * 0.67;

    anim.playBase(actions.moveX !== 0 ? "player.run" : "player.idle");

    if (pdata.attackCooldown > 0) pdata.attackCooldown--;

    if (actions.attack && !anim.isOneShotPlaying() && pdata.attackCooldown === 0) {
        pdata.pendingAttack = actions.attack;
        player.color = "pink";
        anim.playOneShot(`player.${actions.attack}.startup`, () => {
            createAttack(pdata.pendingAttack);
            pdata.pendingAttack = null;
            player.color = "white";
        });
    }

    anim.update();
    anim.render();

    // Level progression: trip-line, countdown, turret AI, key pickup.
    updateLevel();

    // Per-sprite everyFrame callbacks
    for (let i = 0; i < allSprites.length; i++) {
        const sprite = allSprites[i];
        if (!sprite.everyFrame) throw "no everyFrame object";
        const everyFrame = Object.entries(sprite.everyFrame);
        for (let j = 0; j < everyFrame.length; j++) {
            everyFrame[j][1].f(sprite);
            everyFrame[j][1].duration--;
            if (everyFrame[j][1].duration <= 0) {
                delete sprite.everyFrame[everyFrame[j][0]];
                everyFrame.splice(j, 1);
                j--;
            }
        }
    }

    // Turret head tracks the player: flip horizontally to face them. Done AFTER
    // the everyFrame tweens so the facing sign is the final word on scale.x and
    // survives the punch/rise scale animations (we keep their magnitude).
    for (const t of turrets) {
        if (t.dead) continue;
        const mag = Math.abs(t.scale.x) || 1;
        const faceSign = (player.x < t.x) ? -1 : 1;     // player on left -> face left
        t.scale.x = TURRET_FACE_DIR * faceSign * mag;
    }

    // TEMP debug: press K to kill the player and see the gameover screen
    if (kb.presses("k")) pdata.hp = 0;
}

// ============================================================
// Helpers
// ============================================================
function despawnAfter(sprite, frames) {
    let f = 0;
    sprite.everyFrame = sprite.everyFrame || {};
    sprite.everyFrame.despawn = {
        duration: frames + 1,
        f: () => { f++; if (f >= frames) sprite.delete(); },
    };
}

// ------------------------------------------------------------
// Juice: small reusable hit-reaction tweens, driven by the same
// per-sprite everyFrame system the rest of the game uses. Each one
// decays back to its resting transform, so re-triggering mid-tween
// just restarts cleanly without permanent drift.
// ------------------------------------------------------------

// Decaying horizontal jitter around the sprite's home column.
function shakeSprite(sprite, intensity, frames) {
    const baseX = sprite.homeX ?? sprite.x;
    sprite.homeX = baseX;
    let f = 0;
    sprite.everyFrame = sprite.everyFrame || {};
    sprite.everyFrame.shake = {
        duration: frames + 1,
        f: (self) => {
            f++;
            const k = 1 - Math.min(1, f / frames);
            self.x = baseX + (Math.random() * 2 - 1) * intensity * k;
            if (f >= frames) self.x = baseX;
        },
    };
}

// Uniform "pop" — scales up then eases back to 1. Good for impacts.
function punchScale(sprite, amount, frames) {
    let f = 0;
    sprite.everyFrame = sprite.everyFrame || {};
    sprite.everyFrame.punch = {
        duration: frames + 1,
        f: (self) => {
            f++;
            const k = 1 - Math.min(1, f / frames);
            const s = 1 + amount * k;
            self.scale.x = s; self.scale.y = s;
            if (f >= frames) { self.scale.x = 1; self.scale.y = 1; }
        },
    };
}

// Squash-and-stretch — widens while flattening, then settles back.
function squashScale(sprite, amount, frames) {
    let f = 0;
    sprite.everyFrame = sprite.everyFrame || {};
    sprite.everyFrame.squash = {
        duration: frames + 1,
        f: (self) => {
            f++;
            const k = 1 - Math.min(1, f / frames);
            self.scale.x = 1 + amount * k;
            self.scale.y = 1 - amount * k;
            if (f >= frames) { self.scale.x = 1; self.scale.y = 1; }
        },
    };
}

// Burst of little wooden chips that fly out, tumble, shrink and vanish.
function spawnDebris(x, y, count) {
    for (let i = 0; i < count; i++) {
        const d = Sprite.withSensor(x, y, 14, 14);
        d.everyFrame = d.everyFrame || {};
        d.gravity = true;
        d.img = debrisImgs[i % debrisImgs.length];   // .color alone won't render
        d.vel.x = (Math.random() * 2 - 1) * 9;
        d.vel.y = -6 - Math.random() * 7;
        d.rotationSpeed = (Math.random() * 2 - 1) * 22;
        const life = 32;
        let f = 0;
        d.everyFrame.shrink = {
            duration: life + 1,
            f: (self) => { f++; const s = Math.max(0.1, 1 - f / life); self.scale.x = s; self.scale.y = s; },
        };
        despawnAfter(d, life);
    }
}

// Standard ease-out-back: overshoots the target then settles — gives the
// turret a satisfying little pop as it locks into place.
function easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function createAttack(type) {
    let a;
    let offsetX = 0, offsetY = 0;
    let attachToPlayer = true;

    if (type === "ground_punch") {
        offsetX = 80; offsetY = 40;
        a = Sprite.withSensor(player.x + (player.facingRight ? offsetX : -offsetX), player.y + offsetY, 100, 60);
        a.life = 15;
    } else if (type === "air_forward") {
        offsetX = 100; offsetY = 40;
        a = Sprite.withSensor(player.x + (player.facingRight ? offsetX : -offsetX), player.y + offsetY, 120, 40);
        a.life = 8;
    } else if (type === "air_explosion") {
        a = Sprite.withSensor(player.x, player.y, 250);
        a.life = 25;
    } else if (type === "molotov_throw" || type === "beer_throw" || type === "bullet") {
        a = createProjectile(player, type);
        pdata.activeAttacks.add(a);
        pdata.attackCooldown = 6; 
        return;
    }

    a.type = type;
    a.facingRight = player.facingRight;
    // Melee/explosion sensors are hit-detection only — keep them invisible.
    // (Do NOT set sprite.debug: q5play 4.x's debug draw calls a removed
    // `_doFill` and throws every frame, which would crash gameplay.)
    a.visible = false;

    pdata.activeAttacks.add(a);
    pdata.attackCooldown = a.life + 10;

    if (attachToPlayer) {
        a.everyFrame = a.everyFrame || {};
        a.everyFrame.follow = {
            duration: a.life + 1,
            f: (sprite) => {
                sprite.x = player.x + (a.facingRight ? offsetX : -offsetX);
                sprite.y = player.y + offsetY;
                sprite.vel.x = 0;
                sprite.vel.y = 0;
            },
        };
    }

    despawnAfter(a, a.life);
}

const PROJECTILE_TYPES = ["molotov_throw", "beer_throw", "bullet", "molotov_explosion"];

// Overlap callback for every active attack (melee sensor, thrown bottle,
// bullet, or molotov blast) against crates / turrets / terrain.
function handleHit(attack, target) {
    if (PROJECTILE_TYPES.includes(attack.type)) {
        handleProjectileHit(attack, target, [...crates, ...turrets]);
        return;
    }

    // Melee sensors linger for several frames, so guard against a single
    // swing registering many hits — each attack damages a target only once.
    if (!attack.alreadyHit) attack.alreadyHit = new Set();
    if (attack.alreadyHit.has(target)) return;
    attack.alreadyHit.add(target);

    applyAttackDamage(attack.type, target);
}

// Single source of truth for what an attack does to a destructible. Exposed
// on window so the molotov-blast logic in items.js can route through it too.
function applyAttackDamage(type, target) {
    if (!target || target.kind === "dead") return;
    if (target.kind === "crate")  return damageCrate(target);
    if (target.kind === "turret") return damageTurret(target, ATTACK_DAMAGE[type] ?? 5);
}
window.applyAttackDamage = applyAttackDamage;

// Crates always take 3 hits to break, walking through every art frame:
// full -> damaged -> broken -> gone.
function damageCrate(c) {
    c.hp -= 1;
    const px = c.x, py = c.y;       // crate may have been kicked, so use its live pos
    if (c.hp <= 0) {
        c.kind = "dead";
        score += 10;                // +10 per box broken
        spawnDebris(px, py, 9);     // full break: big burst of chips
        c.delete();                 // remove the body so the husk can't block the player
        return;
    }
    c.img = c.hp === 2 ? crateFrames.hit : crateFrames.broken;
    squashScale(c, 0.22, 9);        // recoil from the blow (no x-shake: crates move now)
    spawnDebris(px, py, 3);         // a few splinters knocked loose
}

function damageTurret(t, dmg) {
    if (t.dead) return;
    t.hp -= dmg;
    if (t.hp <= 0) {
        t.hp = 0;
        t.dead = true;
        t.active = false;
        t.img = turretFrames.destroyed;
        shakeSprite(t, 12, 16);                 // violent death rattle
        punchScale(t, 0.18, 10);
        spawnDebris(t.homeX ?? t.x, t.y, 12);
        score += 30;                            // +30 per turret
        spawnCrates();                          // boxes appear after the first turret falls
        if ([...turrets].every(x => x.dead)) spawnKey();
        return;
    }
    t.img = t.hp > 50 ? turretFrames.idle : turretFrames.fire;
    shakeSprite(t, 5, 8);                       // recoil on every hit
    punchScale(t, 0.1, 6);
}

// ============================================================
// Level system: threshold-gated spawning, active turrets, timer + score
// ============================================================
const LEVEL_SECONDS = 300;            // Mario-style countdown, per level
const THRESHOLD_OFFSET = 520;         // distance past spawn where the trip-line sits
const TURRET_REL_XS = [260, 820, 1450];      // turret x's relative to the trip-line
const CRATE_REL_XS  = [180, 560, 1080, 1650]; // crate x's (spawn after the 1st turret falls)
const SHOT_DAMAGE = 10;               // half a heart per hit (5 hearts = 100 hp)
const TURRET_FIRE_INTERVAL = 120;     // frames between a turret's shots
const TURRET_WINDUP = 26;             // wind-up tell (frames) before it fires
const TURRET_RANGE = 1100;            // turret only engages when the player is this close
const TURRET_FACE_DIR = 1;            // flip to -1 if the turret art faces the wrong way

let levelNum = 1;
let score = 0;
let levelPhase = "pre";               // "pre" (before trip-line) | "combat"
let thresholdX = THRESHOLD_OFFSET;
let timerFrames = LEVEL_SECONDS * 60;
let timerActive = false;
let cratesSpawned = false;
let keyCrateHome = null;
let keySpawned = false;

// Wipe the level back to its "pre" state for a fresh run/restart. Nothing
// spawns yet: turrets power up when the player trips the line, crates after
// the first turret is destroyed.
function resetLevel() {
    for (const c of [...crates]) c.delete();
    for (const t of [...turrets]) t.delete();
    for (const s of [...turretShots]) s.delete();
    if (window.theKey) { window.theKey.delete(); window.theKey = null; }

    levelPhase = "pre";
    thresholdX = player.x + THRESHOLD_OFFSET;
    timerFrames = LEVEL_SECONDS * 60;
    timerActive = false;
    cratesSpawned = false;
    keySpawned = false;
    keyCrateHome = null;
}

// Advance to the next wave further down the corridor (after grabbing the key).
function startNextLevel() {
    for (const c of [...crates]) c.delete();
    for (const t of [...turrets]) t.delete();
    for (const s of [...turretShots]) s.delete();
    if (window.theKey) { window.theKey.delete(); window.theKey = null; }

    levelNum += 1;
    score += 50;                      // +50 per new level unlocked
    levelPhase = "pre";
    thresholdX = player.x + THRESHOLD_OFFSET;
    cratesSpawned = false;
    keySpawned = false;
    keyCrateHome = null;
}

// Player crossed the trip-line: start the clock and power up the turrets.
function breachThreshold() {
    levelPhase = "combat";
    timerFrames = LEVEL_SECONDS * 60;
    timerActive = true;
    spawnTurrets();
}

function spawnTurrets() {
    // Drop the turret so its visible base (treads) lands on the floor.
    const turretRestY = surfaceY - TURRET_H / 2 + TURRET_FLOOR_NUDGE;
    TURRET_REL_XS.forEach(rx => {
        const tx = thresholdX + rx;
        const t = Sprite.withSensor(tx, turretRestY, TURRET_W, TURRET_H, "static");
        t.everyFrame = {};
        t.homeX = tx;
        t.kind = "turret";
        t.hp = 100;
        t.dead = false;
        t.active = false;             // goes live when the power-on rise finishes
        t.fireTimer = TURRET_FIRE_INTERVAL + Math.floor(Math.random() * 50);
        t.img = turretFrames.idle;
        t.restY = turretRestY;
        turrets.add(t);
        riseTurret(t);                // turn-on animation; flips t.active true at the end
    });
}

function spawnCrates() {
    if (cratesSpawned) return;
    cratesSpawned = true;
    const crateY = surfaceY - CRATE_H / 2;
    CRATE_REL_XS.forEach((rx, i) => {
        const cx = thresholdX + rx;
        const c = new Sprite(cx, crateY, CRATE_W, CRATE_H);  // solid + dynamic = kickable
        c.everyFrame = {};
        c.homeX = cx;
        c.kind = "crate";
        c.hp = 3;
        c.img = crateFrames.full;
        c.rotationLock = true;
        c.bounciness = 0;
        c.friction = 0.25;            // slides a while after a kick, then settles
        c.isKeyCrate = (i === CRATE_REL_XS.length - 1);
        if (c.isKeyCrate) keyCrateHome = { x: cx, y: crateY };
        crates.add(c);
        punchScale(c, 0.2, 8);        // little pop as it drops in
    });
}

// Turret emerges from the floor (power-on), then becomes a live shooter.
function riseTurret(t) {
    const fromY = t.restY + TURRET_H;
    const frames = 45;
    let f = 0;
    t.y = fromY;
    t.everyFrame.rise = {
        duration: frames + 1,
        f: (self) => {
            f++;
            const k = Math.min(1, f / frames);
            self.y = fromY + (self.restY - fromY) * easeOutBack(k);
            if (f >= frames) {
                self.y = self.restY;
                shakeSprite(self, 4, 6);   // little thud as it locks in
                self.active = true;        // turret is now live and hunting the player
                punchScale(self, 0.15, 8); // power-on pop
            }
        },
    };
}

// Run every frame: live turrets track the player, wind up, and fire shells.
function updateTurrets() {
    for (const t of turrets) {
        if (t.dead || !t.active) continue;
        const dx = player.x - t.x;
        if (Math.abs(dx) > TURRET_RANGE) continue;   // only engage a nearby player
        t.fireTimer--;
        if (t.fireTimer === TURRET_WINDUP) {
            t.img = turretFrames.fire;                // wind-up tell
            punchScale(t, 0.08, 6);
        }
        if (t.fireTimer <= 0) {
            fireTurretShot(t);
            t.fireTimer = TURRET_FIRE_INTERVAL;
            t.img = t.hp > 50 ? turretFrames.idle : turretFrames.fire;
        }
    }
}

// A turret fires a bright shell straight at the player's CURRENT position. The
// shell flies in exactly the direction it's launched (velocity re-asserted each
// frame so gravity can't bend it), leaving a short glowing trail.
function fireTurretShot(t) {
    // Muzzle sits at the barrel: turret center, nudged toward the player and up
    // to roughly barrel height.
    const dirX = (player.x < t.x) ? -1 : 1;
    const sx = t.x + dirX * (TURRET_W * 0.42);
    const sy = t.y - TURRET_H * 0.12;
    const dx = player.x - sx, dy = (player.y - 20) - sy;
    const d = Math.hypot(dx, dy) || 1;
    const speed = 15;
    const vx = (dx / d) * speed, vy = (dy / d) * speed;

    const shot = Sprite.withSensor(sx, sy, 42);
    shot.everyFrame = {};
    shot.kind = "turretshot";
    shot.img = turretShotImg;            // visible glowing shell (q5play won't draw a bare color)
    shot.rotationLock = true;
    shot.spent = false;
    shot.vel.x = vx; shot.vel.y = vy;
    // Re-assert velocity each frame so gravity can't bend it. Also do a manual
    // proximity check against the player — q5play's overlap callback can drop
    // collisions for fast sensors, and every shell MUST be able to land its hit.
    shot.everyFrame.fly = {
        duration: Infinity,
        f: (s) => {
            s.vel.x = vx; s.vel.y = vy;
            if (s.spent) return;
            const dx = s.x - player.x, dy = s.y - player.y;
            // player collider is 100×180; shot radius ~21. Box check is plenty.
            if (Math.abs(dx) < 50 + 21 && Math.abs(dy) < 90 + 21) {
                s.spent = true;
                pdata.hp -= SHOT_DAMAGE;
                flashPlayerHurt();
                spawnDebris(s.x, s.y, 4);
                s.delete();
            }
        },
    };
    turretShots.add(shot);
    despawnAfter(shot, 170);

    // muzzle flash
    punchScale(t, 0.1, 6);
    spawnDebris(sx, sy, 3);
}

// Player took a turret shell.
function onPlayerShot(playerSprite, shot) {
    if (shot.spent) return;
    shot.spent = true;
    pdata.hp -= SHOT_DAMAGE;
    flashPlayerHurt();
    spawnDebris(shot.x, shot.y, 4);
    shot.delete();
}

function flashPlayerHurt() {
    player.color = "red";
    player.everyFrame = player.everyFrame || {};
    let f = 0;
    player.everyFrame.hurt = { duration: 9, f: () => { f++; if (f >= 8) player.color = "white"; } };
}

// Walking into a crate boots it away like a soccer ball.
function kickCrate(playerSprite, c) {
    if (c.kind !== "crate") return;
    const dir = playerSprite.vel.x !== 0 ? Math.sign(playerSprite.vel.x)
                                         : (playerSprite.facingRight ? 1 : -1);
    c.vel.x = dir * 24;               // strong horizontal boot
    c.vel.y = -4;                     // tiny hop so it reads as a kick
}

// Per-frame level progression, called from updatePlaying().
function updateLevel() {
    // Trip-line: crossing it starts the clock and powers up the turrets.
    if (levelPhase === "pre" && player.x >= thresholdX) breachThreshold();

    // Mario-style countdown; running out of time is fatal.
    if (timerActive && timerFrames > 0) {
        timerFrames--;
        if (timerFrames <= 0) { timerFrames = 0; pdata.hp = 0; }
    }

    updateTurrets();

    // Grab the key -> clear the level (+50) and start the next wave.
    const k = window.theKey;
    if (k && !k.collected &&
        Math.abs(player.x - k.x) < 95 && Math.abs(player.y - k.y) < 140) {
        k.collected = true;
        k.delete();
        window.theKey = null;
        startNextLevel();
    }
}

// ============================================================
// HUD (drawn after the sprites via a postdraw hook, so it stays on top).
// The camera transform is off here, so the origin is the screen CENTER.
// ============================================================
function pad6(n) { return String(Math.max(0, Math.floor(n))).padStart(6, "0"); }

// Blocky 8-bit heart (7x6). "1" = pixel on.
const HEART_BMP = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"];
function drawHeart(x, y, pxsz, filled) {
    push();
    noStroke();
    const body = filled ? "#ff3344" : "#3a2230";
    const shine = "#ff9aa2";
    for (let r = 0; r < HEART_BMP.length; r++) {
        for (let c = 0; c < HEART_BMP[r].length; c++) {
            if (HEART_BMP[r][c] !== "1") continue;
            fill(body);
            rect(x + c * pxsz, y + r * pxsz, pxsz, pxsz);
            if (filled && r === 1 && (c === 1 || c === 5)) { // tiny glints
                fill(shine);
                rect(x + c * pxsz, y + r * pxsz, pxsz, pxsz);
            }
        }
    }
    pop();
}

// Retro 8-bit HUD, drawn after the sprites (postdraw hook) so it sits on top.
// Camera transform is off here, so the origin is the screen CENTER.
function drawHUD() {
    if (gameState !== "playing") return;
    const secs = Math.max(0, Math.ceil(timerFrames / 60));
    const S = 4;                         // pixel-font scale
    const rowY = -height / 2 + 16 + (7 * S) / 2;  // vertical center of the top text row
    const leftX = -width / 2 + 28;
    const rightX = width / 2 - 28;
    const OUT = "#0a0a22";               // dark outline for that cooked-in arcade look

    push();
    drawPixelText("SCORE " + pad6(score), leftX, rowY, S, "#ffe066", OUT, null, "left");
    drawPixelText("LEVEL " + levelNum,    0,     rowY, S, "#5fe1ff", OUT, null, "center");
    drawPixelText("TIME " + secs, rightX, rowY, S, secs <= 30 ? "#ff5560" : "#ffffff", OUT, null, "right");

    // Hearts row, under the score.
    const fullHearts = Math.max(0, Math.min(5, Math.ceil(pdata.hp / 20)));
    const hpx = 5, heartW = 7 * hpx;
    const heartY = rowY + (7 * S) / 2 + 14;
    for (let i = 0; i < 5; i++) {
        drawHeart(leftX + i * (heartW + 14), heartY, hpx, i < fullHearts);
    }
    pop();
}
window.q5.addHook("postdraw", drawHUD);

// Once every turret is cleared, a key pops out of the designated crate.
function spawnKey() {
    if (keySpawned) return;
    keySpawned = true;
    const live = [...crates].find(c => c.isKeyCrate && c.kind === "crate");
    const pos = live ? { x: live.x, y: live.y } : (keyCrateHome || { x: player.x, y: surfaceY - 60 });

    const k = new Sprite(pos.x, pos.y - 10, KEY_W, KEY_H);
    k.everyFrame = {};
    k.img = keyImg;
    k.kind = "key";
    k.rotationLock = true;
    k.bounciness = 0.25;
    k.friction = 0.4;

    // Pop up and arc toward whichever side the player is on, tumbling in
    // the air, then settle upright on the floor with a slow glint.
    const dir = (player.x <= pos.x) ? -1 : 1;
    k.vel.y = -18;          // upward launch; gravity arcs it back down
    k.vel.x = dir * 7;
    const spin = -dir * 17; // tumble in the direction of travel

    k.landed = false;
    k.bobT = 0;
    k.everyFrame.pop = {
        duration: Infinity,
        f: (self) => {
            if (!self.landed) {
                self.rotation += spin;                        // tumble while airborne
                if (self.colliding(ground) > 0 && self.vel.y > -2) {
                    self.landed = true;
                    squashScale(self, 0.3, 8);                // squash as it hits the deck
                }
            } else {
                self.rotation *= 0.6;                         // settle upright
                if (Math.abs(self.rotation) < 0.5) self.rotation = 0;
                self.bobT += 0.13;
                if (self.everyFrame.squash === undefined) {   // gentle glint once settled
                    const s = 1 + Math.sin(self.bobT) * 0.05;
                    self.scale.x = s; self.scale.y = s;
                }
            }
        },
    };
    window.theKey = k;
}

// ============================================================
// Debug hooks (harmless) — handy for inspecting/driving the game.
// ============================================================
window.player = player;
window.gameDebug = () => ({
    gameState,
    score, levelNum, timerFrames, timerActive, levelPhase,
    hp: pdata.hp, thresholdX, playerX: Math.round(player.x),
    turrets: turrets.length, crates: crates.length,
    activeTurrets: [...turrets].filter(t => t.active && !t.dead).length,
    deadTurrets: [...turrets].filter(t => t.dead).length,
    key: !!window.theKey,
});