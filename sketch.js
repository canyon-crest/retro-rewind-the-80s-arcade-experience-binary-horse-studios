window.exe = _ => eval(_);

function loadPNG(src) {
    return new Promise((resolve, reject) => {
        const img = document.createElement("img");
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = e => reject(e);
    });
}

await Canvas(1600, 900);
noSmooth();

canvas.style.position = "fixed";

window.onresize = function() {
	if (window.innerHeight / window.innerWidth > height / width) {
		canvas.style.width = "100%";
		canvas.style.height = `${(height / width) * window.innerWidth}px`;
		canvas.style.left = "0";
		canvas.style.top = `${(window.innerHeight - (height / width) * window.innerWidth) * 0.5}px`; // center the canvas vertically
	}
	else {
		canvas.style.width = `${(width / height) * window.innerHeight}px`;
		canvas.style.height = "100%";
		canvas.style.left = `${(window.innerWidth - (width / height) * window.innerHeight) * 0.5}px`; // center the canvas horizontally
		canvas.style.top = "0";
	}
}
window.onresize();

allSprites.everyFrame = {};
allSprites.autoCull = false;


camera.zoom = 1;
camera.x = 0;
camera.y = height / 2;
world.gravity.y = 37;

import { createProjectile, handleProjectileHit } from "./items.js";
// Spritesheet registry: maps sheet names to loaded images and metadata
const spritesheets = {
    usIdle: {
        image: await loadPNG("./idle.png"),
        frameWidth: 31,
        frameHeight: 73,
    },
    usRun: {
        image: await loadPNG("./run.png"),
        frameWidth: 46,
        frameHeight: 70,
    },
    usFire: {
        image: await loadPNG("./fire.png"),
        frameWidth: 50,
        frameHeight: 73,
    }
};


const animationSequences = {
    "player.idle": {
        blocks: [
            { sheet: "usIdle", framePos: { x: 0, y: 0 }, duration: 10 },
            { sheet: "usIdle", framePos: { x: 1, y: 0 }, duration: 10 }
        ],
        loop: true
    },

    "player.run": {
        blocks: [
            { sheet: "usRun", framePos: { x: 2, y: 0 }, duration: 6 },
            { sheet: "usRun", framePos: { x: 1, y: 1 }, duration: 4 },
            { sheet: "usRun", framePos: { x: 2, y: 1 }, duration: 4 },
            { sheet: "usRun", framePos: { x: 0, y: 1 }, duration: 6 },
            { sheet: "usRun", framePos: { x: 0, y: 0 }, duration: 10 }
        ],
        loop: true
    },
    
    // Ground punch: immediate attack
    "player.ground_punch.startup": {
        blocks: [
            { sheet: "player", framePos: { x: 1, y: 0 }, duration: 5 }
        ],
        loop: false,
        onComplete: "spawn_ground_punch"
    },
    
    // Air forward punch: immediate attack
    "player.air_forward.startup": {
        blocks: [
            { sheet: "player", framePos: { x: 2, y: 0 }, duration: 5 }
        ],
        loop: false,
        onComplete: "spawn_air_forward"
    },
    
    // Air explosion: has startup phase
    "player.air_explosion.startup": {
        blocks: [
            { sheet: "player", framePos: { x: 3, y: 0 }, duration: 8 },
            { sheet: "player", framePos: { x: 4, y: 0 }, duration: 7 }
        ],
        loop: false,
        onComplete: "spawn_air_explosion"
    },
    
    // Projectile animations
    "player.molotov_throw.startup": {
        blocks: [
            { sheet: "usRun", framePos: { x: 1, y: 0 }, duration: 2 },
            { sheet: "usRun", framePos: { x: 2, y: 0 }, duration: 5 },
            { sheet: "usRun", framePos: { x: 1, y: 1 }, duration: 5 }
        ],
        loop: false,
        onComplete: "spawn_molotov_throw"
    },
    "player.beer_throw.startup": {
        blocks: [
            { sheet: "usRun", framePos: { x: 1, y: 0 }, duration: 2 },
            { sheet: "usRun", framePos: { x: 2, y: 0 }, duration: 5 },
            { sheet: "usRun", framePos: { x: 1, y: 1 }, duration: 5 }
        ],
        loop: false,
        onComplete: "spawn_beer_throw"
    },
    "player.bullet.startup": {
        blocks: [
            { sheet: "usFire", framePos: { x: 0, y: 2 }, duration: 2 },
            { sheet: "usFire", framePos: { x: 2, y: 0 }, duration: 2 },
            { sheet: "usFire", framePos: { x: 0, y: 2 }, duration: 2 }
        ],
        loop: false,
        onComplete: "spawn_bullet"
    }
};

