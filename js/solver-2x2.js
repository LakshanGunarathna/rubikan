import * as THREE from 'three';
import { RUBIKS_CUBE_COLORS as colors, white, yellow, blue, green, red, orange } from './globals.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

import Cube from 'cubejs';

setTimeout(() => Cube.initSolver(), 100);

const container = document.getElementById('app-2x2');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(5, 5, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.enableRotate = false;
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
canvas.width = 256; canvas.height = 256;
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
  color, roughness: 0.9, metalness: 0.1, bumpMap: noiseTexture, bumpScale: 0.003
});

for (let x of [-0.5, 0.5]) {
  for (let y of [-0.5, 0.5]) {
    for (let z of [-0.5, 0.5]) {
      const cubieGroup = new THREE.Group();
      cubieGroup.position.set(x, y, z);

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

// Visual scaling to match aesthetic dimensions
cubeGroup.scale.set(1.5, 1.5, 1.5);

let isAnimating = false;
let animationState = null;

function rotateLayer(axis, layer, angle, duration = 300) {
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

const MOVES = {
  'L': ['x', -0.5, Math.PI / 2], 'R': ['x', 0.5, -Math.PI / 2],
  'U': ['y', 0.5, -Math.PI / 2], 'D': ['y', -0.5, Math.PI / 2],
  'F': ['z', 0.5, -Math.PI / 2], 'B': ['z', -0.5, Math.PI / 2]
};

// Mode handling
let isActive = false;
window.addEventListener('route-changed', (e) => {
  const path = e.detail;
  if (path === '/solver/2x2x2-cube') {
    isActive = true;
    container.style.display = 'block';

    // Reset all stickers to unpainted placeholder when entering mode
    scene.traverse(child => {
      if (child.userData.isSticker) {
        child.material.color.setHex(0x555555);
      }
    });

    document.getElementById('paint-phase-2x2').classList.remove('d-none');
    document.getElementById('playback-phase-2x2').classList.add('d-none');
    document.getElementById('solver-status-2x2').innerText = "";
    document.getElementById('cubeSolvedMsg-2x2').classList.add('d-none');
  } else {
    isActive = false;
    container.style.display = 'none';
    const solvedMsg = document.getElementById('cubeSolvedMsg-2x2');
    if (solvedMsg) solvedMsg.classList.add('d-none');
  }
});

let selectedColorHex = white;
const EXPECTED_COLORS_ARR = [white, yellow, blue, green, red, orange];
const swatches = [];
const paletteContainer = document.querySelector('.color-palette-2x2');
if (paletteContainer) {
  EXPECTED_COLORS_ARR.forEach((colorCode) => {
    const swatch = document.createElement('div');
    swatch.className = 'swatch-2x2 swatch';
    if (colorCode === white) swatch.classList.add('selected');
    swatch.dataset.color = colorCode;
    swatch.style.background = '#' + colorCode.toString(16).padStart(6, '0');

    swatch.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      selectedColorHex = colorCode;
    });

    swatches.push(swatch);
    paletteContainer.appendChild(swatch);
  });
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let pointerDownPos = { x: 0, y: 0 };

const OPPOSITE_COLORS = {};
OPPOSITE_COLORS[white] = yellow;
OPPOSITE_COLORS[yellow] = white;
OPPOSITE_COLORS[blue] = green;
OPPOSITE_COLORS[green] = blue;
OPPOSITE_COLORS[red] = orange;
OPPOSITE_COLORS[orange] = red;

let isDraggingCube = false;
let isPointerDown = false;

window.addEventListener('pointerdown', (e) => {
  if (!isActive) return;
  if (e.target !== renderer.domElement) return;
  pointerDownPos.x = e.clientX;
  pointerDownPos.y = e.clientY;
  isDraggingCube = false;
  isPointerDown = true;

});

window.addEventListener('pointermove', (e) => {
  if (!isActive || isAnimating || isDraggingCube || !isPointerDown) return;
  if (e.target !== renderer.domElement) return;
  const dx = e.clientX - pointerDownPos.x;
  const dy = e.clientY - pointerDownPos.y;
  if (Math.sqrt(dx * dx + dy * dy) < 10) return;
  if (pointerDownPos.x === 0 && pointerDownPos.y === 0) return;
  isDraggingCube = true;
  if (Math.abs(dx) > Math.abs(dy)) {
    rotateWholeCube('y', (Math.PI / 2) * (dx > 0 ? 1 : -1), 300);
  } else {
    rotateWholeCube('x', (Math.PI / 2) * (dy > 0 ? 1 : -1), 300);
  }
});

window.addEventListener('keydown', (e) => {
  if (!isActive || isAnimating) return;
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

window.addEventListener('pointerup', (e) => {
  isPointerDown = false;
  if (!isActive) return;
  if (e.target !== renderer.domElement) return;
  if (!document.getElementById('playback-phase-2x2').classList.contains('d-none')) return;
  if (isAnimating) return;

  const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
  if (dist > 5) return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(cubeGroup.children, true);

  const hit = intersects.find(i => {
    if (!i.object.userData.isSticker) return false;
    const pos = new THREE.Vector3();
    i.object.getWorldPosition(pos);
    return pos.x > 0.8 || pos.y > 0.8 || pos.z > 0.8;
  });

  if (hit) {
    hit.object.material = hit.object.material.clone();
    hit.object.material.color.setHex(selectedColorHex);
    setTimeout(() => autoDeducePieces(), 0);
  }
});

const ALL_COLORS = [white, yellow, blue, green, red, orange];
const VALID_CORNERS = [];
for (let i = 0; i < ALL_COLORS.length; i++) {
  for (let j = i + 1; j < ALL_COLORS.length; j++) {
    for (let k = j + 1; k < ALL_COLORS.length; k++) {
      const c1 = ALL_COLORS[i];
      const c2 = ALL_COLORS[j];
      const c3 = ALL_COLORS[k];
      if (OPPOSITE_COLORS[c1] !== c2 && OPPOSITE_COLORS[c1] !== c3 && OPPOSITE_COLORS[c2] !== c3) {
        VALID_CORNERS.push([c1, c2, c3]);
      }
    }
  }
}

function autoDeducePieces() {
  let madeChanges = false;

  const pieces = [];
  cubies.forEach(cubie => {
    const stickers = cubie.children.filter(c => c.userData && c.userData.isSticker);
    if (stickers.length === 3) {
      pieces.push({
        cubie,
        stickers,
        colors: stickers.map(s => s.material.color.getHex())
      });
    }
  });

  const fullyPaintedCorners = pieces.filter(p => !p.colors.includes(0x555555)).map(p => p.colors);

  pieces.forEach(p => {
    if (p.colors.includes(0x555555)) {
      const paintedColors = p.colors.filter(c => c !== 0x555555);

      if (paintedColors.length === 2) {
        const c1 = paintedColors[0];
        const c2 = paintedColors[1];
        const possibleTriplets = VALID_CORNERS.filter(trip => trip.includes(c1) && trip.includes(c2));
        const remainingTriplets = possibleTriplets.filter(trip => {
          return !fullyPaintedCorners.some(fp => fp.includes(trip[0]) && fp.includes(trip[1]) && fp.includes(trip[2]));
        });

        if (remainingTriplets.length === 1) {
          const deducedColor = remainingTriplets[0].find(c => c !== c1 && c !== c2);
          const unpaintedSticker = p.stickers.find(s => s.material.color.getHex() === 0x555555);
          if (unpaintedSticker) {
            unpaintedSticker.material = unpaintedSticker.material.clone();
            unpaintedSticker.material.color.setHex(deducedColor);
            madeChanges = true;
          }
        }
      }
    }
  });

  if (madeChanges) {
    autoDeducePieces();
  }
}

// Whole-cube rotation
function rotateWholeCube(axis, angle, duration = 300) {
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

document.getElementById('rotLeft-2x2').addEventListener('click', () => rotateWholeCube('y', -Math.PI / 2));
document.getElementById('rotRight-2x2').addEventListener('click', () => rotateWholeCube('y', Math.PI / 2));
document.getElementById('rotUp-2x2').addEventListener('click', () => rotateWholeCube('x', -Math.PI / 2));
document.getElementById('rotDown-2x2').addEventListener('click', () => rotateWholeCube('x', Math.PI / 2));

const confirmResetOverlay = document.getElementById('confirmResetOverlay-2x2');
document.getElementById('btnPaintReset-2x2').addEventListener('click', () => {
  confirmResetOverlay.classList.remove('d-none');
});
document.getElementById('confirmResetCancel-2x2').addEventListener('click', () => {
  confirmResetOverlay.classList.add('d-none');
});
document.getElementById('confirmResetOk-2x2').addEventListener('click', () => {
  confirmResetOverlay.classList.add('d-none');
  scene.traverse(child => {
    if (child.userData.isSticker) child.material.color.setHex(0x555555);
  });
});
confirmResetOverlay.addEventListener('click', (e) => {
  if (e.target === confirmResetOverlay) confirmResetOverlay.classList.add('d-none');
});

const cubeAlreadySolvedOverlay = document.getElementById('cubeAlreadySolvedOverlay-2x2');
document.getElementById('cubeAlreadySolvedClose-2x2').addEventListener('click', () => {
  cubeAlreadySolvedOverlay.classList.add('d-none');
});
cubeAlreadySolvedOverlay.addEventListener('click', (e) => {
  if (e.target === cubeAlreadySolvedOverlay) cubeAlreadySolvedOverlay.classList.add('d-none');
});

const errorPopupOverlay = document.getElementById('errorPopupOverlay-2x2');
const errorList = document.getElementById('errorList-2x2');
document.getElementById('errorPopupClose-2x2').addEventListener('click', () => {
  errorPopupOverlay.classList.add('d-none');
});
errorPopupOverlay.addEventListener('click', (e) => {
  if (e.target === errorPopupOverlay) errorPopupOverlay.classList.add('d-none');
});

const HEX_TO_NAME = {};
HEX_TO_NAME[white] = 'white';
HEX_TO_NAME[yellow] = 'yellow';
HEX_TO_NAME[blue] = 'blue';
HEX_TO_NAME[green] = 'green';
HEX_TO_NAME[red] = 'red';
HEX_TO_NAME[orange] = 'orange';

const EXPECTED_COLORS = [white, yellow, blue, green, red, orange];

function showErrorPopup(messages) {
  errorList.innerHTML = '';
  messages.forEach(msg => {
    const li = document.createElement('li');
    li.textContent = msg;
    errorList.appendChild(li);
  });
  errorPopupOverlay.classList.remove('d-none');
  document.getElementById('solver-status-2x2').innerText = '';
}

function getCubeArray2x2() {
  const colorMap = {};
  colorMap[yellow] = 0;
  colorMap[green] = 1;
  colorMap[orange] = 2;
  colorMap[white] = 3;
  colorMap[blue] = 4;
  colorMap[red] = 5;

  let getColorIndex = (x, y, z, faceAxis) => {
    const cubie = cubies.find(c => Math.abs(c.position.x - x) < 0.1 && Math.abs(c.position.y - y) < 0.1 && Math.abs(c.position.z - z) < 0.1);
    if (!cubie) throw new Error(`Missing cubie at ${x},${y},${z}`);

    const sticker = cubie.children.find(child => {
      if (!child.userData || !child.userData.isSticker) return false;
      const childWorldPos = new THREE.Vector3();
      child.getWorldPosition(childWorldPos);
      const cubieWorldPos = new THREE.Vector3();
      cubie.getWorldPosition(cubieWorldPos);
      const diff = childWorldPos.clone().sub(cubieWorldPos);
      return Math.abs(diff[faceAxis]) > 0.1;
    });

    if (!sticker) return -1;
    const hex = sticker.material.color.getHex();
    if (colorMap[hex] === undefined && hex !== 0x555555) throw new Error("Unknown color");
    return hex === 0x555555 ? -1 : colorMap[hex];
  };

  const posit = new Array(24);
  posit[15] = getColorIndex(0.5, 0.5, 0.5, 'y');
  posit[14] = getColorIndex(-0.5, 0.5, 0.5, 'y');
  posit[13] = getColorIndex(0.5, 0.5, -0.5, 'y');
  posit[12] = getColorIndex(-0.5, 0.5, -0.5, 'y');

  posit[3] = getColorIndex(0.5, -0.5, 0.5, 'y');
  posit[2] = getColorIndex(-0.5, -0.5, 0.5, 'y');
  posit[1] = getColorIndex(0.5, -0.5, -0.5, 'y');
  posit[0] = getColorIndex(-0.5, -0.5, -0.5, 'y');

  posit[21] = getColorIndex(0.5, 0.5, 0.5, 'z');
  posit[20] = getColorIndex(-0.5, 0.5, 0.5, 'z');
  posit[23] = getColorIndex(0.5, -0.5, 0.5, 'z');
  posit[22] = getColorIndex(-0.5, -0.5, 0.5, 'z');

  posit[9] = getColorIndex(0.5, 0.5, -0.5, 'z');
  posit[8] = getColorIndex(-0.5, 0.5, -0.5, 'z');
  posit[11] = getColorIndex(0.5, -0.5, -0.5, 'z');
  posit[10] = getColorIndex(-0.5, -0.5, -0.5, 'z');

  posit[16] = getColorIndex(0.5, 0.5, 0.5, 'x');
  posit[17] = getColorIndex(0.5, 0.5, -0.5, 'x');
  posit[18] = getColorIndex(0.5, -0.5, 0.5, 'x');
  posit[19] = getColorIndex(0.5, -0.5, -0.5, 'x');

  posit[4] = getColorIndex(-0.5, 0.5, 0.5, 'x');
  posit[5] = getColorIndex(-0.5, 0.5, -0.5, 'x');
  posit[6] = getColorIndex(-0.5, -0.5, 0.5, 'x');
  posit[7] = getColorIndex(-0.5, -0.5, -0.5, 'x');

  if (posit.includes(-1)) throw new Error("Cube is not fully painted!");
  return posit;
}

const Rubiks2x2Solver = (function () {
  let perm = [];
  let twst = [];
  let permmv = [];
  let twstmv = [];
  let isInitialized = false;
  let sol = [];

  // Core piece map from the original logic
  const piece = [
    15, 16, 16, 21, 21, 15, 13, 9, 9, 17, 17, 13, 14, 20, 20, 4, 4, 14, 12, 5, 5, 8, 8, 12,
    3, 23, 23, 18, 18, 3, 1, 19, 19, 11, 11, 1, 2, 6, 6, 22, 22, 2, 0, 10, 10, 7, 7, 0
  ];

  function getprmmv(p, m) {
    let a, b, c, q;
    let ps = new Array(8);
    q = p;
    for (a = 1; a <= 7; a++) {
      b = q % a;
      q = (q - b) / a;
      for (c = a - 1; c >= b; c--) ps[c + 1] = ps[c];
      ps[b] = 7 - a;
    }
    if (m === 0) {
      c = ps[0]; ps[0] = ps[1]; ps[1] = ps[3]; ps[3] = ps[2]; ps[2] = c;
    } else if (m === 1) {
      c = ps[0]; ps[0] = ps[4]; ps[4] = ps[5]; ps[5] = ps[1]; ps[1] = c;
    } else if (m === 2) {
      c = ps[0]; ps[0] = ps[2]; ps[2] = ps[6]; ps[6] = ps[4]; ps[4] = c;
    }
    q = 0;
    for (a = 0; a < 7; a++) {
      b = 0;
      for (c = 0; c < 7; c++) {
        if (ps[c] === a) break;
        if (ps[c] > a) b++;
      }
      q = q * (7 - a) + b;
    }
    return q;
  }

  function gettwsmv(p, m) {
    let a, b, c, d, q;
    let ps = new Array(7);
    q = p;
    d = 0;
    for (a = 0; a <= 5; a++) {
      c = Math.floor(q / 3);
      b = q - 3 * c;
      q = c;
      ps[a] = b;
      d -= b;
      if (d < 0) d += 3;
    }
    ps[6] = d;
    if (m === 0) {
      c = ps[0]; ps[0] = ps[1]; ps[1] = ps[3]; ps[3] = ps[2]; ps[2] = c;
    } else if (m === 1) {
      c = ps[0]; ps[0] = ps[4]; ps[4] = ps[5]; ps[5] = ps[1]; ps[1] = c;
      ps[0] += 2; ps[1]++; ps[5] += 2; ps[4]++;
    } else if (m === 2) {
      c = ps[0]; ps[0] = ps[2]; ps[2] = ps[6]; ps[6] = ps[4]; ps[4] = c;
      ps[2] += 2; ps[0]++; ps[4] += 2; ps[6]++;
    }
    q = 0;
    for (a = 5; a >= 0; a--) {
      q = q * 3 + (ps[a] % 3);
    }
    return q;
  }

  // Pre-calculate tables to make searching instantaneous
  function init() {
    if (isInitialized) return;

    for (let p = 0; p < 5040; p++) {
      perm[p] = -1;
      permmv[p] = [];
      for (let m = 0; m < 3; m++) {
        permmv[p][m] = getprmmv(p, m);
      }
    }
    perm[0] = 0;
    for (let l = 0; l <= 6; l++) {
      for (let p = 0; p < 5040; p++) {
        if (perm[p] === l) {
          for (let m = 0; m < 3; m++) {
            let q = p;
            for (let c = 0; c < 3; c++) {
              q = permmv[q][m];
              if (perm[q] === -1) perm[q] = l + 1;
            }
          }
        }
      }
    }

    for (let p = 0; p < 729; p++) {
      twst[p] = -1;
      twstmv[p] = [];
      for (let m = 0; m < 3; m++) {
        twstmv[p][m] = gettwsmv(p, m);
      }
    }
    twst[0] = 0;
    for (let l = 0; l <= 5; l++) {
      for (let p = 0; p < 729; p++) {
        if (twst[p] === l) {
          for (let m = 0; m < 3; m++) {
            let q = p;
            for (let c = 0; c < 3; c++) {
              q = twstmv[q][m];
              if (twst[q] === -1) twst[q] = l + 1;
            }
          }
        }
      }
    }
    isInitialized = true;
  }

  function search(d, q, t, l, lm) {
    if (l === 0) {
      if (q === 0 && t === 0) return true;
    } else {
      if (perm[q] > l || twst[t] > l) return false;
      for (let m = 0; m < 3; m++) {
        if (m !== lm) {
          let p = q;
          let s = t;
          for (let a = 0; a < 3; a++) {
            p = permmv[p][m];
            s = twstmv[s][m];
            sol[d] = 10 * m + a;
            if (search(d + 1, p, s, l - 1, m)) return true;
          }
        }
      }
    }
    return false;
  }

  function solve(posit) {
    if (posit.length !== 24) return "Error: Cube state must contain exactly 24 facelets.";

    init(); // Ensure tables are built (takes < 100ms on first run)

    let adj = Array.from({ length: 6 }, () => Array(6).fill(0));

    // Count adjacent pairs
    for (let a = 0; a < 48; a += 2) {
      if (posit[piece[a]] <= 5 && posit[piece[a + 1]] <= 5) {
        adj[posit[piece[a]]][posit[piece[a + 1]]]++;
      }
    }

    let opp = [];
    for (let a = 0; a < 6; a++) {
      for (let b = 0; b < 6; b++) {
        if (a !== b && adj[a][b] + adj[b][a] === 0) {
          opp[a] = b;
          opp[b] = a;
        }
      }
    }

    let ps = [];
    let tws = [];
    let a = 0;
    for (let d = 0; d < 7; d++) {
      let p = 0;
      for (let b = a; b < a + 6; b += 2) {
        if (posit[piece[b]] === posit[piece[42]]) p += 4;
        if (posit[piece[b]] === posit[piece[44]]) p += 1;
        if (posit[piece[b]] === posit[piece[46]]) p += 2;
      }
      ps[d] = p;
      if (posit[piece[a]] === posit[piece[42]] || posit[piece[a]] === opp[posit[piece[42]]]) tws[d] = 0;
      else if (posit[piece[a + 2]] === posit[piece[42]] || posit[piece[a + 2]] === opp[posit[piece[42]]]) tws[d] = 1;
      else tws[d] = 2;
      a += 6;
    }

    let q = 0;
    for (let a = 0; a < 7; a++) {
      let b = 0;
      for (let c = 0; c < 7; c++) {
        if (ps[c] === a) break;
        if (ps[c] > a) b++;
      }
      q = q * (7 - a) + b;
    }

    let t = 0;
    for (let a = 5; a >= 0; a--) {
      t = t * 3 + tws[a] - 3 * Math.floor(tws[a] / 3);
    }

    if (q === 0 && t === 0) return []; // Already solved

    sol = [];
    let found = false;
    // Max depth is 11 for a 2x2x2 cube
    for (let l = 0; l <= 11; l++) {
      if (search(0, q, t, l, -1)) {
        found = true;
        break;
      }
    }

    if (!found) return "Error: Unsolvable cube state.";

    let moveList = [];
    for (let i = 0; i < sol.length; i++) {
      let move = "URF".charAt(Math.floor(sol[i] / 10));
      let suffix = " 2'".charAt(sol[i] % 10).trim(); // Remove space for single moves
      moveList.push(move + suffix);
    }

    return moveList;
  }

  return {
    solve: solve,
    init: init
  };
})();

let solutionSteps = [];
let currentStepIndex = 0;
let lastActionDirection = 1;

document.getElementById('btnStartSolve-2x2').addEventListener('click', () => {
  try {
    document.getElementById('solver-status-2x2').innerText = "Validating...";

    const colorCounts = {};
    let hasUnpainted = false;

    cubies.forEach(cubie => {
      const stickers = cubie.children.filter(c => c.userData && c.userData.isSticker);
      stickers.forEach(s => {
        const hex = s.material.color.getHex();
        if (hex === 0x555555) hasUnpainted = true;
        else colorCounts[hex] = (colorCounts[hex] || 0) + 1;
      });
    });

    const colorErrors = [];
    if (hasUnpainted) {
      colorErrors.push('You have unpainted tiles on the cube.');
    }

    EXPECTED_COLORS.forEach(hex => {
      const name = HEX_TO_NAME[hex];
      const count = colorCounts[hex] || 0;
      if (count < 4) colorErrors.push(`You do not have enough ${name} tiles. (${count}/4)`);
      else if (count > 4) colorErrors.push(`You have too many ${name} tiles. (${count}/4)`);
    });
    const usedHexes = Object.keys(colorCounts).map(Number);
    const unexpectedColors = usedHexes.filter(h => !EXPECTED_COLORS.includes(h));
    if (unexpectedColors.length > 0) colorErrors.push('Some tiles use unexpected colors.');

    if (colorErrors.length > 0) {
      showErrorPopup(colorErrors);
      return;
    }

    document.getElementById('solver-status-2x2').innerText = "Calculating Solution...";
    const posit = getCubeArray2x2();

    const movesArr = Rubiks2x2Solver.solve(posit);
    if (typeof movesArr === 'string') {
      throw new Error(movesArr); // "Error: Unsolvable cube state."
    }

    if (movesArr.length === 0) {
      document.getElementById('solver-status-2x2').innerText = "";
      document.getElementById('cubeAlreadySolvedOverlay-2x2').classList.remove('d-none');
      return;
    }

    solutionSteps = [];
    for (let m of movesArr) {
      let face = m[0];
      let modifier = m.length > 1 ? m[1] : '';

      let moveDef = MOVES[face];
      let angle = moveDef[2];
      if (modifier === "'") angle = -angle;
      if (modifier === "2") angle = angle * 2;

      solutionSteps.push({ raw: m, axis: moveDef[0], layer: moveDef[1], angle: angle });
    }

    // Show loading overlay for 3 seconds before transitioning to playback
    const loadingOverlay = document.getElementById('solverLoadingOverlay-2x2');
    loadingOverlay.classList.remove('d-none');
    document.getElementById('solver-status-2x2').innerText = "";

    solveDelayTimer = setTimeout(() => {
      loadingOverlay.classList.add('d-none');
      currentStepIndex = 0;
      lastActionDirection = 1;
      document.getElementById('paint-phase-2x2').classList.add('d-none');
      document.getElementById('playback-phase-2x2').classList.remove('d-none');
      updatePlaybackUI();
      if (typeof gtag === 'function') gtag('event', 'solve_started', { 'cube_size': '2x2x2' });
    }, 3000);

  } catch (err) {
    const loadingOverlay2 = document.getElementById('solverLoadingOverlay-2x2');
    if (loadingOverlay2) loadingOverlay2.classList.add('d-none');
    showErrorPopup(['Your puzzle cannot be solved.']);
    console.error(err);
  }
});

let solveDelayTimer = null;
document.getElementById('btnCancelSolve-2x2').addEventListener('click', () => {
  if (solveDelayTimer) {
    clearTimeout(solveDelayTimer);
    solveDelayTimer = null;
  }
  document.getElementById('solverLoadingOverlay-2x2').classList.add('d-none');
});

const FACE_NAMES = { 'U': 'TOP', 'D': 'BOTTOM', 'F': 'FRONT', 'B': 'BACK', 'L': 'LEFT', 'R': 'RIGHT' };

function getHumanReadableMove(rawMove) {
  const face = rawMove[0];
  const mod = rawMove.length > 1 ? rawMove[1] : '';
  const faceName = FACE_NAMES[face];
  if (mod === "'") return `Turn the ${faceName} layer 90° counterclockwise.`;
  if (mod === "2") return `Turn the ${faceName} layer 180°.`;
  return `Turn the ${faceName} layer 90° clockwise.`;
}

function getReverseHumanReadableMove(rawMove) {
  const face = rawMove[0];
  const mod = rawMove.length > 1 ? rawMove[1] : '';
  const faceName = FACE_NAMES[face];
  if (mod === "'") return `Turn the ${faceName} layer 90° clockwise.`;
  if (mod === "2") return `Turn the ${faceName} layer 180°.`;
  return `Turn the ${faceName} layer 90° counterclockwise.`;
}

function getInverseMoveNotation(rawMove) {
  const face = rawMove[0];
  const mod = rawMove.length > 1 ? rawMove[1] : '';
  if (mod === "'") return face;
  if (mod === "2") return face + "2'";
  return face + "'";
}

function updatePlaybackUI() {
  const humanInstruction = document.getElementById('humanInstruction-2x2');
  const solutionText = document.getElementById('solutionText-2x2');
  const btnSideBack = document.getElementById('btnSideBack-2x2');
  const btnSideNext = document.getElementById('btnSideNext-2x2');
  const cubeSolvedMsg = document.getElementById('cubeSolvedMsg-2x2');

  if (currentStepIndex === 0 && lastActionDirection === 1) {
    humanInstruction.innerText = `Hold your puzzle as shown below, hit "next" to start.`;
    solutionText.innerHTML = "READY TO SOLVE!";
    btnSideBack.disabled = true;
    btnSideNext.disabled = false;
    btnSideNext.innerHTML = 'Next &gt;';
    if (cubeSolvedMsg) cubeSolvedMsg.classList.add('d-none');
    return;
  }

  if (lastActionDirection === -1) {
    const move = solutionSteps[currentStepIndex];
    humanInstruction.innerText = getReverseHumanReadableMove(move.raw);
    let txt = `<span style="color:#eab308">Undo</span> Step ${currentStepIndex + 1} / ${solutionSteps.length}: `;
    txt += `<strong style="color:#eab308">${getInverseMoveNotation(move.raw)}</strong>`;
    solutionText.innerHTML = txt;
    btnSideBack.disabled = currentStepIndex <= 0;
    btnSideNext.disabled = false;
    btnSideNext.innerHTML = 'Next &gt;';
    if (cubeSolvedMsg) cubeSolvedMsg.classList.add('d-none');
    return;
  }

  const move = solutionSteps[currentStepIndex - 1];
  humanInstruction.innerText = getHumanReadableMove(move.raw);
  let txt = `Step ${currentStepIndex} / ${solutionSteps.length}: `;
  txt += `<strong style="color:#2563eb">${move.raw}</strong>`;
  solutionText.innerHTML = txt;
  btnSideBack.disabled = false;

  if (currentStepIndex >= solutionSteps.length) {
    btnSideNext.disabled = true;
    btnSideNext.innerHTML = 'Done!';
    if (cubeSolvedMsg) {
      if (cubeSolvedMsg.classList.contains('d-none')) {
        cubeSolvedMsg.classList.remove('d-none');
        if (typeof gtag === 'function') gtag('event', 'cube_solved', { 'cube_size': '2x2x2' });
      }
    }
  } else {
    btnSideNext.disabled = false;
    btnSideNext.innerHTML = 'Next &gt;';
    if (cubeSolvedMsg) cubeSolvedMsg.classList.add('d-none');
  }
}

async function handleNext() {
  if (isAnimating || currentStepIndex >= solutionSteps.length) return;
  let move = solutionSteps[currentStepIndex];
  lastActionDirection = 1;
  currentStepIndex++;
  updatePlaybackUI();
  await rotateLayer(move.axis, move.layer, move.angle, 600);
}

async function handleBack() {
  if (isAnimating || currentStepIndex <= 0) return;
  currentStepIndex--;
  lastActionDirection = -1;
  let move = solutionSteps[currentStepIndex];
  updatePlaybackUI();
  await rotateLayer(move.axis, move.layer, -move.angle, 600);
}

document.getElementById('btnSideNext-2x2').addEventListener('click', handleNext);
document.getElementById('btnSideBack-2x2').addEventListener('click', handleBack);

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
