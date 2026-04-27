import * as THREE from 'three';
import { RUBIKS_CUBE_COLORS as colors } from './globals.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';


const container = document.getElementById('app');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(5, 5, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false;
container.appendChild(renderer.domElement);

renderer.setClearColor(0x000000, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.enableZoom = false; // Disable zoom option

const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
scene.add(ambientLight);

const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight1.position.set(10, 20, 10);
scene.add(dirLight1);

const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight2.position.set(-10, 10, -10);
scene.add(dirLight2);

const dirLight3 = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight3.position.set(10, -10, -10);
scene.add(dirLight3);

const cubies = [];
const cubeGroup = new THREE.Group();
scene.add(cubeGroup);

// Persistent pivot for slice rotations (reused across all moves)
const pivot = new THREE.Object3D();
cubeGroup.add(pivot);

const coreGeometry = new RoundedBoxGeometry(0.99, 0.99, 0.99, 5, 0.10);
const coreMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7, metalness: 0.1 });
const stickerGeometryX = new RoundedBoxGeometry(0.06, 0.83, 0.83, 6, 0.12);
const stickerGeometryY = new RoundedBoxGeometry(0.83, 0.06, 0.83, 6, 0.12);
const stickerGeometryZ = new RoundedBoxGeometry(0.83, 0.83, 0.06, 6, 0.12);

const canvas = document.createElement('canvas');
canvas.width = 256;
canvas.height = 256;
const context = canvas.getContext('2d');
context.fillStyle = '#ffffff';
context.fillRect(0, 0, 256, 256);
for (let i = 0; i < 20000; i++) {
  context.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  context.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
}
const noiseTexture = new THREE.CanvasTexture(canvas);
noiseTexture.wrapS = THREE.RepeatWrapping;
noiseTexture.wrapT = THREE.RepeatWrapping;

const getStickerMat = (color) => new THREE.MeshStandardMaterial({
  color,
  roughness: 0.9,
  metalness: 0.1,
  bumpMap: noiseTexture,
  bumpScale: 0.003
});

for (let x = -1; x <= 1; x++) {
  for (let y = -1; y <= 1; y++) {
    for (let z = -1; z <= 1; z++) {
      const cubieGroup = new THREE.Group();
      cubieGroup.position.set(x, y, z);
      cubieGroup.userData.originalPos = { x, y, z };

      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      cubieGroup.add(core);

      const addSticker = (geom, col, pos) => {
        const mat = getStickerMat(col);
        const stick = new THREE.Mesh(geom, mat);
        stick.position.set(...pos);
        stick.userData = { isSticker: true, originalColor: col };
        cubieGroup.add(stick);
      };

      if (x === 1) addSticker(stickerGeometryX, colors.right, [0.49, 0, 0]);
      if (x === -1) addSticker(stickerGeometryX, colors.left, [-0.49, 0, 0]);
      if (y === 1) addSticker(stickerGeometryY, colors.top, [0, 0.49, 0]);
      if (y === -1) addSticker(stickerGeometryY, colors.bottom, [0, -0.49, 0]);
      if (z === 1) addSticker(stickerGeometryZ, colors.front, [0, 0, 0.49]);
      if (z === -1) addSticker(stickerGeometryZ, colors.back, [0, 0, -0.49]);

      cubeGroup.add(cubieGroup);
      cubies.push(cubieGroup);
    }
  }
}

let isAnimating = false;
let animationState = null;
let isActive = false;
let currentMode = '';
let moveHistory = [];

