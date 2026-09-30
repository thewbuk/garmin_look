export const THEME_KEY = 'garminLook.theme';
// runs in <head> before first paint to avoid a flash of the wrong theme
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}catch(e){}`;
