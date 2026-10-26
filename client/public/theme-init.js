try {
  const saved = localStorage.getItem('monohaus-theme');
  document.documentElement.dataset.theme = saved === 'dark' || saved === 'light' ? saved : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
} catch { document.documentElement.dataset.theme = 'light'; }