function rotateLayer(axis, layer, angle, duration = 300, record = true) {
  if (record) {
    moveHistory.push({ axis, layer, angle, wholeCube: false });
  }
  return new Promise((resolve) => {
    if (isAnimating && duration > 0) return;
    isAnimating = true;

    // Step 1: Select the slice — filter all cubies on the target layer
    const activeCubies = cubies.filter(c => Math.abs(Math.round(c.position[axis]) - layer) < 0.1);

    // Step 2: Reset pivot and reparent pieces to it (attach preserves world transform)
    pivot.rotation.set(0, 0, 0);
    activeCubies.forEach(c => pivot.attach(c));

    if (duration > 0) {
      // Step 3: Set up frame-based animation state
      const totalRotation = Math.abs(angle);
      animationState = {
        axis,
        targetRotation: angle,
        currentRotation: 0,
        speed: totalRotation / (duration / 1000),
        activePieces: activeCubies,
        resolve
      };
    } else {
      // Instant rotation (no animation)
      pivot.rotation[axis] = angle;
      finishRotation(activeCubies, resolve);
    }
  });
}

// Step 4: Finalize — reparent pieces back to cube group
function finishRotation(activeCubies, resolve) {
  pivot.updateMatrixWorld();
  activeCubies.forEach(c => {
    cubeGroup.attach(c);                                    // Reparent back (preserves world transform)
    c.position.x = Math.round(c.position.x);               // Snap position to integer grid
    c.position.y = Math.round(c.position.y);
    c.position.z = Math.round(c.position.z);

    const euler = new THREE.Euler().setFromQuaternion(c.quaternion);
    euler.x = Math.round(euler.x / (Math.PI / 2)) * (Math.PI / 2);
    euler.y = Math.round(euler.y / (Math.PI / 2)) * (Math.PI / 2);
    euler.z = Math.round(euler.z / (Math.PI / 2)) * (Math.PI / 2);
    c.quaternion.setFromEuler(euler);
  });
  animationState = null;
  isAnimating = false;
  if (resolve) resolve();
}

// Whole-cube rotation — moves all 27 cubies simultaneously on the pivot
function rotateWholeCube(axis, angle, duration = 300, record = true) {
  if (record) {
    moveHistory.push({ axis, angle, wholeCube: true });
  }
  return new Promise((resolve) => {
    if (isAnimating) { resolve(); return; }
    isAnimating = true;

    pivot.rotation.set(0, 0, 0);
    cubies.forEach(c => pivot.attach(c));

    const totalRotation = Math.abs(angle);
    animationState = {
      axis,
      targetRotation: angle,
      currentRotation: 0,
      speed: totalRotation / (duration / 1000),
      activePieces: cubies.slice(),
      resolve
    };
  });
}

const MOVES = {
  'L': ['x', -1, Math.PI / 2], 'M': ['x', 0, Math.PI / 2], 'R': ['x', 1, -Math.PI / 2],
  'U': ['y', 1, -Math.PI / 2], 'E': ['y', 0, Math.PI / 2], 'D': ['y', -1, Math.PI / 2],
  'F': ['z', 1, -Math.PI / 2], 'S': ['z', 0, -Math.PI / 2], 'B': ['z', -1, Math.PI / 2],
  'L_prime': ['x', -1, -Math.PI / 2], 'M_prime': ['x', 0, -Math.PI / 2], 'R_prime': ['x', 1, Math.PI / 2],
  'U_prime': ['y', 1, Math.PI / 2], 'E_prime': ['y', 0, -Math.PI / 2], 'D_prime': ['y', -1, -Math.PI / 2],
  'F_prime': ['z', 1, Math.PI / 2], 'S_prime': ['z', 0, Math.PI / 2], 'B_prime': ['z', -1, -Math.PI / 2]
};

Object.keys(MOVES).forEach(key => {
  const btn = document.getElementById('btn' + key);
  if (btn) {
    btn.addEventListener('click', () => {
      if (!isAnimating && isActive) rotateLayer(...MOVES[key], 300);
    });
  }
});

