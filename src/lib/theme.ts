export type ThemePref = "system" | "light" | "dark";
export const THEME_STORAGE_KEY = "gymly.theme";

/**
 * Runs before first paint to stamp the resolved theme on <html>, so the app
 * never flashes the wrong palette. Kept as a string because it is injected
 * with dangerouslySetInnerHTML in the document head.
 */
export const THEME_BOOTSTRAP = `(function(){try{
var p=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';
var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.setAttribute('data-theme',d?'dark':'light');
document.documentElement.style.colorScheme=d?'dark':'light';
}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;
