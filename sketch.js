/*await Canvas();
world.gravity.y = 10;

let ball = new Sprite();
ball.diameter = 50;
ball.img = '🤪';

let groundA = new Sprite();
groundA.x = -120;
groundA.width = 220;
groundA.rotation = 30;
groundA.physics = STATIC;

let groundB = new Sprite();
groundB.x = 120;
groundB.width = 220;
groundB.rotation = -30;
groundB.physics = STATIC;

q5.update = function () {
	background('skyblue');
	text('click to jump!', 0, -50);

	if (mouse.presses()) ball.vel.y = -5;
};*/

/*
let player, ground;
let balls, activeAttacks;
let facingRight = true;

let attackCooldown = 0;
let startupTimer = 0;
let pendingAttack = null; // buffers attack id while in startup
let groundedTimer = 0;    // coyote time

function setup() {
  createCanvas(800, 600);
  world.gravity.y = 15;

  ground = new Sprite(400, 580, 800, 40, 'static');
  ground.color = '#388e3c';

  player = new Sprite(400, 300, 40, 40);
  player.text = '🦊';
  player.textSize = 45;
  player.color = '#00000000';
  player.rotationLock = true;
  player.friction = 0;

  balls = new Group();
  balls.diameter = 30;
  balls.color = '#e91e63';
  balls.bounciness = 0.9;

  for(let i = 0; i < 15; i++) {
    new balls.Sprite(random(100, 700), random(50, 400));
  }

  activeAttacks = new Group();
  activeAttacks.collider = 'none'; // prevents hitbox from existing physically

  player.overlaps(activeAttacks);
  activeAttacks.overlaps(balls, handleHit);
}

function draw() {
  background('#81d4fa');

  // if touching ground OR moving very slowly vertically, "grounded" (this is highly abusable; fix)
  if (player.colliding(ground) || Math.abs(player.vel.y) < 0.1) {
    groundedTimer = 6; // stay "grounded" for 6 frames after leaving a surface
  } else if (groundedTimer > 0) {
    groundedTimer--;
  }

  if (kb.pressing('left')) {
    player.vel.x = -6;
    facingRight = false;
  } else if (kb.pressing('right')) {
    player.vel.x = 6;
    facingRight = true;
  } else {
    player.vel.x = 0;
  }

  if (kb.presses('up') && groundedTimer > 0) {
    player.vel.y = -10;
    groundedTimer = 0; // reset timer so we can't double jump
  }

  if (attackCooldown > 0) attackCooldown--;

  if (kb.presses('space') && attackCooldown === 0 && startupTimer === 0) {
    let isGrounded = groundedTimer > 0;
    let holdingForward = (facingRight && kb.pressing('right')) || (!facingRight && kb.pressing('left'));

    if (isGrounded) {
      createAttack('ground_punch');
    } else if (holdingForward) {
      createAttack('air_forward');
    } else {
      // startup frames for heavy move
      startupTimer = 15; // 15 frames of wind-up
      pendingAttack = 'air_explosion';
      player.color = 'rgba(255, 0, 0, 0.3)'; // visual cue for startup
    }
  }

  // process Startup Timer
  if (startupTimer > 0) {
    startupTimer--;
    if (startupTimer === 0) {
      createAttack(pendingAttack);
      player.color = '#00000000'; // reset color
    }
  }

  // recenter explosion on player
  for (let a of activeAttacks) {
    if (a.type === 'explosion') {
      a.x = player.x;
      a.y = player.y;
    }
  }
}

function createAttack(type) {
  let a = new activeAttacks.Sprite();

  if (type === 'ground_punch') {
    a.width = 60; a.height = 30;
    a.x = facingRight ? player.x + 40 : player.x - 40;
    a.y = player.y;
    a.life = 15;
    a.strength = 2;
    a.color = 'orange';
  }
  else if (type === 'air_forward') {
    a.width = 100; a.height = 20;
    a.x = facingRight ? player.x + 60 : player.x - 60;
    a.y = player.y;
    a.life = 8;
    a.strength = 1;
    a.color = 'cyan';
  }
  else if (type === 'air_explosion') {
    a.diameter = 130;
    a.x = player.x;
    a.y = player.y;
    a.life = 25;
    a.strength = 3;
    a.type = 'explosion'; // to track movement in draw()
    a.color = 'red';
  }

  attackCooldown = a.life + 10;
}

function handleHit(attack, ball) {
  if (attack.strength === 1) { // WEAK
    if (random() > 0.8) ball.remove();
    else { ball.vel.x = attack.x < ball.x ? 15 : -15; ball.vel.y = -5; }
  }
  else if (attack.strength === 2) { // MEDIUM
    if (random() > 0.4) ball.remove();
    else { ball.vel.x = attack.x < ball.x ? 20 : -20; ball.vel.y = -10; }
  }
  else if (attack.strength === 3) { // STRONG
    ball.remove();
  }
}
*/