const shuffleBtn = document.getElementById('shuffleBtn');
if (shuffleBtn) {
  shuffleBtn.addEventListener('click', async () => {
    if (isAnimating || !isActive) return;

    // Use only base moves for cleaner picking logic
    const BASE_KEYS = ['L', 'M', 'R', 'U', 'E', 'D', 'F', 'S', 'B'];
    let lastMove = { axis: '', layer: 0, dir: 0 };

    for (let i = 0; i < 25; i++) { // Increased shuffle count to compensate for speed
      let randomKey, m, dir;

      // Prevent redundant inverse moves (e.g., L then L')
      do {
        randomKey = BASE_KEYS[Math.floor(Math.random() * BASE_KEYS.length)];
        m = MOVES[randomKey];
        dir = Math.random() > 0.5 ? 1 : -1;
      } while (m[0] === lastMove.axis && m[1] === lastMove.layer && dir === -lastMove.dir);

      lastMove = { axis: m[0], layer: m[1], dir: dir };
      // Faster rotation speed (300ms) for shuffling
      await rotateLayer(m[0], m[1], m[2] * dir, 300);
    }
  });
}

const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
  resetBtn.addEventListener('click', async () => {
    if (isAnimating || !isActive || moveHistory.length === 0) return;

    // Create a copy of the history to reverse, and clear the main history
    const historyToReverse = [...moveHistory];
    moveHistory = [];

    // Rotate each move back in reverse order
    for (let i = historyToReverse.length - 1; i >= 0; i--) {
      const m = historyToReverse[i];
      if (m.wholeCube) {
        // Undo whole-cube rotation
        await rotateWholeCube(m.axis, -m.angle, 150, false);
      } else {
        // Undo single-layer rotation
        await rotateLayer(m.axis, m.layer, -m.angle, 150, false);
      }
    }
  });
}

let cameraAnimState = null;

const resetOrientationBtn = document.getElementById('resetOrientationBtn');
if (resetOrientationBtn) {
  resetOrientationBtn.addEventListener('click', () => {
    if (!isActive) return;

    // Set up frame-based camera lerp animation
    cameraAnimState = {
      startCamPos: camera.position.clone(),
      startTarget: controls.target.clone(),
      endCamPos: new THREE.Vector3(5, 5, 8),
      endTarget: new THREE.Vector3(0, 0, 0),
      duration: 500,
      elapsed: 0
    };
  });
}

// ============================================================
// 3.4 Mouse/Touch Drag Interaction
// ============================================================
const raycaster = new THREE.Raycaster();
const pointerStart = new THREE.Vector2();
let dragState = null; // { faceNormal, piece, screenStart }

function getPointerPos(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    ndc: new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    ),
    screen: new THREE.Vector2(clientX, clientY)
  };
}

// Get the two candidate rotation axes based on the clicked face normal
function getCandidateAxes(faceAxis) {
  if (faceAxis === 'x') return ['y', 'z'];
  if (faceAxis === 'y') return ['x', 'z'];
  return ['x', 'y']; // z-face
}

// Project a world-space axis direction into screen space for comparison with drag
function projectAxisToScreen(axisVec, worldPos) {
  const p1 = worldPos.clone().project(camera);
  const p2 = worldPos.clone().add(axisVec).project(camera);
  const dir = new THREE.Vector2(p2.x - p1.x, p2.y - p1.y);
  dir.normalize();
  return dir;
}

function onPointerDown(e) {
  if (!isActive || isAnimating) return;

  const { ndc, screen } = getPointerPos(e);
  raycaster.setFromCamera(ndc, camera);

  // Raycast against all cubie meshes in the cube group
  const intersects = raycaster.intersectObjects(cubeGroup.children, true);
  if (intersects.length === 0) return;

  const hit = intersects[0];
  if (!hit.face) return;

  // Get the face normal in world space
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
  const worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();

  // Snap normal to nearest axis
  const absN = new THREE.Vector3(Math.abs(worldNormal.x), Math.abs(worldNormal.y), Math.abs(worldNormal.z));
  let faceAxis, faceSign;
  if (absN.x >= absN.y && absN.x >= absN.z) {
    faceAxis = 'x'; faceSign = Math.sign(worldNormal.x);
  } else if (absN.y >= absN.x && absN.y >= absN.z) {
    faceAxis = 'y'; faceSign = Math.sign(worldNormal.y);
  } else {
    faceAxis = 'z'; faceSign = Math.sign(worldNormal.z);
  }

  // Find the cubie group that was clicked
  let cubie = hit.object;
  while (cubie && !cubie.userData.originalPos) {
    cubie = cubie.parent;
  }
  if (!cubie) return;

  dragState = {
    faceAxis,
    faceSign,
    piece: cubie,
    screenStart: screen,
    pieceWorldPos: new THREE.Vector3().setFromMatrixPosition(cubie.matrixWorld)
  };

  // Disable orbit controls while interacting with cube
  controls.enableRotate = false;
}

