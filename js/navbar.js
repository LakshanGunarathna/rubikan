// Shared navbar logic for Multi-Page Application
export function initNavbar() {
  const navbarHTML = `
    <div class="nav-brand">
      <img src="/assets/Logo.png" alt="Rubikan Logo" class="nav-logo-img" />
      <span class="nav-brand-text">Rubikan</span>
    </div>
    <ul class="nav-links">
        <li class="nav-item">
            <a href="/" class="nav-link" data-path="/">Home</a>
        </li>
        <li class="nav-item dropdown">
            <a href="#" class="nav-link">Rubik's Cubes <i class="fas fa-chevron-down"></i></a>
            <ul class="dropdown-menu">
                <li><a href="cubes/2x2x2/" class="dropdown-link">Rubik's Mini Cube (2x2x2)</a></li>
                <li><a href="cubes/3x3x3/" class="dropdown-link">Rubik's Cube (3x3x3)</a></li>
                <li><a href="cubes/4x4x4/" class="dropdown-link">Rubik's Revenge (4x4x4)</a></li>
                <li><a href="cubes/5x5x5/" class="dropdown-link">Rubik's Professor's Cube (5x5x5)</a></li>
            </ul>
        </li>
        <li class="nav-item dropdown">
            <a href="#" class="nav-link">Solver <i class="fas fa-chevron-down"></i></a>
            <ul class="dropdown-menu">
                <li><a href="solver/2x2x2/" class="dropdown-link">2x2x2 Solver (Mini Cube)</a></li>
                <li><a href="solver/3x3x3/" class="dropdown-link">3x3x3 Solver (Rubik's Cube)</a></li>
                <li><a href="solver/4x4x4/" class="dropdown-link">4x4x4 Solver (Revenge Cube)</a></li>
                <li><a href="solver/5x5x5/" class="dropdown-link">5x5x5 Solver (Professor's Cube)</a></li>
            </ul>
        </li>
        <li class="nav-item">
            <a href="rubiks-art/" class="nav-link">Rubik's Art</a>
        </li>
    </ul>
  `;

  const navContainers = document.querySelectorAll('.navbar');
  navContainers.forEach(nav => {
    nav.innerHTML = navbarHTML;

    // Set active state based on current location
    const currentPath = window.location.pathname;
    nav.querySelectorAll('a').forEach(el => {
      const href = el.getAttribute('href');
      const dataPath = el.getAttribute('data-path');

      if (href === currentPath || (dataPath && dataPath === currentPath) ||
        (href && href !== '#' && currentPath.startsWith(href) && href !== '/')) {
        el.classList.add('active');

        // Handle dropdown coloring (grandparent in this new structure)
        const parentDropdown = el.closest('.dropdown');
        if (parentDropdown) {
          const dropBtn = parentDropdown.querySelector('.nav-link');
          if (dropBtn) dropBtn.classList.add('active');
        }
      }
    });

    // Handle branding click
    const brand = nav.querySelector('.nav-brand');
    if (brand) {
      brand.style.cursor = 'pointer';
      brand.addEventListener('click', () => window.location.href = '/');
    }
  });
}
