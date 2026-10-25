
const STORAGE_KEY = "campusFindReports";

function getItems() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function createItemCard(item) {
  const card = document.createElement("article");
  card.className = "item-card";

  const isClaimed = item.status === "Claimed";
  const statusClass = isClaimed ? "status claimed" : "status";

  card.innerHTML = `
    <span class="item-symbol">🎒</span>
    <p><strong>${escapeHTML(item.type || "Found item")}</strong></p>
    <h3>${escapeHTML(item.name)}</h3>
    <p>📍 Lost/found at: ${escapeHTML(item.location)}</p>
    <p>${escapeHTML(item.description || "No description provided.")}</p>
    <p>📅 Date: ${escapeHTML(item.date || "Not specified")}</p>
    <p>🏫 Claim/turn-in location: ${escapeHTML(item.claimLocation || "Not specified")}</p>
    <span class="${statusClass}">${escapeHTML(item.status || "Unclaimed")}</span>
  `;

  return card;
}

function showEmpty(container, message) {
  container.replaceChildren();

  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = message;

  container.appendChild(empty);
}

function renderHome() {
  const items = getItems();

  document.getElementById("totalCount").textContent = items.length;

  document.getElementById("unclaimedCount").textContent =
    items.filter(item => item.status !== "Claimed").length;

  document.getElementById("claimedCount").textContent =
    items.filter(item => item.status === "Claimed").length;

  const container = document.getElementById("recentItems");

  if (items.length === 0) {
    showEmpty(container, "No reports yet. Be the first to submit a report!");
    return;
  }

  container.replaceChildren();

  items.slice(0, 3).forEach(item => {
    container.appendChild(createItemCard(item));
  });
}

function renderBrowse() {
  const container = document.getElementById("browseItems");
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const resultCount = document.getElementById("resultCount");

  function updateResults() {
    const query = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;

    const matches = getItems().filter(item => {
      const searchableText = [
        item.type,
        item.name,
        item.location,
        item.description,
        item.date,
        item.claimLocation
      ].join(" ").toLowerCase();

      const matchesQuery = searchableText.includes(query);
      const matchesStatus =
        status === "all" || (item.status || "Unclaimed") === status;

      return matchesQuery && matchesStatus;
    });

    resultCount.textContent = `${matches.length} item(s)`;

    if (matches.length === 0) {
      showEmpty(container, "No matching reports found. Try another search.");
      return;
    }

    container.replaceChildren();

    matches.forEach(item => {
      container.appendChild(createItemCard(item));
    });
  }

  searchInput.addEventListener("input", updateResults);
  statusFilter.addEventListener("change", updateResults);

  updateResults();
}

function setupReportForm() {
  const form = document.getElementById("reportForm");
  const message = document.getElementById("formMessage");
  const otherRadio = document.getElementById("otherLocationRadio");
  const otherInput = document.getElementById("otherLocation");

  const locationRadios = form.querySelectorAll(
    'input[name="itemLocation"]'
  );

  function updateOtherLocation() {
    const isOther = otherRadio.checked;

    otherInput.disabled = !isOther;
    otherInput.required = isOther;

    if (!isOther) {
      otherInput.value = "";
    }
  }

  locationRadios.forEach(radio => {
    radio.addEventListener("change", updateOtherLocation);
  });

  updateOtherLocation();

  form.addEventListener("submit", event => {
    event.preventDefault();
    message.textContent = "";

    const type = form.querySelector(
      'input[name="itemType"]:checked'
    )?.value;

    const name = document.getElementById("itemName").value.trim();

    const description =
      document.getElementById("itemDescription").value.trim();

    const selectedLocation = form.querySelector(
      'input[name="itemLocation"]:checked'
    )?.value;

    const location = selectedLocation === "Other"
      ? otherInput.value.trim()
      : selectedLocation;

    const date = document.getElementById("itemDate").value;

    const claimLocation =
      document.getElementById("claimLocation").value.trim();

    if (!type || !name || !description || !location || !date || !claimLocation) {
      message.textContent = "Please complete all required questions.";
      return;
    }

    const items = getItems();

    items.unshift({
      id: Date.now().toString(),
      type,
      name,
      description,
      location,
      date,
      claimLocation,
      status: "Unclaimed",
      submittedAt: new Date().toISOString()
    });

    try {
      saveItems(items);
      form.reset();
      updateOtherLocation();

      message.textContent = "Report submitted successfully!";

      setTimeout(() => {
        window.location.href = "browse.html";
      }, 900);
    } catch {
      message.textContent =
        "Could not save the report. Check your browser storage settings.";
    }
  });
}

if (document.getElementById("totalCount")) {
  renderHome();
}

if (document.getElementById("browseItems")) {
  renderBrowse();
}

if (document.getElementById("reportForm")) {
  setupReportForm();
}
