import * as THREE from 'three';
import { RUBIKS_CUBE_COLORS as colors } from './globals.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

let patterns = [];

// Automatically detect the base path (e.g., '/rubikan/' on GitHub Pages or '/' locally)
const ROOT = (window.location.hostname.includes('github.io') || window.location.pathname.startsWith('/rubikan/'))
  ? '/rubikan/'
  : '/';
const BASE_PATH = ROOT;

// DOM Elements
const gridContainer = document.getElementById('cubeArtsGrid');
const btnViewPattern = document.getElementById('btnViewPattern');
const patternViewOverlay = document.getElementById('patternViewOverlay');
const modalCubeContainer = document.getElementById('modal-cube-container');
const closePatternModalBtn = document.getElementById('closePatternModal');
const modalPatternName = document.getElementById('modalPatternName');
const btnArtExit = document.getElementById('btnArtExit');

let typeFilter = 'All';
let diffFilter = 'All';
let searchFilter = '';

function getDifficulty(moveCount) {
  if (moveCount <= 10) return 'Easy';
  if (moveCount <= 20) return 'Medium';
  if (moveCount <= 35) return 'Hard';
  if (moveCount <= 50) return 'Extreme';
  return 'Ultra';
}

// --- UI rendering and filtering ---
async function loadCubeArts() {
  try {
    const res = await fetch(`${ROOT}data/cube-arts.json`);
    const data = await res.json();

    patterns = [];
    for (const type in data) {
      data[type].forEach(pattern => {
        pattern.type = type;

        // Calculate dynamic difficulty based on moves
        const movesArr = pattern.moves.trim().split(/\s+/).filter(m => m);
        pattern.moveCount = movesArr.length;
        pattern.dynamicDifficulty = getDifficulty(pattern.moveCount);

        patterns.push(pattern);
      });
    }

    updateBadges();
    renderCards();

    // Support both new clean path format and old hash format
    const path = window.location.pathname;
    const hash = window.location.hash || '#/';

    let patternId = null;
    if (path.includes('/play/')) {
      patternId = path.split('/play/')[1].split('/')[0];
    } else if (hash.startsWith('#/cube-arts/play/')) {
      patternId = decodeURIComponent(hash.replace('#/cube-arts/play/', ''));
    } else if (hash.startsWith('#play/')) {
      patternId = decodeURIComponent(hash.replace('#play/', ''));
    }

    if (patternId) {
      const pattern = patterns.find(p => p.id === patternId);
      if (pattern) playPattern(pattern, false); // false = don't push state again
    }
  } catch (err) {
    console.warn("Could not load cube arts json", err);
  }
}

function initFilters() {
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  const searchInput = document.getElementById('artSearchInput');

  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      const type = item.dataset.filterType;
      const value = item.dataset.filterValue;

      if (type === 'All') {
        typeFilter = 'All';
        diffFilter = 'All';
        sidebarItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      } else {
        // Remove "All" active state if switching to a specific filter
        const allItem = document.querySelector('.sidebar-item[data-filter-type="All"]');
        if (allItem) allItem.classList.remove('active');

        if (type === 'type') {
          if (typeFilter === value) {
            typeFilter = 'All';
            item.classList.remove('active');
          } else {
            typeFilter = value;
            document.querySelectorAll('.sidebar-item[data-filter-type="type"]').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
          }
        } else if (type === 'difficulty') {
          if (diffFilter === value) {
            diffFilter = 'All';
            item.classList.remove('active');
          } else {
            diffFilter = value;
            document.querySelectorAll('.sidebar-item[data-filter-type="difficulty"]').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
          }
        }

        // If both category and difficulty are reset to All, re-activate "All"
        if (typeFilter === 'All' && diffFilter === 'All') {
          if (allItem) allItem.classList.add('active');
        }
      }

      renderCards();
    });
  });

  // Search functionality
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchFilter = e.target.value.toLowerCase().trim();
      renderCards();
    });
  }
}

