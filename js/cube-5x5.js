import * as THREE from 'three';
import { RUBIKS_CUBE_COLORS as colors } from './globals.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const container = document.getElementById('app-5x5-main');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(8, 8, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false;
container.appendChild(renderer.domElement);

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

for (let x of [-2, -1, 0, 1, 2]) {
  for (let y of [-2, -1, 0, 1, 2]) {
    for (let z of [-2, -1, 0, 1, 2]) {
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

      if (x === 2) addSticker(stickerGeometryX, colors.right, [0.49, 0, 0]);
      if (x === -2) addSticker(stickerGeometryX, colors.left, [-0.49, 0, 0]);
      if (y === 2) addSticker(stickerGeometryY, colors.top, [0, 0.49, 0]);
      if (y === -2) addSticker(stickerGeometryY, colors.bottom, [0, -0.49, 0]);
      if (z === 2) addSticker(stickerGeometryZ, colors.front, [0, 0, 0.49]);
      if (z === -2) addSticker(stickerGeometryZ, colors.back, [0, 0, -0.49]);

      cubeGroup.add(cubieGroup);
      cubies.push(cubieGroup);
    }
  }
}

let isAnimating = false;
let isActive = false;
let animationState = null;
let cameraAnimState = null;
let moveHistory = [];

function rotateLayer(axis, layers, angle, duration = 300, record = true) {
  if (record) {
    moveHistory.push({ wholeCube: false, axis, layers, angle });
  }
  return new Promise((resolve) => {
    if (isAnimating && duration > 0) return;
    isAnimating = true;

    const activeCubies = cubies.filter(c => {
      const pos = Math.round(c.position[axis]);
      return layers.some(l => Math.abs(pos - l) < 0.1);
    });

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

function finishRotation(activePieces, resolve) {
  pivot.updateMatrixWorld();
  activePieces.forEach(c => {
    cubeGroup.attach(c);
    c.position.set(
      Math.round(c.position.x),
      Math.round(c.position.y),
      Math.round(c.position.z)
    );
    const euler = new THREE.Euler().setFromQuaternion(c.quaternion);
    euler.set(
      Math.round(euler.x / (Math.PI / 2)) * (Math.PI / 2),
      Math.round(euler.y / (Math.PI / 2)) * (Math.PI / 2),
      Math.round(euler.z / (Math.PI / 2)) * (Math.PI / 2)
    );
    c.quaternion.setFromEuler(euler);
  });
  animationState = null;
  isAnimating = false;
  if (resolve) resolve();
}

function rotateWholeCube(axis, angle, duration = 300, record = true) {
  if (record) {
    moveHistory.push({ wholeCube: true, axis, angle });
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
  'L': ['x', [-2], Math.PI / 2], 'R': ['x', [2], -Math.PI / 2],
  'U': ['y', [2], -Math.PI / 2], 'D': ['y', [-2], Math.PI / 2],
  'F': ['z', [2], -Math.PI / 2], 'B': ['z', [-2], Math.PI / 2],
  'Lw': ['x', [-2, -1], Math.PI / 2], 'Rw': ['x', [1, 2], -Math.PI / 2],
  'Uw': ['y', [1, 2], -Math.PI / 2], 'Dw': ['y', [-2, -1], Math.PI / 2],
  'Fw': ['z', [1, 2], -Math.PI / 2], 'Bw': ['z', [-2, -1], Math.PI / 2],
  'L_prime': ['x', [-2], -Math.PI / 2], 'R_prime': ['x', [2], Math.PI / 2],
  'U_prime': ['y', [2], Math.PI / 2], 'D_prime': ['y', [-2], -Math.PI / 2],
  'F_prime': ['z', [2], Math.PI / 2], 'B_prime': ['z', [-2], -Math.PI / 2],
  'Lw_prime': ['x', [-2, -1], -Math.PI / 2], 'Rw_prime': ['x', [1, 2], Math.PI / 2],
  'Uw_prime': ['y', [1, 2], Math.PI / 2], 'Dw_prime': ['y', [-2, -1], -Math.PI / 2],
  'Fw_prime': ['z', [1, 2], Math.PI / 2], 'Bw_prime': ['z', [-2, -1], -Math.PI / 2],
  'l': ['x', [-1], Math.PI / 2], 'r': ['x', [1], -Math.PI / 2],
  'u': ['y', [1], -Math.PI / 2], 'd': ['y', [-1], Math.PI / 2],
  'f': ['z', [1], -Math.PI / 2], 'b': ['z', [-1], Math.PI / 2],
  'l_prime': ['x', [-1], -Math.PI / 2], 'r_prime': ['x', [1], Math.PI / 2],
  'u_prime': ['y', [1], Math.PI / 2], 'd_prime': ['y', [-1], -Math.PI / 2],
  'f_prime': ['z', [1], Math.PI / 2], 'b_prime': ['z', [-1], -Math.PI / 2],
  'M': ['x', [0], Math.PI / 2], 'E': ['y', [0], Math.PI / 2], 'S': ['z', [0], -Math.PI / 2],
  'M_prime': ['x', [0], -Math.PI / 2], 'E_prime': ['y', [0], -Math.PI / 2], 'S_prime': ['z', [0], Math.PI / 2],
  'm': ['x', [-1, 0, 1], Math.PI / 2], 'e': ['y', [-1, 0, 1], Math.PI / 2], 's': ['z', [-1, 0, 1], -Math.PI / 2],
  'm_prime': ['x', [-1, 0, 1], -Math.PI / 2], 'e_prime': ['y', [-1, 0, 1], -Math.PI / 2], 's_prime': ['z', [-1, 0, 1], Math.PI / 2]
};

Object.keys(MOVES).forEach(key => {
  const btn = document.getElementById('btn' + key + '-5x5');
  if (btn) {
    btn.addEventListener('click', () => {
      if (!isAnimating && isActive) rotateLayer(...MOVES[key]);
    });
  }
});

const shuffleBtn = document.getElementById('shuffleBtn-5x5');
if (shuffleBtn) {
  shuffleBtn.addEventListener('click', async () => {
    if (isAnimating || !isActive) return;

    const BASE_KEYS = ['L', 'R', 'U', 'D', 'F', 'B', 'Lw', 'Rw', 'Uw', 'Dw', 'Fw', 'Bw', 'l', 'r', 'u', 'd', 'f', 'b', 'M', 'E', 'S', 'm', 'e', 's'];
    let lastMove = { axis: '', layers: [], dir: 0 };

    for (let i = 0; i < 35; i++) {
      let randomKey, m, dir;
      do {
        randomKey = BASE_KEYS[Math.floor(Math.random() * BASE_KEYS.length)];
        m = MOVES[randomKey];
        dir = Math.random() > 0.5 ? 1 : -1;
      } while (m[0] === lastMove.axis && JSON.stringify(m[1]) === JSON.stringify(lastMove.layers) && dir === -lastMove.dir);

      lastMove = { axis: m[0], layers: m[1], dir: dir };
      await rotateLayer(m[0], m[1], m[2] * dir, 180);
    }
  });
}

const resetBtn = document.getElementById('resetBtn-5x5');
if (resetBtn) {
  resetBtn.addEventListener('click', async () => {
    if (isAnimating || !isActive || moveHistory.length === 0) return;
    const historyToReverse = [...moveHistory];
    moveHistory = [];
    for (let i = historyToReverse.length - 1; i >= 0; i--) {
      const m = historyToReverse[i];
      if (m.wholeCube) {
        await rotateWholeCube(m.axis, -m.angle, 100, false);
      } else {
        await rotateLayer(m.axis, m.layers, -m.angle, 100, false);
      }
    }
  });
}

const resetOrientationBtn = document.getElementById('resetOrientationBtn-5x5');
if (resetOrientationBtn) {
  resetOrientationBtn.addEventListener('click', () => {
    if (!isActive || cameraAnimState) return;
    cameraAnimState = {
      startPos: camera.position.clone(),
      endPos: new THREE.Vector3(8, 8, 12),
      startTarget: controls.target.clone(),
      endTarget: new THREE.Vector3(0, 0, 0),
      duration: 500,
      elapsed: 0
    };
  });
}

function snapReset() {
  isAnimating = false;
  animationState = null;
  cameraAnimState = null;
  moveHistory = [];
  camera.position.set(8, 8, 12);
  controls.target.set(0, 0, 0);
  controls.update();
  cubies.forEach(c => {
    const orig = c.userData.originalPos;
    c.position.set(orig.x, orig.y, orig.z);
    c.quaternion.set(0, 0, 0, 1);
  });
}

window.addEventListener('route-changed', (e) => {
  const path = e.detail;
  if (path === '/cubes/5x5x5-cube') {
    isActive = true;
    snapReset();
    controls.enableRotate = true;
  } else {
    isActive = false;
  }
});

// ============================================================
// Mouse Drag Interaction
// ============================================================
const raycaster = new THREE.Raycaster();
const pointerDownPos = new THREE.Vector2();
let isDraggingCube = false;
let isPointerDown = false;
let dragState = null;

function onPointerDown(e) {
  if (!isActive) return;
  isPointerDown = true;
  isDraggingCube = false;
  pointerDownPos.set(e.clientX, e.clientY);

  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(cubies, true);

  if (intersects.length > 0) {
    let piece = intersects[0].object;
    while (piece.parent && piece.parent !== cubeGroup) piece = piece.parent;

    dragState = {
      piece,
      pieceWorldPos: piece.position.clone(),
      faceNormal: intersects[0].face.normal.clone(),
      faceAxis: '',
      faceSign: 0
    };

    const n = dragState.faceNormal;
    if (Math.abs(n.x) > 0.9) { dragState.faceAxis = 'x'; dragState.faceSign = Math.sign(n.x); }
    else if (Math.abs(n.y) > 0.9) { dragState.faceAxis = 'y'; dragState.faceSign = Math.sign(n.y); }
    else if (Math.abs(n.z) > 0.9) { dragState.faceAxis = 'z'; dragState.faceSign = Math.sign(n.z); }

    controls.enableRotate = false;
  }
}

function projectAxisToScreen(axisVec, worldOrigin) {
  const p1 = worldOrigin.clone().project(camera);
  const p2 = worldOrigin.clone().add(axisVec).project(camera);
  return new THREE.Vector2(p2.x - p1.x, p2.y - p1.y).normalize();
}

function onPointerMove(e) {
  if (!isActive || isAnimating || !isPointerDown) return;

  const dx = e.clientX - pointerDownPos.x;
  const dy = e.clientY - pointerDownPos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (!isDraggingCube && dist > 10) {
    isDraggingCube = true;
    if (dragState) {
      handleSliceDrag(dx, dy);
    }
  }
}

function handleSliceDrag(dx, dy) {
  const dragDir = new THREE.Vector2(dx, -dy).normalize(); // Invert Y for screen space
  const candidates = ['x', 'y', 'z'].filter(a => a !== dragState.faceAxis);
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

  const dragSign = dragDir.dot(bestScreenDir) > 0 ? 1 : -1;
  const faceNormalVec = axisVectors[dragState.faceAxis].clone().multiplyScalar(dragState.faceSign);
  const moveAxisVec = axisVectors[bestAxis];
  const cross = new THREE.Vector3().crossVectors(faceNormalVec, moveAxisVec);

  const absCross = new THREE.Vector3(Math.abs(cross.x), Math.abs(cross.y), Math.abs(cross.z));
  let rotAxis, rotSign;
  if (absCross.x >= absCross.y && absCross.x >= absCross.z) {
    rotAxis = 'x'; rotSign = Math.sign(cross.x);
  } else if (absCross.y >= absCross.x && absCross.y >= absCross.z) {
    rotAxis = 'y'; rotSign = Math.sign(cross.y);
  } else {
    rotAxis = 'z'; rotSign = Math.sign(cross.z);
  }

  const sliceVal = Math.round(dragState.piece.position[rotAxis]);
  const angle = (Math.PI / 2) * dragSign * rotSign;
  dragState = null;
  rotateLayer(rotAxis, [sliceVal], angle, 300);
}

function onPointerUp() {
  isPointerDown = false;
  dragState = null;
  if (isActive) controls.enableRotate = true;
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('pointerleave', onPointerUp);

// ============================================================
// Keyboard Controls
// ============================================================
window.addEventListener('keydown', (e) => {
  if (!isActive || isAnimating) return;
  const key = e.key;
  const shift = e.shiftKey;
  if (key === 'ArrowLeft') { rotateWholeCube('y', -Math.PI / 2); return; }
  if (key === 'ArrowRight') { rotateWholeCube('y', Math.PI / 2); return; }
  if (key === 'ArrowUp') { rotateWholeCube('x', -Math.PI / 2); return; }
  if (key === 'ArrowDown') { rotateWholeCube('x', Math.PI / 2); return; }

  const moveKey = shift ? key.toUpperCase() + '_prime' : key.toUpperCase();
  if (MOVES[moveKey]) {
    rotateLayer(...MOVES[moveKey]);
  } else if (key.toLowerCase() === 'r' && shift) rotateLayer(...MOVES['R_prime']);
  else if (key.toLowerCase() === 'l' && shift) rotateLayer(...MOVES['L_prime']);
  else if (key.toLowerCase() === 'u' && shift) rotateLayer(...MOVES['U_prime']);
  else if (key.toLowerCase() === 'd' && shift) rotateLayer(...MOVES['D_prime']);
  else if (key.toLowerCase() === 'f' && shift) rotateLayer(...MOVES['F_prime']);
  else if (key.toLowerCase() === 'b' && shift) rotateLayer(...MOVES['B_prime']);
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
      const anim = cameraAnimState;
      anim.elapsed += delta * 1000;
      const t = Math.min(anim.elapsed / anim.duration, 1);
      const easedT = t * (2 - t);
      camera.position.lerpVectors(anim.startPos, anim.endPos, easedT);
      controls.target.lerpVectors(anim.startTarget, anim.endTarget, easedT);
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
