export const routes = [
  { id: 'home', path: '/', lazy: () => import('./pages/Home.jsx') },
  { id: 'about', path: '/about', lazy: () => import('./pages/About.jsx') },
]
