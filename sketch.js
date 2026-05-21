window.exe = _ => eval(_);

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


camera.zoom = 1;
camera.x = 0;
camera.y = height / 2;
world.gravity.y = 37;

import { createProjectile } from './items.js';

let pdata = {
    facingRight: true,
    attackCooldown: 0,
    startupTimer: 0,
    pendingAttack: null,
    groundedTimer: 0, // coyote time

    activeAttacks: new Group(),
    attackAnimation: null,

    inventory: []
};

const corridorBG = await loadImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAAAoCAYAAADAOHfQAAAFCklEQVR4AexdPY4UPRD116Rf9mX7BdyAcCRyUqQl4hpcg7sQzAEgQwR7CoTQRpAiNmHxW7ZaNaZcbve6Sz3wpH7rnyq/Z5dd3b07I5gOh8MtwRjwDJzXGUgp3QLT1dVVKnFxcZGAsn9tG1yANR79gGVb0wcuoDYWNqBm7+0HF2CNQz9g2db0gQuojYUNqNl7+8EFWOPQD1i2NX3gAmpjYQNq9t5+cAHWOPQDlm1NH7iANWMxJifq3YU6gEa+4aJI091P/mAEGIHdRqBMWt02E/h4PA5djMfn2dZMosXXsvdqenyerVcH/i2+lh0cPfD4PFuPhvi2+Fp24VlaenyebSm/9hvBp5MW3NI2ExgOfwG4REbgrCIgSasnbSbw5eWl9nlw3ePzbGuEW3wte6+mx+fZenXg3+Jr2cHRA4/Ps/VoiG+Lr2UXnqWlx+fZlvJrv9F8mttMYO3AOiPACOw3AmYCP+id/dGrlDJub26SwOPzbM2wZZ0eLfBF6kVqcW2IQAWd5yR63yqzrnbLX6DhYCYwDDPuF49EWYQ88Pbb6/xzxRWphelF6kVqtdd2d5M92c88hvuWg1Be0ftW6httfCQlSWwm8PzOjslnAmxsD/KQk2vmO+n91ZhtAVpQjNSL1OLaXifvjCI+GvPe6M77+mwLOpP3sqsKM4E1E4Ki21vWI7Wwjki9SC2uDREYg+h9WzprPIXhayaw/A5w+fxjevHy5YMBoRoitTCHSL1ILa6t75wiXjVE71ttHq1+JLGZwDIQCxkF4ayVo3TAU9PQ/fAbBc1r1UfpgMfiL/vgNwold9kepQOekttqw++BSDLe4td94jei1Lwj62YCz78DDFLy+DzbGvkWX8veq+nxebZeHfi3+Fp2cPTA4/NsPRri2+Jr2YVnaenxebal/NpvNJ/mNhNYO7DOCDAC+42AmcB4ZRg5ZY/Ps62ZQ4uvZe/V9Pg8W68O/Ft8LTs4euDxebYeDfFt8bXswrO09Pg821J+7TeaT3ObCawduuv403uGfIkDZTfH0gFZB59lQkOwdOgqv0i9SC0EI1IvUusPX5uZwCfv7PfBRqKkR7++ZeXWc8DKP72f8GW7vk5sG2tBN1IvUotrc85mDs6ez2Se3urLTOCZDQmVG1h8D/KQ/itSC7OL1IvU4trML3QgLN2I3reOCV5fXyfATGD9zo7E7eA1XTVf6aBtW2tBO1IvUotrQwSWQ+9NOUrbIs5kqb+0Xf0cWF79Rn2RQ/isiYktQgv6kXqRWlxb3xc5ZG8QtxJiizqTpf6SNpIXftUnMO5CowHBEqM1hK/UkbbY+8vj/AWA4/H4W134dXk0/Eb0aQ1dH8FtcWgNqVt+I/qEvyxHcFscpQ7alt+IPnCPhpnAo0XIxwgwAttEgAm8TVzJygiERIAJHBJmijAC20SACbxNXP8wVi5nTxHAx0cyHyawRIIlI7DzCMi/woF/nVKSmAm8803j9BgBREAnL9oC/N9ICUbiwDgcGIO95gESFk9elADqeApPb66+J4Ix4BmonYH99H9KT5IG9mx6+v/XRDAGPAPneQb4OzDeRwhG4EwjMH3+8jgRjAHPwHmegendv+/TPzcfEkvGgefg/PJgevZ1Sm//+5E2KcnLuPJ8bZpfE5OXNy/evM/3IcYnMJ8Qmz4heHPY9ubAJzBf8/maf8Y3cT6Bt9o88vLJHvBw4BM4IMh8jdz2NfJvju9PAAAA//+D7uq9AAAABklEQVQDABKMPA4wFkJmAAAAAElFTkSuQmCC");


