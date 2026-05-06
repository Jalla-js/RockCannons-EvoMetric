let currentLang = localStorage.getItem("lang") || "en";

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  applyTranslations();
  loadSites();
}

// 🌍 MAP SETUP
const map = L.map('map').setView([53.1, -4.1], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

let markers = L.layerGroup().addTo(map);

// 🎨 marker colours
function getStyle(status) {
  if (status === "approved") {
    return {
      radius: 10,
      color: "#2ecc71",
      fillColor: "#2ecc71",
      fillOpacity: 0.9
    };
  }

  if (status === "pending") {
    return {
      radius: 10,
      color: "#f39c12",
      fillColor: "#f39c12",
      fillOpacity: 0.9
    };
  }
}

// 🧠 SAFE PARSE
function parseDescription(site) {
  try {
    return site.description ? JSON.parse(site.description) : {};
  } catch {
    return {};
  }
}

// 🌐 LANGUAGE RESOLVER
function resolveDescription(descObj) {
  const isWelsh = currentLang === "cy";

  const primary = isWelsh ? descObj.descWel : descObj.descEng;
  const fallback = isWelsh ? descObj.descEng : descObj.descWel;

  if (primary && primary.trim() !== "") {
    return {
      text: primary,
      warning: ""
    };
  }

  if (fallback && fallback.trim() !== "") {
    return {
      text: fallback,
      warning: translations[currentLang].noWelsh + "\n\n"
    };
  }

  return {
    text: translations[currentLang].desc,
    warning: ""
  };
}

// 📍 OPEN SITE (FULL VIEW)
function openSite(site) {
  const descObj = parseDescription(site);
  const resolved = resolveDescription(descObj);

  document.getElementById('popupTitle').innerText = site.name;

  document.getElementById('popupDesc').innerText =
    resolved.warning +
    resolved.text +
    (descObj.holeCount !== undefined && descObj.holeCount !== -1
      ? `\n\n${translations[currentLang].holes}${descObj.holeCount}`
      : "");

  map.flyTo([site.latitude, site.longitude], 15);
}

// 📦 LOAD SITES
async function loadSites() {
  markers.clearLayers();

  const { data } = await getVisibleSites();

  const search =
    document.getElementById("searchInput")?.value.toLowerCase() || "";

  const holeFilter =
    document.getElementById("filterHoles")?.value || "";

  data.forEach(site => {

    if (site.status === "rejected") return;

    const descObj = parseDescription(site);

    const descEng = (descObj.descEng || "").toLowerCase();
    const descWel = (descObj.descWel || "").toLowerCase();
    const holeCount = descObj.holeCount ?? -1;

    // 🔍 SEARCH
    if (
      search &&
      !site.name.toLowerCase().includes(search) &&
      !descEng.includes(search) &&
      !descWel.includes(search)
    ) {
      return;
    }

    // 🕳️ FILTER
    if (holeFilter) {
      if (holeFilter === "4") {
        if (holeCount === -1 || holeCount < 4) return;
      } else {
        if (holeCount !== parseInt(holeFilter)) return;
      }
    }

    const marker = L.circleMarker(
      [site.latitude, site.longitude],
      getStyle(site.status)
    ).addTo(markers);

    marker.on('click', () => openPopup(site));
  });
}

let selectedSite = null;

// 📍 POPUP
function openPopup(site) {
  selectedSite = site;

  const descObj = parseDescription(site);
  const resolved = resolveDescription(descObj);

  document.getElementById("popupTitle").innerText = site.name;

  document.getElementById("popupDesc").innerText =
    resolved.warning + resolved.text;

  document.getElementById("popupHole").innerText =
    translations[currentLang].holes +
    (descObj.holeCount ?? "Unknown");

  document.getElementById("sitePopup").classList.remove("hidden");

  document.getElementById("openFullBtn").onclick = () => {
    if (!selectedSite) return;
    window.location.href = `site.html?id=${selectedSite.site_id}`;
  };
}

function closePopup() {
  document.getElementById("sitePopup").classList.add("hidden");
}

// 🔁 LIVE SEARCH / FILTER
const searchInput = document.getElementById("searchInput");
const filterHoles = document.getElementById("filterHoles");

if (searchInput) {
  searchInput.addEventListener("input", loadSites);
}

if (filterHoles) {
  filterHoles.addEventListener("change", loadSites);
}

// 🚀 INITIAL LOAD
loadSites();

// 👤 USER
let currentUser = null;

async function loadUser() {
  const { data: { user } } = await sb.auth.getUser();

  const btn = document.getElementById("userBtn");

  if (!user) {
    btn.innerText = "👤";
    btn.onclick = () => window.location.href = "login.html";
    return;
  }

  const { data } = await sb
    .from("users")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  currentUser = user;

  const initial = (data?.display_name || "U")[0].toUpperCase();
  btn.innerText = initial;

  btn.onclick = toggleUserMenu;
}

function toggleUserMenu() {
  let existing = document.getElementById("userMenu");

  if (existing) {
    existing.remove();
    return;
  }

  const name = currentUser?.email || "User";

  const menu = document.createElement("div");
  menu.id = "userMenu";
  menu.className = "user-dropdown";

  menu.innerHTML = `
    <div class="name">${name}</div>
    <button id="logoutBtn">Logout</button>
  `;

  document.body.appendChild(menu);

  document.getElementById("logoutBtn").onclick = async () => {
    await sb.auth.signOut();
    location.reload();
  };
}

loadUser();

// 🌐 LANGUAGE TOGGLE
document.getElementById("langToggle").onclick = () => {
  setLang(currentLang === "en" ? "cy" : "en");
}

function updateLangButton() {
  const btn = document.getElementById("langToggle");
  if (btn) btn.innerText = currentLang === "en" ? "CY" : "EN";
}

// 🌍 TRANSLATIONS
const translations = {
  en: {
    search: "Search Sites...",
    filter: "Filter by hole count",
    holes: "Holes: ",
    desc: "No description",
    noWelsh: "⚠️ No Welsh translation available"
  },
  cy: {
    search: "Chwilio safleoedd...",
    filter: "Hidlo yn ôl nifer tyllau",
    holes: "Tyllau: ",
    desc: "Dim disgrifiad",
    noWelsh: "⚠️ Dim cyfieithiad Cymraeg ar gael"
  }
}

// 🔤 APPLY UI TRANSLATIONS
function applyTranslations() {
  updateLangButton();

  const t = translations[currentLang];

  const search = document.getElementById("searchInput");
  if (search) search.placeholder = t.search;
  
  const filter = document.getElementById("filterHoles");
  if (filter) filter.options[0].text = t.filter;
}