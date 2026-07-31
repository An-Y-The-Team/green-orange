/**
 * Pre-hydration theme stamp — the anti-FOUC half of theme-provider.tsx.
 *
 * Deliberately NOT a client component: render it from the ROOT layout (a
 * server component), so the inline <script> arrives in the server HTML and
 * executes at parse time. Rendering it from a client component would both
 * skip execution and trip React 19.2's "Encountered a script tag while
 * rendering React component" warning.
 */
const INIT = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var c=d?"dark":"light";var e=document.documentElement;e.classList.remove("light","dark");e.classList.add(c);e.style.colorScheme=c}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: INIT }} />;
}
