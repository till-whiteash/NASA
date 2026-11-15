// Game traversal limits, not a specification for NASA's real rover.
export const ROVER_MOTION = { max: 16, reverse: 5, accel: 9, brake: 14 };   // max was 18 m/s: a little slower, easier over rock fields
const maxGrade = Math.tan(55 * Math.PI / 180);
const contacts = [-2.2, 0, 2.2].flatMap(f => [-1.6, 0, 1.6].map(r => [f, r]));

// Short swept steps stop fast vehicles tunnelling through a rock face. Compare
// the actual support at each tyre and under the belly, rather than rock radius.
export function moveOverSurface(pos, dx, dz, yaw, sample) {
  const distance = Math.hypot(dx, dz);
  if (!distance) return 1;
  const count = Math.ceil(distance / .2), sx = dx / count, sz = dz / count;
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  const probe = .4, ux = dx / distance, uz = dz / distance;
  for (let i = 0; i < count; i++) {
    for (const [f, r] of contacts) {
      const x = pos.x + sin * f + cos * r, z = pos.z + cos * f - sin * r;
      const before = sample(x, z), after = sample(x + sx, z + sz);
      const rise = after.height - before.height;
      // Tyres can step over a small lip; a tall vertical side still blocks.
      const smallObstacle=after.obstacleHeight !== undefined && after.obstacleHeight < .9;
      // Judge the grade in the direction of travel, not the face's sideways tilt.
      // Probe a fixed distance so slow starts and high-speed driving agree.
      const ahead = sample(x + ux * probe, z + uz * probe);
      const aheadSmall = ahead.obstacleHeight !== undefined && ahead.obstacleHeight < .9;
      const grade = (ahead.height - before.height) / probe;
      if (!smallObstacle && (rise > .22 + distance / count * maxGrade || (!aheadSmall && grade > maxGrade + .01))) return i / count;
    }
    pos.x += sx; pos.z += sz;
  }
  return 1;
}
