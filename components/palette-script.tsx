/**
 * Sets data-palette before first paint so there is no flash.
 * "auto" follows London's hour: day palette 07:00–18:59, night otherwise.
 * A visitor's explicit choice (Cmd+K) is stored under "palette".
 */
const script = `(function(){try{
var q=new URLSearchParams(location.search).get('palette');var s=q||localStorage.getItem('palette');
var p=s==='day'||s==='night'?s:null;
if(!p){var h=+new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'numeric',hourCycle:'h23'}).format(new Date());p=h>=7&&h<19?'day':'night';}
document.documentElement.dataset.palette=p;
}catch(e){document.documentElement.dataset.palette='night';}})();`;

export function PaletteScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export type PaletteChoice = "auto" | "day" | "night";

export function applyPalette(choice: PaletteChoice) {
  if (choice === "auto") localStorage.removeItem("palette");
  else localStorage.setItem("palette", choice);
  const h = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "numeric", hourCycle: "h23" }).format(new Date()),
  );
  const resolved = choice === "auto" ? (h >= 7 && h < 19 ? "day" : "night") : choice;
  document.documentElement.dataset.palette = resolved;
}
