// renderer.js
import { createStickman, tickStickman } from './stickman.js';

const { Engine, Render, Runner, Bodies, Composite, Events } = Matter;

// Canvas setup
const canvas = document.getElementById('world');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = Engine.create();
engine.world.gravity.y = 1.0;

const render = Render.create({
  canvas,
  engine,
  options: {
    width: canvas.width,
    height: canvas.height,
    wireframes: false,
    background: 'transparent'
  }
});
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

const ground = Bodies.rectangle(canvas.width / 2, canvas.height + 50, canvas.width * 2, 100, { isStatic: true });
Composite.add(engine.world, [ground]);

// Stickman container
const stickmen = [];

// UI refs
const colorPicker = document.getElementById('colorPicker');
const drawBtn = document.getElementById('drawBtn');
const doneDrawingBtn = document.getElementById('doneDrawingBtn');
const startRiggingBtn = document.getElementById('startRiggingBtn');
const riggingPanel = document.getElementById('rigging-panel');
const finalizeRigBtn = document.getElementById('finalizeRigBtn');
const nameInput = document.getElementById('nameInput');
const toggleInteract = document.getElementById('toggleInteract');

let interactionEnabled = true;
toggleInteract.addEventListener('click', () => {
  interactionEnabled = !interactionEnabled;
  toggleInteract.textContent = 'Interaction: ' + (interactionEnabled ? 'ON' : 'OFF');
});

let drawingMode = false;
let currentLine = [];
let drawnLines = [];

drawBtn.addEventListener('click', () => {
  drawingMode = true;
  drawBtn.style.display = 'none';
  doneDrawingBtn.style.display = 'inline-block';
});

doneDrawingBtn.addEventListener('click', () => {
  drawingMode = false;
  drawBtn.style.display = 'inline-block';
  doneDrawingBtn.style.display = 'none';
});

canvas.addEventListener('mousedown', (e) => {
  if (!drawingMode) return;
  currentLine = [{ x: e.clientX, y: e.clientY }];
  drawnLines.push(currentLine);
});

canvas.addEventListener('mousemove', (e) => {
  if (drawingMode && currentLine.length > 0) {
    currentLine.push({ x: e.clientX, y: e.clientY });
  }
  mousePos = { x: e.clientX, y: e.clientY };
});

Events.on(render, 'afterRender', () => {
  const context = canvas.getContext('2d');
  context.strokeStyle = colorPicker.value;
  context.lineWidth = 5;
  drawnLines.forEach(line => {
    context.beginPath();
    context.moveTo(line[0].x, line[0].y);
    for (let i = 1; i < line.length; i++) {
      context.lineTo(line[i].x, line[i].y);
    }
    context.stroke();
  });
});

let riggingMode = false;
let rigJoints = [];
let currentJointType = 'head';

doneDrawingBtn.addEventListener('click', () => {
  drawingMode = false;
  drawBtn.style.display = 'inline-block';
  doneDrawingBtn.style.display = 'none';
  startRiggingBtn.style.display = 'inline-block';
});

startRiggingBtn.addEventListener('click', () => {
  riggingMode = true;
  startRiggingBtn.style.display = 'none';
  riggingPanel.style.display = 'block';
});

document.querySelectorAll('.rig-joint-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    currentJointType = e.target.dataset.joint;
  });
});

canvas.addEventListener('click', (e) => {
  if (!riggingMode) return;
  rigJoints.push({ x: e.clientX, y: e.clientY, type: currentJointType });
});

Matter.Events.on(render, 'afterRender', () => {
  const context = canvas.getContext('2d');
  // ... (existing afterRender logic for drawing lines)

  // Visualize rig joints
  if (riggingMode) {
    rigJoints.forEach(joint => {
      context.beginPath();
      context.arc(joint.x, joint.y, 5, 0, 2 * Math.PI);
      context.fillStyle = 'red';
      context.fill();
    });
  }
});


