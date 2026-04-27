import * as THREE from 'three';
import { RUBIKS_CUBE_COLORS as colors } from './globals.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const container = document.getElementById('app-2x2-main');
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
controls.enableZoom = false;

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

for (let x of [-0.5, 0.5]) {
  for (let y of [-0.5, 0.5]) {
    for (let z of [-0.5, 0.5]) {
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

      if (x === 0.5) addSticker(stickerGeometryX, colors.right, [0.49, 0, 0]);
      if (x === -0.5) addSticker(stickerGeometryX, colors.left, [-0.49, 0, 0]);
      if (y === 0.5) addSticker(stickerGeometryY, colors.top, [0, 0.49, 0]);
      if (y === -0.5) addSticker(stickerGeometryY, colors.bottom, [0, -0.49, 0]);
      if (z === 0.5) addSticker(stickerGeometryZ, colors.front, [0, 0, 0.49]);
      if (z === -0.5) addSticker(stickerGeometryZ, colors.back, [0, 0, -0.49]);

      cubeGroup.add(cubieGroup);
      cubies.push(cubieGroup);
    }
  }
}

// Visual scaling
cubeGroup.scale.set(1.5, 1.5, 1.5);

let isAnimating = false;
let animationState = null;
let isActive = false;
let moveHistory = [];

function rotateLayer(axis, layer, angle, duration = 300, record = true) {
  if (record) {
    moveHistory.push({ axis, layer, angle, wholeCube: false });
  }
  return new Promise((resolve) => {
    if (isAnimating && duration > 0) return;
    isAnimating = true;

    const activeCubies = cubies.filter(c => Math.abs(c.position[axis] - layer) < 0.1);

    pivot.rotation.set(0, 0, 0);
    activeCubies.forEach(c => pivot.attach(c));

    if (duration > 0) {
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
      pivot.rotation[axis] = angle;
      finishRotation(activeCubies, resolve);
    }
  });
}

