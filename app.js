/*
  HNHS Campus Lost-and-Found
  This version stores reports in Supabase so reports can be shared across devices.
  Replace the two configuration placeholders below with your Supabase Project URL
  and a Publishable key (or legacy anon key). NEVER use a Secret/service_role key here.
*/
const SUPABASE_URL = "https://fkvngsxqycdxoqjconsj.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_gyj-VHnJsQ6vHFXJaUTRLA_V1I_5Fwi";
const REPORTS_TABLE = "reports";

function databaseReady() {
  return window.supabase &&
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("PASTE_") &&
    SUPABASE_PUBLIC_KEY &&
    !SUPABASE_PUBLIC_KEY.includes("PASTE_");
}

const db = databaseReady()
  ? window.supabase.createClient(https://fkvngsxqycdxoqjconsj.supabase.co, sb_publishable_gyj-VHnJsQ6vHFXJaUTRLA_V1I_5Fwi)
  : null;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showEmpty(container, message) {
  if (!container) return;
  container.replaceChildren();
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = message;
  container.appendChild(empty);
}

function mapDatabaseRow(row) {
  return {
    id: row.id,
    type: row.item_type || "Found item",
    name: row.item_name || "Unnamed item",
    description: row.description || "No description provided.",
    location: row.location || "Not specified",
    date: row.item_date || "Not specified",
    claimLocation: row.claim_location || "Not specified",
    status: row.status || "Unclaimed",
    submittedAt: row.created_at || ""
  };
}

async function loadItems() {
  if (!db) {
    throw new Error("Supabase is not configured. Add your Project URL and public key near the top of app.js.");
  }

  const { data, error } = await db
    .from(REPORTS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDatabaseRow);
}

function createItemCard(item) {
  const card = document.createElement("article");
  card.className = "item-card";
  const isClaimed = item.status === "Claimed";
  const statusClass = isClaimed ? "status claimed" : "status";

  card.innerHTML = `
    <span class="item-symbol">🎒</span>
    <p><strong>${escapeHTML(item.type)}</strong></p>
    <h3>${escapeHTML(item.name)}</h3>
    <p>📍 Lost/found at: ${escapeHTML(item.location)}</p>
    <p>${escapeHTML(item.description)}</p>
    <p>📅 Date: ${escapeHTML(item.date)}</p>
    <p>🏫 Claim/turn-in location: ${escapeHTML(item.claimLocation)}</p>
    <span class="${statusClass}">${escapeHTML(item.status)}</span>
  `;
  return card;
}

async function renderHome() {
  const total = document.getElementById("totalCount");
  const unclaimed = document.getElementById("unclaimedCount");
  const claimed = document.getElementById("claimedCount");
  const container = document.getElementById("recentItems");
  if (!total || !unclaimed || !claimed || !container) return;

  try {
    const items = await loadItems();
    total.textContent = items.length;
    unclaimed.textContent = items.filter(item => item.status !== "Claimed").length;
    claimed.textContent = items.filter(item => item.status === "Claimed").length;

    if (items.length === 0) {
      showEmpty(container, "No reports yet. Be the first to submit a report!");
      return;
    }

    container.replaceChildren();
    items.slice(0, 3).forEach(item => container.appendChild(createItemCard(item)));
  } catch (error) {
    total.textContent = "—";
    unclaimed.textContent = "—";
    claimed.textContent = "—";
    showEmpty(container, `Could not load reports. ${error.message}`);
  }
}

function renderBrowse() {
  const container = document.getElementById("browseItems");
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const resultCount = document.getElementById("resultCount");
  if (!container || !searchInput || !statusFilter || !resultCount) return;

  let allItems = [];

  function updateResults() {
    const query = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;
    const matches = allItems.filter(item => {
      const searchableText = [
        item.type, item.name, item.location, item.description,
        item.date, item.claimLocation
      ].join(" ").toLowerCase();
      const matchesQuery = searchableText.includes(query);
      const matchesStatus = status === "all" || item.status === status;
      return matchesQuery && matchesStatus;
    });

    resultCount.textContent = `${matches.length} item(s)`;
    if (matches.length === 0) {
      showEmpty(container, allItems.length === 0
        ? "No reports have been submitted yet."
        : "No matching reports found. Try another search.");
      return;
    }

    container.replaceChildren();
    matches.forEach(item => container.appendChild(createItemCard(item)));
  }

  async function refreshReports() {
    try {
      allItems = await loadItems();
      updateResults();
    } catch (error) {
      resultCount.textContent = "Unable to load";
      showEmpty(container, `Could not load reports. ${error.message}`);
    }
  }

  searchInput.addEventListener("input", updateResults);
  statusFilter.addEventListener("change", updateResults);
  refreshReports();

  // Refresh periodically so an already-open browse page can pick up reports
  // submitted from another device. Reloading the page also fetches fresh data.
  window.setInterval(refreshReports, 20000);
}

function setupReportForm() {
  const form = document.getElementById("reportForm");
  const message = document.getElementById("formMessage");
  const submitButton = form.querySelector('button[type="submit"]');
  const otherRadio = document.getElementById("otherLocationRadio");
  const otherInput = document.getElementById("otherLocation");
  const locationRadios = form.querySelectorAll('input[name="itemLocation"]');

  function updateOtherLocation() {
    const isOther = otherRadio.checked;
    otherInput.disabled = !isOther;
    otherInput.required = isOther;
    if (!isOther) otherInput.value = "";
  }

  locationRadios.forEach(radio => radio.addEventListener("change", updateOtherLocation));
  updateOtherLocation();

  form.addEventListener("submit", async event => {
    event.preventDefault();
    message.textContent = "";

    if (!db) {
      message.textContent = "The shared database is not configured yet. Add the Supabase Project URL and public key to app.js.";
      return;
    }

    const type = form.querySelector('input[name="itemType"]:checked')?.value;
    const name = document.getElementById("itemName").value.trim();
    const description = document.getElementById("itemDescription").value.trim();
    const selectedLocation = form.querySelector('input[name="itemLocation"]:checked')?.value;
    const location = selectedLocation === "Other" ? otherInput.value.trim() : selectedLocation;
    const date = document.getElementById("itemDate").value;
    const claimLocation = document.getElementById("claimLocation").value.trim();

    if (!type || !name || !description || !location || !date || !claimLocation) {
      message.textContent = "Please complete all required questions.";
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting…";

    try {
      const { error } = await db.from(REPORTS_TABLE).insert({
        item_type: type,
        item_name: name,
        description,
        location,
        item_date: date,
        claim_location: claimLocation,
        status: "Unclaimed",
        created_at: new Date().toISOString()
      });

      if (error) throw error;
      form.reset();
      updateOtherLocation();
      message.textContent = "Report submitted successfully and saved to the shared database!";
      window.setTimeout(() => { window.location.href = "browse.html"; }, 900);
    } catch (error) {
      message.textContent = `Could not submit the report: ${error.message}`;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Submit Report";
    }
  });
}

if (document.getElementById("totalCount")) renderHome();
if (document.getElementById("browseItems")) renderBrowse();
if (document.getElementById("reportForm")) setupReportForm();
