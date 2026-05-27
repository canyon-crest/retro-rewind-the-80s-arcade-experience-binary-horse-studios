# Animation Sequence System Documentation

## Overview

The animation system allows you to define sequences of sprite frames from spritesheets. Each animation is a sequence of **blocks**, where each block displays a specific frame from a spritesheet for a configurable duration.

**Key Features:**
- Frame-by-frame animation with per-frame duration
- Support for looping and non-looping sequences
- Integration with attack system (attacks now trigger animations)
- Grid-based or pixel coordinate frame positioning
- Extensible to all game sprites (currently focused on player)

---

## Architecture

### Animation Sequence Structure

```javascript
animationSequences = {
    "animation.name": {
        blocks: [
            { sheet: "spritesheet_key", framePos: { x: 0, y: 0 }, duration: 10 },
            { sheet: "spritesheet_key", framePos: { x: 1, y: 0 }, duration: 8 },
            // ... more blocks
        ],
        loop: true,  // Whether sequence repeats after finishing
        onComplete: "optional_callback_name"  // For internal event handling
    }
}
```

### Block Properties

| Property | Type | Description |
|----------|------|-------------|
| `sheet` | string | Key in `spritesheets` registry (e.g., `"player"`) |
| `framePos` | object | `{x, y}` frame position (interpreted as grid indices if < 20, otherwise pixel coords) |
| `duration` | number | Frames to display this block |

### Spritesheet Registry

```javascript
spritesheets = {
    player: {
        image: null,           // Loaded image (PNG/etc)
        frameWidth: 64,        // Width of single frame in pixels
        frameHeight: 64,       // Height of single frame in pixels
    },
    // Add more spritesheets as needed
}
```

---

## Current Animation Definitions

### Player Animations

```
player.idle
├─ Block 0: frame (0, 0), duration 10 frames, loops

player.ground_punch.startup
├─ Block 0: frame (1, 0), duration 5 frames
└─ [Attack spawns when animation completes]

player.air_forward.startup
├─ Block 0: frame (2, 0), duration 5 frames
└─ [Attack spawns when animation completes]

player.air_explosion.startup
├─ Block 0: frame (3, 0), duration 8 frames
├─ Block 1: frame (4, 0), duration 7 frames (15 total)
└─ [Attack spawns when animation completes]

player.molotov_throw.startup
├─ Block 0: frame (5, 0), duration 5 frames
└─ [Projectile created when animation completes]

player.beer_throw.startup
├─ Block 0: frame (6, 0), duration 5 frames
└─ [Projectile created when animation completes]

player.bullet.startup
├─ Block 0: frame (7, 0), duration 5 frames
└─ [Projectile created when animation completes]
```

---

## How to Use

### 1. Loading Spritesheets

Add spritesheet images at the top of `sketch.js` after the `corridorBG` load:

```javascript
// Load spritesheet images
const playerSpritesheet = await loadImage("path/to/player_spritesheet.png");
spritesheets.player.image = playerSpritesheet;
```

### 2. Defining New Animations

Add sequences to `animationSequences`:

```javascript
"player.jump": {
    blocks: [
        { sheet: "player", framePos: { x: 0, y: 1 }, duration: 4 },
        { sheet: "player", framePos: { x: 1, y: 1 }, duration: 4 },
        { sheet: "player", framePos: { x: 2, y: 1 }, duration: 6 }
    ],
    loop: false  // Don't repeat jump animation
}
```

### 3. Triggering Animations Manually

```javascript
// Start a looping animation
startAnimation("player.idle", true);

// Start a non-looping animation
startAnimation("player.jump", false);
```

### 4. Detecting Animation Completion

When a non-looping animation finishes:
- `pdata.activeAnimation` becomes `null`
- `pdata.animationFrame` resets to `0`

Example: Trigger a follow-up action after animation ends

```javascript
if (pdata.hadJumpAnimation && !pdata.activeAnimation) {
    // Jump animation just completed
    pdata.hadJumpAnimation = false;
    // Do something...
}
```

---

## Animation State in pdata

The player state object tracks animation playback:

```javascript
pdata = {
    activeAnimation: null,      // Current animation name or null
    animationFrame: 0,          // Current block index (0-based)
    animationTimer: 0,          // Countdown frames until next block
    animationLooping: false,    // Whether animation loops
    
    // ... other properties (attackCooldown, etc.)
}
```

---

## Core Functions

### `startAnimation(name, loop = true)`

Begins playing an animation sequence.

```javascript
startAnimation("player.ground_punch.startup", false);
```

- Sets `pdata.activeAnimation` to the sequence name
- Resets frame to 0 and timer to first block's duration
- If animation doesn't exist, logs warning and returns

### `updateAnimation()`

Called every frame in `q5.update()`. Decrements timer, advances blocks, handles looping.

