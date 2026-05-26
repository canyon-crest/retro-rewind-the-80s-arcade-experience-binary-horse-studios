export function createProjectile(sender, projectileType) {
    const dir = sender.facingRight ? 1 : -1;
    const startX = sender.x + dir * 30;
    const startY = sender.y - 8;

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
        proj.vel.y = -2;

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
    const targetHasHP = target.hasOwnProperty("hp");

    if (proj.type === "molotov_explosion") {
        console.warn("well color me impressed");
        return;
    }

    if (proj.type === "molotov_throw") {
        proj.type = "molotov_explosion";
        proj.img = "💥";
        proj.diameter = 200;
        proj.life = 20;

        proj.vel.x = proj.vel.y = 0;
        const bond = new GlueJoint(proj, worldAnchor);
        bond.visible = false;

        proj.explosionID = `${frameCount} + ${Math.floor(Math.random() * 1000)}`; // future: better explosion ID system

        proj.everyFrame["overlaps"] = {duration: Infinity, f: function(explosion) {
            for (const h of hittables) { // future: probably irrelevant but could update to check for new hittables?
                if (explosion.overlaps(h) && !h.everyFrame["antigravity-" + proj.explosionID]) { // future: better "already-hit detection"
                    h.color = color([Math.random() * 0.5 + 0.5, Math.random() * 0.5 + 0.5, Math.random() * 0.5 + 0.5]);

                    h.everyFrame["antigravity-" + proj.explosionID] = {duration: Infinity, f: function(self) {
                        self.bearing = 90;
                        self.applyForceScaled(world.gravity.y * -2);
                    }};

                    if (h.hasOwnProperty("hp")) {
                        h.hp -= 42;

                        if (h.hp < 0) {
                            // future: death animation
                            h.delete();
                        }
                    }
                }
            }
        }};
        return;
    }

    if (!targetIsHittable) {
        if (proj.type !== "molotov_explosion" && proj.type !== "molotov_throw") {
            proj.delete();
        }
    }
    else {
        if (proj.type === "beer_throw") {
            target.vel.x = proj.vel.x; target.vel.y = -20;
            if (targetHasHP) target.hp -= 15;
            proj.delete();
        }
        else if (proj.type === "bullet") {
            if (targetHasHP) target.hp -= 25;
            if (terrain.includes(target)/* && !(targetHasHP && target.hp < 0)*/) {
                proj.delete();
            }
        }
    }
}