function finishRotation(activeCubies, resolve) {
  pivot.updateMatrixWorld();
  activeCubies.forEach(c => {
    cubeGroup.attach(c);
    c.position.x = Math.round(c.position.x * 2) / 2;
    c.position.y = Math.round(c.position.y * 2) / 2;
    c.position.z = Math.round(c.position.z * 2) / 2;

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
  'L': ['x', -0.5, Math.PI / 2], 'R': ['x', 0.5, -Math.PI / 2],
  'U': ['y', 0.5, -Math.PI / 2], 'D': ['y', -0.5, Math.PI / 2],
  'F': ['z', 0.5, -Math.PI / 2], 'B': ['z', -0.5, Math.PI / 2],
  'L_prime': ['x', -0.5, -Math.PI / 2], 'R_prime': ['x', 0.5, Math.PI / 2],
  'U_prime': ['y', 0.5, Math.PI / 2], 'D_prime': ['y', -0.5, -Math.PI / 2],
  'F_prime': ['z', 0.5, Math.PI / 2], 'B_prime': ['z', -0.5, -Math.PI / 2]
};

Object.keys(MOVES).forEach(key => {
  const btn = document.getElementById('btn' + key + '-2x2');
  if (btn) {
    btn.addEventListener('click', () => {
      if (!isAnimating && isActive) rotateLayer(...MOVES[key], 300);
    });
  }
});

const shuffleBtn = document.getElementById('shuffleBtn-2x2');
if (shuffleBtn) {
  shuffleBtn.addEventListener('click', async () => {
    if (isAnimating || !isActive) return;
    const BASE_KEYS = ['L', 'R', 'U', 'D', 'F', 'B'];
    let lastMove = { axis: '', layer: 0, dir: 0 };
    for (let i = 0; i < 20; i++) {
      let randomKey, m, dir;
      do {
        randomKey = BASE_KEYS[Math.floor(Math.random() * BASE_KEYS.length)];
        m = MOVES[randomKey];
        dir = Math.random() > 0.5 ? 1 : -1;
      } while (m[0] === lastMove.axis && m[1] === lastMove.layer && dir === -lastMove.dir);

      lastMove = { axis: m[0], layer: m[1], dir: dir };
      await rotateLayer(m[0], m[1], m[2] * dir, 250);
    }
  });
}

const resetBtn = document.getElementById('resetBtn-2x2');
if (resetBtn) {
  resetBtn.addEventListener('click', async () => {
    if (isAnimating || !isActive || moveHistory.length === 0) return;
    const historyToReverse = [...moveHistory];
    moveHistory = [];
    for (let i = historyToReverse.length - 1; i >= 0; i--) {
      const m = historyToReverse[i];
      if (m.wholeCube) {
        await rotateWholeCube(m.axis, -m.angle, 150, false);
      } else {
        await rotateLayer(m.axis, m.layer, -m.angle, 150, false);
      }
    }
  });
}

let cameraAnimState = null;

const resetOrientationBtn = document.getElementById('resetOrientationBtn-2x2');
if (resetOrientationBtn) {
  resetOrientationBtn.addEventListener('click', () => {
    if (!isActive) return;
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
// Mouse/Touch Drag Interaction
// ============================================================
const raycaster = new THREE.Raycaster();
let dragState = null;

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

function getCandidateAxes(faceAxis) {
  if (faceAxis === 'x') return ['y', 'z'];
  if (faceAxis === 'y') return ['x', 'z'];
  return ['x', 'y'];
}

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
  const intersects = raycaster.intersectObjects(cubeGroup.children, true);
  if (intersects.length === 0) return;
  const hit = intersects[0];
  if (!hit.face) return;

  const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
  const worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
  const absN = new THREE.Vector3(Math.abs(worldNormal.x), Math.abs(worldNormal.y), Math.abs(worldNormal.z));
  let faceAxis, faceSign;
  if (absN.x >= absN.y && absN.x >= absN.z) { faceAxis = 'x'; faceSign = Math.sign(worldNormal.x); }
  else if (absN.y >= absN.x && absN.y >= absN.z) { faceAxis = 'y'; faceSign = Math.sign(worldNormal.y); }
  else { faceAxis = 'z'; faceSign = Math.sign(worldNormal.z); }

  let cubie = hit.object;
  while (cubie && !cubie.userData.originalPos) cubie = cubie.parent;
  if (!cubie) return;

  dragState = {
    faceAxis, faceSign, piece: cubie, screenStart: screen,
    pieceWorldPos: new THREE.Vector3().setFromMatrixPosition(cubie.matrixWorld)
  };
  controls.enableRotate = false;
}

function onPointerMove(e) {
  if (!dragState || !isActive || isAnimating) return;
  const { screen } = getPointerPos(e);
  const dx = screen.x - dragState.screenStart.x;
  const dy = screen.y - dragState.screenStart.y;
  if (Math.sqrt(dx * dx + dy * dy) < 10) return;

  const dragDir = new THREE.Vector2(dx, -dy).normalize();
  const candidates = getCandidateAxes(dragState.faceAxis);
  const axisVectors = { 'x': new THREE.Vector3(1, 0, 0), 'y': new THREE.Vector3(0, 1, 0), 'z': new THREE.Vector3(0, 0, 1) };

  let bestAxis = null, bestDot = -Infinity, bestScreenDir = null;
  for (const axis of candidates) {
    const screenAxis = projectAxisToScreen(axisVectors[axis], dragState.pieceWorldPos);
    const dot = Math.abs(dragDir.dot(screenAxis));
    if (dot > bestDot) { bestDot = dot; bestAxis = axis; bestScreenDir = screenAxis; }
  }

  const dragSign = dragDir.dot(bestScreenDir) > 0 ? 1 : -1;
  const faceNormalVec = axisVectors[dragState.faceAxis].clone().multiplyScalar(dragState.faceSign);
  const cross = new THREE.Vector3().crossVectors(faceNormalVec, axisVectors[bestAxis]);
  const absCross = new THREE.Vector3(Math.abs(cross.x), Math.abs(cross.y), Math.abs(cross.z));
  let rotAxis, rotSign;
  if (absCross.x >= absCross.y && absCross.x >= absCross.z) { rotAxis = 'x'; rotSign = Math.sign(cross.x); }
  else if (absCross.y >= absCross.x && absCross.y >= absCross.z) { rotAxis = 'y'; rotSign = Math.sign(cross.y); }
  else { rotAxis = 'z'; rotSign = Math.sign(cross.z); }

  const sliceVal = Math.round(dragState.piece.position[rotAxis] * 2) / 2;
  const angle = (Math.PI / 2) * dragSign * rotSign;
  dragState = null;
  rotateLayer(rotAxis, sliceVal, angle, 300);
}

function onPointerUp() {
  if (dragState) dragState = null;
  if (isActive) controls.enableRotate = true;
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);
renderer.domElement.addEventListener('pointermove', onPointerMove);
renderer.domElement.addEventListener('pointerup', onPointerUp);
renderer.domElement.addEventListener('pointerleave', onPointerUp);

// ============================================================
// Keyboard Controls
// ============================================================
window.addEventListener('keydown', (e) => {
  if (!isActive || isAnimating) return;
  const shift = e.shiftKey;
  const keyMap = {
    'r': shift ? 'R_prime' : 'R', 'l': shift ? 'L_prime' : 'L',
    'u': shift ? 'U_prime' : 'U', 'd': shift ? 'D_prime' : 'D',
    'f': shift ? 'F_prime' : 'F', 'b': shift ? 'B_prime' : 'B',
  };
  const lowerKey = e.key.toLowerCase();
  if (keyMap[lowerKey]) {
    e.preventDefault();
    const m = MOVES[keyMap[lowerKey]];
    if (m) rotateLayer(m[0], m[1], m[2], 300);
    return;
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    rotateWholeCube('y', (Math.PI / 2) * (e.key === 'ArrowLeft' ? -1 : 1), 300);
    return;
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    rotateWholeCube('x', (Math.PI / 2) * (e.key === 'ArrowUp' ? -1 : 1), 300);
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
  if (path === '/cubes/2x2x2-cube') {
    isActive = true;
    snapReset(); // Reset cube state on each visit
    controls.enableRotate = true;
    controls.enableZoom = false;
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

    if (animationState) {
      const anim = animationState;
      const direction = Math.sign(anim.targetRotation);
      const step = anim.speed * delta * direction;
      anim.currentRotation += step;
      if (Math.abs(anim.currentRotation) >= Math.abs(anim.targetRotation)) {
        pivot.rotation[anim.axis] = anim.targetRotation;
        finishRotation(anim.activePieces, anim.resolve);
      } else {
        pivot.rotation[anim.axis] = anim.currentRotation;
      }
    }

    if (cameraAnimState) {
      cameraAnimState.elapsed += delta * 1000;
      const t = Math.min(cameraAnimState.elapsed / cameraAnimState.duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
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