let pdata = {
    attackCooldown: 0,
    startupTimer: 0,
    pendingAttack: null,
    groundedTimer: 0, // coyote time

    activeAttacks: new Group(),
    attackAnimation: null,

    // Animation system state
    activeAnimation: null,      // Current animation name (string)
    animationFrame: 0,          // Index in current sequence (0-based)
    animationTimer: 0,          // Countdown frames until next block
    animationLooping: false,    // Whether animation loops
    
    // Movement animation state
    currentMovementAnim: null,  // "idle" or "run" or null
    currentDefaultAnimation: "idle", // Default animation to return to ("idle" or "run")
    lastMoveX: 0,               // Track previous movement for state changes

    inventory: []
};

const corridorBG = await loadImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAAAoCAYAAADAOHfQAAAFCklEQVR4AexdPY4UPRD116Rf9mX7BdyAcCRyUqQl4hpcg7sQzAEgQwR7CoTQRpAiNmHxW7ZaNaZcbve6Sz3wpH7rnyq/Z5dd3b07I5gOh8MtwRjwDJzXGUgp3QLT1dVVKnFxcZGAsn9tG1yANR79gGVb0wcuoDYWNqBm7+0HF2CNQz9g2db0gQuojYUNqNl7+8EFWOPQD1i2NX3gAmpjYQNq9t5+cAHWOPQDlm1NH7iANWMxJifq3YU6gEa+4aJI091P/mAEGIHdRqBMWt02E/h4PA5djMfn2dZMosXXsvdqenyerVcH/i2+lh0cPfD4PFuPhvi2+Fp24VlaenyebSm/9hvBp5MW3NI2ExgOfwG4REbgrCIgSasnbSbw5eWl9nlw3ePzbGuEW3wte6+mx+fZenXg3+Jr2cHRA4/Ps/VoiG+Lr2UXnqWlx+fZlvJrv9F8mttMYO3AOiPACOw3AmYCP+id/dGrlDJub26SwOPzbM2wZZ0eLfBF6kVqcW2IQAWd5yR63yqzrnbLX6DhYCYwDDPuF49EWYQ88Pbb6/xzxRWphelF6kVqtdd2d5M92c88hvuWg1Be0ftW6httfCQlSWwm8PzOjslnAmxsD/KQk2vmO+n91ZhtAVpQjNSL1OLaXifvjCI+GvPe6M77+mwLOpP3sqsKM4E1E4Ki21vWI7Wwjki9SC2uDREYg+h9WzprPIXhayaw/A5w+fxjevHy5YMBoRoitTCHSL1ILa6t75wiXjVE71ttHq1+JLGZwDIQCxkF4ayVo3TAU9PQ/fAbBc1r1UfpgMfiL/vgNwold9kepQOekttqw++BSDLe4td94jei1Lwj62YCz78DDFLy+DzbGvkWX8veq+nxebZeHfi3+Fp2cPTA4/NsPRri2+Jr2YVnaenxebal/NpvNJ/mNhNYO7DOCDAC+42AmcB4ZRg5ZY/Ps62ZQ4uvZe/V9Pg8W68O/Ft8LTs4euDxebYeDfFt8bXswrO09Pg821J+7TeaT3ObCawduuv403uGfIkDZTfH0gFZB59lQkOwdOgqv0i9SC0EI1IvUusPX5uZwCfv7PfBRqKkR7++ZeXWc8DKP72f8GW7vk5sG2tBN1IvUotrc85mDs6ez2Se3urLTOCZDQmVG1h8D/KQ/itSC7OL1IvU4trML3QgLN2I3reOCV5fXyfATGD9zo7E7eA1XTVf6aBtW2tBO1IvUotrQwSWQ+9NOUrbIs5kqb+0Xf0cWF79Rn2RQ/isiYktQgv6kXqRWlxb3xc5ZG8QtxJiizqTpf6SNpIXftUnMO5CowHBEqM1hK/UkbbY+8vj/AWA4/H4W134dXk0/Eb0aQ1dH8FtcWgNqVt+I/qEvyxHcFscpQ7alt+IPnCPhpnAo0XIxwgwAttEgAm8TVzJygiERIAJHBJmijAC20SACbxNXP8wVi5nTxHAx0cyHyawRIIlI7DzCMi/woF/nVKSmAm8803j9BgBREAnL9oC/N9ICUbiwDgcGIO95gESFk9elADqeApPb66+J4Ix4BmonYH99H9KT5IG9mx6+v/XRDAGPAPneQb4OzDeRwhG4EwjMH3+8jgRjAHPwHmegendv+/TPzcfEkvGgefg/PJgevZ1Sm//+5E2KcnLuPJ8bZpfE5OXNy/evM/3IcYnMJ8Qmz4heHPY9ubAJzBf8/maf8Y3cT6Bt9o88vLJHvBw4BM4IMh8jdz2NfJvju9PAAAA//+D7uq9AAAABklEQVQDABKMPA4wFkJmAAAAAElFTkSuQmCC");