function updateBadges() {
  const totalEl = document.getElementById('statTotal');
  const cubesEl = document.getElementById('statCubes');

  if (totalEl) totalEl.innerText = patterns.length;
  if (cubesEl) {
    const types = new Set(patterns.map(p => p.type));
    cubesEl.innerText = types.size;
  }

  // --- "All" badge: total after both type + difficulty filters (ignoring search) ---
  const allFiltered = patterns.filter(p => {
    if (typeFilter !== 'All' && p.type !== typeFilter) return false;
    if (diffFilter !== 'All' && p.dynamicDifficulty !== diffFilter) return false;
    return true;
  });
  const allBadge = document.querySelector('[data-count-id="all"]');
  if (allBadge) allBadge.innerText = allFiltered.length;

  // --- Type badges: count patterns filtered by the CURRENT difficulty (not type) ---
  const typeKeys = ['2x2x2', '3x3x3', '4x4x4', '5x5x5'];
  typeKeys.forEach(type => {
    const count = patterns.filter(p => {
      if (p.type !== type) return false;
      // Apply difficulty filter if active
      if (diffFilter !== 'All' && p.dynamicDifficulty !== diffFilter) return false;
      return true;
    }).length;
    const badge = document.querySelector(`[data-count-id="type-${type}"]`);
    if (badge) badge.innerText = count;
  });

  // --- Difficulty badges: count patterns filtered by the CURRENT type (not difficulty) ---
  const diffLevels = ['Easy', 'Medium', 'Hard', 'Extreme', 'Ultra'];
  diffLevels.forEach(diff => {
    const count = patterns.filter(p => {
      if (p.dynamicDifficulty !== diff) return false;
      // Apply type filter if active
      if (typeFilter !== 'All' && p.type !== typeFilter) return false;
      return true;
    }).length;
    const badge = document.querySelector(`[data-count-id="difficulty-${diff}"]`);
    if (badge) badge.innerText = count;
  });
}

