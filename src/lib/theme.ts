// Shared with the TerraInk landing (thewbuk/terraink-mobile, web/src/lib/theme.ts): same key, same
// script, so picking light or dark anywhere on terraink.space applies to both apps.
export const THEME_KEY = 'terraink.theme';
const OLD_KEY = 'garminLook.theme'; // before the apps shared a key; read once as a fallback
// runs in <head> before first paint to avoid a flash of the wrong theme
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}')||localStorage.getItem('${OLD_KEY}');if(t==='light'||t==='dark')localStorage.setItem('${THEME_KEY}',t);document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}catch(e){}`;