let player;

let terrain;
let ground;
let walls = [];

let balls;

{ // create environmental objects
    terrain = new Group();
    terrain.physics = "static";
    terrain.bounciness = 0; // BY DEFAULT

    const surfaceY = 700;
    ground = new terrain.Sprite(0, surfaceY + 37, 80000, 74);
    ground.visible = false;

    for (let i = 0; i <= 12; i++) {
        walls[i] = new terrain.Sprite((i * 6) * height - width * 0.5, surfaceY * 0.5, 74, surfaceY);
    }

    walls[13] = new terrain.Sprite(0, 0, 74, 74);

    player = new Sprite(0, 300, 100, 100);
    player.color = "white";
    player.rotationLock = true;
    player.friction = 0;
    player.bounciness = 0;

    balls = new Group();
    balls.diameter = 67;
    balls.color = '#e91e63';
    balls.bounciness = 0.9;

    for (let i = 0; i < 15; i++) {
        new balls.Sprite(random(100, 700), random(50, 400));
    }
}

pdata.activeAttacks.overlaps(balls, handleHit);
player.passes(pdata.activeAttacks);

function computePlayerActions(pdata, player, kb) {
    const actions = {
        moveX: 0,
        facingRight: pdata.facingRight,
        jump: false,
        attack: null,
        startup: false,
        pendingAttack: null
    };

    if (kb.pressing('left')) {
        actions.moveX = -10;
        actions.facingRight = false;
    } else if (kb.pressing('right')) {
        actions.moveX = 10; // CONSTANT
        actions.facingRight = true;
    } else {
        actions.moveX = 0;
    }

    if (kb.presses('up') && pdata.groundedTimer > 0) {
        actions.jump = true;
    }

    if (kb.presses('space') && pdata.attackCooldown === 0 && pdata.startupTimer === 0) {
        let isGrounded = pdata.groundedTimer > 0;
        let holdingForward = (pdata.facingRight && kb.pressing('right')) || (!pdata.facingRight && kb.pressing('left'));

        if (isGrounded) {
            actions.attack = 'ground_punch';
        } else if (holdingForward) {
            actions.attack = 'air_forward';
        } else {
            actions.startup = true;
            actions.pendingAttack = 'air_explosion';
        }
    }

    if (kb.presses('z') && pdata.attackCooldown === 0) {
        actions.attack = 'molotov_throw';
    }
    if (kb.presses('x') && pdata.attackCooldown === 0) {
        actions.attack = 'beer_throw';
    }
    if (kb.presses('c') && pdata.attackCooldown === 0) {
        actions.attack = 'bullet';
    }

    return actions;
}

function attackImageFor(type) {
    return {
        ground_punch: '🥊',
        air_forward: '👊',
        air_explosion: '💥',
        molotov_throw: '🍾',
        beer_throw: '🍺',
        bullet: '🔫'
    }[type] || '\u{1f98a}';
}