function renderCards() {
  gridContainer.innerHTML = '';

  const filtered = patterns.filter(p => {
    // Basic defensive check
    if (!p) return false;

    // Category Filter
    if (typeFilter !== 'All' && p.type !== typeFilter) return false;

    // Difficulty Filter
    if (diffFilter !== 'All' && p.dynamicDifficulty !== diffFilter) return false;

    // Search Filter
    if (searchFilter) {
      const pName = (p.name || '').toLowerCase();
      const pId = (p.id || '').toLowerCase();
      const matchName = pName.includes(searchFilter);
      const matchId = pId.includes(searchFilter);
      if (!matchName && !matchId) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    gridContainer.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <h3>No Rubik's art available</h3>
        <p>Try adjusting your search or filters to find what you're looking for.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(p => {
    const el = document.createElement('div');
    el.className = 'cube-art-card';
    el.innerHTML = `
      <div class="cube-art-img-wrapper">
        <img src="${ROOT}${p.imageUrl.replace('/public/', '').replace(/^\//, '')}" alt="${p.name}" class="cube-art-img" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuNCkiLz48cmVjdCB4PSIyNSIgeT0iMjUiIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIiLz48bGluZSB4MT0iMjUiIHkxPSI0MS42IiB4Mj0iNzUiIHkyPSI0MS42IiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMiIvPjxsaW5lIHgxPSIyNSIgeTI9IjU4LjMiIHgyPSI3NSIgeTI9IjU4LjMiIHN0cm9rZT0iIzk0YTMiIHN0cm9rZS13aWR0aD0iMiIvPjxsaW5lIHgxPSI0MS42IiB5MT0iMjUiIHgyPSI0MS42IiB5Mj0iNzUiIHN0cm9rZT0iIzk0YTMiIHN0cm9rZS13aWR0aD0iMiIvPjxsaW5lIHgxPSI1OC4zIiB5MT0iMjUiIHgyPSI1OC4zIiB5Mj0iNzUiIHN0cm9rZT0iIzk0YTMiIHN0cm9rZS13aWR0aD0iMiIvPjx0ZXh0IHg9IjUwJSIgeT0iOTAlIiBmb250LXNpemU9IjgiIGZpbGw9IiM2NDc0OGIiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='"/>
      </div>
      <div class="cube-art-body">
        <div class="cube-art-title">${p.name}</div>
        <div class="cube-art-id">#${p.id}</div>
        <div class="cube-art-meta">
          <span class="meta-badge">${p.type}</span>
          <span class="meta-badge">${p.dynamicDifficulty}</span>
          <span class="meta-badge">${p.moveCount} Moves</span>
        </div>
      </div>
    `;
    el.addEventListener('click', () => {
      // Currently we only support 3x3x3, 2x2x2, 4x4x4 and 5x5x5 3D players. 
      if (p.type !== '3x3x3' && p.type !== '2x2x2' && p.type !== '4x4x4' && p.type !== '5x5x5') {
        alert("3D guide is only available for 2x2, 3x3, 4x4 and 5x5 puzzles at the moment!");
        return;
      }
      playPattern(p);
    });
    gridContainer.appendChild(el);
  });

  // Update badges to reflect current filter context
  updateBadges();
}

// --- 3D Scene setup ---
const container = document.getElementById('app-cube-arts');
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
controls.enableRotate = false; // Disable global rotation during step sequence
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

// --- Modal 3D Scene setup ---
let modalScene, modalCamera, modalRenderer, modalControls, modalCubeGroup;
let modalCubies = [];
let isModalActive = false;

function initModalScene() {
  modalScene = new THREE.Scene();
  modalCamera = new THREE.PerspectiveCamera(45, modalCubeContainer.clientWidth / modalCubeContainer.clientHeight, 0.1, 100);
  modalCamera.position.set(3.3, 3.3, 4.9);

  modalRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  modalRenderer.setSize(modalCubeContainer.clientWidth, modalCubeContainer.clientHeight);
  modalRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  modalCubeContainer.appendChild(modalRenderer.domElement);

  modalControls = new OrbitControls(modalCamera, modalRenderer.domElement);
  modalControls.enableDamping = true;
  modalControls.dampingFactor = 0.05;
  modalControls.enablePan = false;
  modalControls.enableZoom = false;

  const ambient = new THREE.AmbientLight(0xffffff, 2.5);
  modalScene.add(ambient);
  const d1 = new THREE.DirectionalLight(0xffffff, 1.5);
  d1.position.set(10, 20, 10);
  modalScene.add(d1);
  const d2 = new THREE.DirectionalLight(0xffffff, 1.0);
  d2.position.set(-10, 10, -10);
  modalScene.add(d2);

  modalCubeGroup = new THREE.Group();
  modalScene.add(modalCubeGroup);
}

const cubies = [];
const cubeGroup = new THREE.Group();
scene.add(cubeGroup);



const coreGeometry = new RoundedBoxGeometry(0.99, 0.99, 0.99, 5, 0.10);
const coreMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7, metalness: 0.1 });
const stickerGeometryX = new RoundedBoxGeometry(0.06, 0.83, 0.83, 6, 0.12);
const stickerGeometryY = new RoundedBoxGeometry(0.83, 0.06, 0.83, 6, 0.12);
const stickerGeometryZ = new RoundedBoxGeometry(0.83, 0.83, 0.06, 6, 0.12);

const canvasText = document.createElement('canvas');
canvasText.width = 256; canvasText.height = 256;
const contextText = canvasText.getContext('2d');
contextText.fillStyle = '#ffffff';
contextText.fillRect(0, 0, 256, 256);
for (let i = 0; i < 20000; i++) {
  contextText.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  contextText.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
}
const noiseTexture = new THREE.CanvasTexture(canvasText);
noiseTexture.wrapS = THREE.RepeatWrapping;
noiseTexture.wrapT = THREE.RepeatWrapping;

const getStickerMat = (color) => new THREE.MeshStandardMaterial({
  color, roughness: 0.9, metalness: 0.1, bumpMap: noiseTexture, bumpScale: 0.003
});