// Pre-extract all animation frames from spritesheets
const animationFrames = {};

async function extractAllAnimationFrames() {
    for (const [animName, sequence] of Object.entries(animationSequences)) {
        animationFrames[animName] = [];
        
        for (const block of sequence.blocks) {
            const sheet = spritesheets[block.sheet];
            if (!sheet || !sheet.image) {
                animationFrames[animName].push("\u{1f98a}"); // fallback emoji
                continue;
            }
            
            const framePos = block.framePos;
            let srcX = framePos.x;
            let srcY = framePos.y;
            
            // If framePos values are small integers (likely grid indices), convert to pixel coords
            if (framePos.x < 20 && framePos.y < 20) {
                srcX = framePos.x * sheet.frameWidth;
                srcY = framePos.y * sheet.frameHeight;
            }
            
            const frameImage = await extractFrameAsImage(
                sheet.image,
                srcX, srcY,
                sheet.frameWidth,
                sheet.frameHeight
            );
            
            animationFrames[animName].push(frameImage || "\u{1f98a}");
        }
    }
}

await extractAllAnimationFrames();

let player;

let ground;
let walls = [];
let doors = [];

{ // create environmental objects
    window.worldAnchor = Sprite.withSensor(0, 0, 37, 37, "static");

    window.terrain = new Group();
    terrain.physics = "static";
    terrain.bounciness = 0; // BY DEFAULT

    const surfaceY = 700;
    const doorHeight = 200;

    ground = new terrain.Sprite(37000, surfaceY + 37, 80000, 74);
    ground.visible = false;

    for (let i = 0; i <= 12; i++) {
        walls[i] = new terrain.Sprite((i * 6) * height - width * 0.5, (surfaceY - doorHeight) * 0.5, 74, surfaceY - doorHeight);
        doors[i] = new terrain.Sprite((i * 6) * height - width * 0.5, surfaceY - doorHeight * 0.5, 67, doorHeight);
        doors[i].color = "#bababa";

        doors[i].hp = 67;
    }

    player = new Sprite(0, 300, 100, 180); // CONSTANT
    player.facingRight = true;
    player.color = "white";
    player.rotationLock = true;
    player.friction = 0;
    player.bounciness = 0;

    window.balls = new Group();
    balls.diameter = 67;
    balls.color = "#e91e63";
    balls.bounciness = 0.9;
    balls.hp = 67;

    for (let i = 0; i < 15; i++) {
        new balls.Sprite(random(100, 700), random(50, 400));
    }
}

pdata.activeAttacks.overlaps(balls, handleHit);
pdata.activeAttacks.overlaps(terrain, handleHit);
player.passes(pdata.activeAttacks);

// Initialize with idle animation
startAnimation("player.idle", true);
pdata.currentMovementAnim = "idle";

function computePlayerActions(pdata, player, kb) {
    const actions = {
        moveX: 0,
        facingRight: player.facingRight,
        jump: false,
        attack: null,
        startup: false,
        pendingAttack: null
    };

    if (kb.pressing("left")) {
        actions.moveX = -10;
        actions.facingRight = false;
    } else if (kb.pressing("right")) {
        actions.moveX = 10; // CONSTANT
        actions.facingRight = true;
    } else {
        actions.moveX = 0;
    }

    if (kb.presses("up") && pdata.groundedTimer > 0) {
        actions.jump = true;
    }

    if (kb.presses("space") && pdata.attackCooldown === 0 && pdata.startupTimer === 0) {
        let isGrounded = pdata.groundedTimer > 0;
        let holdingForward = (player.facingRight && kb.pressing("right")) || (!player.facingRight && kb.pressing("left"));

        if (isGrounded) {
            actions.attack = "ground_punch";
        } else if (holdingForward) {
            actions.attack = "air_forward";
        } else {
            actions.startup = true;
            actions.pendingAttack = "air_explosion";
        }
    }

    if (kb.presses("z") && pdata.attackCooldown === 0) {
        actions.attack = "molotov_throw";
    }
    if (kb.presses("x") && pdata.attackCooldown === 0) {
        actions.attack = "beer_throw";
    }
    if (kb.presses("c") && pdata.attackCooldown === 0) {
        actions.attack = "bullet";
    }

    return actions;
}