q5.update = function () {
    const positionAlongCorridor = camera.x % (height * 6);

    image(corridorBG, (3 * height - width * 0.5) - positionAlongCorridor, 0, height * 6, height);
    if (positionAlongCorridor < 0) image(corridorBG, (-3 * height - width * 0.5) - positionAlongCorridor, 0, height * 6, height);
    else if (positionAlongCorridor > height * 6 - width) image(corridorBG, (9 * height - width * 0.5) - positionAlongCorridor, 0, height * 6, height);

    if (player.colliding(ground)) {
        // CONSTANT
        pdata.groundedTimer = 4; // stay "grounded" for 4 frames after leaving a surface
    } else if (pdata.groundedTimer > 0) {
        pdata.groundedTimer--;
    }

    const actions = computePlayerActions(pdata, player, kb);

    player.vel.x = actions.moveX;
    pdata.facingRight = actions.facingRight;

    if (actions.jump) {
        player.vel.y = -16; // CONSTANT
        pdata.groundedTimer = 0;
    }

    camera.x += (player.x - camera.x) * 0.67;

    if (pdata.attackAnimation) {
        player.img = pdata.attackAnimation;
    } else {
        player.img = '\u{1f98a}';
    }

    const transitionResult = computeStateTransitions(pdata, actions);

    // apply side-effects from transitions
    if (transitionResult.startupStarted) {
        player.color = 'pink';
    }

    if (transitionResult.spawnAttack) {
        createAttack(transitionResult.spawnAttack);
        player.color = 'white';
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
        result.spawnAttack = actions.attack;
        pdata.attackAnimation = attackImageFor(actions.attack);
        return result;
    }

    if (actions.startup) {
        pdata.startupTimer = 15; // CONSTANT
        pdata.pendingAttack = actions.pendingAttack;
        pdata.attackAnimation = attackImageFor(actions.pendingAttack);
        result.startupStarted = true;
        return result;
    }

    // process startup frames
    if (pdata.startupTimer > 0) {
        pdata.startupTimer--;
        if (pdata.startupTimer === 0) {
            result.spawnAttack = pdata.pendingAttack;
            pdata.pendingAttack = null;
        }
    }

    return result;
}

function createAttack(type) {
    let a;

    if (type === 'ground_punch') {
        a = Sprite.withSensor(
            pdata.facingRight ? player.x + 80 : player.x - 80,
            player.y,
            100, // CONSTANT(s)
            60
        );
        a.life = 15;
        a.strength = 2;
        a.color = 'orange';
    }

    else if (type === 'air_forward') {
        a = Sprite.withSensor(
            player.x + (pdata.facingRight ? 100 : -100),
            player.y,
            120, // CONSTANT(s)
            40
        );
        a.life = 8;
        a.strength = 1;
        a.color = 'cyan';
    }

    else if (type === 'air_explosion') {
        a = Sprite.withSensor(player.x, player.y, 250); // CONSTANT(s)
        a.life = 25;
        a.strength = 3;
        a.color = 'red';
    }

    else if (type === 'molotov_throw' || type === 'beer_throw' || type === 'bullet') {
        a = createProjectile(player, type);
        pdata.activeAttacks.add(a);
        pdata.attackCooldown = a.life + 10;
        return;
    }

    a.img = '\u{1f98c}';

    pdata.activeAttacks.add(a);
    pdata.attackCooldown = a.life + 10;

    let bond = new GlueJoint(player, a);
    bond.length = 0;
    bond.visible = false;

    a.debug = true;
}

function handleHit(attack, ball) {
    // future: define direction
    if (attack.strength === 1) { // WEAK
        if (random() > 0.8) ball.delete();
        else { ball.vel.x = attack.x < ball.x ? 15 : -15; ball.vel.y = -5; }
    }
    else if (attack.strength === 2) { // MEDIUM
        if (random() > 0.4) ball.delete();
        else { ball.vel.x = attack.x < ball.x ? 20 : -20; ball.vel.y = -10; }
    }
    else if (attack.strength === 3) { // STRONG
        ball.delete();
    }
}
