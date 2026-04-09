export const blue = 0x2A62C9;
export const green = 0x009E60;
export const white = 0xFFFFFF;
export const yellow = 0xFFD500;
export const red = 0xC41E3A;
export const orange = 0xFF5800;

export const RUBIKS_CUBE_COLORS = {
  right: blue,
  left: green,
  top: white,
  bottom: yellow,
  front: red,
  back: orange
};

// Automatically detect the base path (e.g., '/rubikan/' on GitHub Pages or '/' locally)
export const BASE_URL = (window.location.hostname.includes('github.io') || window.location.pathname.startsWith('/rubikan/'))
  ? '/rubikan/'
  : '/';
