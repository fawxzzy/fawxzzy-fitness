import {
  APP_THEME_PRESETS,
  getAppThemePrimerConfig,
} from "@/lib/app-theme";
import {
  APP_BOOT_PREFERENCES_COOKIE_KEY,
  APP_BOOT_PREFERENCES_STORAGE_KEY,
} from "@/lib/app-boot-preferences";
import {
  AMBIENT_THEME_NAMES,
  AMBIENT_THEME_STORAGE_KEY,
} from "@/lib/ambient/theme";

export function buildLocalDevBrowserResetScript(buildId: string) {
  const payload = JSON.stringify({
    buildId,
    markerKey: `fawxzzy:fitness:dev-browser-reset:${buildId}`,
    freshParam: "__fresh",
    sessionKeepaliveLaunchKey: "fawxzzy:fitness:session-keepalive:launch",
  });

  return `(()=>{const config=${payload};try{
const host=window.location.hostname;
const isLocalHost=host==="localhost"||host==="127.0.0.1"||host==="[::1]";
if(!isLocalHost){return;}
const url=new URL(window.location.href);
const freshValue=url.searchParams.get(config.freshParam);
if(freshValue===config.buildId){
  url.searchParams.delete(config.freshParam);
  window.history.replaceState(window.history.state,"",url.toString());
  try{window.sessionStorage.setItem(config.markerKey,"1");}catch{}
  return;
}
let hasResetMarker=false;
try{hasResetMarker=window.sessionStorage.getItem(config.markerKey)==="1";}catch{}
if(hasResetMarker){return;}
try{
  window.sessionStorage.setItem(config.markerKey,"1");
  window.sessionStorage.removeItem(config.sessionKeepaliveLaunchKey);
}catch{}
Promise.resolve()
  .then(async()=>{
    if("serviceWorker" in navigator){
      try{
        const registrations=await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration)=>registration.unregister()));
      }catch{}
    }
    if("caches" in window){
      try{
        const cacheKeys=await window.caches.keys();
        await Promise.all(cacheKeys.map((cacheKey)=>window.caches.delete(cacheKey)));
      }catch{}
    }
  })
  .finally(()=>{
    url.searchParams.set(config.freshParam,config.buildId);
    window.location.replace(url.toString());
  });
}catch{}})();`;
}

