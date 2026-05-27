export function createProjectile(sender, projectileType) {
    const dir = sender.facingRight ? 1 : -1;
    const startX = sender.x + dir * 30;
    const startY = sender.y - 48; // CONSTANT

    const proj = Sprite.withSensor(startX, startY, 50);
    proj.facingRight = dir > 0;
    proj.rotationLock = true;
    proj.friction = 0;
    proj.bounciness = 0;
    proj.gravity = true;
    proj.life = 200; // effectively just a despawn threshold
    proj.type = projectileType;

    proj.vel.x = sender.vel.x;
    proj.vel.y = sender.vel.y * 0.4;

    if (projectileType === 'molotov_throw') {
        proj.img = '🍾';
        proj.vel.x += dir * 20 + Math.random() * 4;
        proj.vel.y += -5 - Math.random();
    } else if (projectileType === 'beer_throw') {
        proj.img = '🍺';
        proj.vel.x += dir * 20 + Math.random() * 4;
        proj.vel.y += -5 - Math.random();
    } else if (projectileType === 'bullet') {
        proj.diameter = 20;
        proj.img = '\u25aa\ufe0f';
        proj.vel.x = dir * 50;
        proj.vel.y = -1;

        proj.everyFrame[Math.max(-1, ...Object.keys(proj.everyFrame)) + 1] = {duration: Infinity, f: function(self) {
            self.bearing = 90;
            self.applyForceScaled(world.gravity.y * -0.6);
        }};
    }

    proj.debug = true;
    return proj;
}

export function handleProjectileHit(proj, target, hittables) {
    const targetIsHittable = hittables.includes(target);

    // The blast does its own per-target damage via its everyFrame callback;
    // ignore plain overlaps for an already-detonated molotov.
    if (proj.type === "molotov_explosion") return;

    if (proj.type === "molotov_throw") {
        proj.type = "molotov_explosion";
        proj.img = "💥";
        proj.diameter = 200;
        proj.life = 20;

        proj.vel.x = proj.vel.y = 0;
        const bond = new GlueJoint(proj, worldAnchor);
        bond.visible = false;

        proj.explosionID = `${frameCount}+${Math.floor(Math.random() * 1000)}`;

        // Damage each destructible in range exactly once (the flag guards
        // against the AoE re-hitting the same target every frame).
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
        return;
    }

    // Bottles and bullets: shatter on contact. Damage is centralized in
    // window.applyAttackDamage so weapon lethality stays consistent. Guard
    // against landing twice in the frames before the sprite is removed.
    if (proj.spent) return;
    proj.spent = true;
    if (targetIsHittable) {
        window.applyAttackDamage(proj.type, target);
    }
    proj.delete();
}