function initCube(type = '3x3x3') {
  // Clear old cubies
  cubies.forEach(c => cubeGroup.remove(c));
  cubies.length = 0;

  let offsets = [];
  if (type === '2x2x2') {
    offsets = [-0.5, 0.5];
    cubeGroup.scale.set(1.5, 1.5, 1.5);
  } else if (type === '4x4x4') {
    offsets = [-1.5, -0.5, 0.5, 1.5];
    cubeGroup.scale.set(0.8, 0.8, 0.8);
  } else if (type === '5x5x5') {
    offsets = [-2, -1, 0, 1, 2];
    cubeGroup.scale.set(0.65, 0.65, 0.65);
  } else {
    offsets = [-1, 0, 1];
    cubeGroup.scale.set(1, 1, 1);
  }

  for (let x of offsets) {
    for (let y of offsets) {
      for (let z of offsets) {
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

        if (type === '4x4x4') {
          if (x === 1.5) addSticker(stickerGeometryX, colors.right, [0.49, 0, 0]);
          if (x === -1.5) addSticker(stickerGeometryX, colors.left, [-0.49, 0, 0]);
          if (y === 1.5) addSticker(stickerGeometryY, colors.top, [0, 0.49, 0]);
          if (y === -1.5) addSticker(stickerGeometryY, colors.bottom, [0, -0.49, 0]);
          if (z === 1.5) addSticker(stickerGeometryZ, colors.front, [0, 0, 0.49]);
          if (z === -1.5) addSticker(stickerGeometryZ, colors.back, [0, 0, -0.49]);
        } else if (type === '5x5x5') {
          if (x === 2) addSticker(stickerGeometryX, colors.right, [0.49, 0, 0]);
          if (x === -2) addSticker(stickerGeometryX, colors.left, [-0.49, 0, 0]);
          if (y === 2) addSticker(stickerGeometryY, colors.top, [0, 0.49, 0]);
          if (y === -2) addSticker(stickerGeometryY, colors.bottom, [0, -0.49, 0]);
          if (z === 2) addSticker(stickerGeometryZ, colors.front, [0, 0, 0.49]);
          if (z === -2) addSticker(stickerGeometryZ, colors.back, [0, 0, -0.49]);
        } else {
          if (x > 0) addSticker(stickerGeometryX, colors.right, [0.49, 0, 0]);
          if (x < 0) addSticker(stickerGeometryX, colors.left, [-0.49, 0, 0]);
          if (y > 0) addSticker(stickerGeometryY, colors.top, [0, 0.49, 0]);
          if (y < 0) addSticker(stickerGeometryY, colors.bottom, [0, -0.49, 0]);
          if (z > 0) addSticker(stickerGeometryZ, colors.front, [0, 0, 0.49]);
          if (z < 0) addSticker(stickerGeometryZ, colors.back, [0, 0, -0.49]);
        }

        cubeGroup.add(cubieGroup);
        cubies.push(cubieGroup);
      }
    }
  }
}

initCube();

let isAnimating = false;

