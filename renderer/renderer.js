// renderer.js
const { Engine, Render, Runner, Bodies, Composite, Constraint, Mouse, MouseConstraint, Vector, Body } = Matter;

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

const ground = Bodies.rectangle(canvas.width/2, canvas.height+50, canvas.width*2, 100, { isStatic: true });
Composite.add(engine.world, [ground]);

// Stickman container
const stickmen = [];

// UI refs
const colorPicker = document.getElementById('colorPicker');
const drawBtn = document.getElementById('drawBtn');
const uploadBtn = document.getElementById('uploadBtn');
const autoRigBtn = document.getElementById('autoRigBtn');
const nameInput = document.getElementById('nameInput');
const createBtn = document.getElementById('createBtn');
const toggleInteract = document.getElementById('toggleInteract');

let interactionEnabled = true;
toggleInteract.addEventListener('click', ()=> {
  interactionEnabled = !interactionEnabled;
  toggleInteract.textContent = 'Interaction: ' + (interactionEnabled ? 'ON' : 'OFF');
});

// Simple auto-rig + create function
function createStickmanFromParams(x,y, color, name, customImage=null) {
  // For simplicity: simple 7-body stickman as in prior demo
  const head = Bodies.circle(x, y - 60, 16, { density:0.001, restitution:0.2 });
  const chest = Bodies.rectangle(x, y - 30, 20, 28, { density:0.001 });
  const pelvis = Bodies.rectangle(x, y, 24, 16, { density:0.001 });

  const leftUpper = Bodies.rectangle(x - 18, y - 30, 12, 28, { density:0.001 });
  const leftLower = Bodies.rectangle(x - 30, y - 10, 12, 28, { density:0.001 });
  const rightUpper = Bodies.rectangle(x + 18, y - 30, 12, 28, { density:0.001 });
  const rightLower = Bodies.rectangle(x + 30, y - 10, 12, 28, { density:0.001 });

  const neck = Constraint.create({ bodyA: head, pointA:{x:0,y:12}, bodyB: chest, length: 6, stiffness: 0.8 });
  const spine = Constraint.create({ bodyA: chest, pointA:{x:0,y:14}, bodyB: pelvis, length: 10, stiffness: 0.9 });
  const lShoulder = Constraint.create({ bodyA: chest, pointA:{x:-10,y:-6}, bodyB: leftUpper, length: 6, stiffness:0.7 });
  const lElbow = Constraint.create({ bodyA: leftUpper, pointA:{x:0,y:12}, bodyB: leftLower, length: 10, stiffness:0.6 });
  const rShoulder = Constraint.create({ bodyA: chest, pointA:{x:10,y:-6}, bodyB: rightUpper, length: 6, stiffness:0.7 });
  const rElbow = Constraint.create({ bodyA: rightUpper, pointA:{x:0,y:12}, bodyB: rightLower, length: 10, stiffness:0.6 });

  const parts = [head, chest, pelvis, leftUpper, leftLower, rightUpper, rightLower];
  parts.forEach(p => p.render.fillStyle = color);

  Composite.add(engine.world, [...parts, neck, spine, lShoulder, lElbow, rShoulder, rElbow]);

  // assign AI attributes based on name (simple mapping; you can later plug LLM)
  const attrs = personalityFromName(name);

  const stick = { name, parts, constraints: [neck,spine,lShoulder,lElbow,rShoulder,rElbow], color, attrs, state:'idle', target:null, lastHover:false };
  stickmen.push(stick);
  return stick;
}

function personalityFromName(name) {
  // Very simple heuristic: keywords
  const n = name.toLowerCase();
  if (n.includes('dev') || n.includes('code') || n.includes('devon') || n.includes('program')) {
    return { role: 'developer', skill: ['coding','debugging'], mood: 'focused' };
  }
  if (n.includes('art') || n.includes('draw') || n.includes('painter')) {
    return { role: 'artist', skill: ['drawing','color'], mood: 'creative' };
  }
  if (n.includes('sys') || n.includes('admin')) {
    return { role: 'sysadmin', skill: ['monitoring','repair'], mood: 'alert' };
  }
  // default: random-ish
  return { role: 'generalist', skill: ['misc'], mood: 'curious' };
}

// Example behavior tick
function tickBehavior() {
  for (const s of stickmen) {
    // simple: if mouse near right hand -> wave / approach
    const rightHand = s.parts[6]; // rightLower
    // check cursor proximity
    const d = distance(rightHand.position, mousePos);
    if (d < 100 && interactionEnabled) {
      if (!s.lastHover) {
        s.lastHover = true;
        // switch to "greet" animation
        s.state = 'greet';
        // if wants to "speak" through gestures: create gesture animation
        s.gesturePhase = 0;
      }
    } else {
      s.lastHover = false;
      s.state = 'idle';
    }

    // handle gesture
    if (s.state === 'greet') {
      s.gesturePhase += 0.2;
      const hand = rightHand;
      const tx = hand.position.x + Math.sin(s.gesturePhase) * 10;
      Body.translate(hand, { x: (tx - hand.position.x) * 0.12, y: 0 });
      // When enough waves, maybe trigger "open notepad"
      if (s.gesturePhase > 10) {
        // Example: trigger main process to open notepad
        window.electronAPI.openApp('notepad');
        s.state = 'idle';
      }
    }
    // keep chest slightly upright
    const chest = s.parts[1];
    Body.rotate(chest, -chest.angle * 0.02);
  }
  requestAnimationFrame(tickBehavior);
}

// helper
function distance(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }

let mousePos = { x: -9999, y: -9999 };
canvas.addEventListener('mousemove', (e) => {
  mousePos = { x: e.clientX, y: e.clientY };
});

// UI bindings
createBtn.addEventListener('click', ()=> {
  const color = colorPicker.value;
  const name = nameInput.value || ('Stick' + (stickmen.length+1));
  // spawn at center top
  createStickmanFromParams(300 + Math.random()*600, 200 + Math.random()*200, color, name);
});

document.getElementById('spawnDemo').addEventListener('click', ()=> {
  createStickmanFromParams(100 + Math.random()*1000, 200 + Math.random()*200, '#ff5b9a', 'artist_1');
  createStickmanFromParams(200 + Math.random()*800, 200 + Math.random()*200, '#0b66ff', 'dev_1');
});

// Start behavior loop
tickBehavior();

// Resize handling
window.addEventListener('resize', ()=> {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  render.canvas.width = canvas.width;
  render.canvas.height = canvas.height;
});