// Start playing an animation sequence
function startAnimation(name, loop = true) {
    if (!animationSequences[name]) {
        console.warn(`Animation "${name}" not found`);
        return;
    }
    pdata.activeAnimation = name;
    pdata.animationFrame = 0;
    pdata.animationLooping = loop;
    
    const sequence = animationSequences[name];
    if (sequence.blocks.length > 0) {
        pdata.animationTimer = sequence.blocks[0].duration;
    }
}

// Update animation state each frame (call once per frame in q5.update)
function updateAnimation() {
    if (!pdata.activeAnimation) return;
    
    const sequence = animationSequences[pdata.activeAnimation];
    if (!sequence || sequence.blocks.length === 0) return;
    
    pdata.animationTimer--;
    
    if (pdata.animationTimer <= 0) {
        pdata.animationFrame++;
        
        if (pdata.animationFrame >= sequence.blocks.length) {
            if (pdata.animationLooping) {
                pdata.animationFrame = 0;
                pdata.animationTimer = sequence.blocks[0].duration;
            } else {
                // Animation finished, clear to allow spawning and state transitions
                pdata.activeAnimation = null;
                pdata.animationFrame = 0;
                return;
            }
        } else {
            pdata.animationTimer = sequence.blocks[pdata.animationFrame].duration;
        }
    }
}

// Render the current animation frame to the player sprite
// Extract a single frame from a spritesheet as an Image object
async function extractFrameAsImage(sheetImage, srcX, srcY, frameWidth, frameHeight) {
    // Create offscreen canvas at frame dimensions
    const canvas = document.createElement('canvas');
    canvas.width = frameWidth;
    canvas.height = frameHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Draw the cropped region from spritesheet to canvas
    try {
        ctx.drawImage(
            sheetImage,
            srcX, srcY,                    // Source position
            frameWidth, frameHeight,       // Source dimensions
            0, 0,                          // Dest position
            frameWidth, frameHeight        // Dest dimensions
        );
    } catch (e) {
        console.warn("Failed to extract frame:", e);
        return null;
    }
    
    // Convert canvas to data URL and load into Image object
    const img = await loadImage(canvas.toDataURL());
    img.resize(frameWidth * 20/3, frameHeight * 20/3); // CONSTANT
    return img;
}

function renderCurrentFrame() {
    if (!pdata.activeAnimation) return;
    
    const framesList = animationFrames[pdata.activeAnimation];
    if (!framesList || framesList.length === 0) {
        player.img = "\u{1f98a}";
        return;
    }
    
    player.img = framesList[pdata.animationFrame];
}

