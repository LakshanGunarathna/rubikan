import * as THREE from 'three';
import { RUBIKS_CUBE_COLORS as colors, white, yellow, blue, green, red, orange } from './globals.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as TWEEN from '@tweenjs/tween.js';

const container = document.getElementById('app-5x5');
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

for (let x of [-2, -1, 0, 1, 2]) {
  for (let y of [-2, -1, 0, 1, 2]) {
    for (let z of [-2, -1, 0, 1, 2]) {
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

function rotateLayer(axis, layers, angle, duration = 300) {
  return new Promise((resolve) => {
    if (isAnimating && duration > 0) return;
    isAnimating = true;

    const activeCubies = cubies.filter(c => {
      const pos = Math.round(c.position[axis]);
      return layers.some(l => Math.abs(pos - l) < 0.1);
    });

    const pivot = new THREE.Group();
    cubeGroup.add(pivot);
    activeCubies.forEach(c => pivot.attach(c));

    if (duration > 0) {
      new TWEEN.Tween({ val: 0 })
        .to({ val: angle }, duration)
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
    c.position.x = Math.round(c.position.x);
    c.position.y = Math.round(c.position.y);
    c.position.z = Math.round(c.position.z);

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

function rotateWholeCube(axis, angle) {
  if (isAnimating) return;
  isAnimating = true;

  const pivot = new THREE.Group();
  cubeGroup.add(pivot);
  cubies.forEach(c => pivot.attach(c));

  new TWEEN.Tween({ val: 0 })
    .to({ val: angle }, 300)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate((obj) => pivot.rotation[axis] = obj.val)
    .onComplete(() => finishRotation(pivot, cubies))
    .start();
}

// Mode Selection
let isActive = false;
window.addEventListener('route-changed', (e) => {
  const path = e.detail;
  if (path === '/solver/5x5x5-cube') {
    isActive = true;
    container.style.display = 'block';

    scene.traverse(child => {
      if (child.userData.isSticker) {
        child.material.color.setHex(0x555555);
      }
    });

    document.getElementById('paint-phase-5x5').classList.remove('d-none');
    document.getElementById('playback-phase-5x5').classList.add('d-none');
    document.getElementById('solver-status-5x5').innerText = "";
    document.getElementById('cubeSolvedMsg-5x5').classList.add('d-none');
  } else {
    document.getElementById('solve-5x5-view').classList.add('d-none');
    container.style.display = 'none';
    const solvedMsg = document.getElementById('cubeSolvedMsg-5x5');
    if (solvedMsg) solvedMsg.classList.add('d-none');
  }
});

const OPPOSITE_COLORS = {};
OPPOSITE_COLORS[white] = yellow;
OPPOSITE_COLORS[yellow] = white;
OPPOSITE_COLORS[blue] = green;
OPPOSITE_COLORS[green] = blue;
OPPOSITE_COLORS[red] = orange;
OPPOSITE_COLORS[orange] = red;

const ALL_COLORS = [white, yellow, blue, green, red, orange];

const VALID_EDGES = [];
for (let i = 0; i < ALL_COLORS.length; i++) {
  for (let j = i + 1; j < ALL_COLORS.length; j++) {
    const c1 = ALL_COLORS[i];
    const c2 = ALL_COLORS[j];
    if (OPPOSITE_COLORS[c1] !== c2) {
      VALID_EDGES.push([c1, c2]);
    }
  }
}

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
    if (stickers.length > 1) { // edges and corners
      pieces.push({
        cubie,
        stickers,
        colors: stickers.map(s => s.material.color.getHex()),
        isEdge: stickers.length === 2,
        isCorner: stickers.length === 3
      });
    }
  });

  const fullyPaintedEdges = pieces.filter(p => p.isEdge && !p.colors.includes(0x555555)).map(p => p.colors);
  const fullyPaintedCorners = pieces.filter(p => p.isCorner && !p.colors.includes(0x555555)).map(p => p.colors);

  pieces.forEach(p => {
    if (p.colors.includes(0x555555)) {
      const paintedColors = p.colors.filter(c => c !== 0x555555);
      if (p.isEdge && paintedColors.length === 1) {
        const c1 = paintedColors[0];
        const possiblePairs = VALID_EDGES.filter(pair => pair.includes(c1));
        const remainingPairs = possiblePairs.filter(pair => {
          const count = fullyPaintedEdges.filter(fp => fp.includes(pair[0]) && fp.includes(pair[1])).length;
          return count < 3; // 3 edges per physical edge group on a 5x5
        });
        if (remainingPairs.length === 1) {
          const deducedColor = remainingPairs[0].find(c => c !== c1);
          const unpaintedSticker = p.stickers.find(s => s.material.color.getHex() === 0x555555);
          if (unpaintedSticker) {
            unpaintedSticker.material = unpaintedSticker.material.clone();
            unpaintedSticker.material.color.setHex(deducedColor);
            madeChanges = true;
          }
        }
      } else if (p.isCorner && paintedColors.length === 2) {
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

  if (madeChanges) autoDeducePieces();
}

const CANONICAL_NORMALS = {};
CANONICAL_NORMALS[white] = new THREE.Vector3(0, 1, 0);
CANONICAL_NORMALS[yellow] = new THREE.Vector3(0, -1, 0);
CANONICAL_NORMALS[red] = new THREE.Vector3(0, 0, 1);
CANONICAL_NORMALS[orange] = new THREE.Vector3(0, 0, -1);
CANONICAL_NORMALS[blue] = new THREE.Vector3(1, 0, 0);
CANONICAL_NORMALS[green] = new THREE.Vector3(-1, 0, 0);

const COLOR_FROM_NORMAL = {
  "0,1,0": white, "0,-1,0": yellow,
  "0,0,1": red, "0,0,-1": orange,
  "1,0,0": blue, "-1,0,0": green
};

function autoFillCenters() {
  const centerStickers = [];
  cubies.forEach(c => {
    const px = Math.round(c.position.x);
    const py = Math.round(c.position.y);
    const pz = Math.round(c.position.z);

    if ((Math.abs(px) === 2 && py === 0 && pz === 0) ||
      (Math.abs(py) === 2 && px === 0 && pz === 0) ||
      (Math.abs(pz) === 2 && px === 0 && py === 0)) {

      const st = c.children.find(child => child.userData && child.userData.isSticker);
      if (st) {
        centerStickers.push({
          sticker: st,
          normal: new THREE.Vector3(px / 2, py / 2, pz / 2),
          color: st.material.color.getHex()
        });
      }
    }
  });

  const painted = centerStickers.filter(s => s.color !== 0x555555);
  let s1 = null, s2 = null;
  for (let i = 0; i < painted.length; i++) {
    for (let j = i + 1; j < painted.length; j++) {
      if (painted[i].normal.dot(painted[j].normal) === 0) {
        s1 = painted[i];
        s2 = painted[j];
        break;
      }
    }
    if (s1) break;
  }

  if (s1 && s2) {
    const v1 = CANONICAL_NORMALS[s1.color];
    const v2 = CANONICAL_NORMALS[s2.color];
    if (!v1 || !v2) return;

    const n3 = new THREE.Vector3().crossVectors(s1.normal, s2.normal);
    const v3 = new THREE.Vector3().crossVectors(v1, v2);

    const mapping = [
      { n: s1.normal, v: v1 },
      { n: new THREE.Vector3(-s1.normal.x, -s1.normal.y, -s1.normal.z), v: new THREE.Vector3(-v1.x, -v1.y, -v1.z) },
      { n: s2.normal, v: v2 },
      { n: new THREE.Vector3(-s2.normal.x, -s2.normal.y, -s2.normal.z), v: new THREE.Vector3(-v2.x, -v2.y, -v2.z) },
      { n: n3, v: v3 },
      { n: new THREE.Vector3(-n3.x, -n3.y, -n3.z), v: new THREE.Vector3(-v3.x, -v3.y, -v3.z) }
    ];

    centerStickers.forEach(cs => {
      const mapItem = mapping.find(m => m.n.equals(cs.normal));
      if (mapItem) {
        const canonicalKey = `${Math.round(mapItem.v.x)},${Math.round(mapItem.v.y)},${Math.round(mapItem.v.z)}`;
        const targetHex = COLOR_FROM_NORMAL[canonicalKey];
        if (targetHex !== undefined && cs.color !== targetHex) {
          cs.sticker.material = cs.sticker.material.clone();
          cs.sticker.material.color.setHex(targetHex);
        }
      }
    });
  }
}

// Color Palette Setup
let selectedColorHex = white;
const EXPECTED_COLORS_ARR = [white, yellow, blue, green, red, orange];
const swatches = [];
const paletteContainer = document.querySelector('.color-palette-5x5');
if (paletteContainer) {
  EXPECTED_COLORS_ARR.forEach((colorCode) => {
    const swatch = document.createElement('div');
    swatch.className = 'swatch-5x5 swatch';
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

// Painting Interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let pointerDownPos = { x: 0, y: 0 };

window.addEventListener('pointerdown', (e) => {
  if (!isActive) return;
  if (e.target !== renderer.domElement) return;
  pointerDownPos.x = e.clientX;
  pointerDownPos.y = e.clientY;
});

window.addEventListener('pointerup', (e) => {
  if (!isActive) return;
  if (e.target !== renderer.domElement) return;
  if (document.getElementById('paint-phase-5x5').classList.contains('d-none')) return;
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
    return pos.x > 2.4 || pos.y > 2.4 || pos.z > 2.4;
  });

  if (hit) {
    hit.object.material = hit.object.material.clone();
    hit.object.material.color.setHex(selectedColorHex);

    const px = Math.round(hit.object.parent.position.x);
    const py = Math.round(hit.object.parent.position.y);
    const pz = Math.round(hit.object.parent.position.z);

    // Check if it is a central piece
    const isCenter = (Math.abs(px) === 2 && py === 0 && pz === 0) ||
      (Math.abs(py) === 2 && px === 0 && pz === 0) ||
      (Math.abs(pz) === 2 && px === 0 && py === 0);

    if (isCenter && OPPOSITE_COLORS[selectedColorHex] !== undefined) {
      const oppP = cubies.find(op => Math.round(op.position.x) === -px && Math.round(op.position.y) === -py && Math.round(op.position.z) === -pz);
      if (oppP) {
        const oppSticker = oppP.children.find(c => c.userData && c.userData.isSticker);
        if (oppSticker) {
          oppSticker.material = oppSticker.material.clone();
          oppSticker.material.color.setHex(OPPOSITE_COLORS[selectedColorHex]);
        }
      }
    } else {
      setTimeout(() => autoDeducePieces(), 0);
    }
    autoFillCenters();
  }
});

// UI Controls
document.getElementById('rotLeft-5x5').addEventListener('click', () => rotateWholeCube('y', -Math.PI / 2));
document.getElementById('rotRight-5x5').addEventListener('click', () => rotateWholeCube('y', Math.PI / 2));
document.getElementById('rotUp-5x5').addEventListener('click', () => rotateWholeCube('x', -Math.PI / 2));
document.getElementById('rotDown-5x5').addEventListener('click', () => rotateWholeCube('x', Math.PI / 2));

const confirmResetOverlay = document.getElementById('confirmResetOverlay-5x5');
document.getElementById('btnPaintReset-5x5').addEventListener('click', () => {
  confirmResetOverlay.classList.remove('d-none');
});
document.getElementById('confirmResetCancel-5x5').addEventListener('click', () => {
  confirmResetOverlay.classList.add('d-none');
});
document.getElementById('confirmResetOk-5x5').addEventListener('click', () => {
  confirmResetOverlay.classList.add('d-none');
  scene.traverse(child => {
    if (child.userData.isSticker) child.material.color.setHex(0x555555);
  });
});

const cubeAlreadySolvedOverlay = document.getElementById('cubeAlreadySolvedOverlay-5x5');
document.getElementById('cubeAlreadySolvedClose-5x5').addEventListener('click', () => {
  cubeAlreadySolvedOverlay.classList.add('d-none');
});
cubeAlreadySolvedOverlay.addEventListener('click', (e) => {
  if (e.target === cubeAlreadySolvedOverlay) cubeAlreadySolvedOverlay.classList.add('d-none');
});

const errorPopupOverlay = document.getElementById('errorPopupOverlay-5x5');
const errorList = document.getElementById('errorList-5x5');
document.getElementById('errorPopupClose-5x5').addEventListener('click', () => {
  errorPopupOverlay.classList.add('d-none');
});

const HEX_TO_NAME = {};
HEX_TO_NAME[white] = 'white';
HEX_TO_NAME[yellow] = 'yellow';
HEX_TO_NAME[blue] = 'blue';
HEX_TO_NAME[green] = 'green';
HEX_TO_NAME[red] = 'red';
HEX_TO_NAME[orange] = 'orange';

function showErrorPopup(messages) {
  errorList.innerHTML = '';
  messages.forEach(msg => {
    const li = document.createElement('li');
    li.textContent = msg;
    errorList.appendChild(li);
  });
  errorPopupOverlay.classList.remove('d-none');
  document.getElementById('solver-status-5x5').innerText = '';
}

document.getElementById('btnStartSolve-5x5').addEventListener('click', () => {
  try {
    document.getElementById('solver-status-5x5').innerText = "Validating...";
    const colorCounts = {};
    let hasUnpainted = false;

    cubies.forEach(cubie => {
      const stickers = cubie.children.filter(c => c.userData && c.userData.isSticker);
      stickers.forEach(s => {
        const hex = s.material.color.getHex();
        if (hex === 0x555555) hasUnpainted = true;
        else {
          colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }
      });
    });

    const EXPECTED_COLORS = [white, yellow, blue, green, red, orange];
    const errors = [];
    if (hasUnpainted) errors.push('You have unpainted tiles on the cube.');

    EXPECTED_COLORS.forEach(hex => {
      const count = colorCounts[hex] || 0;
      const name = HEX_TO_NAME[hex];
      if (count < 25) errors.push(`You do not have enough ${name} tiles. (${count}/25)`);
      else if (count > 25) errors.push(`You have too many ${name} tiles. (${count}/25)`);
    });

    if (errors.length > 0) {
      showErrorPopup(errors);
      return;
    }

    const statusEl = document.getElementById('solver-status-5x5');
    const loadingOverlay = document.getElementById('solverLoadingOverlay-5x5');

    loadingOverlay.classList.remove('d-none');
    statusEl.innerText = "";

    const stateStr = getCubeString();

    let isSolved = true;
    for (let i = 0; i < 150; i += 25) {
      const segment = stateStr.substring(i, i + 25);
      if (new Set(segment).size > 1) {
        isSolved = false;
        break;
      }
    }

    if (isSolved) {
      loadingOverlay.classList.add('d-none');
      document.getElementById('cubeAlreadySolvedOverlay-5x5').classList.remove('d-none');
      return;
    }

    solveAbortController = new AbortController();

    const apiBaseUrl = 'https://cubesolverapi-917370863662.europe-west1.run.app';
    fetch(`${apiBaseUrl}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: stateStr }),
      signal: solveAbortController.signal
    })
      .then(res => res.json())
      .then(data => {
        loadingOverlay.classList.add('d-none');

        if (data.error) {
          showErrorPopup([data.error, ...(data.details ? [data.details] : [])]);
          return;
        }

        let rawOut = data.solution || data.raw;
        let moveline = rawOut.split('\n').find(l => l.includes('Solution:')) || rawOut;
        let moveStr = moveline.replace('Solution:', '').trim();

        solutionSteps = [];
        const movesArr = moveStr.split(' ').filter(m => m);
        for (let m of movesArr) {
          let mapped = mapWcaToRotation5x5(m);
          if (mapped) {
            solutionSteps.push({ raw: m, axis: mapped.axis, layer: mapped.layers, angle: mapped.angle });
          }
        }

        currentStepIndex = 0;
        lastActionDirection = 1;
        document.getElementById('paint-phase-5x5').classList.add('d-none');
        document.getElementById('playback-phase-5x5').classList.remove('d-none');
        updatePlaybackUI();
        if (typeof gtag === 'function') gtag('event', 'solve_started', { 'cube_size': '5x5x5' });
      })
      .catch(err => {
        loadingOverlay.classList.add('d-none');
        if (err.name === 'AbortError') {
          console.log('Solve request cancelled by user.');
          return;
        }
        showErrorPopup(["Could not connect to Python API.", "Ensure the API supports 5x5 or is currently online."]);
        console.error(err);
      });

  } catch (err) {
    document.getElementById('solverLoadingOverlay-5x5').classList.add('d-none');
    showErrorPopup(['An error occurred during validation.']);
    console.error(err);
  }
});

let solveAbortController = null;
document.getElementById('btnCancelSolve-5x5').addEventListener('click', () => {
  if (solveAbortController) {
    solveAbortController.abort();
    document.getElementById('solverLoadingOverlay-5x5').classList.add('d-none');
  }
});

let solutionSteps = [];
let currentStepIndex = 0;
let lastActionDirection = 1;

function getCubeString() {
  let getColor = (x, y, z, faceAxis) => {
    const cubie = cubies.find(c => Math.abs(c.position.x - x) < 0.1 && Math.abs(c.position.y - y) < 0.1 && Math.abs(c.position.z - z) < 0.1);
    if (!cubie) throw new Error(`Missing cubie at ${x},${y},${z}`);

    const sticker = cubie.children.find(child => {
      if (!child.userData || !child.userData.isSticker) return false;
      const childWorldPos = new THREE.Vector3(); child.getWorldPosition(childWorldPos);
      const cubieWorldPos = new THREE.Vector3(); cubie.getWorldPosition(cubieWorldPos);
      return Math.abs(childWorldPos[faceAxis] - cubieWorldPos[faceAxis]) > 0.1;
    });
    if (!sticker) throw new Error(`Missing sticker on face ${faceAxis} at ${x},${y},${z}`);
    return sticker.material.color.getHex();
  };

  const centerColors = {};
  centerColors[getColor(0, 2, 0, 'y')] = 'U';
  centerColors[getColor(2, 0, 0, 'x')] = 'R';
  centerColors[getColor(0, 0, 2, 'z')] = 'F';
  centerColors[getColor(0, -2, 0, 'y')] = 'D';
  centerColors[getColor(-2, 0, 0, 'x')] = 'L';
  centerColors[getColor(0, 0, -2, 'z')] = 'B';

  if (Object.keys(centerColors).length !== 6) throw new Error("Center tiles must have 6 distinct colors! Ensure the middle of each face is uniquely colored.");

  let str = '';
  for (let z of [-2, -1, 0, 1, 2]) for (let x of [-2, -1, 0, 1, 2]) str += centerColors[getColor(x, 2, z, 'y')]; // U
  for (let y of [2, 1, 0, -1, -2]) for (let z of [2, 1, 0, -1, -2]) str += centerColors[getColor(2, y, z, 'x')]; // R
  for (let y of [2, 1, 0, -1, -2]) for (let x of [-2, -1, 0, 1, 2]) str += centerColors[getColor(x, y, 2, 'z')]; // F
  for (let z of [2, 1, 0, -1, -2]) for (let x of [-2, -1, 0, 1, 2]) str += centerColors[getColor(x, -2, z, 'y')]; // D
  for (let y of [2, 1, 0, -1, -2]) for (let z of [-2, -1, 0, 1, 2]) str += centerColors[getColor(-2, y, z, 'x')]; // L
  for (let y of [2, 1, 0, -1, -2]) for (let x of [2, 1, 0, -1, -2]) str += centerColors[getColor(x, y, -2, 'z')]; // B
  return str;
}

function mapWcaToRotation5x5(moveStr) {
  let face = moveStr[0];
  let mod = moveStr.substring(1);

  if (['2', '3'].includes(face) && moveStr.length > 1) {
    let digit = face;
    let baseFace = moveStr[1];
    mod = moveStr.substring(2);

    if (mod.startsWith('w')) {
      face = digit + baseFace + 'w';
      mod = mod.substring(1);
    } else {
      face = digit + baseFace;
    }
  } else if (mod.startsWith('w')) {
    face = face + 'w';
    mod = mod.substring(1);
  }

  let angleDef = 0;
  let axis = 'y';
  let ls = [];

  switch (face) {
    case 'U': axis = 'y'; ls = [2]; angleDef = -Math.PI / 2; break;
    case 'D': axis = 'y'; ls = [-2]; angleDef = Math.PI / 2; break;
    case 'L': axis = 'x'; ls = [-2]; angleDef = Math.PI / 2; break;
    case 'R': axis = 'x'; ls = [2]; angleDef = -Math.PI / 2; break;
    case 'F': axis = 'z'; ls = [2]; angleDef = -Math.PI / 2; break;
    case 'B': axis = 'z'; ls = [-2]; angleDef = Math.PI / 2; break;

    case 'Uw': case '2Uw': axis = 'y'; ls = [1, 2]; angleDef = -Math.PI / 2; break;
    case 'Dw': case '2Dw': axis = 'y'; ls = [-2, -1]; angleDef = Math.PI / 2; break;
    case 'Lw': case '2Lw': axis = 'x'; ls = [-2, -1]; angleDef = Math.PI / 2; break;
    case 'Rw': case '2Rw': axis = 'x'; ls = [1, 2]; angleDef = -Math.PI / 2; break;
    case 'Fw': case '2Fw': axis = 'z'; ls = [1, 2]; angleDef = -Math.PI / 2; break;
    case 'Bw': case '2Bw': axis = 'z'; ls = [-2, -1]; angleDef = Math.PI / 2; break;

    case '3Uw': axis = 'y'; ls = [0, 1, 2]; angleDef = -Math.PI / 2; break;
    case '3Dw': axis = 'y'; ls = [-2, -1, 0]; angleDef = Math.PI / 2; break;
    case '3Lw': axis = 'x'; ls = [-2, -1, 0]; angleDef = Math.PI / 2; break;
    case '3Rw': axis = 'x'; ls = [0, 1, 2]; angleDef = -Math.PI / 2; break;
    case '3Fw': axis = 'z'; ls = [0, 1, 2]; angleDef = -Math.PI / 2; break;
    case '3Bw': axis = 'z'; ls = [-2, -1, 0]; angleDef = Math.PI / 2; break;

    case 'u': case '2U': axis = 'y'; ls = [1]; angleDef = -Math.PI / 2; break;
    case 'd': case '2D': axis = 'y'; ls = [-1]; angleDef = Math.PI / 2; break;
    case 'l': case '2L': axis = 'x'; ls = [-1]; angleDef = Math.PI / 2; break;
    case 'r': case '2R': axis = 'x'; ls = [1]; angleDef = -Math.PI / 2; break;
    case 'f': case '2F': axis = 'z'; ls = [1]; angleDef = -Math.PI / 2; break;
    case 'b': case '2B': axis = 'z'; ls = [-1]; angleDef = Math.PI / 2; break;

    case 'M': case '3L': axis = 'x'; ls = [0]; angleDef = Math.PI / 2; break;
    case '3R': axis = 'x'; ls = [0]; angleDef = -Math.PI / 2; break;
    case 'E': case '3D': axis = 'y'; ls = [0]; angleDef = Math.PI / 2; break;
    case '3U': axis = 'y'; ls = [0]; angleDef = -Math.PI / 2; break;
    case 'S': case '3F': axis = 'z'; ls = [0]; angleDef = -Math.PI / 2; break;
    case '3B': axis = 'z'; ls = [0]; angleDef = Math.PI / 2; break;

    case 'x': axis = 'x'; ls = [-2, -1, 0, 1, 2]; angleDef = -Math.PI / 2; break;
    case 'y': axis = 'y'; ls = [-2, -1, 0, 1, 2]; angleDef = -Math.PI / 2; break;
    case 'z': axis = 'z'; ls = [-2, -1, 0, 1, 2]; angleDef = -Math.PI / 2; break;

    case 'm': axis = 'x'; ls = [-1, 0, 1]; angleDef = Math.PI / 2; break;
    case 'e': axis = 'y'; ls = [-1, 0, 1]; angleDef = Math.PI / 2; break;
    case 's': axis = 'z'; ls = [-1, 0, 1]; angleDef = -Math.PI / 2; break;

    default: return null;
  }

  let angle = angleDef;
  if (mod.includes("'")) angle = -angleDef;
  if (mod.includes("2")) angle = angleDef * 2;

  return { axis, layers: ls, angle };
}

function getExplanation(moveRaw) {
  return `Execute move: ${moveRaw}`;
}

function getInverseMoveNotation(move) {
  if (move.includes("'")) return move.replace("'", "");
  if (move.includes("2")) return move;
  return move + "'";
}

function getReverseExplanation(moveRaw) {
  const inverseMove = getInverseMoveNotation(moveRaw);
  return getExplanation(inverseMove);
}

function updatePlaybackUI() {
  const humanInstruction = document.getElementById('humanInstruction-5x5');
  const solutionText = document.getElementById('solutionText-5x5');
  const btnSideBack = document.getElementById('btnSideBack-5x5');
  const btnSideNext = document.getElementById('btnSideNext-5x5');
  const cubeSolvedMsg = document.getElementById('cubeSolvedMsg-5x5');

  const stepCounterEl = document.querySelector('.step-counter');
  let stepCounter = stepCounterEl;
  if (!stepCounter) {
    stepCounter = document.createElement('div');
    stepCounter.className = 'step-counter';
    stepCounter.style.marginTop = '1rem';
    stepCounter.style.fontSize = '1.2rem';
    stepCounter.style.fontWeight = 'bold';
    stepCounter.style.color = 'var(--text-dim)';
    document.querySelector('#playback-phase-5x5 .notation-instruction').appendChild(stepCounter);
  }

  if (currentStepIndex === 0 && lastActionDirection === 1) {
    humanInstruction.innerText = `Hold your puzzle as shown below, hit "next" to start.`;
    solutionText.innerHTML = "READY TO SOLVE!";
    stepCounter.innerHTML = `Step 0 / ${solutionSteps.length}`;
    btnSideBack.disabled = true;
    btnSideNext.disabled = false;
    btnSideNext.innerHTML = 'Next &gt;';
    if (cubeSolvedMsg) cubeSolvedMsg.classList.add('d-none');
    return;
  }

  if (lastActionDirection === -1) {
    const move = solutionSteps[currentStepIndex];
    humanInstruction.innerHTML = getReverseExplanation(move.raw);
    let txt = `<span style="color:#eab308">Undo:</span> `;
    txt += `<strong style="color:#eab308; font-size: 2rem;">${getInverseMoveNotation(move.raw)}</strong>`;
    solutionText.innerHTML = txt;
    stepCounter.innerHTML = `Step ${currentStepIndex} / ${solutionSteps.length}`;
    btnSideBack.disabled = currentStepIndex <= 0;
    btnSideNext.disabled = false;
    btnSideNext.innerHTML = 'Next &gt;';
    if (cubeSolvedMsg) cubeSolvedMsg.classList.add('d-none');
    return;
  }

  const move = solutionSteps[currentStepIndex - 1];
  humanInstruction.innerHTML = getExplanation(move.raw);
  let txt = `<strong style="color:#2563eb; font-size: 2rem;">${move.raw}</strong>`;
  solutionText.innerHTML = txt;
  stepCounter.innerHTML = `Step ${currentStepIndex} / ${solutionSteps.length}`;

  btnSideBack.disabled = false;

  if (currentStepIndex >= solutionSteps.length) {
    btnSideNext.disabled = true;
    btnSideNext.innerHTML = 'Done!';
    if (cubeSolvedMsg) {
      if (cubeSolvedMsg.classList.contains('d-none')) {
         cubeSolvedMsg.classList.remove('d-none');
         if (typeof gtag === 'function') gtag('event', 'cube_solved', { 'cube_size': '5x5x5' });
      }
    }
  } else {
    btnSideNext.disabled = false;
    btnSideNext.innerHTML = 'Next &gt;';
    if (cubeSolvedMsg) cubeSolvedMsg.classList.add('d-none');
  }
}

document.getElementById('btnSideNext-5x5').addEventListener('click', async () => {
  if (isAnimating) return;
  if (currentStepIndex < solutionSteps.length) {
    const step = solutionSteps[currentStepIndex];
    lastActionDirection = 1;
    currentStepIndex++;
    updatePlaybackUI();
    await rotateLayer(step.axis, step.layer, step.angle, 350);
  }
});

document.getElementById('btnSideBack-5x5').addEventListener('click', async () => {
  if (isAnimating) return;
  if (currentStepIndex > 0) {
    currentStepIndex--;
    const step = solutionSteps[currentStepIndex];
    lastActionDirection = -1;
    updatePlaybackUI();
    await rotateLayer(step.axis, step.layer, -step.angle, 350);
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