finalizeRigBtn.addEventListener('click', () => {
  riggingMode = false;
  riggingPanel.style.display = 'none';

  if (drawnLines.length === 0 || rigJoints.length < 2) return; // Need at least 2 joints

  // More advanced rigging logic
  const parts = {}; // Store created bodies by joint type
  const constraints = [];

  // 1. Associate lines with the nearest joint
  const jointMap = {};
  rigJoints.forEach(joint => {
    jointMap[joint.type] = jointMap[joint.type] || [];
    jointMap[joint.type].push({ joint, lines: [] });
  });

  drawnLines.forEach(line => {
    const center = { x: (line[0].x + line[line.length - 1].x) / 2, y: (line[0].y + line[line.length - 1].y) / 2 };
    let closestJointGroup = null;
    let minDistance = Infinity;
    Object.values(jointMap).forEach(jointGroup => {
      jointGroup.forEach(entry => {
        const dist = distance(center, entry.joint);
        if (dist < minDistance) {
          minDistance = dist;
          closestJointGroup = entry;
        }
      });
    });
    if (closestJointGroup) {
      closestJointGroup.lines.push(line);
    }
  });

  // 2. Create bodies for each joint group
  Object.entries(jointMap).forEach(([type, group]) => {
    group.forEach((entry, index) => {
      if (entry.lines.length === 0) return;

      const line = entry.lines[0]; // For simplicity, use the first line
      const start = line[0];
      const end = line[line.length-1];
      const length = distance(start, end);
      const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      const angle = Math.atan2(end.y - start.y, end.x - start.x);

      let body;
      if (type === 'head') {
        body = Bodies.circle(center.x, center.y, length / 2, { render: { fillStyle: colorPicker.value } });
      } else {
        body = Bodies.rectangle(center.x, center.y, 5, length, { angle, render: { fillStyle: colorPicker.value } });
      }
      parts[`${type}_${index}`] = body;
    });
  });

  // 3. Create constraints (simple version: connect everything to the head)
  const head = parts['head_0'];
  if (head) {
    Object.entries(parts).forEach(([key, part]) => {
      if (key === 'head_0') return;
      const constraint = Constraint.create({
        bodyA: head,
        bodyB: part,
        stiffness: 0.2,
        length: distance(head.position, part.position)
      });
      constraints.push(constraint);
    });
  }

  const allParts = Object.values(parts);
  Composite.add(engine.world, [...allParts, ...constraints]);

  // Create the final stickman object
  const newStickman = {
    name: nameInput.value || ('Stick' + (stickmen.length + 1)),
    color: colorPicker.value,
    parts: [],
    constraints: [],
    attrs: {},
    state: 'idle',
    target: null,
    lastHover: false,
    memory: {},
    // Store drawing data for saving/loading
    drawing: {
      lines: drawnLines,
      joints: rigJoints,
    }
  };

  const { parts, constraints } = createStickmanFromDrawing(drawnLines, rigJoints, colorPicker.value);
  newStickman.parts = parts;
  newStickman.constraints = constraints;
  newStickman.attrs = personalityFromName(newStickman.name);
  newStickman.memory = {
    personality: newStickman.attrs,
    learned: {},
    goals: newStickman.attrs.goals,
  };

  stickmen.push(newStickman);

  drawnLines = [];
  rigJoints = [];
  saveStickmenState();
});

function tickBehavior() {
  for (const s of stickmen) {
    tickStickman(s, mousePos, interactionEnabled, canvas);
  }
  requestAnimationFrame(tickBehavior);
}

let mousePos = { x: -9999, y: -9999 };

document.getElementById('spawnDemo').addEventListener('click', () => {
  stickmen.push(createStickman(100 + Math.random() * 1000, 200 + Math.random() * 200, '#ff5b9a', 'artist_1', engine));
  stickmen.push(createStickman(200 + Math.random() * 800, 200 + Math.random() * 200, '#0b66ff', 'dev_1', engine));
  saveStickmenState();
});

