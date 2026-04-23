const DATA_URL = "./data/papers.json";

let allPapers = [];
let currentFilter = "all";
let searchQuery = "";
let bookmarks = new Set(
  JSON.parse(localStorage.getItem("aip-bookmarks") || "[]")
);
let readSet = new Set(JSON.parse(localStorage.getItem("aip-read") || "[]"));
let lastVisit = localStorage.getItem("aip-lastvisit");

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  }

  setupListeners();
  await loadPapers();

  localStorage.setItem("aip-lastvisit", new Date().toISOString());

  updateOnlineStatus();
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
});

// ── Event listeners ───────────────────────────────────────────────────────────

function setupListeners() {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderPapers();
    });
  });

  document.getElementById("search-input").addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderPapers();
  });

  document.getElementById("refresh-btn").addEventListener("click", () => {
    loadPapers(true);
  });
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadPapers(force = false) {
  const container = document.getElementById("paper-list");
  if (!force) {
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Loading papers…</p></div>`;
  }

  try {
    const url = force ? `${DATA_URL}?t=${Date.now()}` : DATA_URL;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    allPapers = data.papers || [];
    updateStats(data);
    renderPapers();

    if (force) showToast("✅ Papers refreshed!");
  } catch (err) {
    console.error(err);
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <p>Failed to load papers.<br>Check your connection or try refreshing.</p>
      </div>`;
  }
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function updateStats(data) {
  if (data.updated_at) {
    const d = new Date(data.updated_at);
    document.getElementById("last-updated").textContent =
      "Updated: " + d.toLocaleString();
  } else {
    document.getElementById("last-updated").textContent =
      "No data yet — run GitHub Actions to fetch papers.";
  }

  document.getElementById("stat-total").textContent =
    `${data.total ?? 0} papers`;

  if (lastVisit && allPapers.length > 0) {
    const newCount = allPapers.filter(
      (p) => new Date(p.published) > new Date(lastVisit)
    ).length;
    const el = document.getElementById("stat-new");
    if (newCount > 0) {
      el.textContent = `● ${newCount} new`;
      el.classList.remove("hidden");
    }
  }

  document.getElementById("stat-bookmarks").textContent =
    `☆ ${bookmarks.size} saved`;
}

// ── Filter + render ───────────────────────────────────────────────────────────

function getFiltered() {
  return allPapers.filter((p) => {
    if (currentFilter === "bookmarks") {
      if (!bookmarks.has(p.id)) return false;
    } else if (currentFilter !== "all") {
      if (!p.matched_keywords?.includes(currentFilter)) return false;
    }

    if (searchQuery) {
      const hay = (p.title + " " + (p.authors || []).join(" ")).toLowerCase();
      if (!hay.includes(searchQuery)) return false;
    }

    return true;
  });
}

function renderPapers() {
  const list = getFiltered();
  const container = document.getElementById("paper-list");

  if (list.length === 0) {
    const msg =
      currentFilter === "bookmarks"
        ? "No saved papers yet.<br>Click ☆ on any paper to save it."
        : "No papers match your filter.";
    container.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>${msg}</p></div>`;
    return;
  }

  container.innerHTML = list.map(renderCard).join("");

  // Bind action buttons
  container.querySelectorAll(".action-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { id, action } = btn.dataset;
      if (action === "bookmark") toggleBookmark(id, btn);
      if (action === "read") toggleRead(id, btn);
    });
  });

  // Expand / collapse summaries
  container.querySelectorAll(".expand-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const summary = btn.previousElementSibling;
      const isCollapsed = summary.classList.contains("collapsed");
      summary.classList.toggle("collapsed", !isCollapsed);
      btn.textContent = isCollapsed ? "Show less ▴" : "Show more ▾";
    });
  });
}

function renderCard(paper) {
  const isNew =
    lastVisit && new Date(paper.published) > new Date(lastVisit);
  const isBookmarked = bookmarks.has(paper.id);
  const isRead = readSet.has(paper.id);

  const date = paper.published
    ? new Date(paper.published).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const authors = (paper.authors || []).slice(0, 3).join(", ") +
    (paper.authors?.length > 3 ? ` +${paper.authors.length - 3} more` : "");

  const catTags = (paper.categories || [])
    .slice(0, 3)
    .map((c) => `<span class="tag tag-category">${c}</span>`)
    .join("");

  const kwTags = (paper.matched_keywords || [])
    .map((k) => `<span class="tag tag-keyword">${k}</span>`)
    .join("");

  return `
    <article class="paper-card ${isRead ? "is-read" : ""} ${isBookmarked ? "is-bookmarked" : ""}">
      <div class="card-header">
        <a href="${paper.url}" target="_blank" rel="noopener noreferrer" class="card-title"
          >${paper.title}</a>
        <div class="card-actions">
          <button class="action-btn ${isBookmarked ? "bookmarked" : ""}"
            data-id="${paper.id}" data-action="bookmark" title="Save paper">☆</button>
          <button class="action-btn ${isRead ? "read" : ""}"
            data-id="${paper.id}" data-action="read" title="Mark as read">✓</button>
        </div>
      </div>

      <div class="card-meta">
        <span class="card-authors">${authors}</span>
        <span class="card-date">${date}</span>
        ${isNew ? '<span class="badge-new">New</span>' : ""}
      </div>

      <div class="card-tags">${catTags}${kwTags}</div>

      <p class="card-summary collapsed">${paper.summary || "No summary available."}</p>
      <button class="expand-btn">Show more ▾</button>
    </article>`;
}

// ── Bookmark / Read ───────────────────────────────────────────────────────────

function toggleBookmark(id, btn) {
  const card = btn.closest(".paper-card");
  if (bookmarks.has(id)) {
    bookmarks.delete(id);
    btn.classList.remove("bookmarked");
    card.classList.remove("is-bookmarked");
    showToast("Removed from saved");
  } else {
    bookmarks.add(id);
    btn.classList.add("bookmarked");
    card.classList.add("is-bookmarked");
    showToast("✅ Saved!");
  }
  localStorage.setItem("aip-bookmarks", JSON.stringify([...bookmarks]));
  document.getElementById("stat-bookmarks").textContent =
    `☆ ${bookmarks.size} saved`;

  if (currentFilter === "bookmarks") renderPapers();
}

function toggleRead(id, btn) {
  const card = btn.closest(".paper-card");
  if (readSet.has(id)) {
    readSet.delete(id);
    btn.classList.remove("read");
    card.classList.remove("is-read");
  } else {
    readSet.add(id);
    btn.classList.add("read");
    card.classList.add("is-read");
  }
  localStorage.setItem("aip-read", JSON.stringify([...readSet]));
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function updateOnlineStatus() {
  document
    .getElementById("offline-badge")
    .classList.toggle("hidden", navigator.onLine);
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.add("hidden"), 2500);
}
