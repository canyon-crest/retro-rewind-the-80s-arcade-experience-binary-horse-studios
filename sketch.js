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

import { createProjectile, handleProjectileHit } from "./items.js";
import {
    initStartScreen,
    updateStartScreen,
    handleStartScreenClick,
    isStartScreenDone,
} from "./startscreen.js";
import { GameOverScreen } from "./deathscreen.js";

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

const CRATE_W = 90, CRATE_H = 90;
const TURRET_W = 120, TURRET_H = 120;
const KEY_W = 64, KEY_H = 37;

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
const keyImg = await loadGameImage("./key.png", KEY_W, KEY_H);

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
    }
};

function resetGameplayPositions() {
    // Player back to spawn
    player.x = 0;
    player.y = 300;
    player.vel.x = 0;
    player.vel.y = 0;

    // Fresh crates + turrets for this run.
    spawnLevelEntities();

    // Camera back to start
    camera.x = width / 2;
}
function restartGame() {
    setWorldVisible(true);
    resetGameplayPositions();
    
    player.facingRight = true;
    pdata.hp = 100;
    pdata.attackCooldown = 0;
    pdata.pendingAttack = null;
    pdata.groundedTimer = 0;
    pdata.airborne = false;

    for (const a of [...pdata.activeAttacks]) a.delete();
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
            gameState = "gameover";
            setWorldVisible(false);
            gameOverScreen = new GameOverScreen({
                quote: '"YOU FAILED, SOLDIER."',
                onContinue: () => {
                    restartGame();
                    setWorldVisible(true);
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

    a.img = "\u{1f98c}";
    a.type = type;
    a.facingRight = player.facingRight;
    pdata.activeAttacks.add(a);
    pdata.attackCooldown = a.life + 10;
    a.debug = true;

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
    if (c.hp <= 0) {
        c.kind = "dead";
        c.visible = false;
        return;
    }
    c.img = c.hp === 2 ? crateFrames.hit : crateFrames.broken;
}

function damageTurret(t, dmg) {
    if (t.dead) return;
    t.hp -= dmg;
    if (t.hp <= 0) {
        t.hp = 0;
        t.dead = true;
        t.img = turretFrames.destroyed;
        if ([...turrets].every(x => x.dead)) spawnKey();
        return;
    }
    t.img = t.hp > 50 ? turretFrames.idle : turretFrames.fire;
}

// ============================================================
// Level entities (crates + turrets) and the key
// ============================================================
const CRATE_XS = [350, 750, 1150, 1550];
const TURRET_XS = [550, 1350, 2150];
let keyCrateHome = null;
let keySpawned = false;

function spawnLevelEntities() {
    for (const c of [...crates]) c.delete();
    for (const t of [...turrets]) t.delete();
    if (window.theKey) { window.theKey.delete(); window.theKey = null; }
    keySpawned = false;

    const crateY = surfaceY - CRATE_H / 2;
    CRATE_XS.forEach((cx, i) => {
        const c = Sprite.withSensor(cx, crateY, CRATE_W, CRATE_H, "static");
        c.everyFrame = {};
        c.kind = "crate";
        c.hp = 3;
        c.img = crateFrames.full;
        c.isKeyCrate = (i === CRATE_XS.length - 1);
        if (c.isKeyCrate) keyCrateHome = { x: cx, y: crateY };
        crates.add(c);
    });

    const turretRestY = surfaceY - TURRET_H / 2;
    TURRET_XS.forEach(tx => {
        const t = Sprite.withSensor(tx, turretRestY, TURRET_W, TURRET_H, "static");
        t.everyFrame = {};
        t.kind = "turret";
        t.hp = 100;
        t.dead = false;
        t.img = turretFrames.idle;
        t.restY = turretRestY;
        turrets.add(t);
        riseTurret(t);
    });
}

// Turret emerges from the floor: start fully below the surface, slide up.
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
            self.y = fromY + (self.restY - fromY) * k;
        },
    };
}

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
    k.bounciness = 0.2;
    k.friction = 0.4;
    k.vel.y = -17; // pop upward; gravity drops it back onto the floor
    window.theKey = k;
}