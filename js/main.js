// Mode Switching and Routing
import './cube-3x3.js';
import './cube-2x2.js';
import './cube-4x4.js';
import './solver-3x3.js';
import './solver-2x2.js';
import './solver-4x4.js';
import './cube-arts.js';

let currentMode = 'home';

// Base path for pure version (set to empty by default)
const BASE_PATH = '';

// Returns the route portion, using hash routing to support static hosting without 404s
function getRoutePath() {
  const hash = window.location.hash || '#/';
  // Remove the '#' and ensure it starts with /
  let path = hash.slice(1);
  if (!path.startsWith('/')) path = '/' + path;
  return path;
}

const appContainer = document.getElementById('app');
const homeView = document.getElementById('home-view');
const cube3x3View = document.getElementById('cube-3x3-view');
const cube2x2View = document.getElementById('cube-2x2-view');
const cube4x4View = document.getElementById('cube-4x4-view');
const comingSoonView = document.getElementById('coming-soon-view');

const navBtns = document.querySelectorAll('.navbar [data-route]');

function handleNavigation(path, addToHistory = true) {
  if (path === '/') path = '/'; // ensure format
  window.location.hash = path;
  // hashchange event will trigger updateViewBasedOnRoute
}

navBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    handleNavigation(e.currentTarget.getAttribute('data-route'));
  });
});

window.addEventListener('hashchange', () => {
  updateViewBasedOnRoute();
});

window.addEventListener('popstate', () => {
  updateViewBasedOnRoute();
});

function getTitleFromPath(path) {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return '';
  const lastPart = parts[parts.length - 1];
  return lastPart.replace(/-/g, ' ').toUpperCase();
}

function updateViewBasedOnRoute() {
  const path = getRoutePath();

  // Reset navs for both top level buttons and dropdown links
  document.querySelectorAll('.navbar .nav-btn, .navbar [data-route]').forEach(btn => btn.classList.remove('active'));
  // Find active nav and highlight
  const activeNav = document.querySelector(`.navbar [data-route="${path === '/' ? '/' : path}"]`);
  if (activeNav && activeNav.classList.contains('nav-btn')) {
    activeNav.classList.add('active');
  } else if (activeNav) {
    activeNav.classList.add('active'); // highlight the specific dropdown link
    const parentDropBtn = activeNav.closest('.dropdown')?.querySelector('.nav-btn');
    if (parentDropBtn) parentDropBtn.classList.add('active');
  }

  // Reset views
  [homeView, cube3x3View, cube2x2View, cube4x4View, comingSoonView].forEach(v => {
    if (v) v.classList.add('d-none');
  });

  // Hide all 3D containers
  ['app', 'app-2x2-main', 'app-3x3', 'app-2x2', 'app-4x4', 'app-4x4-main', 'app-cube-arts'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const s3x3 = document.getElementById('solve-3x3-view');
  if (s3x3) s3x3.classList.add('d-none');
  const s2x2 = document.getElementById('solve-2x2-view');
  if (s2x2) s2x2.classList.add('d-none');
  const s4x4 = document.getElementById('solve-4x4-view');
  if (s4x4) s4x4.classList.add('d-none');
  const cubeArtsView = document.getElementById('cube-arts-view');
  if (cubeArtsView) cubeArtsView.classList.add('d-none');
  const cubeArtsPlayerView = document.getElementById('cube-arts-player-view');
  if (cubeArtsPlayerView) cubeArtsPlayerView.classList.add('d-none');

  currentMode = path;

  if (path === '' || path === '/') {
    homeView.classList.remove('d-none');

  } else if (path === '/cubes/3x3x3-cube') {
    if (appContainer) appContainer.style.display = 'block';
    if (cube3x3View) cube3x3View.classList.remove('d-none');

  } else if (path === '/cubes/2x2x2-cube') {
    const app2x2Main = document.getElementById('app-2x2-main');
    if (app2x2Main) app2x2Main.style.display = 'block';
    if (cube2x2View) cube2x2View.classList.remove('d-none');

  } else if (path === '/cubes/4x4x4-cube') {
    const app4x4Main = document.getElementById('app-4x4-main');
    if (app4x4Main) app4x4Main.style.display = 'block';
    if (cube4x4View) cube4x4View.classList.remove('d-none');

  } else if (path === '/solver/3x3x3-cube') {
    if (s3x3) s3x3.classList.remove('d-none');

  } else if (path === '/solver/2x2x2-cube') {
    if (s2x2) s2x2.classList.remove('d-none');

  } else if (path === '/solver/4x4x4-cube') {
    if (s4x4) s4x4.classList.remove('d-none');

  } else if (path === '/cube-arts') {
    if (cubeArtsView) cubeArtsView.classList.remove('d-none');

  } else if (path.startsWith('/cube-arts/play')) {
    if (cubeArtsPlayerView) cubeArtsPlayerView.classList.remove('d-none');

  } else {
    // Other routes go to coming soon
    const comingSoonTitle = document.getElementById('coming-soon-title');
    if (comingSoonTitle) comingSoonTitle.innerText = getTitleFromPath(path) || 'FEATURE';
    comingSoonView.classList.remove('d-none');
  }

  window.dispatchEvent(new CustomEvent('route-changed', { detail: path }));
}

// Initial route update after all modules are loaded
window.addEventListener('load', () => {
  updateViewBasedOnRoute();
});