function onPointerMove(e) {
  if (!dragState || !isActive || isAnimating) return;

  const { screen } = getPointerPos(e);
  const dx = screen.x - dragState.screenStart.x;
  const dy = screen.y - dragState.screenStart.y;
  const dragDist = Math.sqrt(dx * dx + dy * dy);

  // 10px threshold before registering as a drag
  if (dragDist < 10) return;

  const dragDir = new THREE.Vector2(dx, -dy).normalize(); // Flip Y for screen coords

  // Get candidate axes based on clicked face
  const candidates = getCandidateAxes(dragState.faceAxis);

  // Project each candidate axis to screen space and pick best alignment
  const axisVectors = {
    'x': new THREE.Vector3(1, 0, 0),
    'y': new THREE.Vector3(0, 1, 0),
    'z': new THREE.Vector3(0, 0, 1)
  };

  let bestAxis = null;
  let bestDot = -Infinity;
  let bestScreenDir = null;

  for (const axis of candidates) {
    const screenAxis = projectAxisToScreen(axisVectors[axis], dragState.pieceWorldPos);
    const dot = Math.abs(dragDir.dot(screenAxis));
    if (dot > bestDot) {
      bestDot = dot;
      bestAxis = axis;
      bestScreenDir = screenAxis;
    }
  }

  // Determine rotation direction from drag sign relative to the projected axis
  const dragSign = dragDir.dot(bestScreenDir) > 0 ? 1 : -1;

  // Compute rotation axis via cross product: faceNormal × moveAxis
  const faceNormalVec = axisVectors[dragState.faceAxis].clone().multiplyScalar(dragState.faceSign);
  const moveAxisVec = axisVectors[bestAxis];
  const cross = new THREE.Vector3().crossVectors(faceNormalVec, moveAxisVec);

  // The rotation axis is the dominant component of the cross product
  const absCross = new THREE.Vector3(Math.abs(cross.x), Math.abs(cross.y), Math.abs(cross.z));
  let rotAxis, rotSign;
  if (absCross.x >= absCross.y && absCross.x >= absCross.z) {
    rotAxis = 'x'; rotSign = Math.sign(cross.x);
  } else if (absCross.y >= absCross.x && absCross.y >= absCross.z) {
    rotAxis = 'y'; rotSign = Math.sign(cross.y);
  } else {
    rotAxis = 'z'; rotSign = Math.sign(cross.z);
  }

  // Determine the slice layer from the clicked piece position
  const sliceVal = Math.round(dragState.piece.position[rotAxis]);

  // Rotation angle: 90° in the direction determined by drag × face normal
  const angle = (Math.PI / 2) * dragSign * rotSign;

  // Clear drag state before executing rotation
  const savedDragState = dragState;
  dragState = null;

  rotateLayer(rotAxis, sliceVal, angle, 300);
}

function onPointerUp() {
  if (dragState) {
    dragState = null;
  }
  // Re-enable orbit controls
  if (isActive) controls.enableRotate = true;
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);
renderer.domElement.addEventListener('pointermove', onPointerMove);
renderer.domElement.addEventListener('pointerup', onPointerUp);
renderer.domElement.addEventListener('pointerleave', onPointerUp);

