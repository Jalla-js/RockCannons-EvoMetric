const map = L.map('map').setView([53.1, -4.1], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
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

// 📍 open site panel
function openSite(site) {
  const desc = getDescription(site);

  document.getElementById('title').innerText = site.name;

  document.getElementById('desc').innerText =
    (desc.descEng || "No description available") +
    (desc.holeCount !== undefined && desc.holeCount !== -1
      ? `\n\nHoles: ${desc.holeCount}`
      : "");

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

function openPopup(site) {
  selectedSite = site;

  const desc = getDescription(site);

  document.getElementById("popupTitle").innerText = site.name;
  document.getElementById("popupDesc").innerText =
    desc.descEng || "No description";

  document.getElementById("popupHole").innerText =
    "Holes: " + (desc.holeCount ?? "Unknown");

  document.getElementById("sitePopup").classList.remove("hidden");
  document.getElementById("openFullBtn").addEventListener("click", () => {
  if (!selectedSite) return;

  window.location.href = `site.html?id=${selectedSite.site_id}`;
});
}

function closePopup() {
  document.getElementById("sitePopup").classList.add("hidden");
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

async function loadUser() {
  const { data: { user } } = await sb.auth.getUser();

  const btn = document.getElementById("userBtn");

  if (!user) {
    btn.innerText = "👤";

    btn.onclick = () => {
      window.location.href = "login.html";
    };

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
