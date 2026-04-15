const MUSIC_TIME_KEY = "portfolioMusicTime";
const MUSIC_PLAYING_KEY = "portfolioMusicIsPlaying";
const MUSIC_INIT_KEY = "portfolioMusicInitialized";
const INTRO_DISMISSED_KEY = "portfolioIntroDismissed";
const MUSIC_START_TIME = 7;
const PAGE_CACHE = new Map();
let heroScrollHandler = null;
let activePageUrl = window.location.href;

const musicPlayer = document.getElementById("musicPlayer");
const musicToggle = document.getElementById("musicToggle");
const bgMusic = document.getElementById("bgMusic");
const pageShell = document.getElementById("pageShell");
const introSplash = document.getElementById("introSplash");
const enterHomeButton = document.getElementById("enterHomeButton");

const supportsDynamicNavigation = window.location.protocol !== "file:";
const currentPagePath = window.location.pathname.split("/").pop() || "index.html";
const isHomePage = currentPagePath === "index.html";
const shouldShowIntro = Boolean(introSplash) && isHomePage && sessionStorage.getItem(INTRO_DISMISSED_KEY) !== "true";

const syncMusicState = () => {
if(!bgMusic){
return;
}

sessionStorage.setItem(MUSIC_TIME_KEY, String(bgMusic.currentTime));
sessionStorage.setItem(MUSIC_PLAYING_KEY, String(!bgMusic.paused));
};

const attemptPlayFromStart = () => {
if(!bgMusic){
return;
}

bgMusic.currentTime = MUSIC_START_TIME;
sessionStorage.setItem(MUSIC_TIME_KEY, String(MUSIC_START_TIME));
sessionStorage.setItem(MUSIC_PLAYING_KEY, "true");
sessionStorage.setItem(MUSIC_INIT_KEY, "true");

const playAttempt = bgMusic.play();
if(playAttempt && typeof playAttempt.catch === "function"){
playAttempt.catch(() => {});
}
};

if(musicPlayer && musicToggle){
const hiddenClass = "is-hidden";

const syncMusicToggle = () => {
const isHidden = musicPlayer.classList.contains(hiddenClass);
musicToggle.textContent = isHidden ? "Show" : "Hide";
musicToggle.setAttribute("aria-expanded", String(!isHidden));
};

musicToggle.addEventListener("click", () => {
musicPlayer.classList.toggle(hiddenClass);
syncMusicToggle();
});

syncMusicToggle();
}

if(bgMusic){
const savedTime = Number(sessionStorage.getItem(MUSIC_TIME_KEY));
const savedIsPlaying = sessionStorage.getItem(MUSIC_PLAYING_KEY);
const hasInitializedMusic = sessionStorage.getItem(MUSIC_INIT_KEY) === "true";

const attemptPlay = () => {
const playAttempt = bgMusic.play();

if(playAttempt && typeof playAttempt.catch === "function"){
playAttempt.catch(() => {});
}
};

const restoreMusicState = () => {
const hasSavedTime = Number.isFinite(savedTime) && savedTime > 0;
bgMusic.currentTime = hasInitializedMusic && hasSavedTime ? savedTime : MUSIC_START_TIME;
sessionStorage.setItem(MUSIC_INIT_KEY, "true");

if(!shouldShowIntro && savedIsPlaying !== "false"){
attemptPlay();
}
};

if(bgMusic.readyState >= 1){
restoreMusicState();
}else{
bgMusic.addEventListener("loadedmetadata", restoreMusicState, { once:true });
}

["click","keydown","touchstart"].forEach(eventName => {
window.addEventListener(eventName, attemptPlay, { once:true });
});

bgMusic.addEventListener("play", syncMusicState);
bgMusic.addEventListener("pause", syncMusicState);
bgMusic.addEventListener("timeupdate", syncMusicState);
window.addEventListener("beforeunload", syncMusicState);
}

if(shouldShowIntro){
document.body.classList.add("intro-active");
musicPlayer?.classList.add("intro-hidden");
sessionStorage.setItem(MUSIC_PLAYING_KEY, "false");
}

if(introSplash && !shouldShowIntro){
introSplash.classList.add("is-hidden");
}