q5.update = function () {
    const positionAlongCorridor = camera.x % (height * 6);

    image(corridorBG, (3 * height - width * 0.5) - positionAlongCorridor, 0, height * 6, height);
    if (positionAlongCorridor < 0) image(corridorBG, (-3 * height - width * 0.5) - positionAlongCorridor, 0, height * 6, height);
    else if (positionAlongCorridor > height * 6 - width) image(corridorBG, (9 * height - width * 0.5) - positionAlongCorridor, 0, height * 6, height);

    if (player.colliding(ground)) {
        // CONSTANT
        pdata.groundedTimer = 3; // stay "grounded" for 4 frames after leaving a surface
    } else if (pdata.groundedTimer > 0) {
        pdata.groundedTimer--;
    }

    const actions = computePlayerActions(pdata, player, kb);

    player.vel.x = actions.moveX;
    player.facingRight = actions.facingRight;

    if (actions.jump) {
        player.vel.y = -16; // CONSTANT
        pdata.groundedTimer = 0;
    }

    camera.x += (player.x - camera.x) * 0.67;

    // Movement animation control: switch between idle and run based on player velocity
    // Only update movement animation if no attack animation is active
    if (!pdata.activeAnimation || pdata.activeAnimation.startsWith("player.idle") || pdata.activeAnimation.startsWith("player.run")) {
        const isMoving = Math.abs(actions.moveX) > 0;
        
        if (isMoving && pdata.currentMovementAnim !== "run") {
            // Start run animation
            startAnimation("player.run", true);
            pdata.currentMovementAnim = "run";
            pdata.currentDefaultAnimation = "run";
        } else if (!isMoving && pdata.currentMovementAnim !== "idle") {
            // Start idle animation
            startAnimation("player.idle", true);
            pdata.currentMovementAnim = "idle";
            pdata.currentDefaultAnimation = "idle";
        } else if (!pdata.activeAnimation && pdata.currentMovementAnim) {
            // Animation was cleared (attack finished), restore default animation
            pdata.activeAnimation = `player.${pdata.currentDefaultAnimation}`;
            pdata.animationFrame = 0;
            const defaultSeq = animationSequences[pdata.activeAnimation];
            if (defaultSeq && defaultSeq.blocks.length > 0) {
                pdata.animationTimer = defaultSeq.blocks[0].duration;
            }
        }
    }

    const transitionResult = computeStateTransitions(pdata, actions);

    // apply side-effects from transitions
    if (transitionResult.startupStarted) {
        player.color = "pink";
    }

    if (transitionResult.spawnAttack) {
        createAttack(transitionResult.spawnAttack);
        player.color = "white";
    }

    // Update and render active animation
    updateAnimation();
    renderCurrentFrame();

    // Fallback to attack animation or idle if no active animation
    if (!pdata.activeAnimation) {
        if (pdata.attackAnimation) {
            player.img = pdata.attackAnimation;
        } else {
            player.img = "\u{1f98a}";
        }
    }

    for (let i = 0; i < allSprites.length; i++) {
        const sprite = allSprites[i];
        if (!sprite.everyFrame) {
            throw "no everyFrame object";
        }

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
}

function computeStateTransitions(pdata, actions) {
    // returns { spawnAttack?: string, startupStarted?: bool }
    const result = {};

    if (pdata.attackCooldown > 0) {
        pdata.attackCooldown--;
        if (pdata.attackCooldown === 0) {
            pdata.attackAnimation = null;
        }
    }

    if (actions.attack) {
        // Start animation for immediate attack
        const animName = `player.${actions.attack}.startup`;
        startAnimation(animName, false);
        pdata.pendingAttack = actions.attack;
        result.startupStarted = true;
        return result;
    }

    if (actions.startup) {
        // Start animation for startup attack
        const animName = `player.${actions.pendingAttack}.startup`;
        startAnimation(animName, false);
        pdata.pendingAttack = actions.pendingAttack;
        result.startupStarted = true;
        return result;
    }

    // Detect when animation completes and spawn attack
    if (pdata.pendingAttack && !pdata.activeAnimation && pdata.attackCooldown === 0) {
        result.spawnAttack = pdata.pendingAttack;
        pdata.pendingAttack = null;
    }

    return result;
}

function createAttack(type) {
    let a;

    if (type === "ground_punch") {
        a = Sprite.withSensor(
            player.facingRight ? player.x + 80 : player.x - 80,
            player.y + 40,
            100, // CONSTANT(s)
            60
        );
        a.life = 15;
    }

    else if (type === "air_forward") {
        a = Sprite.withSensor(
            player.x + (player.facingRight ? 100 : -100),
            player.y + 40,
            120, // CONSTANT(s)
            40
        );
        a.life = 8;
    }

    else if (type === "air_explosion") {
        a = Sprite.withSensor(player.x, player.y, 250); // CONSTANT(s)
        a.life = 25;
    }

    else if (type === "molotov_throw" || type === "beer_throw" || type === "bullet") {
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

    let bond = new GlueJoint(player, a);
    bond.length = 0;
    bond.visible = false;

    a.debug = true;
}

function handleHit(attack, target) {
    const isProjectile = attack.type === "molotov_throw" || attack.type === "beer_throw" || attack.type === "bullet";

    const hittables = [...balls, ...doors];
    const targetIsHittable = hittables.includes(target);

    const targetHasHP = target.hasOwnProperty("hp");

    if (isProjectile) {
        handleProjectileHit(attack, target, hittables);
    }
    else if (targetIsHittable) {
        if (attack.type === "ground_punch") {
            target.vel.x = attack.facingRight ? 15 : -15; target.vel.y = -5;
            target.hp -= 20;
        }
        else if (attack.type === "air_forward") {
            target.vel.x = attack.facingRight ? 20 : -20; target.vel.y = -10;
            target.hp -= 18;
        }
        else if (attack.type === "air_explosion") {
            let angle = atan2(target.y - attack.y, target.x - attack.x);
            target.vel.x = 25 * cos(angle);
            target.vel.y = 25 * sin(angle) ** 2;

            target.hp -= 37;
        }
    }

    if (targetHasHP && target.hp < 0) {
        // future: death animation
        // future: can die twice?
        target.delete();
    }
}
