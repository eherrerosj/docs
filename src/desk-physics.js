import * as CANNON from 'cannon-es';

export const PAPER_WIDTH = 2.65;
export const PAPER_HEIGHT = 3.35;
export const PAPER_THICKNESS = 0.085;

export function createDeskPhysics(width, depth) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0), allowSleep: true });
  world.solver.iterations = 16;
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.defaultContactMaterial.friction = 0.46;
  world.defaultContactMaterial.restitution = 0.06;
  world.defaultContactMaterial.contactEquationStiffness = 1e8;
  const papers = [];
  let drag = null;

  function staticBox(x, y, z, sx, sy, sz) {
    const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(sx, sy, sz)) });
    body.position.set(x, y, z);
    world.addBody(body);
  }
  staticBox(0, -0.2, 0, width / 2, 0.2, depth / 2);
  staticBox(-width / 2 - 0.05, 0.25, 0, 0.08, 0.5, depth / 2);
  staticBox(width / 2 + 0.05, 0.25, 0, 0.08, 0.5, depth / 2);
  staticBox(0, 0.25, -depth / 2 - 0.05, width / 2, 0.5, 0.08);
  staticBox(0, 0.25, depth / 2 + 0.05, width / 2, 0.5, 0.08);

  function addPaper({ x, z, angle = 0, y = PAPER_THICKNESS / 2 + 0.015, tidyX = x, tidyZ = z }) {
    const body = new CANNON.Body({
      mass: 0.35,
      shape: new CANNON.Box(new CANNON.Vec3(PAPER_WIDTH / 2, PAPER_THICKNESS / 2, PAPER_HEIGHT / 2)),
      linearDamping: 0.45, angularDamping: 0.65,
      sleepSpeedLimit: 0.08, sleepTimeLimit: 0.5,
    });
    // Keep documents face up and legible; gravity, collisions, sliding and yaw remain physical.
    body.angularFactor.set(0, 1, 0);
    body.position.set(x, y, z);
    body.quaternion.setFromEuler(0, angle, 0);
    body.home = { x: tidyX, z: tidyZ, angle: 0 };
    world.addBody(body);
    papers.push(body);
    return body;
  }

  function beginDrag(body, point) {
    release();
    body.wakeUp();
    const pivot = body.pointToLocalFrame(new CANNON.Vec3(point.x, point.y, point.z));
    pivot.y = 0;
    const anchor = new CANNON.Body({ type: CANNON.Body.KINEMATIC, mass: 0, collisionFilterGroup: 0, collisionFilterMask: 0 });
    anchor.position.set(point.x, point.y, point.z);
    world.addBody(anchor);
    const constraint = new CANNON.PointToPointConstraint(body, pivot, anchor, new CANNON.Vec3(), 70);
    world.addConstraint(constraint);
    drag = { body, anchor, constraint, target: anchor.position.clone() };
  }

  function moveDrag(point) {
    if (!drag) return;
    drag.target.set(
      Math.max(-width / 2 + 2, Math.min(width / 2 - 2, point.x)),
      Math.max(0.25, Math.min(1.5, point.y)),
      Math.max(-depth / 2 + 2, Math.min(depth / 2 - 2, point.z)),
    );
  }

  function release() {
    if (!drag) return;
    const body = drag.body;
    world.removeConstraint(drag.constraint);
    world.removeBody(drag.anchor);
    if (body.velocity.length() > 5) body.velocity.scale(5 / body.velocity.length(), body.velocity);
    body.angularVelocity.y = Math.max(-4, Math.min(4, body.angularVelocity.y));
    body.wakeUp();
    drag = null;
  }

  function reset() {
    release();
    for (const body of papers) {
      body.position.set(body.home.x, PAPER_THICKNESS / 2 + 0.02, body.home.z);
      body.quaternion.setFromEuler(0, body.home.angle, 0);
      body.velocity.setZero();
      body.angularVelocity.setZero();
      body.wakeUp();
    }
  }

  function step(delta) {
    const dt = Math.min(Math.max(delta, 1 / 240), 0.05);
    if (drag) {
      drag.target.vsub(drag.anchor.position, drag.anchor.velocity);
      drag.anchor.velocity.scale(Math.min(24, 1 / dt), drag.anchor.velocity);
      const speed = drag.anchor.velocity.length();
      if (speed > 10) drag.anchor.velocity.scale(10 / speed, drag.anchor.velocity);
    }
    world.step(1 / 120, dt, 8);
    for (const body of papers) {
      if (!Number.isFinite(body.position.y) || body.position.y < -2 || Math.abs(body.position.x) > width / 2 + 2 || Math.abs(body.position.z) > depth / 2 + 2) {
        body.position.set(body.home.x, 0.15, body.home.z);
        body.quaternion.setFromEuler(0, body.home.angle, 0);
        body.velocity.setZero();
        body.angularVelocity.setZero();
        body.wakeUp();
      }
    }
  }

  return { world, papers, addPaper, beginDrag, moveDrag, release, reset, step, get dragging() { return drag?.body || null; } };
}
