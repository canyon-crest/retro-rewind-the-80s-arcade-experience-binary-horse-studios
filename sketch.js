window.exe = _ => eval(_);

let player, ground;
let balls, activeAttacks;
let facingRight = true;

let attackCooldown = 0;
let startupTimer = 0;
let pendingAttack = null;
let groundedTimer = 0; // coyote time

await Canvas(800, 600);
camera.zoom = 0.5;
world.gravity.y = 15;

ground = new Sprite(400, 580, 800, 40);
ground.physics = "static";
ground.color = '#388e3c';
ground.bounciness = 0;

player = new Sprite(400, 300, 40, 40);
player.img = '\u{1f98a}';
player.color = '#00000000';
player.rotationLock = true;
player.friction = 0;
player.bounciness = 0;

balls = new Group();
balls.diameter = 30;
balls.color = '#e91e63';
balls.bounciness = 0.9;

for(let i = 0; i < 15; i++) {
  new balls.Sprite(random(100, 700), random(50, 400));
}

activeAttacks = new Group();

activeAttacks.overlaps(balls, handleHit);
player.passes(activeAttacks);

q5.update = function() {
  background('#81d4fa');

  if (player.colliding(ground)) {
    groundedTimer = 4; // stay "grounded" for 4 frames after leaving a surface
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
    groundedTimer = 0;
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
      // explosive aerial; begin startup frames 
      startupTimer = 15; // CONSTANT
      pendingAttack = 'air_explosion';
      player.color = 'pink';
    }
  }

  // process startup frames
  if (startupTimer > 0) {
    startupTimer--;
    if (startupTimer === 0) {
      createAttack(pendingAttack);
      player.color = 'white';
    }
  }
}

function createAttack(type) {
  let a;

  if (type === 'ground_punch') {
    a = new Sprite(
      facingRight ? player.x + 40 : player.x - 40,
      player.y,
      60,
      30
    );
    a.collider = 'rectangle';
    a.life = 15;
    a.strength = 2;
    a.color = 'orange';
  }

  else if (type === 'air_forward') {
    a = new Sprite(
      facingRight ? player.x + 60 : player.x - 60,
      player.y,
      100,
      20
    );
    a.collider = 'rectangle';
    a.life = 8;
    a.strength = 1;
    a.color = 'cyan';
  }

  else if (type === 'air_explosion') {
    a = new Sprite(player.x, player.y, 120);
    a.collider = 'circle';
    a.life = 25;
    a.strength = 3;
    a.color = 'red';
  }

  a.physics = "kinematic";

  activeAttacks.add(a);
  attackCooldown = a.life + 10;
}

function handleHit(attack, ball) {
  console.log("HIT ATTACK OF TYPE", attack.strength)
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