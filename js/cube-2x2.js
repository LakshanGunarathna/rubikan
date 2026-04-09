import * as THREE from 'three';
import { RUBIKS_CUBE_COLORS as colors } from './globals.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
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
let isActive = false;
let moveHistory = [];

function rotateLayer(axis, layer, angle, duration = 300, record = true) {
  if (record) {
    moveHistory.push({ axis, layer, angle });
  }
  return new Promise((resolve) => {
    if (isAnimating && duration > 0) return;
    isAnimating = true;

    const activeCubies = cubies.filter(c => Math.abs(c.position[axis] - layer) < 0.1);

    const pivot = new THREE.Group();
    cubeGroup.add(pivot);
    activeCubies.forEach(c => pivot.attach(c));

    const targetProps = { val: angle };

    if (duration > 0) {
      new TWEEN.Tween({ val: 0 })
        .to(targetProps, duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate((obj) => pivot.rotation[axis] = obj.val)
        .onComplete(() => finishRotation(pivot, activeCubies, resolve))
        .start();
    } else {
      pivot.rotation[axis] = angle;
      finishRotation(pivot, activeCubies, resolve);
    }
  });
}

function finishRotation(pivot, activeCubies, resolve) {
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
  cubeGroup.remove(pivot);
  isAnimating = false;
  if (resolve) resolve();
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
      await rotateLayer(m.axis, m.layer, -m.angle, 150, false);
    }
  });
}

const resetOrientationBtn = document.getElementById('resetOrientationBtn-2x2');
if (resetOrientationBtn) {
  resetOrientationBtn.addEventListener('click', () => {
    if (!isActive) return;
    new TWEEN.Tween(camera.position).to({ x: 5, y: 5, z: 8 }, 500).easing(TWEEN.Easing.Quadratic.Out).start();
    new TWEEN.Tween(controls.target).to({ x: 0, y: 0, z: 0 }, 500).easing(TWEEN.Easing.Quadratic.Out).start();
  });
}

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

function animate(time) {
  requestAnimationFrame(animate);
  if (isActive) {
    TWEEN.update(time);
    controls.update();
    renderer.render(scene, camera);
  }
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