export function buildPreHydrationAppBootPrimerScript() {
  const themeConfig = JSON.stringify(getAppThemePrimerConfig());
  const bootConfig = JSON.stringify({
    cookieKey: APP_BOOT_PREFERENCES_COOKIE_KEY,
    storageKey: APP_BOOT_PREFERENCES_STORAGE_KEY,
    version: 1,
    ambientStorageKey: AMBIENT_THEME_STORAGE_KEY,
    ambientNames: AMBIENT_THEME_NAMES,
    presetThemes: APP_THEME_PRESETS,
  });

  return `(()=>{try{
const themeConfig=${themeConfig};
const bootConfig=${bootConfig};
const root=document.documentElement;
if(!root){return;}
const clamp=(value,min,max)=>Math.min(Math.max(value,min),max);
const normalizeHexColor=(value,fallback)=>{if(typeof value!=="string"){return fallback;}const trimmed=value.trim();const hex=trimmed.startsWith("#")?trimmed:"#"+trimmed;if(/^#[\\da-fA-F]{6}$/.test(hex)){return hex.toLowerCase();}if(/^#[\\da-fA-F]{3}$/.test(hex)){const [,first,second,third]=hex;return ("#"+first+first+second+second+third+third).toLowerCase();}return fallback;};
const normalizeRadius=(value,fallback,min,max)=>typeof value==="number"&&!Number.isNaN(value)?clamp(Math.round(value),min,max):fallback;
const isHexColor=(value)=>typeof value==="string"&&/^#(?:[\\da-fA-F]{3}|[\\da-fA-F]{6})$/.test(value.trim());
const isRadius=(value,min,max)=>typeof value==="number"&&Number.isFinite(value)&&Math.round(value)===value&&value>=min&&value<=max;
const decodeValue=(value)=>{try{return decodeURIComponent(value);}catch{return value;}};
const isPreset=(value)=>value==="default"||value==="rose"||value==="test";
const isSlot=(value)=>typeof value==="string"&&themeConfig.customSlotIds.includes(value);
const isSelection=(value)=>isPreset(value)||isSlot(value);
const isAmbientTheme=(value)=>typeof value==="string"&&bootConfig.ambientNames.includes(value);
const isDisplayMode=(value)=>value==="browser"||value==="standalone";
const isIsoTimestamp=(value)=>typeof value==="string"&&!Number.isNaN(Date.parse(value));
const sanitizeTheme=(value)=>{const preset=value?.preset==="test"?"test":value?.preset==="rose"?"rose":"default";return {preset,textPrimaryColor:normalizeHexColor(value?.textPrimaryColor,themeConfig.defaultTheme.textPrimaryColor),textSecondaryColor:normalizeHexColor(value?.textSecondaryColor,themeConfig.defaultTheme.textSecondaryColor),textMutedColor:normalizeHexColor(value?.textMutedColor,themeConfig.defaultTheme.textMutedColor),primaryActionColor:normalizeHexColor(value?.primaryActionColor,themeConfig.defaultTheme.primaryActionColor),secondaryActionColor:normalizeHexColor(value?.secondaryActionColor,themeConfig.defaultTheme.secondaryActionColor),accentDividerColor:normalizeHexColor(value?.accentDividerColor,themeConfig.defaultTheme.accentDividerColor),metricAccentColor:normalizeHexColor(value?.metricAccentColor,themeConfig.defaultTheme.metricAccentColor),successCompleteColor:normalizeHexColor(value?.successCompleteColor,themeConfig.defaultTheme.successCompleteColor),selectionActiveColor:normalizeHexColor(value?.selectionActiveColor,themeConfig.defaultTheme.selectionActiveColor),accentYellowColor:normalizeHexColor(value?.accentYellowColor,themeConfig.defaultTheme.accentYellowColor),loaderScanColor:normalizeHexColor(value?.loaderScanColor,themeConfig.defaultTheme.loaderScanColor),warningColor:normalizeHexColor(value?.warningColor,themeConfig.defaultTheme.warningColor),dangerColor:normalizeHexColor(value?.dangerColor,themeConfig.defaultTheme.dangerColor),surfaceCardColor:normalizeHexColor(value?.surfaceCardColor,themeConfig.defaultTheme.surfaceCardColor),cardOutlineColor:normalizeHexColor(value?.cardOutlineColor,themeConfig.defaultTheme.cardOutlineColor),buttonRadius:normalizeRadius(value?.buttonRadius,themeConfig.defaultTheme.buttonRadius,10,28),cardRadius:normalizeRadius(value?.cardRadius,themeConfig.defaultTheme.cardRadius,14,36)};};
const isValidThemeSnapshot=(value)=>{if(!value||typeof value!=="object"){return false;}const record=value;return isPreset(record.preset)&&isHexColor(record.textPrimaryColor)&&isHexColor(record.textSecondaryColor)&&isHexColor(record.textMutedColor)&&isHexColor(record.primaryActionColor)&&isHexColor(record.secondaryActionColor)&&isHexColor(record.accentDividerColor)&&isHexColor(record.metricAccentColor)&&isHexColor(record.successCompleteColor)&&isHexColor(record.selectionActiveColor)&&isHexColor(record.accentYellowColor)&&isHexColor(record.loaderScanColor)&&isHexColor(record.warningColor)&&isHexColor(record.dangerColor)&&isHexColor(record.surfaceCardColor)&&isHexColor(record.cardOutlineColor)&&isRadius(record.buttonRadius,10,28)&&isRadius(record.cardRadius,14,36);};
const parseTheme=(rawValue)=>{if(!rawValue){return null;}try{const parsed=JSON.parse(rawValue);if(parsed?.version!==themeConfig.themeVersion||!parsed?.theme){return null;}return sanitizeTheme(parsed.theme);}catch{return null;}};
const parseThemeLibrary=(rawValue)=>{if(!rawValue){return [];}try{const parsed=JSON.parse(rawValue);if(parsed?.version!==themeConfig.libraryVersion||!Array.isArray(parsed?.themes)){return [];}const seenIds=new Set();const normalizedThemes=[];for(const entry of parsed.themes){if(!isSlot(entry?.id)||seenIds.has(entry.id)){continue;}if(typeof entry?.name!=="string"||entry.name.replace(/[\\r\\n\\t]+/g," ").slice(0,15)===""){continue;}seenIds.add(entry.id);normalizedThemes.push({id:entry.id,theme:sanitizeTheme(entry.theme)});}return normalizedThemes.sort((left,right)=>themeConfig.customSlotIds.indexOf(left.id)-themeConfig.customSlotIds.indexOf(right.id));}catch{return [];}};  
const parseBootPreferences=(rawValue)=>{if(typeof rawValue!=="string"||rawValue.trim().length===0){return null;}try{const parsed=JSON.parse(decodeValue(rawValue));if(parsed?.version!==bootConfig.version||!isIsoTimestamp(parsed?.updatedAt)){return null;}if("themeSelection" in parsed&&parsed.themeSelection!=null&&!isSelection(parsed.themeSelection)){return null;}if("theme" in parsed&&parsed.theme!=null&&!isValidThemeSnapshot(parsed.theme)){return null;}if("ambientTheme" in parsed&&parsed.ambientTheme!=null&&!isAmbientTheme(parsed.ambientTheme)){return null;}if("displayMode" in parsed&&parsed.displayMode!=null&&!isDisplayMode(parsed.displayMode)){return null;}return {themeSelection:parsed.themeSelection??null,theme:parsed.theme?sanitizeTheme(parsed.theme):null,ambientTheme:parsed.ambientTheme??null,displayMode:parsed.displayMode??null};}catch{return null;}};
const readCookie=(key)=>{if(typeof document.cookie!=="string"||document.cookie.length===0){return null;}const needle=key+"=";const parts=document.cookie.split(/;\\s*/);for(const part of parts){if(part.startsWith(needle)){return part.slice(needle.length);}}return null;};
const toRgbTuple=(hexColor)=>{const normalized=normalizeHexColor(hexColor,themeConfig.defaultTheme.primaryActionColor);return [Number.parseInt(normalized.slice(1,3),16),Number.parseInt(normalized.slice(3,5),16),Number.parseInt(normalized.slice(5,7),16)];};
const mixRgb=(source,target,amount)=>{const ratio=clamp(amount,0,1);return [Math.round(source[0]+(target[0]-source[0])*ratio),Math.round(source[1]+(target[1]-source[1])*ratio),Math.round(source[2]+(target[2]-source[2])*ratio)];};
const toRgbCssValue=(rgb)=>rgb.join(" ");
const toPixelValue=(value)=>Math.round(value)+"px";
const deriveSurfacePalette=(surfaceCardColor)=>{const surface2=toRgbTuple(surfaceCardColor);const surface1=mixRgb(surface2,[7,17,27],0.28);const surface3=mixRgb(surface2,[255,255,255],0.12);return {surface1,surface2,surface3};};
const deriveCardRadiusScale=(cardRadius)=>({cardRadius:toPixelValue(cardRadius),radiusSm:toPixelValue(clamp(cardRadius-8,10,cardRadius)),radiusMd:toPixelValue(clamp(cardRadius-4,12,cardRadius)),radiusLg:toPixelValue(cardRadius),radiusXl:toPixelValue(cardRadius+6)});
const deriveButtonRadiusScale=(buttonRadius)=>({buttonRadius:toPixelValue(clamp(buttonRadius,10,28)),bottomActionRadius:toPixelValue(clamp(buttonRadius+8,18,40)),actionChromeShellRadius:toPixelValue(clamp(buttonRadius+4,16,36)),actionChromeSegmentRadius:toPixelValue(buttonRadius),actionChromeSegmentRadiusCompact:toPixelValue(clamp(buttonRadius-2,8,buttonRadius))});
const getCssVariables=(theme)=>{const accent=toRgbTuple(theme.primaryActionColor);const accentStrong=mixRgb(accent,[255,255,255],0.16);const secondaryAction=toRgbTuple(theme.secondaryActionColor);const accentDivider=toRgbTuple(theme.accentDividerColor);const metricAccent=toRgbTuple(theme.metricAccentColor);const successComplete=toRgbTuple(theme.successCompleteColor);const selectionActive=toRgbTuple(theme.selectionActiveColor);const accentYellow=toRgbTuple(theme.accentYellowColor);const loaderScan=toRgbTuple(theme.loaderScanColor);const warning=toRgbTuple(theme.warningColor);const danger=toRgbTuple(theme.dangerColor);const cardOutline=toRgbTuple(theme.cardOutlineColor);const textPrimary=toRgbTuple(theme.textPrimaryColor);const textSecondary=toRgbTuple(theme.textSecondaryColor);const textMuted=toRgbTuple(theme.textMutedColor);const destructiveBg=mixRgb(danger,[7,17,27],0.84);const destructiveBgHover=mixRgb(danger,[7,17,27],0.8);const destructiveBgActive=mixRgb(danger,[7,17,27],0.88);const destructiveText=mixRgb(danger,[255,255,255],0.78);const {surface1,surface2,surface3}=deriveSurfacePalette(theme.surfaceCardColor);const buttonScale=deriveButtonRadiusScale(theme.buttonRadius);const cardScale=deriveCardRadiusScale(theme.cardRadius);return {"--text-primary":toRgbCssValue(textPrimary),"--text-secondary":toRgbCssValue(textSecondary),"--text-muted":toRgbCssValue(textMuted),"--text":"var(--text-primary)","--muted":"var(--text-secondary)","--faint":"var(--text-muted)","--accent":toRgbCssValue(accent),"--accent-strong":toRgbCssValue(accentStrong),"--accent-mint":toRgbCssValue(accent),"--accent-mint-strong":toRgbCssValue(accentStrong),"--accent-blue":toRgbCssValue(accent),"--accent-red":toRgbCssValue(danger),"--accent-purple":toRgbCssValue(accent),"--secondary-action-rgb":toRgbCssValue(secondaryAction),"--accent-divider-rgb":toRgbCssValue(accentDivider),"--metric-accent-rgb":toRgbCssValue(metricAccent),"--selection-rgb":toRgbCssValue(selectionActive),"--loader-scan-rgb":toRgbCssValue(loaderScan),"--warning-rgb":toRgbCssValue(warning),"--danger-rgb":toRgbCssValue(danger),"--stroke-soft":toRgbCssValue(cardOutline),"--stroke-strong":toRgbCssValue(cardOutline),"--accent-yellow-off":toRgbCssValue(accentYellow),"--accent-yellow-on":toRgbCssValue(accentYellow),"--success-rgb":toRgbCssValue(successComplete),"--surface-1-rgb":toRgbCssValue(surface1),"--surface-2-rgb":toRgbCssValue(surface2),"--surface-3-rgb":toRgbCssValue(surface3),"--bg-panel":"var(--surface-1-rgb)","--bg-card":"var(--surface-2-rgb)","--bg-shell":"var(--surface-3-rgb)","--surface":"var(--surface-1-rgb)","--surface-2":"var(--surface-2-rgb)","--surface-rgb":"var(--surface-2-rgb)","--shell-rgb":"var(--surface-3-rgb)","--surface-muted":"var(--surface-2-rgb)","--glass-tint-rgb":"var(--surface-1-rgb)","--button-radius":buttonScale.buttonRadius,"--button-destructive-bg":toRgbCssValue(destructiveBg)+" / 0.94","--button-destructive-bg-hover":toRgbCssValue(destructiveBgHover)+" / 0.98","--button-destructive-bg-active":toRgbCssValue(destructiveBgActive)+" / 1","--button-destructive-text":toRgbCssValue(destructiveText),"--button-destructive-border":toRgbCssValue(danger)+" / 0.4","--bottom-action-radius":buttonScale.bottomActionRadius,"--action-chrome-shell-radius":buttonScale.actionChromeShellRadius,"--action-chrome-segment-radius":buttonScale.actionChromeSegmentRadius,"--action-chrome-segment-radius-compact":buttonScale.actionChromeSegmentRadiusCompact,"--card-radius":cardScale.cardRadius,"--radius-sm":cardScale.radiusSm,"--radius-md":cardScale.radiusMd,"--radius-lg":cardScale.radiusLg,"--radius-xl":cardScale.radiusXl};};
const applyTheme=(theme)=>{const signature=themeConfig.themeKeys.map((key)=>String(theme[key]??"")).join("|");if(root.dataset.appThemeReady==="true"&&root.dataset.appThemeSignature===signature){return;}const isDefaultTheme=themeConfig.themeKeys.every((key)=>theme[key]===themeConfig.defaultTheme[key]);if(isDefaultTheme){for(const variableName of themeConfig.variableNames){root.style.removeProperty(variableName);}}else{const cssVariables=getCssVariables(theme);for(const [variableName,value] of Object.entries(cssVariables)){root.style.setProperty(variableName,value);}}root.dataset.appThemeReady="true";root.dataset.appThemeSignature=signature;};
const applyAmbient=(ambientTheme)=>{if(!ambientTheme){if(root.dataset.ambientTheme){delete root.dataset.ambientTheme;}return;}if(root.dataset.ambientTheme!==ambientTheme){root.dataset.ambientTheme=ambientTheme;}};
const getRuntimeDisplayMode=()=>{try{if(window.matchMedia("(display-mode: standalone)").matches){return "standalone";}}catch{}try{if(window.navigator&&window.navigator.standalone===true){return "standalone";}}catch{}return "browser";};
const applyDisplayMode=(displayMode)=>{if(!displayMode){return;}if(root.dataset.displayMode!==displayMode){root.dataset.displayMode=displayMode;}};
let storage=null;
try{storage=window.localStorage;}catch{}
const bootPreferences=parseBootPreferences(readCookie(bootConfig.cookieKey))??parseBootPreferences(storage?.getItem(bootConfig.storageKey)??null);
let theme=bootPreferences?.theme??null;
if(!theme&&bootPreferences?.themeSelection&&isPreset(bootPreferences.themeSelection)){theme=bootConfig.presetThemes[bootPreferences.themeSelection];}
if(!theme){const selectionRaw=(()=>{try{return storage?.getItem(themeConfig.selectionStorageKey)??null;}catch{return null;}})();const selection=isSelection(selectionRaw)?selectionRaw:null;if(selection&&isPreset(selection)){theme=themeConfig.presetThemes[selection];}else{const storedTheme=parseTheme((()=>{try{return storage?.getItem(themeConfig.themeStorageKey)??null;}catch{return null;}})());if(storedTheme){theme=storedTheme;}else if(selection&&isSlot(selection)){theme=parseThemeLibrary((()=>{try{return storage?.getItem(themeConfig.libraryStorageKey)??null;}catch{return null;}})()).find((entry)=>entry.id===selection)?.theme??themeConfig.defaultTheme;}else{theme=themeConfig.defaultTheme;}}}
applyTheme(theme??themeConfig.defaultTheme);
const ambientTheme=bootPreferences?.ambientTheme??(()=>{try{const stored=storage?.getItem(bootConfig.ambientStorageKey)??null;return isAmbientTheme(stored)?stored:null;}catch{return null;}})();
applyAmbient(ambientTheme);
applyDisplayMode(getRuntimeDisplayMode()??bootPreferences?.displayMode??null);
root.dataset.appBootPrimer="applied";
}catch{}})();`;
}

export function buildPreHydrationAppThemePrimerScript() {
  return buildPreHydrationAppBootPrimerScript();
}