async function loadStickmenState() {
  const savedStickmen = await window.electronAPI.loadStickmen();
  savedStickmen.forEach(data => {
    let stickman;
    if (data.isDemo) {
      stickman = createStickman(data.parts[0].position.x, data.parts[0].position.y, data.color, data.name, engine);
      stickman.parts.forEach((part, i) => {
        if (data.parts[i]) {
          Matter.Body.setPosition(part, data.parts[i].position);
          Matter.Body.setAngle(part, data.parts[i].angle);
        }
      });
    } else if (data.drawing) {
      // Re-create the stickman from drawing data
      const { parts, constraints } = createStickmanFromDrawing(data.drawing.lines, data.drawing.joints, data.color);
      stickman = {
        name: data.name,
        color: data.color,
        parts,
        constraints,
        attrs: data.attrs,
        state: data.state,
        target: null,
        lastHover: false,
        memory: data.memory || {},
        drawing: data.drawing,
      };
      stickman.parts.forEach((part, i) => {
        if (data.parts[i]) {
          Matter.Body.setPosition(part, data.parts[i].position);
          Matter.Body.setAngle(part, data.parts[i].angle);
        }
      });
    }
    if (stickman) {
      stickmen.push(stickman);
    }
  });
}

function createStickmanFromDrawing(drawnLines, rigJoints, color) {
  // This function encapsulates the rigging logic from finalizeRigBtn
  // to be reusable for loading.
  const parts = {};
  const constraints = [];

  // (The rigging logic from finalizeRigBtn needs to be moved here)
  const jointMap = {};
  rigJoints.forEach(joint => {
    jointMap[joint.type] = jointMap[joint.type] || [];
    jointMap[joint.type].push({ joint, lines: [] });
  });

  drawnLines.forEach(line => {
    const center = { x: (line[0].x + line[line.length - 1].x) / 2, y: (line[0].y + line[line.length - 1].y) / 2 };
    let closestJointGroup = null;
    let minDistance = Infinity;
    Object.values(jointMap).forEach(jointGroup => {
      jointGroup.forEach(entry => {
        const dist = distance(center, entry.joint);
        if (dist < minDistance) {
          minDistance = dist;
          closestJointGroup = entry;
        }
      });
    });
    if (closestJointGroup) {
      closestJointGroup.lines.push(line);
    }
  });

  Object.entries(jointMap).forEach(([type, group]) => {
    group.forEach((entry, index) => {
      if (entry.lines.length === 0) return;

      const line = entry.lines[0];
      const start = line[0];
      const end = line[line.length-1];
      const length = distance(start, end);
      const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      const angle = Math.atan2(end.y - start.y, end.x - start.x);

      let body;
      if (type === 'head') {
        body = Bodies.circle(center.x, center.y, length / 2, { render: { fillStyle: color } });
      } else {
        body = Bodies.rectangle(center.x, center.y, 5, length, { angle, render: { fillStyle: color } });
      }
      parts[`${type}_${index}`] = body;
    });
  });

  const head = parts['head_0'];
  if (head) {
    Object.entries(parts).forEach(([key, part]) => {
      if (key === 'head_0') return;
      const constraint = Constraint.create({
        bodyA: head,
        bodyB: part,
        stiffness: 0.2,
        length: distance(head.position, part.position)
      });
      constraints.push(constraint);
    });
  }

  const allParts = Object.values(parts);
  Composite.add(engine.world, [...allParts, ...constraints]);

  return { parts: allParts, constraints };
}

function saveStickmenState() {
  // We need to serialize the stickman data into a format that can be stored.
  const serializableStickmen = stickmen.map(s => {
    // For custom-drawn stickmen, save their drawing data.
    if (s.drawing) {
      return {
        name: s.name,
        color: s.color,
        attrs: s.attrs,
        state: s.state,
        drawing: s.drawing,
        // Also save the final positions of the created parts for accurate restoration
        parts: s.parts.map(p => ({ position: p.position, angle: p.angle })),
      };
    }
    // For pre-made stickmen
    return {
      name: s.name,
      color: s.color,
      attrs: s.attrs,
      state: s.state,
      isDemo: true, // Mark as a demo stickman
      parts: s.parts.map(p => ({ position: p.position, angle: p.angle })),
    };
  });
  window.electronAPI.saveStickmen(serializableStickmen);
}


loadStickmenState().then(() => {
  tickBehavior();
});

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  render.canvas.width = canvas.width;
  render.canvas.height = canvas.height;
});

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
