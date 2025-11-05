// stickman.js
const { Bodies, Constraint, Composite, Body } = Matter;

export function createStickman(x, y, color, name, engine) {
  const head = Bodies.circle(x, y - 60, 16, { density: 0.001, restitution: 0.2 });
  const chest = Bodies.rectangle(x, y - 30, 20, 28, { density: 0.001 });
  const pelvis = Bodies.rectangle(x, y, 24, 16, { density: 0.001 });

  const leftUpper = Bodies.rectangle(x - 18, y - 30, 12, 28, { density: 0.001 });
  const leftLower = Bodies.rectangle(x - 30, y - 10, 12, 28, { density: 0.001 });
  const rightUpper = Bodies.rectangle(x + 18, y - 30, 12, 28, { density: 0.001 });
  const rightLower = Bodies.rectangle(x + 30, y - 10, 12, 28, { density: 0.001 });

  const neck = Constraint.create({ bodyA: head, pointA: { x: 0, y: 12 }, bodyB: chest, length: 6, stiffness: 0.8 });
  const spine = Constraint.create({ bodyA: chest, pointA: { x: 0, y: 14 }, bodyB: pelvis, length: 10, stiffness: 0.9 });
  const lShoulder = Constraint.create({ bodyA: chest, pointA: { x: -10, y: -6 }, bodyB: leftUpper, length: 6, stiffness: 0.7 });
  const lElbow = Constraint.create({ bodyA: leftUpper, pointA: { x: 0, y: 12 }, bodyB: leftLower, length: 10, stiffness: 0.6 });
  const rShoulder = Constraint.create({ bodyA: chest, pointA: { x: 10, y: -6 }, bodyB: rightUpper, length: 6, stiffness: 0.7 });
  const rElbow = Constraint.create({ bodyA: rightUpper, pointA: { x: 0, y: 12 }, bodyB: rightLower, length: 10, stiffness: 0.6 });

  const parts = [head, chest, pelvis, leftUpper, leftLower, rightUpper, rightLower];
  parts.forEach(p => p.render.fillStyle = color);

  Composite.add(engine.world, [...parts, neck, spine, lShoulder, lElbow, rShoulder, rElbow]);

  const attrs = personalityFromName(name);

  const stick = {
    name,
    parts,
    constraints: [neck, spine, lShoulder, lElbow, rShoulder, rElbow],
    color,
    attrs,
    state: 'idle',
    target: null,
    lastHover: false,
    memory: {
      personality: attrs,
      learned: {},
      goals: ['wander'],
    }
  };
  return stick;
}

export function personalityFromName(name) {
  const n = name.toLowerCase();
  let personality = {
    role: 'generalist',
    skills: ['observing'],
    interests: ['exploring'],
    mood: 'curious',
    goals: ['wander']
  };

  if (n.includes('dev') || n.includes('code') || n.includes('programmer')) {
    personality.role = 'developer';
    personality.skills.push('coding', 'debugging');
    personality.interests.push('technology', 'problem-solving');
    personality.goals.push('build_something');
  }
  if (n.includes('art') || n.includes('draw') || n.includes('painter')) {
    personality.role = 'artist';
    personality.skills.push('drawing', 'color-theory');
    personality.interests.push('art', 'design');
    personality.goals.push('create_art');
  }
  if (n.includes('sys') || n.includes('admin')) {
    personality.role = 'sysadmin';
    personality.skills.push('networking', 'security');
    personality.interests.push('servers', 'automation');
    personality.goals.push('optimize_system');
  }
  return personality;
}

export function tickStickman(s, mousePos, interactionEnabled, canvas) {
  const rightHand = s.parts[6];
  const d = distance(rightHand.position, mousePos);
  if (d < 100 && interactionEnabled) {
    if (!s.lastHover) {
      s.lastHover = true;
      s.state = 'greet';
      s.gesturePhase = 0;
    }
  } else {
    s.lastHover = false;
    s.state = 'idle';
  }

  if (s.state === 'greet') {
    s.gesturePhase += 0.2;
    const hand = rightHand;
    const tx = hand.position.x + Math.sin(s.gesturePhase) * 10;
    Body.translate(hand, { x: (tx - hand.position.x) * 0.12, y: 0 });
    if (s.gesturePhase > 10) {
      window.electronAPI.openApp('notepad');
      s.state = 'idle';
    }
  }

  const chest = s.parts[1];
  Body.rotate(chest, -chest.angle * 0.02);

  // Goal-oriented AI
  if (s.state === 'idle' && Math.random() < 0.01) {
    const goal = s.memory.personality.goals[Math.floor(Math.random() * s.memory.personality.goals.length)];
    s.state = goal; // Set current state to the chosen goal

    if (s.state === 'wander') {
      s.target = {
        x: Math.random() * canvas.width,
        y: canvas.height - 50 // Ground level
      };
    } else if (s.state === 'build_something') {
      console.log(`${s.name} is thinking about building something...`);
      // Action: Open notepad and type
      window.electronAPI.openApp('notepad');
      window.electronAPI.typeString('Hello, World!');
      s.state = 'idle'; // Reset state after action
    } else if (s.state === 'create_art') {
      console.log(`${s.name} wants to create art.`);
      // Placeholder for drawing action
      s.state = 'idle';
    }
  } else if (s.state === 'wandering' && s.target) {
    const head = s.parts[0];
    const dx = s.target.x - head.position.x;
    if (Math.abs(dx) > 20) {
      Body.applyForce(head, head.position, { x: Math.sign(dx) * 0.001, y: 0 });
      if (Math.random() < 0.01) {
        Body.applyForce(head, head.position, { x: 0, y: -0.05 });
      }
    } else {
      s.state = 'idle';
      s.target = null;
    }
  }
}

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
