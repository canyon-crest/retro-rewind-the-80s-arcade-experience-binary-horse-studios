window.exe = _ => eval(_);

let player, ground;
let balls, activeAttacks;
let facingRight = true;

let attackCooldown = 0;
let startupTimer = 0;
let pendingAttack = null;
let groundedTimer = 0; // coyote time

await Canvas();
noSmooth();
camera.zoom = 1;
camera.x = 400;
camera.y = 300;
world.gravity.y = 15;

const corridorBG = await loadImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAAAoCAYAAADAOHfQAAAFCklEQVR4AexdPY4UPRD116Rf9mX7BdyAcCRyUqQl4hpcg7sQzAEgQwR7CoTQRpAiNmHxW7ZaNaZcbve6Sz3wpH7rnyq/Z5dd3b07I5gOh8MtwRjwDJzXGUgp3QLT1dVVKnFxcZGAsn9tG1yANR79gGVb0wcuoDYWNqBm7+0HF2CNQz9g2db0gQuojYUNqNl7+8EFWOPQD1i2NX3gAmpjYQNq9t5+cAHWOPQDlm1NH7iANWMxJifq3YU6gEa+4aJI091P/mAEGIHdRqBMWt02E/h4PA5djMfn2dZMosXXsvdqenyerVcH/i2+lh0cPfD4PFuPhvi2+Fp24VlaenyebSm/9hvBp5MW3NI2ExgOfwG4REbgrCIgSasnbSbw5eWl9nlw3ePzbGuEW3wte6+mx+fZenXg3+Jr2cHRA4/Ps/VoiG+Lr2UXnqWlx+fZlvJrv9F8mttMYO3AOiPACOw3AmYCP+id/dGrlDJub26SwOPzbM2wZZ0eLfBF6kVqcW2IQAWd5yR63yqzrnbLX6DhYCYwDDPuF49EWYQ88Pbb6/xzxRWphelF6kVqtdd2d5M92c88hvuWg1Be0ftW6httfCQlSWwm8PzOjslnAmxsD/KQk2vmO+n91ZhtAVpQjNSL1OLaXifvjCI+GvPe6M77+mwLOpP3sqsKM4E1E4Ki21vWI7Wwjki9SC2uDREYg+h9WzprPIXhayaw/A5w+fxjevHy5YMBoRoitTCHSL1ILa6t75wiXjVE71ttHq1+JLGZwDIQCxkF4ayVo3TAU9PQ/fAbBc1r1UfpgMfiL/vgNwold9kepQOekttqw++BSDLe4td94jei1Lwj62YCz78DDFLy+DzbGvkWX8veq+nxebZeHfi3+Fp2cPTA4/NsPRri2+Jr2YVnaenxebal/NpvNJ/mNhNYO7DOCDAC+42AmcB4ZRg5ZY/Ps62ZQ4uvZe/V9Pg8W68O/Ft8LTs4euDxebYeDfFt8bXswrO09Pg821J+7TeaT3ObCawduuv403uGfIkDZTfH0gFZB59lQkOwdOgqv0i9SC0EI1IvUusPX5uZwCfv7PfBRqKkR7++ZeXWc8DKP72f8GW7vk5sG2tBN1IvUotrc85mDs6ez2Se3urLTOCZDQmVG1h8D/KQ/itSC7OL1IvU4trML3QgLN2I3reOCV5fXyfATGD9zo7E7eA1XTVf6aBtW2tBO1IvUotrQwSWQ+9NOUrbIs5kqb+0Xf0cWF79Rn2RQ/isiYktQgv6kXqRWlxb3xc5ZG8QtxJiizqTpf6SNpIXftUnMO5CowHBEqM1hK/UkbbY+8vj/AWA4/H4W134dXk0/Eb0aQ1dH8FtcWgNqVt+I/qEvyxHcFscpQ7alt+IPnCPhpnAo0XIxwgwAttEgAm8TVzJygiERIAJHBJmijAC20SACbxNXP8wVi5nTxHAx0cyHyawRIIlI7DzCMi/woF/nVKSmAm8803j9BgBREAnL9oC/N9ICUbiwDgcGIO95gESFk9elADqeApPb66+J4Ix4BmonYH99H9KT5IG9mx6+v/XRDAGPAPneQb4OzDeRwhG4EwjMH3+8jgRjAHPwHmegendv+/TPzcfEkvGgefg/PJgevZ1Sm//+5E2KcnLuPJ8bZpfE5OXNy/evM/3IcYnMJ8Qmz4heHPY9ubAJzBf8/maf8Y3cT6Bt9o88vLJHvBw4BM4IMh8jdz2NfJvju9PAAAA//+D7uq9AAAABklEQVQDABKMPA4wFkJmAAAAAElFTkSuQmCC");

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
  background(corridorBG);

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
    a = Sprite.withSensor(
      facingRight ? player.x + 40 : player.x - 40,
      player.y,
      60,
      30
    );
    a.life = 15;
    a.strength = 2;
    a.color = 'orange';
  }

  else if (type === 'air_forward') {
    a = Sprite.withSensor(
      facingRight ? player.x + 60 : player.x - 60,
      player.y,
      100,
      20
    );
    a.life = 8;
    a.strength = 1;
    a.color = 'cyan';
  }

  else if (type === 'air_explosion') {
    a = Sprite.withSensor(player.x, player.y, 120);
    a.life = 25;
    a.strength = 3;
    a.color = 'red';
  }

  a.img = '🖼️';

  activeAttacks.add(a);
  attackCooldown = a.life + 10;

  let bond = new GlueJoint(player, a);
  bond.length = 0;
  bond.visible = false;

  a.debug = false;
}

function handleHit(attack, ball) {
  console.log(attack);
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