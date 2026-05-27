# Animation System Quick Reference

## Define an Animation

```javascript
"player.my_animation": {
    blocks: [
        { sheet: "player", framePos: { x: 0, y: 0 }, duration: 10 },
        { sheet: "player", framePos: { x: 1, y: 0 }, duration: 8 }
    ],
    loop: true,  // or false for one-shot
    onComplete: "optional_action"
}
```

## Start Animation

```javascript
startAnimation("player.my_animation");        // Looping
startAnimation("player.my_animation", false); // One-shot
```

## Check if Animation is Playing

```javascript
if (pdata.activeAnimation === "player.my_animation") {
    // Animation is currently active
}

if (!pdata.activeAnimation) {
    // No animation is playing
}
```

## Animation Timeline

| Frame | Duration | Event |
|-------|----------|-------|
| 0 | 10 | Block 0 displays |
| 10 | 8 | Block 1 displays |
| 18 | (ends) | Animation complete (if loop=false) |

## Load Spritesheet

```javascript
spritesheets.player.image = await loadImage("path/to/spritesheet.png");
spritesheets.player.frameWidth = 64;   // Width of each frame
spritesheets.player.frameHeight = 64;  // Height of each frame
```

## Frame Position Options

### Grid-based (recommended for organized spritesheets)
```javascript
framePos: { x: 0, y: 0 }  // col 0, row 0
framePos: { x: 3, y: 1 }  // col 3, row 1
```
Auto-converts to pixels: `x * frameWidth, y * frameHeight`

### Pixel-based (for precise positioning)
```javascript
framePos: { x: 200, y: 150 }  // 200 pixels from left, 150 from top
```

## Frame Calculation

If values are < 20, treated as grid indices:
- `framePos: { x: 0, y: 0 }` → pixel `(0, 0)`
- `framePos: { x: 2, y: 1 }` → pixel `(2*64, 1*64)` = `(128, 64)`

If values are ≥ 20, treated as pixels:
- `framePos: { x: 100, y: 50 }` → pixel `(100, 50)`

## Attack Animation Flow

```
Player Input
    ↓
startAnimation("player.{attack}.startup")
    ↓
Animation plays (N frames)
    ↓
pdata.activeAnimation becomes null
    ↓
createAttack() spawns attack sprite
    ↓
Attack active (life, collision checks, etc)
```

## Current Attack Animations

| Input | Animation | Frames | Startup | Duration |
|-------|-----------|--------|---------|----------|
| Space (ground) | `player.ground_punch.startup` | 1 | 5 frames | ~5 frames |
| Space + Forward (air) | `player.air_forward.startup` | 1 | 5 frames | ~5 frames |
| Space (mid-air no input) | `player.air_explosion.startup` | 2 | 15 frames | 8+7 frames |
| Z | `player.molotov_throw.startup` | 1 | 5 frames | ~5 frames |
| X | `player.beer_throw.startup` | 1 | 5 frames | ~5 frames |
| C | `player.bullet.startup` | 1 | 5 frames | ~5 frames |

## State Properties

```javascript
pdata.activeAnimation    // "player.idle" or null
pdata.animationFrame     // 0-based index into blocks array
pdata.animationTimer     // Frames remaining in current block
pdata.animationLooping   // true if animation repeats
```

## Debugging

```javascript
// Check animation setup
console.log(animationSequences["player.idle"]);

// Check spritesheet loaded
console.log(spritesheets.player.image);

// Check current animation state
console.log({
    active: pdata.activeAnimation,
    frame: pdata.animationFrame,
    timer: pdata.animationTimer,
    looping: pdata.animationLooping
});

// Manually trigger animation (in console)
startAnimation("player.idle", true);
```

## Common Patterns

### Looping animation (idle, walk)
```javascript
loop: true
```

### One-shot attack
```javascript
loop: false,
onComplete: "spawn_attack"
```

### Multi-frame charge-up
```javascript
blocks: [
    { sheet: "player", framePos: { x: 0, y: 0 }, duration: 5 },
    { sheet: "player", framePos: { x: 1, y: 0 }, duration: 5 },
    { sheet: "player", framePos: { x: 2, y: 0 }, duration: 5 }
],
loop: false
```

### Quick jab (1 frame, fast)
```javascript
blocks: [
    { sheet: "player", framePos: { x: 5, y: 0 }, duration: 3 }
],
loop: false
```
