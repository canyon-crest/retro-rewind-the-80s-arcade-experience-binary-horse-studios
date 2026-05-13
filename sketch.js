let player;
let bullets = [];
let enemyBullets = [];
let enemies = [];
let score = 0;
let groundLevel = 350; 

function setup() {
  createCanvas(800, 400);
  player = new Player();
}

function draw() {
  background(135, 206, 235); 
  fill(100, 70, 50);
  rect(0, groundLevel, width, height - groundLevel);

  player.update();
  player.show();

  handleBullets(bullets, enemies, true);
  handleEnemyBullets();

  // Spawn enemies
  if (frameCount % 120 === 0) {
    enemies.push(new Enemy());
  }

  // Update enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update();
    enemies[i].show();
    enemies[i].shoot();

    if (enemies[i].x < -50) enemies.splice(i, 1);
  }

  // Display score
  fill(0);
  textSize(24);
  textAlign(LEFT, TOP);
  text("Score: " + score, 10, 10);
}

function keyPressed() {
  if (key === ' ' || keyCode === UP_ARROW) {
    player.jump();
  }
  if (key === 'f' || key === 'F') { 
    bullets.push(new Projectile(player.x + 20, player.y + 15, 10, color(255, 255, 0)));
  }
}

class Player {
  constructor() {
    this.x = 100;
    this.y = groundLevel - 40;
    this.w = 30;
    this.h = 40;
    this.velocityY = 0;
    this.gravity = 0.8;
    this.speed = 5;
    this.isJumping = false;
  }

  show() {
    fill(50, 100, 255);
    rect(this.x, this.y, this.w, this.h); 
  }

  update() {
    if (keyIsDown(LEFT_ARROW)) this.x -= this.speed;
    if (keyIsDown(RIGHT_ARROW)) this.x += this.speed;

    this.y += this.velocityY;
    if (this.y < groundLevel - this.h) {
      this.velocityY += this.gravity;
    } else {
      this.y = groundLevel - this.h;
      this.velocityY = 0;
      this.isJumping = false;
    }
    this.x = constrain(this.x, 0, width - this.w);
  }

  jump() {
    if (!this.isJumping) {
      this.velocityY = -15;
      this.isJumping = true;
    }
  }
}

class Projectile {
  constructor(x, y, speed, col) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.col = col;
    this.r = 5;
  }

  update() { this.x += this.speed; }

  show() {
    fill(this.col);
    ellipse(this.x, this.y, this.r * 2);
  }
}

class Enemy {
  constructor() {
    this.x = width;
    this.y = groundLevel - 40;
    this.w = 30;
    this.h = 40;
    this.speed = 2;

    // Each enemy has its own shooting cooldown
    this.shootCooldown = int(random(60, 150)); // frames between shots
    this.lastShot = 0;
  }

  update() { this.x -= this.speed; }

  show() {
    fill(255, 50, 50); 
    rect(this.x, this.y, this.w, this.h);
  }

  shoot() {
    if (frameCount - this.lastShot > this.shootCooldown) {
      enemyBullets.push(new Projectile(this.x, this.y + 15, -7, color(255, 0, 0)));
      this.lastShot = frameCount;
    }
  }
}

function handleBullets(bArray, targetArray, isPlayer) {
  for (let i = bArray.length - 1; i >= 0; i--) {
    bArray[i].update();
    bArray[i].show();
    
    for (let j = targetArray.length - 1; j >= 0; j--) {
      if (collideRectCircle(targetArray[j].x, targetArray[j].y, targetArray[j].w, targetArray[j].h, bArray[i].x, bArray[i].y, bArray[i].r)) {
        targetArray.splice(j, 1);
        bArray.splice(i, 1);
        score += 10;
        break;
      }
    }
    if (bArray[i] && (bArray[i].x > width || bArray[i].x < 0)) bArray.splice(i, 1);
  }
}

function handleEnemyBullets() {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    enemyBullets[i].update();
    enemyBullets[i].show();

    if (collideRectCircle(player.x, player.y, player.w, player.h, enemyBullets[i].x, enemyBullets[i].y, enemyBullets[i].r)) {
      enemyBullets.splice(i, 1);
      score -= 5;
    }
  }
}

function collideRectCircle(rx, ry, rw, rh, cx, cy, cr) {
  let testX = cx;
  let testY = cy;
  if (cx < rx) testX = rx; else if (cx > rx + rw) testX = rx + rw;
  if (cy < ry) testY = ry; else if (cy > ry + rh) testY = ry + rh;
  let d = dist(cx, cy, testX, testY);
  return d <= cr;
}