// ============================================================
// 3.5 Keyboard Controls
// ============================================================
window.addEventListener('keydown', (e) => {
  if (!isActive || isAnimating) return;

  const key = e.key;
  const shift = e.shiftKey;

  // Standard Rubik's cube notation
  const keyMap = {
    'r': shift ? 'R_prime' : 'R',
    'l': shift ? 'L_prime' : 'L',
    'u': shift ? 'U_prime' : 'U',
    'd': shift ? 'D_prime' : 'D',
    'f': shift ? 'F_prime' : 'F',
    'b': shift ? 'B_prime' : 'B',
  };

  const lowerKey = key.toLowerCase();

  if (keyMap[lowerKey]) {
    e.preventDefault();
    const moveKey = keyMap[lowerKey];
    const m = MOVES[moveKey];
    if (m) rotateLayer(m[0], m[1], m[2], 300);
    return;
  }

  // Arrow keys: whole cube rotation
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    e.preventDefault();
    const dir = key === 'ArrowLeft' ? -1 : 1;
    rotateWholeCube('y', (Math.PI / 2) * dir, 300);
    return;
  }

  if (key === 'ArrowUp' || key === 'ArrowDown') {
    e.preventDefault();
    const dir = key === 'ArrowUp' ? -1 : 1;
    rotateWholeCube('x', (Math.PI / 2) * dir, 300);
    return;
  }
});

function snapReset() {
  // Clear any existing animations or history
  isAnimating = false;
  moveHistory = [];

  // Snap camera and controls back instantly
  camera.position.set(5, 5, 8);
  controls.target.set(0, 0, 0);
  controls.update();

  // Reset all cubies to original positions and orientations
  cubies.forEach(c => {
    const orig = c.userData.originalPos;
    c.position.set(orig.x, orig.y, orig.z);
    c.quaternion.set(0, 0, 0, 1);
  });
}

window.addEventListener('route-changed', (e) => {
  const path = e.detail;
  currentMode = path;
  if (path === '/cubes/3x3x3-cube') {
    isActive = true;
    snapReset(); // Reset cube state on each visit
    controls.enableRotate = true;
    controls.enableZoom = false; // Keep zoom disabled

    scene.traverse(child => {
      if (child.userData.isSticker && child.userData.originalColor) {
        child.material.color.setHex(child.userData.originalColor);
      }
    });

  } else {
    isActive = false;
  }
});

let lastFrameTime = 0;
function animate(time) {
  requestAnimationFrame(animate);
  if (isActive) {
    const delta = lastFrameTime ? (time - lastFrameTime) / 1000 : 0;
    lastFrameTime = time;

    // Incrementally rotate pivot each frame until target is reached
    if (animationState) {
      const anim = animationState;
      const direction = Math.sign(anim.targetRotation);
      const step = anim.speed * delta * direction;
      anim.currentRotation += step;

      if (Math.abs(anim.currentRotation) >= Math.abs(anim.targetRotation)) {
        // Snap to exact target angle and finalize
        pivot.rotation[anim.axis] = anim.targetRotation;
        finishRotation(anim.activePieces, anim.resolve);
      } else {
        pivot.rotation[anim.axis] = anim.currentRotation;
      }
    }

    // Frame-based camera orientation animation (smooth ease-out lerp)
    if (cameraAnimState) {
      cameraAnimState.elapsed += delta * 1000;
      const t = Math.min(cameraAnimState.elapsed / cameraAnimState.duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // Cubic ease-out

      camera.position.lerpVectors(cameraAnimState.startCamPos, cameraAnimState.endCamPos, ease);
      controls.target.lerpVectors(cameraAnimState.startTarget, cameraAnimState.endTarget, ease);

      if (t >= 1) cameraAnimState = null;
    }

    controls.update();
    renderer.render(scene, camera);
  } else {
    lastFrameTime = time;
  }
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
