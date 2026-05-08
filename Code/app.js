const map = L.map('map').setView([53.1, -4.1], 10);

var CartoDB_Voyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 20
}).addTo(map);

let markers = L.layerGroup().addTo(map);

// 🎨 marker colours based on status
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

// 🧠 SAFE JSON PARSE (IMPORTANT FIX)
function getDescription(site) {
  try {
    return site.description ? JSON.parse(site.description) : {};
  } catch {
    return {};
  }
}

let activePopupSite = null;

// 📍 open site panel
function openSite(site) {
  const desc = getDescription(site);

  document.getElementById('popupTitle').innerText = site.name;

  /*document.getElementById('popupDesc').innerText =
    (desc.descEng || "No description available") +
    (desc.holeCount !== undefined && desc.holeCount !== -1
      ? `\n\nHoles: ${desc.holeCount}`
      : "");*/
    document.getElementById("popupDesc").innerText =
  getLocalizedDescription(site);

  map.flyTo([site.latitude, site.longitude], 15);
}

// 📦 load + filter + search
async function loadSites() {
  markers.clearLayers();

  const { data } = await getVisibleSites();

  const search =
    document.getElementById("searchInput")?.value.toLowerCase() || "";

  const holeFilter =
    document.getElementById("filterHoles")?.value || "";

  data.forEach(site => {

    if (site.status === "rejected") return;

    const desc = getDescription(site);

    const descEng = (desc.descEng || "").toLowerCase();
    const descWel = (desc.descWel || "").toLowerCase();
    const holeCount = desc.holeCount ?? -1;

    // 🔍 SEARCH (name + both descriptions)
    if (
      search &&
      !site.name.toLowerCase().includes(search) &&
      !descEng.includes(search) &&
      !descWel.includes(search)
    ) {
      return;
    }

    // 🕳️ HOLE FILTER (FIXED LOGIC)
    if (holeFilter) {

      if (holeFilter === "4") {
        // 4+ holes
        if (holeCount === -1 || holeCount < 4) return;
      } else {
        // exact match
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
let popupPhotos = [];
let popupPhotoIndex = 0;

function showPopupPhoto() {
  const img = document.getElementById('popuppicture');
  const prevBtn = document.getElementById('prevPhotoBtn');
  const nextBtn = document.getElementById('nextPhotoBtn');

  if (!popupPhotos || popupPhotos.length === 0) {
    img.src = '';
    img.style.display = 'none';
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    return;
  }

  img.src = popupPhotos[popupPhotoIndex].image_url;
  img.style.display = 'block';
  prevBtn.style.display = 'inline-flex';
  nextBtn.style.display = 'inline-flex';
  prevBtn.disabled = popupPhotoIndex === 0;
  nextBtn.disabled = popupPhotoIndex === popupPhotos.length - 1;
}

function openPopup(site) {
  selectedSite = site;

  const desc = getDescription(site);

  document.getElementById("popupTitle").innerText = site.name;
activePopupSite = site;
renderPopup(site);

  (async () => {
    const { data: photos } = await window.sb
      .from("photos")
      .select("image_url")
      .eq("site_id", site.site_id);

    popupPhotos = photos || [];
    popupPhotoIndex = 0;
    showPopupPhoto();
  })();

  const prevBtn = document.getElementById('prevPhotoBtn');
  const nextBtn = document.getElementById('nextPhotoBtn');

  prevBtn.onclick = () => {
    if (popupPhotoIndex > 0) {
      popupPhotoIndex -= 1;
      showPopupPhoto();
    }
  };

  nextBtn.onclick = () => {
    if (popupPhotoIndex < popupPhotos.length - 1) {
      popupPhotoIndex += 1;
      showPopupPhoto();
    }
  };

  document.getElementById("sitePopup").classList.remove("hidden");
  document.getElementById("openFullBtn").addEventListener("click", () => {
    if (!selectedSite) return;

    window.location.href = `site.html?id=${selectedSite.site_id}`;
  });
}

function closePopup() {
  document.getElementById("sitePopup").classList.add("hidden");
}

function renderPopup(site) {
  if (!site) return;

  const desc = getDescription(site);
  const t = translations[currentLang];

  document.getElementById("popupTitle").innerText = site.name;

  document.getElementById("popupDesc").innerText =
    getLocalizedDescription(site);

  document.getElementById("popupHole").innerText =
    `${t.holes} ${desc.holeCount ?? "Unknown"}`;

  document.getElementById("openFullBtn").innerText = t.open;

  // close button is inline HTML, so we fix it here too:
  const closeBtn = document.querySelector("#sitePopup button[onclick]");
  if (closeBtn) closeBtn.innerText = t.close;
}

// 🔁 live updates
const searchInput = document.getElementById("searchInput");
const filterHoles = document.getElementById("filterHoles");

if (searchInput) {
  searchInput.addEventListener("input", loadSites);
}

if (filterHoles) {
  filterHoles.addEventListener("change", loadSites);
}

// 🚀 initial load
loadSites();

let currentUser = null;
let currentRole = null;

async function loadUser() {

  const btn = document.getElementById("userBtn");

  if (!btn) {
    console.error("userBtn not found");
    return;
  }

  // Default logged out icon
  btn.innerText = "👤";

  const {
  data: { session }
} = await sb.auth.getSession();

const user = session?.user || null;

  // Not logged in
  if (!user) {

    btn.onclick = () => {
      window.location.href = "login.html";
    };

    return;
  }

  currentUser = user;

  // Get display name + role
  const { data, error } = await sb
    .from("users")
    .select("display_name, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error(error);
  }

  currentRole = data?.role || null;

  // Set user initial
  const initial = (
    data?.display_name ||
    user.email ||
    "U"
  )[0].toUpperCase();

  btn.innerText = initial;

  btn.onclick = toggleUserMenu;
}

function toggleUserMenu(e) {

  e?.stopPropagation();

  let existing = document.getElementById("userMenu");

  // Toggle off
  if (existing) {
    existing.remove();
    return;
  }

  const menu = document.createElement("div");

  menu.id = "userMenu";
  menu.className = "user-dropdown";

  let adminButton = "";

  // Admin-only review button
  if (currentRole === "admin") {
    adminButton = `
      <button id="reviewBtn">Review Sites</button>
    `;
  }

  menu.innerHTML = `
    <div class="name">${currentUser?.email || "User"}</div>

    <button id="addSiteBtn">Add Site</button>

    ${adminButton}

    <button id="logoutBtn">Logout</button>
  `;

  document.body.appendChild(menu);

  // Add Site
  document.getElementById("addSiteBtn").onclick = () => {
    window.location.href = "add.html";
  };

  // Admin review
  if (currentRole === "admin") {
    document.getElementById("reviewBtn").onclick = () => {
      window.location.href = "admin.html";
    };
  }

  // Logout
  document.getElementById("logoutBtn").onclick = async () => {
    await sb.auth.signOut();
    location.reload();
  };
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {

  const menu = document.getElementById("userMenu");
  const btn = document.getElementById("userBtn");

  if (
    menu &&
    !menu.contains(e.target) &&
    !btn.contains(e.target)
  ) {
    menu.remove();
  }
});

// Load user system
loadUser();

// Language options

let currentLang =
  localStorage.getItem("lang") ||
  navigator.language.slice(0, 2) ||
  "en";

// fallback to English if unsupported language
if (!["en", "cy"].includes(currentLang)) {
  currentLang = "en";
}

let isSwitchingLang = false;
function setLang(lang) {
  if (isSwitchingLang || lang === currentLang) return;

  isSwitchingLang = true;

  const body = document.body;
  body.classList.add("lang-fade-out");

  setTimeout(() => {
    currentLang = lang;
    localStorage.setItem("lang", lang);

    applyTranslations();
    loadSites(); // refresh map text
    if (activePopupSite) {
  renderPopup(activePopupSite);
}

    body.classList.remove("lang-fade-out");
    body.classList.add("lang-fade-in");

    setTimeout(() => {
      body.classList.remove("lang-fade-in");
      isSwitchingLang = false;
    }, 200);
  }, 200);
}

function toggleLang() {
  setLang(currentLang === "en" ? "cy" : "en");
}

const translations = {
  en: {
    search: "Search sites...",
    filter: "Filter by hole count",
    holes: "Holes:",
    open: "Open full page",
    close: "Close",
    noDesc: "No description available",
    noWelsh: "No Welsh translation available"
  },
  cy: {
    search: "Chwilio safleoedd...",
    filter: "Hidlo yn ôl tyllau",
    holes: "Tyllau:",
    open: "Agor tudalen llawn",
    close: "Cau",
    noDesc: "Dim disgrifiad ar gael",
    noEnglish: "Dim cyfieithiad Cymraeg ar gael"
  }
};

function getLocalizedDescription(site) {
  const desc = getDescription(site);

  const eng = desc.descEng?.trim();
  const wel = desc.descWel?.trim();

  // ENGLISH MODE
  if (currentLang === "en") {

    if (eng) return eng;

    if (wel) {
      return wel + "\n\n(No English translation available)";
    }

    return translations.en.noDesc;
  }

  // WELSH MODE
  if (currentLang === "cy") {

    if (wel) return wel;

    if (eng) {
      return eng + "\n\n(Dim cyfieithiad Cymraeg ar gael)";
    }

    return translations.cy.noDesc;
  }

  return translations.en.noDesc;
}

function applyTranslations() {
  const t = translations[currentLang];

  const search = document.getElementById("searchInput");
  if (search) search.placeholder = t.search;

  const filter = document.getElementById("filterHoles");
  if (filter) filter.options[0].text = t.filter;

  const btn = document.getElementById("langToggle");
  if (btn) btn.innerText = currentLang === "en" ? "CY" : "EN";
}

function initLanguageButton() {
  const btn = document.getElementById("langToggle");

  if (!btn) {
    console.error("langToggle button not found");
    return;
  }

  btn.innerText = currentLang === "en" ? "CY" : "EN";

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleLang();
  });
}

window.addEventListener("DOMContentLoaded", () => {
  applyTranslations();
  initLanguageButton();
});