if(enterHomeButton && introSplash){
enterHomeButton.addEventListener("click", () => {
sessionStorage.setItem(INTRO_DISMISSED_KEY, "true");
document.body.classList.remove("intro-active");
introSplash.classList.add("is-hidden");
musicPlayer?.classList.remove("intro-hidden");
attemptPlayFromStart();
});
}

const initHeroScrollEffect = () => {
if(heroScrollHandler){
window.removeEventListener("scroll", heroScrollHandler);
heroScrollHandler = null;
}

const heroImage = document.getElementById("heroImage");
if(!heroImage){
return;
}

heroScrollHandler = () => {
const scrollY = window.scrollY;
const totalScrollHeight = document.documentElement.scrollHeight - window.innerHeight;
const blurAmount = Math.min(scrollY / 20, 15);
const scrollPercent = totalScrollHeight > 0 ? (scrollY / totalScrollHeight) * 100 : 0;
const positionPercent = Math.min(100, scrollPercent * 2);

heroImage.style.filter = `blur(${blurAmount}px)`;
heroImage.style.objectPosition = `center ${positionPercent}%`;
};

heroScrollHandler();
window.addEventListener("scroll", heroScrollHandler, { passive:true });
};

const getPagePath = url => {
const target = new URL(url, window.location.href);
const path = target.pathname.split("/").pop();
return path || "index.html";
};

const setActiveNavigation = currentPath => {
document.querySelectorAll(".nav-link").forEach(link => {
const isActive = getPagePath(link.href) === currentPath;
link.classList.toggle("active", isActive);
});
};

const initializePage = currentUrl => {
activePageUrl = new URL(currentUrl || window.location.href, window.location.href).href;
initHeroScrollEffect();
setActiveNavigation(getPagePath(activePageUrl));
};

const prefetchLinkedPages = () => {
if(!supportsDynamicNavigation){
return;
}

document.querySelectorAll("#pageShell a[href$='.html']").forEach(link => {
const targetUrl = new URL(link.href, window.location.href).href;
if(PAGE_CACHE.has(targetUrl) || targetUrl === window.location.href){
return;
}

fetch(targetUrl)
.then(response => response.ok ? response.text() : null)
.then(html => {
if(html){
PAGE_CACHE.set(targetUrl, html);
}
})
.catch(() => {});
});
};

const parsePageShell = html => {
const parser = new DOMParser();
const nextDocument = parser.parseFromString(html, "text/html");
const nextShell = nextDocument.getElementById("pageShell");

if(!nextShell){
return null;
}

return {
title: nextDocument.title,
shellHtml: nextShell.innerHTML
};
};

const loadPageHtml = async url => {
if(PAGE_CACHE.has(url)){
return PAGE_CACHE.get(url);
}

const response = await fetch(url);
if(!response.ok){
throw new Error(`Failed to load ${url}`);
}

const html = await response.text();
PAGE_CACHE.set(url, html);
return html;
};

const swapPage = async (url, pushState = true) => {
if(!supportsDynamicNavigation || !pageShell){
window.location.href = url;
return;
}

const targetUrl = new URL(url, window.location.href).href;
if(targetUrl === activePageUrl){
return;
}

try{
pageShell.classList.add("is-switching");
syncMusicState();

const html = await loadPageHtml(targetUrl);
const nextPage = parsePageShell(html);

if(!nextPage){
window.location.href = targetUrl;
return;
}

pageShell.innerHTML = nextPage.shellHtml;
document.title = nextPage.title;

if(pushState){
window.history.pushState({}, "", targetUrl);
}

window.scrollTo({ top:0, left:0, behavior:"auto" });
pageShell.classList.remove("is-switching");
initializePage(targetUrl);
prefetchLinkedPages();
}catch(error){
window.location.href = targetUrl;
}
};

document.addEventListener("click", event => {
const link = event.target.closest("a");

if(!link || !link.href){
return;
}

const targetUrl = new URL(link.href, window.location.href);
const isInternalPage = targetUrl.origin === window.location.origin && targetUrl.pathname.endsWith(".html");

if(!isInternalPage || link.target === "_blank" || link.hasAttribute("download")){
return;
}

event.preventDefault();
swapPage(targetUrl.href);
});

window.addEventListener("popstate", () => {
swapPage(window.location.href, false);
});

initializePage(window.location.href);
prefetchLinkedPages();
