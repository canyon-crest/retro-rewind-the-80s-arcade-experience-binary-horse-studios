export function createProjectile(sender, projectileType) {
    const dir = sender.facingRight ? 1 : -1;
    const startX = sender.x + dir * 30;
    const startY = sender.y - 8;

    const proj = Sprite.withSensor(startX, startY, 20, 20);
    proj.rotationLock = true;
    proj.friction = 0;
    proj.bounciness = 0;
    proj.gravity = true;
    proj.vel.x = dir * (projectileType === 'bullet' ? 24 : 14);
    proj.vel.y = projectileType === 'bullet' ? 0 : -3;
    proj.life = projectileType === 'bullet' ? 40 : 70;
    proj.type = projectileType;

    if (projectileType === 'molotov_throw') {
        proj.color = 'orange';
        proj.img = '🍾';
        proj.strength = 3;
    } else if (projectileType === 'beer_throw') {
        proj.color = 'gold';
        proj.img = '🍺';
        proj.strength = 1;
    } else if (projectileType === 'bullet') {
        proj.color = 'silver';
        proj.img = '•';
        proj.strength = 1;
    }

    proj.debug = false;
    return proj;
}
