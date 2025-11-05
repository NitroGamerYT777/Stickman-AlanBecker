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
const uploadBtn = document.getElementById('uploadBtn');
const autoRigBtn = document.getElementById('autoRigBtn');
const nameInput = document.getElementById('nameInput');
const createBtn = document.getElementById('createBtn');
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

autoRigBtn.addEventListener('click', () => {
  if (drawnLines.length === 0) return;

  // 1. Find the torso (longest line)
  let torsoLine = drawnLines.reduce((longest, line) => {
    const length = distance(line[0], line[line.length - 1]);
    if (length > (longest.length || 0)) {
      return { line, length };
    }
    return longest;
  }, { line: null, length: 0 }).line;

  if (!torsoLine) return;

  // For now, just create the torso
  const start = torsoLine[0];
  const end = torsoLine[torsoLine.length - 1];
  const length = distance(start, end);
  const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const torso = Bodies.rectangle(center.x, center.y, 5, length, {
    angle: angle,
    render: { fillStyle: colorPicker.value }
  });

  Composite.add(engine.world, torso);


  const remainingLines = drawnLines.filter(line => line !== torsoLine);

  // Identify head (closest small line to the top of the torso)
  const torsoTop = end.y < start.y ? end : start;
  let headLine = null;
  let minDistance = Infinity;

  remainingLines.forEach(line => {
    const lineCenter = { x: (line[0].x + line[line.length - 1].x) / 2, y: (line[0].y + line[line.length - 1].y) / 2 };
    const dist = distance(torsoTop, lineCenter);
    if (dist < minDistance && distance(line[0], line[line.length - 1]) < length * 0.5) {
      minDistance = dist;
      headLine = line;
    }
  });

  if (headLine) {
    const headCenter = { x: (headLine[0].x + headLine[headLine.length - 1].x) / 2, y: (headLine[0].y + headLine[headLine.length - 1].y) / 2 };
    const headRadius = distance(headLine[0], headLine[headLine.length - 1]) / 2;
    const head = Bodies.circle(headCenter.x, headCenter.y, headRadius, {
      render: { fillStyle: colorPicker.value }
    });
    const neck = Constraint.create({
      bodyA: torso,
      pointA: { x: 0, y: -length / 2 },
      bodyB: head,
      length: 10,
      stiffness: 0.8
    });
    Composite.add(engine.world, [head, neck]);
  }

  const limbLines = remainingLines.filter(line => line !== headLine);

  limbLines.forEach(line => {
    const start = line[0];
    const end = line[line.length - 1];
    const length = distance(start, end);
    const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const limb = Bodies.rectangle(center.x, center.y, 5, length, {
      angle: angle,
      render: { fillStyle: colorPicker.value }
    });

    // Find attachment point on torso
    const attachPoint = { x: torso.position.x, y: center.y };
    const torsoAttachPoint = { x: 0, y: center.y - torso.position.y };

    const joint = Constraint.create({
      bodyA: torso,
      pointA: torsoAttachPoint,
      bodyB: limb,
      length: 20,
      stiffness: 0.6
    });

    Composite.add(engine.world, [limb, joint]);
  });


  drawnLines = [];
});

function tickBehavior() {
  for (const s of stickmen) {
    tickStickman(s, mousePos, interactionEnabled, canvas);
  }
  requestAnimationFrame(tickBehavior);
}

let mousePos = { x: -9999, y: -9999 };

createBtn.addEventListener('click', () => {
  const color = colorPicker.value;
  const name = nameInput.value || ('Stick' + (stickmen.length + 1));
  const stickman = createStickman(300 + Math.random() * 600, 200 + Math.random() * 200, color, name, engine);
  stickmen.push(stickman);
});

document.getElementById('spawnDemo').addEventListener('click', () => {
  stickmen.push(createStickman(100 + Math.random() * 1000, 200 + Math.random() * 200, '#ff5b9a', 'artist_1', engine));
  stickmen.push(createStickman(200 + Math.random() * 800, 200 + Math.random() * 200, '#0b66ff', 'dev_1', engine));
});

tickBehavior();

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  render.canvas.width = canvas.width;
  render.canvas.height = canvas.height;
});

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