function rotateLayer(axis, layer, angle, duration = 300) {
  return new Promise((resolve) => {
    if (isAnimating && duration > 0) return;
    isAnimating = true;

    const is2x2 = currentPattern && currentPattern.type === '2x2x2';
    const is4x4 = currentPattern && currentPattern.type === '4x4x4';
    const is5x5 = currentPattern && currentPattern.type === '5x5x5';
    const activeCubies = cubies.filter(c => {
      const pos = (is2x2 || is4x4) ? Math.round(c.position[axis] * 2) / 2 : Math.round(c.position[axis]);
      if (Array.isArray(layer)) {
        return layer.some(l => Math.abs(pos - l) < 0.1);
      }
      return Math.abs(pos - layer) < 0.1;
    });

    const pivot = new THREE.Group();
    cubeGroup.add(pivot);
    activeCubies.forEach(c => pivot.attach(c));

    if (duration > 0) {
      new TWEEN.Tween({ val: 0 })
        .to({ val: angle }, duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate((obj) => pivot.rotation[axis] = obj.val)
        .onComplete(() => {
          finishRotation(pivot, activeCubies, resolve);
        })
        .start();
    } else {
      pivot.rotation[axis] = angle;
      finishRotation(pivot, activeCubies, resolve);
    }
  });
}

function finishRotation(pivot, activeCubies, resolve) {
  const is2x2 = currentPattern && currentPattern.type === '2x2x2';
  const is4x4 = currentPattern && currentPattern.type === '4x4x4';
  const is5x5 = currentPattern && currentPattern.type === '5x5x5';
  pivot.updateMatrixWorld();
  activeCubies.forEach(c => {
    cubeGroup.attach(c);
    if (is2x2 || is4x4) {
      c.position.x = Math.round(c.position.x * 2) / 2;
      c.position.y = Math.round(c.position.y * 2) / 2;
      c.position.z = Math.round(c.position.z * 2) / 2;
    } else {
      c.position.x = Math.round(c.position.x);
      c.position.y = Math.round(c.position.y);
      c.position.z = Math.round(c.position.z);
    }

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

const MOVES_3X3 = {
  'L': ['x', -1, Math.PI / 2], 'M': ['x', 0, Math.PI / 2], 'R': ['x', 1, -Math.PI / 2],
  'U': ['y', 1, -Math.PI / 2], 'E': ['y', 0, Math.PI / 2], 'D': ['y', -1, Math.PI / 2],
  'F': ['z', 1, -Math.PI / 2], 'S': ['z', 0, -Math.PI / 2], 'B': ['z', -1, Math.PI / 2],
  'x': ['x', [-1, 0, 1], -Math.PI / 2], 'y': ['y', [-1, 0, 1], -Math.PI / 2], 'z': ['z', [-1, 0, 1], -Math.PI / 2]
};

const MOVES_2X2 = {
  'L': ['x', -0.5, Math.PI / 2], 'R': ['x', 0.5, -Math.PI / 2],
  'U': ['y', 0.5, -Math.PI / 2], 'D': ['y', -0.5, Math.PI / 2],
  'F': ['z', 0.5, -Math.PI / 2], 'B': ['z', -0.5, Math.PI / 2],
  'x': ['x', [-0.5, 0.5], -Math.PI / 2], 'y': ['y', [-0.5, 0.5], -Math.PI / 2], 'z': ['z', [-0.5, 0.5], -Math.PI / 2]
};

const MOVES_4X4 = {
  'L': ['x', [-1.5], Math.PI / 2], 'R': ['x', [1.5], -Math.PI / 2],
  'U': ['y', [1.5], -Math.PI / 2], 'D': ['y', [-1.5], Math.PI / 2],
  'F': ['z', [1.5], -Math.PI / 2], 'B': ['z', [-1.5], Math.PI / 2],
  'Lw': ['x', [-1.5, -0.5], Math.PI / 2], 'Rw': ['x', [1.5, 0.5], -Math.PI / 2],
  'Uw': ['y', [1.5, 0.5], -Math.PI / 2], 'Dw': ['y', [-1.5, -0.5], Math.PI / 2],
  'Fw': ['z', [1.5, 0.5], -Math.PI / 2], 'Bw': ['z', [-1.5, -0.5], Math.PI / 2],
  'l': ['x', [-0.5], Math.PI / 2], 'r': ['x', [0.5], -Math.PI / 2],
  'u': ['y', [0.5], -Math.PI / 2], 'd': ['y', [-0.5], Math.PI / 2],
  'f': ['z', [0.5], -Math.PI / 2], 'b': ['z', [-0.5], Math.PI / 2],
  'M': ['x', [-0.5, 0.5], Math.PI / 2], 'E': ['y', [-0.5, 0.5], Math.PI / 2], 'S': ['z', [-0.5, 0.5], -Math.PI / 2],
  'x': ['x', [-1.5, -0.5, 0.5, 1.5], -Math.PI / 2], 'y': ['y', [-1.5, -0.5, 0.5, 1.5], -Math.PI / 2], 'z': ['z', [-1.5, -0.5, 0.5, 1.5], -Math.PI / 2]
};

const MOVES_5X5 = {
  'L': ['x', [-2], Math.PI / 2], 'R': ['x', [2], -Math.PI / 2],
  'U': ['y', [2], -Math.PI / 2], 'D': ['y', [-2], Math.PI / 2],
  'F': ['z', [2], -Math.PI / 2], 'B': ['z', [-2], Math.PI / 2],
  'Lw': ['x', [-2, -1], Math.PI / 2], 'Rw': ['x', [1, 2], -Math.PI / 2],
  'Uw': ['y', [1, 2], -Math.PI / 2], 'Dw': ['y', [-2, -1], Math.PI / 2],
  'Fw': ['z', [1, 2], -Math.PI / 2], 'Bw': ['z', [-2, -1], Math.PI / 2],
  'l': ['x', [-1], Math.PI / 2], 'r': ['x', [1], -Math.PI / 2],
  'u': ['y', [1], -Math.PI / 2], 'd': ['y', [-1], Math.PI / 2],
  'f': ['z', [1], -Math.PI / 2], 'b': ['z', [-1], Math.PI / 2],
  'M': ['x', [0], Math.PI / 2], 'E': ['y', [0], Math.PI / 2], 'S': ['z', [0], -Math.PI / 2],
  'm': ['x', [-1, 0, 1], Math.PI / 2], 'e': ['y', [-1, 0, 1], Math.PI / 2], 's': ['z', [-1, 0, 1], -Math.PI / 2],
  'x': ['x', [-2, -1, 0, 1, 2], -Math.PI / 2], 'y': ['y', [-2, -1, 0, 1, 2], -Math.PI / 2], 'z': ['z', [-2, -1, 0, 1, 2], -Math.PI / 2]
};

let isActive = false;
let currentPattern = null;
let currentStepIndex = 0;
let solutionSteps = [];
let lastActionDirection = 1;

window.addEventListener('route-changed', (e) => {
  const path = e.detail;
  const cubeArtsView = document.getElementById('cube-arts-view');
  const cubeArtsPlayerView = document.getElementById('cube-arts-player-view');

  if (path === '/cube-arts' || path.startsWith('/cube-arts/play') || path.includes('/rubiks-art/')) {
    isActive = true;

    if (path.startsWith('/cube-arts/play')) {
      // PLAY MODE
      if (cubeArtsView) cubeArtsView.classList.add('d-none');
      if (cubeArtsPlayerView) cubeArtsPlayerView.classList.remove('d-none');
      container.style.display = 'block';
    } else {
      // LIST MODE
      if (cubeArtsView) cubeArtsView.classList.remove('d-none');
      if (cubeArtsPlayerView) cubeArtsPlayerView.classList.add('d-none');
      currentPattern = null;
      container.style.display = 'none';
      if (patterns.length === 0) loadCubeArts();
    }
  } else {
    isActive = false;
    if (cubeArtsView) cubeArtsView.classList.add('d-none');
    if (cubeArtsPlayerView) cubeArtsPlayerView.classList.add('d-none');
    container.style.display = 'none';
  }
});

function playPattern(p, updateURL = true) {
  currentPattern = p;
  initCube(p.type);

  if (updateURL) {
    window.location.hash = `play/${encodeURIComponent(p.id)}`;
    // Explicitly trigger routing update
    handleRouting();
  }

  const MOVES = p.type === '5x5x5' ? MOVES_5X5 : (p.type === '4x4x4' ? MOVES_4X4 : (p.type === '2x2x2' ? MOVES_2X2 : MOVES_3X3));

  // Parse moves exactly as they are written to form the pattern
  const rawMovesArray = p.moves.trim().split(/\s+/).filter(m => m);
  solutionSteps = [];

  for (let m of rawMovesArray) {
    let face = m.replace(/[2']+/g, "");
    let modifier = m.replace(/^[a-zA-Z]+/g, "");

    let moveDef = MOVES[face];
    if (!moveDef) {
      console.warn("Unknown move notation:", face, "in", m);
      continue;
    }
    let angle = moveDef[2];
    if (modifier.includes("'")) angle = -angle;
    if (modifier.includes("2")) angle = angle * 2;

    solutionSteps.push({ raw: m, axis: moveDef[0], layer: moveDef[1], angle: angle });
  }

  currentStepIndex = 0;
  lastActionDirection = 1;

  container.style.display = 'block';
  updatePlaybackUI();
}

const FACE_NAMES = {
  'U': 'TOP', 'D': 'BOTTOM', 'F': 'FRONT', 'B': 'BACK', 'L': 'LEFT', 'R': 'RIGHT',
  'M': 'MIDDLE', 'E': 'EQUATOR', 'S': 'STANDING',
  'l': 'LEFT INNER', 'r': 'RIGHT INNER', 'u': 'TOP INNER', 'd': 'BOTTOM INNER', 'f': 'FRONT INNER', 'b': 'BACK INNER',
  'Lw': 'LEFT WIDE', 'Rw': 'RIGHT WIDE', 'Uw': 'TOP WIDE', 'Dw': 'BOTTOM WIDE', 'Fw': 'FRONT WIDE', 'Bw': 'BACK WIDE',
  'x': 'ENTIRE CUBE (X-axis)', 'y': 'ENTIRE CUBE (Y-axis)', 'z': 'ENTIRE CUBE (Z-axis)'
};

function getHumanReadableMove(rawMove) {
  const face = rawMove.replace(/[2']+/g, "");
  const mod = rawMove.replace(/^[a-zA-Z]+/g, "");
  const faceName = FACE_NAMES[face] || face;
  if (mod.includes("'")) return `Turn the ${faceName} layer 90° counterclockwise.`;
  if (mod.includes("2")) return `Turn the ${faceName} layer 180°.`;
  return `Turn the ${faceName} layer 90° clockwise.`;
}

function getReverseHumanReadableMove(rawMove) {
  const face = rawMove.replace(/[2']+/g, "");
  const mod = rawMove.replace(/^[a-zA-Z]+/g, "");
  const faceName = FACE_NAMES[face] || face;
  if (mod.includes("'")) return `Turn the ${faceName} layer 90° clockwise.`;
  if (mod.includes("2")) return `Turn the ${faceName} layer 180°.`;
  return `Turn the ${faceName} layer 90° counterclockwise.`;
}

function getInverseMoveNotation(rawMove) {
  const face = rawMove.replace(/[2']+/g, "");
  const mod = rawMove.replace(/^[a-zA-Z]+/g, "");
  if (mod.includes("'")) return face;
  if (mod.includes("2")) return face + "2'";
  return face + "'";
}

function updatePlaybackUI() {
  const humanInstruction = document.getElementById('artInstruction');
  const solutionText = document.getElementById('artSolutionText');
  const btnSideBack = document.getElementById('btnArtSideBack');
  const btnSideNext = document.getElementById('btnArtSideNext');
  const artBadge = document.getElementById('artBadge');

  if (currentPattern) {
    artBadge.innerText = `#${currentPattern.id} - ${currentPattern.name}`;
  }

  // Determine if we are at the end of the solution
  const isFinished = currentStepIndex >= solutionSteps.length && lastActionDirection === 1;

  if (isFinished) {
    btnSideNext.classList.add('d-none');
    btnViewPattern.classList.remove('d-none');
  } else {
    btnSideNext.classList.remove('d-none');
    btnViewPattern.classList.add('d-none');
  }

  if (currentStepIndex === 0 && lastActionDirection === 1) {
    humanInstruction.innerText = `Hold your SOLVED Cube as shown below, press "Next" to start.`;
    solutionText.innerHTML = "READY TO MAKE";
    btnSideBack.disabled = true;
    btnSideNext.disabled = false;
    btnSideNext.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
    return;
  }

  if (lastActionDirection === -1) {
    const move = solutionSteps[currentStepIndex];
    humanInstruction.innerText = getReverseHumanReadableMove(move.raw);

    let txt = `<strong style="color:#eab308">Undo</strong> Step ${currentStepIndex + 1} / ${solutionSteps.length}: `;
    txt += `<strong style="color:#eab308">${getInverseMoveNotation(move.raw)}</strong>`;
    solutionText.innerHTML = txt;

    btnSideBack.disabled = currentStepIndex <= 0;
    btnSideNext.disabled = false;
    btnSideNext.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
    return;
  }

  const move = solutionSteps[currentStepIndex - 1];
  humanInstruction.innerText = getHumanReadableMove(move.raw);

  let txt = `Step ${currentStepIndex} / ${solutionSteps.length}: `;
  txt += `<strong style="color:#2563eb">${move.raw}</strong>`;
  solutionText.innerHTML = txt;

  btnSideBack.disabled = false;
  btnSideNext.disabled = false;
  btnSideNext.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
}

function openPatternModal() {
  if (!modalRenderer) initModalScene();

  isModalActive = true;
  patternViewOverlay.classList.remove('d-none');
  modalPatternName.innerText = "#" + currentPattern.id + " - " + currentPattern.name;

  // Sync modal cube with current cube
  modalCubies.forEach(c => modalCubeGroup.remove(c));
  modalCubies = [];

  cubies.forEach(cubie => {
    const clone = cubie.clone();
    // We need to clone materials to avoid sharing state if we wanted to animate, 
    // but for static view it's mostly fine. However, let's ensure stickers are correct.
    modalCubeGroup.add(clone);
    modalCubies.push(clone);
  });

  // Dynamic zoom for modal view
  if (currentPattern && currentPattern.type === '2x2x2') {
    modalCamera.position.set(2.5, 2.5, 3.75);
  } else if (currentPattern && currentPattern.type === '4x4x4') {
    modalCamera.position.set(4, 4, 6);
  } else if (currentPattern && currentPattern.type === '5x5x5') {
    modalCamera.position.set(4.5, 4.5, 6.5);
  } else {
    modalCamera.position.set(3.3, 3.3, 4.9);
  }

  // Handle resize for modal
  const width = modalCubeContainer.clientWidth;
  const height = modalCubeContainer.clientHeight;
  modalCamera.aspect = width / height;
  modalCamera.updateProjectionMatrix();
  modalRenderer.setSize(width, height);
}

function closePatternModal() {
  isModalActive = false;
  patternViewOverlay.classList.add('d-none');
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

document.getElementById('btnArtSideNext').addEventListener('click', handleNext);
document.getElementById('btnArtSideBack').addEventListener('click', handleBack);
btnViewPattern.addEventListener('click', openPatternModal);
document.getElementById('btnArtExit').addEventListener('click', () => {
  window.location.hash = '/cube-arts';
});
closePatternModalBtn.addEventListener('click', closePatternModal);
patternViewOverlay.addEventListener('click', (e) => {
  if (e.target === patternViewOverlay) closePatternModal();
});

function animate(time) {
  requestAnimationFrame(animate);
  if (isActive && container.style.display !== 'none') {
    TWEEN.update(time);
    if (!isModalActive) {
      controls.update();
      renderer.render(scene, camera);
    }
  }

  if (isModalActive && modalRenderer) {
    modalControls.update();
    modalRenderer.render(modalScene, modalCamera);
  }
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function handleRouting() {
  const path = window.location.pathname;
  const hash = window.location.hash;

  let routePath = '/cube-arts'; // Default

  // Check if we are in play mode via path or hash
  const isPlayMode = path.includes('/play/') || hash.startsWith('#/cube-arts/play/') || hash.startsWith('#play/');

  if (isPlayMode) {
    routePath = '/cube-arts/play';

    // If patterns are loaded, try to start playing the specific pattern
    if (patterns.length > 0) {
      let patternId = null;
      if (path.includes('/play/')) {
        patternId = path.split('/play/')[1].split('/')[0];
      } else if (hash.startsWith('#/cube-arts/play/')) {
        patternId = decodeURIComponent(hash.replace('#/cube-arts/play/', ''));
      } else if (hash.startsWith('#play/')) {
        patternId = decodeURIComponent(hash.replace('#play/', ''));
      }

      if (patternId && (!currentPattern || currentPattern.id !== patternId)) {
        const pattern = patterns.find(p => p.id === patternId);
        if (pattern) playPattern(pattern, false);
      }
    }
  }

  window.dispatchEvent(new CustomEvent('route-changed', { detail: routePath }));
}

window.addEventListener('hashchange', handleRouting);
window.addEventListener('popstate', handleRouting);

if (btnArtExit) {
  btnArtExit.addEventListener('click', () => {
    window.location.hash = "";
    handleRouting();
  });
}

// Init if we load initially on this route
(function () {
  const path = window.location.pathname;
  if (path.includes('rubiks-art')) {
    loadCubeArts().then(() => {
      handleRouting();
    });
    initFilters();
  }
})();