- Called automatically in main loop
- No parameters needed
- Handles animation completion

### `renderCurrentFrame()`

Renders the current animation block to `player.img`.

- Called automatically in main loop
- Extracts frame from spritesheet
- Falls back to emoji if spritesheet not loaded

---

## Integration with Attack System

The attack system has been refactored to use animations:

**Before:** Direct emoji swap on attack start  
**Now:** Animation sequence plays, then attack sprite is created when animation ends

### Attack Flow

1. Player presses attack button
2. `computeStateTransitions()` calls `startAnimation("player.{attack_type}.startup", false)`
3. Animation plays for configured duration
4. When animation finishes (`pdata.activeAnimation` becomes null)
5. `computeStateTransitions()` detects this and calls `createAttack(type)`
6. Attack sprite appears and acts

### Advantages

- Visual feedback for attacks with startup frames
- Configurable timing per animation frame
- Can layer multiple animations (startup → active → recovery)

---

## Next Steps

### Phase 4: Movement Integration (Not Yet Implemented)

Define animations for:
- Player idle (in progress)
- Player walking/running
- Player jumping
- Player falling

Tie to player movement input in `computePlayerActions()`.

### Phase 5: Frame Cropping Implementation

Current implementation displays full spritesheet. To show individual frames:

**Option A: Canvas Cropping (Recommended)**
```javascript
// Extract frame region to canvas, convert to data URI
function extractFrameAsDataURI(sheet, framePos, width, height) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sheet.image, srcX, srcY, width, height, 0, 0, width, height);
    return canvas.toDataURL();
}
```

**Option B: Pre-extracted Frames**
- Export individual frames from spritesheet
- Store as separate images
- Reference directly in animation blocks

**Option C: Image Cropping Library**
- Use existing image library or create custom cropping function

---

## File Reference

- **Main animations**: [sketch.js](sketch.js) - `animationSequences` object, `startAnimation()`, `updateAnimation()`, `renderCurrentFrame()`
- **Spritesheet registry**: [sketch.js](sketch.js) - `spritesheets` object
- **Attack integration**: [sketch.js](sketch.js) - `computeStateTransitions()` function
- **State tracking**: [sketch.js](sketch.js) - `pdata` object properties

---

## Examples

### Example 1: Simple Looping Idle Animation

```javascript
"player.idle": {
    blocks: [
        { sheet: "player", framePos: { col: 0, row: 0 }, duration: 10 },
        { sheet: "player", framePos: { col: 1, row: 0 }, duration: 10 },
        { sheet: "player", framePos: { col: 2, row: 0 }, duration: 10 }
    ],
    loop: true
}
```

### Example 2: Multi-Frame Attack Startup

```javascript
"player.special_attack.startup": {
    blocks: [
        { sheet: "player", framePos: { col: 3, row: 1 }, duration: 6 },
        { sheet: "player", framePos: { col: 4, row: 1 }, duration: 6 },
        { sheet: "player", framePos: { col: 5, row: 1 }, duration: 6 },
        { sheet: "player", framePos: { col: 6, row: 1 }, duration: 6 }
    ],
    loop: false,
    onComplete: "spawn_special_attack"
}
```

### Example 3: Projectile Throw

```javascript
"player.grenade_throw.startup": {
    blocks: [
        { sheet: "player", framePos: { x: 200, y: 100 }, duration: 3 },
        { sheet: "player", framePos: { x: 264, y: 100 }, duration: 3 },
        { sheet: "player", framePos: { x: 328, y: 100 }, duration: 2 }
    ],
    loop: false,
    onComplete: "spawn_grenade_throw"
}
```

---

## Troubleshooting

### Animation Not Showing
- Check spritesheet is loaded: `console.log(spritesheets.player.image)`
- Verify animation name exists: `console.log(animationSequences["player.idle"])`
- Check `renderCurrentFrame()` is being called (should be in `q5.update()`)

### Animation Plays Too Fast/Slow
- Adjust `duration` values in blocks (measured in frames, 60 fps assumed)
- Increase duration = slower animation
- Decrease duration = faster animation

### Attack Not Spawning
- Ensure `pdata.pendingAttack` is set before animation starts
- Check animation is non-looping (`.loop = false`)
- Verify `createAttack()` is called from transition result

### Spritesheet Alignment
- Frame coordinates should match actual frame positions in spritesheet
- If using grid indices, ensure `frameWidth` and `frameHeight` match actual frame dimensions
- Use pixel coordinates for precise positioning

---

## Summary

The animation system provides a flexible, frame-based approach to sprite animation with tight integration to the attack system. Start by loading spritesheets, defining animation sequences, and using the provided functions to control playback.

For questions or issues, check the troubleshooting section or add console logging to `updateAnimation()` and `renderCurrentFrame()`.
