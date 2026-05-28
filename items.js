export function createProjectile(sender, projectileType, charge = 1.0) {
    const dir = sender.facingRight ? 1 : -1;
    const startX = sender.x + dir * 30;
    const startY = sender.y - 48; // CONSTANT

    const proj = Sprite.withSensor(startX, startY, 50);
    proj.facingRight = dir > 0;
    // Bottles tumble end-over-end in flight (cartoon throw). The bullet
    // overrides this below — bullets shouldn't spin.
    proj.rotationLock = (projectileType === "bullet");
    proj.friction = 0;
    proj.bounciness = 0;
    proj.gravity = true;
    proj.life = 200; // effectively just a despawn threshold
    proj.type = projectileType;

    proj.vel.x = sender.vel.x;
    proj.vel.y = sender.vel.y * 0.4;

    // Charge-scaled bottle throw: tap = short toss (charge ~0), hold = far
    // throw (charge ~1). Both bottles share the same arc curve.
    if (projectileType === 'molotov_throw' || projectileType === 'beer_throw') {
        const t = Math.max(0, Math.min(1, charge));
        const vxBase = 8 + t * 24;          // 0 charge ≈ 8 px/f, full ≈ 32 px/f
        const vyBase = -5 - t * 9;          // 0 charge ≈ -5 px/f, full ≈ -14 px/f
        proj.img = (projectileType === 'molotov_throw') ? window.molotovImg : window.beerBottleImg;
        proj.vel.x += dir * vxBase + Math.random() * 3;
        proj.vel.y += vyBase - Math.random();
        proj.rotationSpeed = dir * 22;
    } else if (projectileType === 'bullet') {
        proj.diameter = 20;
        proj.img = window.rifleBulletImg;    // brass + lead rifle round
        proj.scale.x = dir;                  // tip leads the way it travels
        proj.vel.x = dir * 50;
        proj.vel.y = -1;

        proj.everyFrame[Math.max(-1, ...Object.keys(proj.everyFrame)) + 1] = {duration: Infinity, f: function(self) {
            self.bearing = 90;
            self.applyForceScaled(world.gravity.y * -0.6);
        }};
    }

    // NOTE: don't set proj.debug — q5play 4.x's debug draw calls a removed
    // `_doFill` and throws every frame, crashing gameplay.
    return proj;
}

export function handleProjectileHit(proj, target, hittables) {
    const targetIsHittable = hittables.includes(target);

    // The blast does its own per-target damage via its everyFrame callback;
    // ignore plain overlaps for an already-detonated molotov.
    if (proj.type === "molotov_explosion") return;

    if (proj.type === "molotov_throw") {
        proj.type = "molotov_explosion";
        proj.img = window.molotovBlastImg;   // visible radial flame burst
        proj.diameter = 320;                 // bigger AoE — proper molotov radius
        proj.life = 28;                      // brief central FWOOMP
        proj.rotationLock = true;
        proj.rotationSpeed = 0;
        proj.rotation = 0;

        proj.vel.x = proj.vel.y = 0;
        const bond = new GlueJoint(proj, worldAnchor);
        bond.visible = false;

        proj.explosionID = `${frameCount}+${Math.floor(Math.random() * 1000)}`;

        // Initial radial-blast damage: every destructible in the central
        // flash takes a hit (the flag stops the AoE re-hitting per-frame).
        proj.everyFrame["overlaps"] = {duration: Infinity, f: function(explosion) {
            for (const h of hittables) {
                if (h.kind === "dead") continue;
                const flag = "_hitByExp_" + proj.explosionID;
                if (explosion.overlaps(h) && !h[flag]) {
                    h[flag] = true;
                    window.applyAttackDamage("molotov_explosion", h);
                }
            }
        }};

        // Now lay a strip of GROUND FIRE across the impact area — flames stay
        // on the floor and keep burning anything that walks through them for
        // ~1.5 s. This is the part that reads as "molotov on the ground".
        spawnGroundFire(proj.x, hittables);
        return;
    }

    // Bullets shatter on contact — straight pass-through damage to the target
    // they hit, no splash.
    if (proj.type === "bullet") {
        if (proj.spent) return;
        proj.spent = true;
        if (targetIsHittable) window.applyAttackDamage("bullet", target);
        proj.delete();
        return;
    }

    // BEER bottle: shatters wherever it lands (ground, wall, crate, turret)
    // and sprays glass across a small radius — anything inside takes a hit.
    if (proj.type === "beer_throw") {
        if (proj.spent) return;
        proj.spent = true;
        const lx = proj.x, ly = proj.y;
        for (const h of hittables) {
            if (!h || h.kind === "dead") continue;
            const dx = h.x - lx, dy = h.y - ly;
            if (Math.abs(dx) < 110 && Math.abs(dy) < 110) {
                window.applyAttackDamage("beer_throw", h);
            }
        }
        // small visible flash where the bottle broke
        if (window.spawnDebrisGlobal) window.spawnDebrisGlobal(lx, ly, 6);
        proj.delete();
        return;
    }

    // Fallback (e.g. unknown projectile type) — preserve old behaviour.
    if (proj.spent) return;
    proj.spent = true;
    if (targetIsHittable) window.applyAttackDamage(proj.type, target);
    proj.delete();
}

// Spread a strip of flickering ground-fire patches across the molotov's impact
// area. Each patch sits on the floor, flickers, and burns anything inside it
// (every hittable damaged exactly once per fire patch via a per-patch flag).
export function spawnGroundFire(impactX, hittables) {
    const groundY = (window.surfaceY ?? 522) - 50;  // flames sit ON the floor
    const patchCount = 6;
    const patchSpacing = 60;
    const burnLife = 90;                  // ~1.5 s of fire
    for (let i = 0; i < patchCount; i++) {
        const px = impactX + (i - (patchCount - 1) / 2) * patchSpacing;
        const fire = Sprite.withSensor(px, groundY, 90, 110);
        fire.everyFrame = {};
        fire.img = window.fireSpriteImg;
        fire.kind = "fire";
        fire.gravity = false;
        fire.rotationLock = true;
        fire.flickT = i * 7;
        const fireID = "_burned_" + frameCount + "_" + Math.floor(Math.random() * 1e6);
        // flame flicker
        fire.everyFrame.flick = { duration: Infinity, f: (s) => {
            s.flickT++;
            s.scale.y = 1 + Math.sin(s.flickT * 0.35) * 0.18;
            s.scale.x = 1 + Math.cos(s.flickT * 0.27) * 0.08;
            s.vel.x = 0; s.vel.y = 0;
        }};
        // damage anything standing in the fire (each target burned once per patch)
        fire.everyFrame.burn = { duration: Infinity, f: (s) => {
            for (const h of hittables) {
                if (!h || h.kind === "dead") continue;
                if (h[fireID]) continue;
                if (s.overlaps(h)) {
                    h[fireID] = true;
                    window.applyAttackDamage("molotov_explosion", h);
                }
            }
        }};
        // self-clean after burnLife frames
        let f = 0;
        fire.everyFrame.life = { duration: burnLife + 1, f: (s) => {
            f++;
            if (f > burnLife - 12) s.scale.y *= 0.92;  // shrink at end
            if (f >= burnLife) s.delete();
        }};
    }
}