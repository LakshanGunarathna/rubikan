import * as THREE from 'three';
import { RUBIKS_CUBE_COLORS as colors, white, yellow, blue, green, red, orange } from './globals.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as TWEEN from '@tweenjs/tween.js';

const container = document.getElementById('app-4x4');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(7, 7, 10); // Slightly further back for 4x4

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

// Noise texture for stickers
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

// 4x4 dimensions: -1.5, -0.5, 0.5, 1.5
for (let x of [-1.5, -0.5, 0.5, 1.5]) {
  for (let y of [-1.5, -0.5, 0.5, 1.5]) {
    for (let z of [-1.5, -0.5, 0.5, 1.5]) {
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

      if (x === 1.5) addSticker(stickerGeometryX, colors.right, [0.49, 0, 0]);
      if (x === -1.5) addSticker(stickerGeometryX, colors.left, [-0.49, 0, 0]);
      if (y === 1.5) addSticker(stickerGeometryY, colors.top, [0, 0.49, 0]);
      if (y === -1.5) addSticker(stickerGeometryY, colors.bottom, [0, -0.49, 0]);
      if (z === 1.5) addSticker(stickerGeometryZ, colors.front, [0, 0, 0.49]);
      if (z === -1.5) addSticker(stickerGeometryZ, colors.back, [0, 0, -0.49]);

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
      const pos = Math.round(c.position[axis] * 2) / 2;
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
  if (path === '/solver/4x4x4-cube') {
    isActive = true;
    container.style.display = 'block';

    scene.traverse(child => {
      if (child.userData.isSticker) {
        child.material.color.setHex(0x555555);
      }
    });

    document.getElementById('paint-phase-4x4').classList.remove('d-none');
    document.getElementById('playback-phase-4x4').classList.add('d-none');
    document.getElementById('solver-status-4x4').innerText = "";
    document.getElementById('cubeSolvedMsg-4x4').classList.add('d-none');
  } else {
    document.getElementById('solve-4x4-view').classList.add('d-none');
    container.style.display = 'none';
    const solvedMsg = document.getElementById('cubeSolvedMsg-4x4');
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
    if (stickers.length > 1) {
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
          return count < 2; // 2 wing edges per physical edge
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


// Color Palette Setup
let selectedColorHex = white;
const EXPECTED_COLORS_ARR = [white, yellow, blue, green, red, orange];
const swatches = [];
const paletteContainer = document.querySelector('.color-palette-4x4');
if (paletteContainer) {
  EXPECTED_COLORS_ARR.forEach((colorCode) => {
    const swatch = document.createElement('div');
    swatch.className = 'swatch-4x4 swatch';
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
  if (document.getElementById('paint-phase-4x4').classList.contains('d-none')) return;
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
    // Stickers are at absolute coordinate ~2.0 (1.5 + 0.49)
    return pos.x > 1.9 || pos.y > 1.9 || pos.z > 1.9;
  });

  if (hit) {
    hit.object.material = hit.object.material.clone();
    hit.object.material.color.setHex(selectedColorHex);

    setTimeout(() => {
      autoDeducePieces();
    }, 0);
  }
});

// UI Controls
document.getElementById('rotLeft-4x4').addEventListener('click', () => rotateWholeCube('y', -Math.PI / 2));
document.getElementById('rotRight-4x4').addEventListener('click', () => rotateWholeCube('y', Math.PI / 2));
document.getElementById('rotUp-4x4').addEventListener('click', () => rotateWholeCube('x', -Math.PI / 2));
document.getElementById('rotDown-4x4').addEventListener('click', () => rotateWholeCube('x', Math.PI / 2));

const confirmResetOverlay = document.getElementById('confirmResetOverlay-4x4');
document.getElementById('btnPaintReset-4x4').addEventListener('click', () => {
  confirmResetOverlay.classList.remove('d-none');
});
document.getElementById('confirmResetCancel-4x4').addEventListener('click', () => {
  confirmResetOverlay.classList.add('d-none');
});
document.getElementById('confirmResetOk-4x4').addEventListener('click', () => {
  confirmResetOverlay.classList.add('d-none');
  scene.traverse(child => {
    if (child.userData.isSticker) child.material.color.setHex(0x555555);
  });
});

const cubeAlreadySolvedOverlay = document.getElementById('cubeAlreadySolvedOverlay-4x4');
document.getElementById('cubeAlreadySolvedClose-4x4').addEventListener('click', () => {
  cubeAlreadySolvedOverlay.classList.add('d-none');
});
cubeAlreadySolvedOverlay.addEventListener('click', (e) => {
  if (e.target === cubeAlreadySolvedOverlay) cubeAlreadySolvedOverlay.classList.add('d-none');
});

const errorPopupOverlay = document.getElementById('errorPopupOverlay-4x4');
const errorList = document.getElementById('errorList-4x4');
document.getElementById('errorPopupClose-4x4').addEventListener('click', () => {
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
  document.getElementById('solver-status-4x4').innerText = '';
}

document.getElementById('btnStartSolve-4x4').addEventListener('click', () => {
  try {
    document.getElementById('solver-status-4x4').innerText = "Validating...";
    const colorCounts = {};
    let hasUnpainted = false;
    const paintedPieces = [];

    cubies.forEach(cubie => {
      const stickers = cubie.children.filter(c => c.userData && c.userData.isSticker);
      const pieceColors = [];
      stickers.forEach(s => {
        const hex = s.material.color.getHex();
        if (hex === 0x555555) hasUnpainted = true;
        else {
          colorCounts[hex] = (colorCounts[hex] || 0) + 1;
          pieceColors.push(hex);
        }
      });
      if (pieceColors.length > 0) paintedPieces.push({ cubie, colors: pieceColors });
    });

    const EXPECTED_COLORS = [white, yellow, blue, green, red, orange];
    const errors = [];
    if (hasUnpainted) errors.push('You have unpainted tiles on the cube.');

    EXPECTED_COLORS.forEach(hex => {
      const count = colorCounts[hex] || 0;
      const name = HEX_TO_NAME[hex];
      if (count < 16) errors.push(`You do not have enough ${name} tiles.`);
      else if (count > 16) errors.push(`You have too many ${name} tiles.`);
    });

    if (errors.length > 0) {
      showErrorPopup(errors);
      return;
    }

    // Piece validity check
    let edgeErrors = 0, cornerErrors = 0;
    paintedPieces.forEach(p => {
      if (p.colors.length > 1) {
        let hasError = false;
        for (let i = 0; i < p.colors.length; i++) {
          for (let j = i + 1; j < p.colors.length; j++) {
            if (OPPOSITE_COLORS[p.colors[i]] === p.colors[j]) hasError = true;
            if (p.colors[i] === p.colors[j]) hasError = true;
          }
        }
        if (hasError) {
          if (p.colors.length === 2) edgeErrors++;
          else cornerErrors++;
        }
      }
    });

    if (edgeErrors || cornerErrors) {
      const eMsg = [];
      if (edgeErrors) eMsg.push(`${edgeErrors} edge piece(s) have invalid color combinations.`);
      if (cornerErrors) eMsg.push(`${cornerErrors} corner piece(s) have invalid color combinations.`);
      showErrorPopup(eMsg);
      return;
    }

    const statusEl = document.getElementById('solver-status-4x4');
    const loadingOverlay = document.getElementById('solverLoadingOverlay-4x4');

    // Show premium loading popup
    loadingOverlay.classList.remove('d-none');
    statusEl.innerText = ""; // Clear the old inline status

    // We send the 96 char string!
    const stateStr = getCubeString();

    // Local check for solved state
    let isSolved = true;
    for (let i = 0; i < 96; i += 16) {
      const segment = stateStr.substring(i, i + 16);
      if (new Set(segment).size > 1) {
        isSolved = false;
        break;
      }
    }

    if (isSolved) {
      loadingOverlay.classList.add('d-none');
      document.getElementById('cubeAlreadySolvedOverlay-4x4').classList.remove('d-none');
      return;
    }

    // Setup AbortController for cancellation
    solveAbortController = new AbortController();

    // Hardcoding to the Render URL so you can test it from anywhere (even locally)
    const apiBaseUrl = 'https://rubikan.onrender.com';
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
          let mapped = mapWcaToRotation4x4(m);
          if (mapped) {
            solutionSteps.push({ raw: m, axis: mapped.axis, layer: mapped.layers, angle: mapped.angle });
          }
        }

        currentStepIndex = 0;
        lastActionDirection = 1;
        document.getElementById('paint-phase-4x4').classList.add('d-none');
        document.getElementById('playback-phase-4x4').classList.remove('d-none');
        updatePlaybackUI();
      })
      .catch(err => {
        loadingOverlay.classList.add('d-none');
        if (err.name === 'AbortError') {
          console.log('Solve request cancelled by user.');
          return;
        }
        showErrorPopup(["Could not connect to Python API.", "Run python-solver-api locally using Docker or Flask."]);
        console.error(err);
      });

  } catch (err) {
    document.getElementById('solverLoadingOverlay-4x4').classList.add('d-none');
    showErrorPopup(['An error occurred during validation.']);
    console.error(err);
  }
});

let solveAbortController = null;
document.getElementById('btnCancelSolve-4x4').addEventListener('click', () => {
  if (solveAbortController) {
    solveAbortController.abort();
    document.getElementById('solverLoadingOverlay-4x4').classList.add('d-none');
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

  const colors = {};
  colors[white] = 'U'; colors[yellow] = 'D'; colors[red] = 'R';
  colors[orange] = 'L'; colors[blue] = 'B'; colors[green] = 'F';

  let str = '';
  for (let z of [-1.5, -0.5, 0.5, 1.5]) for (let x of [-1.5, -0.5, 0.5, 1.5]) str += colors[getColor(x, 1.5, z, 'y')]; // U
  for (let y of [1.5, 0.5, -0.5, -1.5]) for (let z of [1.5, 0.5, -0.5, -1.5]) str += colors[getColor(1.5, y, z, 'x')]; // R
  for (let y of [1.5, 0.5, -0.5, -1.5]) for (let x of [-1.5, -0.5, 0.5, 1.5]) str += colors[getColor(x, y, 1.5, 'z')]; // F
  for (let z of [1.5, 0.5, -0.5, -1.5]) for (let x of [-1.5, -0.5, 0.5, 1.5]) str += colors[getColor(x, -1.5, z, 'y')]; // D
  for (let y of [1.5, 0.5, -0.5, -1.5]) for (let z of [-1.5, -0.5, 0.5, 1.5]) str += colors[getColor(-1.5, y, z, 'x')]; // L
  for (let y of [1.5, 0.5, -0.5, -1.5]) for (let x of [1.5, 0.5, -0.5, -1.5]) str += colors[getColor(x, y, -1.5, 'z')]; // B
  return str;
}

function mapWcaToRotation4x4(moveStr) {
  let face = moveStr[0];
  let mod = moveStr.substring(1);

  // Dwalton special inner slice (e.g. 2R, 2U) mapped to 'r', 'u'
  if (['2', '3'].includes(face) && moveStr.length > 1) {
    let innerFace = moveStr[1];
    mod = moveStr.substring(2);
    face = innerFace.toLowerCase(); // 2R -> r
  }

  // Standard wide (e.g. Rw)
  if (mod.startsWith('w')) {
    face = face + 'w';
    mod = mod.substring(1);
  }

  let angleDef = 0;
  let axis = 'y';
  let ls = [];

  switch (face) {
    // Outer
    case 'U': axis = 'y'; ls = [1.5]; angleDef = -Math.PI / 2; break;
    case 'D': axis = 'y'; ls = [-1.5]; angleDef = Math.PI / 2; break;
    case 'L': axis = 'x'; ls = [-1.5]; angleDef = Math.PI / 2; break;
    case 'R': axis = 'x'; ls = [1.5]; angleDef = -Math.PI / 2; break;
    case 'F': axis = 'z'; ls = [1.5]; angleDef = -Math.PI / 2; break;
    case 'B': axis = 'z'; ls = [-1.5]; angleDef = Math.PI / 2; break;

    // Wide
    case 'Uw': axis = 'y'; ls = [1.5, 0.5]; angleDef = -Math.PI / 2; break;
    case 'Dw': axis = 'y'; ls = [-1.5, -0.5]; angleDef = Math.PI / 2; break;
    case 'Lw': axis = 'x'; ls = [-1.5, -0.5]; angleDef = Math.PI / 2; break;
    case 'Rw': axis = 'x'; ls = [1.5, 0.5]; angleDef = -Math.PI / 2; break;
    case 'Fw': axis = 'z'; ls = [1.5, 0.5]; angleDef = -Math.PI / 2; break;
    case 'Bw': axis = 'z'; ls = [-1.5, -0.5]; angleDef = Math.PI / 2; break;

    // Inner
    case 'u': axis = 'y'; ls = [0.5]; angleDef = -Math.PI / 2; break;
    case 'd': axis = 'y'; ls = [-0.5]; angleDef = Math.PI / 2; break;
    case 'l': axis = 'x'; ls = [-0.5]; angleDef = Math.PI / 2; break;
    case 'r': axis = 'x'; ls = [0.5]; angleDef = -Math.PI / 2; break;
    case 'f': axis = 'z'; ls = [0.5]; angleDef = -Math.PI / 2; break;
    case 'b': axis = 'z'; ls = [-0.5]; angleDef = Math.PI / 2; break;


    // Middle Slices
    case 'M': axis = 'x'; ls = [-0.5, 0.5]; angleDef = Math.PI / 2; break; // Like L
    case 'E': axis = 'y'; ls = [-0.5, 0.5]; angleDef = Math.PI / 2; break; // Like D
    case 'S': axis = 'z'; ls = [-0.5, 0.5]; angleDef = -Math.PI / 2; break; // Like F

    // Rotations
    case 'x': axis = 'x'; ls = [-1.5, -0.5, 0.5, 1.5]; angleDef = -Math.PI / 2; break; // Like R
    case 'y': axis = 'y'; ls = [-1.5, -0.5, 0.5, 1.5]; angleDef = -Math.PI / 2; break; // Like U
    case 'z': axis = 'z'; ls = [-1.5, -0.5, 0.5, 1.5]; angleDef = -Math.PI / 2; break; // Like F

    default: return null;
  }

  let angle = angleDef;
  if (mod.includes("'")) angle = -angleDef;
  if (mod.includes("2")) angle = angleDef * 2;

  return { axis, layers: ls, angle };
}

const moveExplanations = {
  "R": "Turn the RIGHT LAYER 90&deg; clockwise.",
  "R'": "Turn the RIGHT LAYER 90&deg; counterclockwise.",
  "R2": "Turn the RIGHT LAYER 180&deg;.",
  "L": "Turn the LEFT LAYER 90&deg; clockwise.",
  "L'": "Turn the LEFT LAYER 90&deg; counterclockwise.",
  "L2": "Turn the LEFT LAYER 180&deg;.",
  "U": "Turn the TOP LAYER 90&deg; clockwise.",
  "U'": "Turn the TOP LAYER 90&deg; counterclockwise.",
  "U2": "Turn the TOP LAYER 180&deg;.",
  "D": "Turn the BOTTOM LAYER 90&deg; clockwise.",
  "D'": "Turn the BOTTOM LAYER 90&deg; counterclockwise.",
  "D2": "Turn the BOTTOM LAYER 180&deg;.",
  "F": "Turn the FRONT LAYER 90&deg; clockwise.",
  "F'": "Turn the FRONT LAYER 90&deg; counterclockwise.",
  "F2": "Turn the FRONT LAYER 180&deg;.",
  "B": "Turn the BACK LAYER 90&deg; clockwise.",
  "B'": "Turn the BACK LAYER 90&deg; counterclockwise.",
  "B2": "Turn the BACK LAYER 180&deg;.",
  "M": "Turn the MIDDLE X-SLICE 90&deg; (matches L direction).",
  "M'": "Turn the MIDDLE X-SLICE 90&deg; counterclockwise.",
  "M2": "Turn the MIDDLE X-SLICE 180&deg;.",
  "E": "Turn the EQUATORIAL Y-SLICE 90&deg; (matches D direction).",
  "E'": "Turn the EQUATORIAL Y-SLICE 90&deg; counterclockwise.",
  "E2": "Turn the EQUATORIAL Y-SLICE 180&deg;.",
  "S": "Turn the STANDING Z-SLICE 90&deg; (matches F direction).",
  "S'": "Turn the STANDING Z-SLICE 90&deg; counterclockwise.",
  "S2": "Turn the STANDING Z-SLICE 180&deg;.",
  "r": "Turn the RIGHT HALF 90&deg; clockwise.",
  "r'": "Turn the RIGHT HALF 90&deg; counterclockwise.",
  "r2": "Turn the RIGHT HALF 180&deg;.",
  "l": "Turn the LEFT HALF 90&deg; clockwise.",
  "l'": "Turn the LEFT HALF 90&deg; counterclockwise.",
  "l2": "Turn the LEFT HALF 180&deg;.",
  "u": "Turn the TOP HALF 90&deg; clockwise.",
  "u'": "Turn the TOP HALF 90&deg; counterclockwise.",
  "u2": "Turn the TOP HALF 180&deg;.",
  "d": "Turn the BOTTOM HALF 90&deg; clockwise.",
  "d'": "Turn the BOTTOM HALF 90&deg; counterclockwise.",
  "d2": "Turn the BOTTOM HALF 180&deg;.",
  "f": "Turn the FRONT HALF 90&deg; clockwise.",
  "f'": "Turn the FRONT HALF 90&deg; counterclockwise.",
  "f2": "Turn the FRONT HALF 180&deg;.",
  "b": "Turn the BACK HALF 90&deg; clockwise.",
  "b'": "Turn the BACK HALF 90&deg; counterclockwise.",
  "b2": "Turn the BACK HALF 180&deg;.",
  "Rw": "Turn the RIGHT TWO LAYERS 90&deg; clockwise.",
  "Rw'": "Turn the RIGHT TWO LAYERS 90&deg; counterclockwise.",
  "Rw2": "Turn the RIGHT TWO LAYERS 180&deg;.",
  "Lw": "Turn the LEFT TWO LAYERS 90&deg; clockwise.",
  "Lw'": "Turn the LEFT TWO LAYERS 90&deg; counterclockwise.",
  "Lw2": "Turn the LEFT TWO LAYERS 180&deg;.",
  "Uw": "Turn the TOP TWO LAYERS 90&deg; clockwise.",
  "Uw'": "Turn the TOP TWO LAYERS 90&deg; counterclockwise.",
  "Uw2": "Turn the TOP TWO LAYERS 180&deg;.",
  "Dw": "Turn the BOTTOM TWO LAYERS 90&deg; clockwise.",
  "Dw'": "Turn the BOTTOM TWO LAYERS 90&deg; counterclockwise.",
  "Dw2": "Turn the BOTTOM TWO LAYERS 180&deg;.",
  "Fw": "Turn the FRONT TWO LAYERS 90&deg; clockwise.",
  "Fw'": "Turn the FRONT TWO LAYERS 90&deg; counterclockwise.",
  "Fw2": "Turn the FRONT TWO LAYERS 180&deg;.",
  "Bw": "Turn the BACK TWO LAYERS 90&deg; clockwise.",
  "Bw'": "Turn the BACK TWO LAYERS 90&deg; counterclockwise.",
  "Bw2": "Turn the BACK TWO LAYERS 180&deg;.",
  "x": "Rotate the ENTIRE CUBE 90&deg; clockwise on X-axis.",
  "x'": "Rotate the ENTIRE CUBE 90&deg; counterclockwise on X-axis.",
  "x2": "Rotate the ENTIRE CUBE 180&deg; on X-axis.",
  "y": "Rotate the ENTIRE CUBE 90&deg; clockwise on Y-axis.",
  "y'": "Rotate the ENTIRE CUBE 90&deg; counterclockwise on Y-axis.",
  "y2": "Rotate the ENTIRE CUBE 180&deg; on Y-axis.",
  "z": "Rotate the ENTIRE CUBE 90&deg; clockwise on Z-axis.",
  "z'": "Rotate the ENTIRE CUBE 90&deg; counterclockwise on Z-axis.",
  "z2": "Rotate the ENTIRE CUBE 180&deg; on Z-axis."
};

function getExplanation(moveRaw) {
  let mappedRaw = moveRaw;
  if (['2', '3'].includes(moveRaw[0]) && moveRaw.length > 1) {
    let innerFace = moveRaw[1];
    let mod = moveRaw.substring(2);
    mappedRaw = innerFace.toLowerCase() + mod;
  }
  return moveExplanations[mappedRaw] || `Execute move: ${moveRaw}`;
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
  const humanInstruction = document.getElementById('humanInstruction-4x4');
  const solutionText = document.getElementById('solutionText-4x4');
  const btnSideBack = document.getElementById('btnSideBack-4x4');
  const btnSideNext = document.getElementById('btnSideNext-4x4');
  const cubeSolvedMsg = document.getElementById('cubeSolvedMsg-4x4');

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
    humanInstruction.innerHTML = getReverseExplanation(move.raw);
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
  humanInstruction.innerHTML = getExplanation(move.raw);
  let txt = `Step ${currentStepIndex} / ${solutionSteps.length}: `;
  txt += `<strong style="color:#2563eb">${move.raw}</strong>`;
  solutionText.innerHTML = txt;

  btnSideBack.disabled = false;

  if (currentStepIndex >= solutionSteps.length) {
    btnSideNext.disabled = true;
    btnSideNext.innerHTML = 'Done!';
    if (cubeSolvedMsg) cubeSolvedMsg.classList.remove('d-none');
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

document.getElementById('btnSideNext-4x4').addEventListener('click', handleNext);
document.getElementById('btnSideBack-4x4').addEventListener('click', handleBack);

// Render Loop
function animate(time) {
  requestAnimationFrame(animate);
  if (isActive) {
    TWEEN.update(time);
    controls.update();
    renderer.render(scene, camera);
  }
}
animate();
