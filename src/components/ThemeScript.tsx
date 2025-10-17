export function ThemeScript() {
  const themeScript = `
    (function() {
      try {
        const stored = localStorage.getItem('cottagr-theme');
        const theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.classList.add(theme);
      } catch (e) {}
    })();
  `;

  return (
    <script dangerouslySetInnerHTML={{ __html: themeScript }} />
  );
}
