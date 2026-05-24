const STORAGE_KEY = "northline-studio-hub-items-v2";
const LOG_KEY = "northline-studio-hub-log-v1";
const WHITEBOARD_KEY = "northline-studio-whiteboard-v1";
const TEAM_MEMBERS = ["Avery", "Mina", "Jordan", "Tess", "Leo", "Sam", "Nico", "Rae"];
const STATUSES = ["Inbox", "Planned", "Designing", "Client Review", "Done"];
const SOURCE_LABELS = {
  email: "Email",
  "call-note": "Client Call Note",
  screenshot: "Screenshot / Visual",
  "google-doc": "Google Doc/Slide/Sheet",
  idea: "Studio Idea"
};

const state = {
  items: loadItems(),
  activity: loadActivity(),
  selectedIds: new Set(),
  filters: { search: "", source: "all", owner: "all", status: "all", priority: "all", favoritesOnly: false },
  whiteboard: loadWhiteboard(),
  whiteboardTool: "pen"
};

const el = {
  boardView: id("board-view"),
  scheduleView: id("schedule-view"),
  libraryView: id("library-view"),
  archiveView: id("archive-view"),
  activityView: id("activity-view"),
  whiteboardView: id("whiteboard-view"),
  viewButtons: document.querySelectorAll(".view-button"),
  form: id("capture-form"),
  itemId: id("item-id"),
  title: id("item-title"),
  source: id("item-source"),
  project: id("item-project"),
  owner: id("item-owner"),
  status: id("item-status"),
  priority: id("item-priority"),
  dueDate: id("item-due-date"),
  reminderDate: id("item-reminder-date"),
  effort: id("item-effort"),
  reference: id("item-reference"),
  imageInput: id("item-image"),
  tags: id("item-tags"),
  notes: id("item-notes"),
  checklist: id("item-checklist"),
  favorite: id("item-favorite"),
  archived: id("item-archived"),
  saveButton: id("save-button"),
  cancelEdit: id("cancel-edit"),
  cardTemplate: id("item-card-template"),
  searchInput: id("search-input"),
  sourceFilter: id("source-filter"),
  ownerFilter: id("owner-filter"),
  statusFilter: id("status-filter"),
  priorityFilter: id("priority-filter"),
  favoritesOnly: id("favorites-only"),
  clearFilters: id("clear-filters"),
  exportJson: id("export-json"),
  importJson: id("import-json"),
  seedDemo: id("seed-demo"),
  selectionCount: id("selection-count"),
  bulkDone: id("bulk-done"),
  bulkArchive: id("bulk-archive"),
  bulkOwner: id("bulk-owner"),
  clearSelection: id("clear-selection"),
  openCount: id("open-count"),
  weekCount: id("week-count"),
  referenceCount: id("reference-count"),
  favoriteCount: id("favorite-count"),
  archiveCount: id("archive-count"),
  overdueCount: id("overdue-count")
  ,
  wbPen: id("wb-pen"),
  wbEraser: id("wb-eraser"),
  wbColor: id("wb-color"),
  wbSize: id("wb-size"),
  wbClear: id("wb-clear"),
  wbAddNote: id("wb-add-note"),
  wbCanvas: id("whiteboard-canvas"),
  wbStickyLayer: id("sticky-layer")
};

init();

function init() {
  populateOwners();
  bindEvents();
  initWhiteboard();
  renderAll();
}

function bindEvents() {
  el.viewButtons.forEach((b) => b.addEventListener("click", () => setView(b.dataset.viewTarget)));
  el.form?.addEventListener("submit", saveItem);
  el.cancelEdit?.addEventListener("click", resetForm);
  el.searchInput?.addEventListener("input", () => updateFilter("search", el.searchInput.value.trim().toLowerCase()));
  el.sourceFilter?.addEventListener("change", () => updateFilter("source", el.sourceFilter.value));
  el.ownerFilter?.addEventListener("change", () => updateFilter("owner", el.ownerFilter.value));
  el.statusFilter?.addEventListener("change", () => updateFilter("status", el.statusFilter.value));
  el.priorityFilter?.addEventListener("change", () => updateFilter("priority", el.priorityFilter.value));
  el.favoritesOnly?.addEventListener("change", () => updateFilter("favoritesOnly", el.favoritesOnly.checked));
  el.clearFilters?.addEventListener("click", clearFilters);
  el.exportJson?.addEventListener("click", exportData);
  el.importJson?.addEventListener("change", importData);
  el.seedDemo?.addEventListener("click", seedDemoData);
  el.bulkDone?.addEventListener("click", () => bulkUpdate("status", "Done"));
  el.bulkArchive?.addEventListener("click", () => bulkUpdate("archived", true));
  el.bulkOwner?.addEventListener("click", bulkReassign);
  el.clearSelection?.addEventListener("click", () => {
    state.selectedIds.clear();
    renderAll();
  });
  [el.boardView, el.libraryView, el.archiveView].forEach((view) => view.addEventListener("click", handleActions));
  [el.boardView, el.libraryView, el.archiveView].forEach((view) => view.addEventListener("change", handleSelect));
}

function populateOwners() {
  const options = TEAM_MEMBERS.map((m) => `<option value="${m}">${m}</option>`).join("");
  el.owner.innerHTML = options;
  el.ownerFilter.insertAdjacentHTML("beforeend", options);
  el.owner.value = TEAM_MEMBERS[0];
}

function setView(viewId) {
  el.viewButtons.forEach((b) => b.classList.toggle("active", b.dataset.viewTarget === viewId));
  [el.boardView, el.scheduleView, el.libraryView, el.archiveView, el.activityView, el.whiteboardView].forEach((v) => {
    v.classList.toggle("active", v.id === viewId);
  });
}

function updateFilter(key, value) {
  state.filters[key] = value;
  renderAll();
}

function clearFilters() {
  state.filters = { search: "", source: "all", owner: "all", status: "all", priority: "all", favoritesOnly: false };
  el.searchInput.value = "";
  el.sourceFilter.value = "all";
  el.ownerFilter.value = "all";
  el.statusFilter.value = "all";
  el.priorityFilter.value = "all";
  el.favoritesOnly.checked = false;
  renderAll();
}

async function saveItem(event) {
  event.preventDefault();
  const idValue = el.itemId.value || createId();
  const existing = state.items.find((x) => x.id === idValue);
  const selectedFile = el.imageInput.files && el.imageInput.files[0];
  const imageData = selectedFile ? await fileToDataUrl(selectedFile) : existing?.imageData || "";
  const now = new Date().toISOString();
  const item = {
    id: idValue,
    title: el.title.value.trim(),
    source: el.source.value,
    project: el.project.value.trim(),
    owner: el.owner.value,
    status: el.status.value,
    priority: el.priority.value,
    dueDate: el.dueDate.value,
    reminderDate: el.reminderDate.value,
    effortHours: Number(el.effort.value || 0),
    reference: el.reference.value.trim(),
    imageData,
    tags: el.tags.value.trim(),
    notes: el.notes.value.trim(),
    checklist: parseChecklist(el.checklist.value),
    favorite: el.favorite.checked,
    archived: el.archived.checked,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };
  if (!item.title) return;
  if (existing) {
    state.items[state.items.findIndex((x) => x.id === item.id)] = item;
    pushLog(`Updated "${item.title}"`);
  } else {
    state.items.unshift(item);
    pushLog(`Added "${item.title}"`);
  }
  persistAll();
  resetForm();
  renderAll();
}

function resetForm() {
  el.form.reset();
  el.itemId.value = "";
  el.owner.value = TEAM_MEMBERS[0];
  el.priority.value = "Medium";
  el.status.value = "Inbox";
  el.effort.value = "1";
  el.saveButton.innerHTML = "<span aria-hidden=\"true\">+</span><span>Add Item</span>";
  el.cancelEdit.classList.add("hidden");
}

function handleSelect(event) {
  const input = event.target.closest(".select-item");
  if (!input) return;
  const idValue = input.dataset.id;
  if (input.checked) state.selectedIds.add(idValue);
  else state.selectedIds.delete(idValue);
  updateSelectionLabel();
}

function handleActions(event) {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;
  const idValue = btn.dataset.id;
  const action = btn.dataset.action;
  const item = state.items.find((x) => x.id === idValue);
  if (!item) return;

  if (action === "edit") return editItem(item);
  if (action === "delete") return deleteItem(item);
  if (action === "move-back") return moveStatus(item, -1);
  if (action === "move-forward") return moveStatus(item, 1);
  if (action === "toggle-favorite") return toggleFavorite(item);
  if (action === "toggle-archive") return toggleArchive(item);
  if (action === "check-next") return checkNextTask(item);
}

function editItem(item) {
  el.itemId.value = item.id;
  el.title.value = item.title;
  el.source.value = item.source;
  el.project.value = item.project;
  el.owner.value = item.owner;
  el.status.value = item.status;
  el.priority.value = item.priority;
  el.dueDate.value = item.dueDate || "";
  el.reminderDate.value = item.reminderDate || "";
  el.effort.value = String(item.effortHours || 0);
  el.reference.value = item.reference || "";
  el.tags.value = item.tags || "";
  el.notes.value = item.notes || "";
  el.checklist.value = (item.checklist || []).map((x) => x.text).join("\n");
  el.favorite.checked = Boolean(item.favorite);
  el.archived.checked = Boolean(item.archived);
  el.saveButton.innerHTML = "<span aria-hidden=\"true\">+</span><span>Update Item</span>";
  el.cancelEdit.classList.remove("hidden");
  document.querySelector(".capture-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteItem(item) {
  if (!window.confirm(`Delete "${item.title}"?`)) return;
  state.items = state.items.filter((x) => x.id !== item.id);
  state.selectedIds.delete(item.id);
  pushLog(`Deleted "${item.title}"`);
  persistAll();
  renderAll();
}

function moveStatus(item, offset) {
  const idx = STATUSES.indexOf(item.status);
  const target = idx + offset;
  if (target < 0 || target >= STATUSES.length) return;
  item.status = STATUSES[target];
  item.updatedAt = new Date().toISOString();
  pushLog(`Moved "${item.title}" to ${item.status}`);
  persistAll();
  renderAll();
}

function toggleFavorite(item) {
  item.favorite = !item.favorite;
  item.updatedAt = new Date().toISOString();
  pushLog(`${item.favorite ? "Starred" : "Unstarred"} "${item.title}"`);
  persistAll();
  renderAll();
}

function toggleArchive(item) {
  item.archived = !item.archived;
  item.updatedAt = new Date().toISOString();
  pushLog(`${item.archived ? "Archived" : "Restored"} "${item.title}"`);
  persistAll();
  renderAll();
}

function checkNextTask(item) {
  const next = (item.checklist || []).find((x) => !x.done);
  if (!next) return;
  next.done = true;
  item.updatedAt = new Date().toISOString();
  pushLog(`Checked subtask on "${item.title}"`);
  persistAll();
  renderAll();
}

function bulkUpdate(key, value) {
  if (state.selectedIds.size === 0) return;
  state.items.forEach((item) => {
    if (state.selectedIds.has(item.id)) {
      item[key] = value;
      item.updatedAt = new Date().toISOString();
    }
  });
  pushLog(`Bulk updated ${state.selectedIds.size} items`);
  persistAll();
  renderAll();
}

function bulkReassign() {
  if (state.selectedIds.size === 0) return;
  const owner = window.prompt(`Assign to: ${TEAM_MEMBERS.join(", ")}`, TEAM_MEMBERS[0]);
  if (!owner || !TEAM_MEMBERS.includes(owner)) return;
  bulkUpdate("owner", owner);
}

function renderAll() {
  renderMetrics();
  renderBoard();
  renderSchedule();
  renderLibrary();
  renderArchive();
  renderActivity();
  updateSelectionLabel();
}

function renderMetrics() {
  const active = state.items.filter((x) => !x.archived);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  el.openCount.textContent = String(active.filter((x) => x.status !== "Done").length);
  el.weekCount.textContent = String(active.filter((x) => x.dueDate && new Date(x.dueDate) >= start && new Date(x.dueDate) <= end).length);
  el.referenceCount.textContent = String(active.filter((x) => x.source === "screenshot" || x.imageData).length);
  el.favoriteCount.textContent = String(state.items.filter((x) => x.favorite).length);
  el.archiveCount.textContent = String(state.items.filter((x) => x.archived).length);
  el.overdueCount.textContent = String(active.filter((x) => x.dueDate && new Date(x.dueDate) < start && x.status !== "Done").length);
}

function renderBoard() {
  const items = getFilteredItems().filter((x) => !x.archived);
  const grid = document.createElement("div");
  grid.className = "board-grid";
  STATUSES.forEach((status) => {
    const section = document.createElement("section");
    section.className = "board-column";
    const list = items.filter((x) => x.status === status);
    section.innerHTML = `<h3>${status} (${list.length})</h3>`;
    const holder = document.createElement("div");
    holder.className = "column-items";
    if (!list.length) {
      holder.innerHTML = '<p class="empty-state">No items here.</p>';
    } else {
      list.forEach((item) => holder.appendChild(renderCard(item, true)));
    }
    section.appendChild(holder);
    grid.appendChild(section);
  });
  el.boardView.innerHTML = "";
  el.boardView.appendChild(grid);
}

function renderSchedule() {
  const items = getFilteredItems().filter((x) => !x.archived);
  const sorted = items.filter((x) => x.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const wrap = document.createElement("div");
  wrap.className = "schedule-list";
  if (!sorted.length) {
    wrap.innerHTML = '<p class="empty-state" style="padding:10px">No scheduled items.</p>';
  } else {
    const rows = sorted
      .map(
        (x) =>
          `<tr><td>${formatDate(x.dueDate)}</td><td><strong>${escapeHtml(x.title)}</strong><br/><span style="color:#5d6a70">${escapeHtml(
            x.project || "No project"
          )}</span></td><td>${escapeHtml(x.owner)}</td><td>${escapeHtml(x.status)}</td><td>${escapeHtml(x.priority)}</td><td>${escapeHtml(
            x.reminderDate ? formatDate(x.reminderDate) : "-"
          )}</td></tr>`
      )
      .join("");
    wrap.innerHTML = `<table class="schedule-table"><thead><tr><th>Date</th><th>Item</th><th>Owner</th><th>Status</th><th>Priority</th><th>Reminder</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  el.scheduleView.innerHTML = "";
  el.scheduleView.appendChild(wrap);
}

function renderLibrary() {
  const items = getFilteredItems().filter((x) => !x.archived);
  const groups = new Map();
  items.forEach((item) => {
    const source = SOURCE_LABELS[item.source] || item.source;
    if (!groups.has(source)) groups.set(source, []);
    groups.get(source).push(item);
  });
  const wrap = document.createElement("div");
  wrap.className = "library-list";
  if (!items.length) {
    wrap.innerHTML = '<p class="empty-state" style="padding:10px">No items match current filters.</p>';
  } else {
    [...groups.entries()].forEach(([label, list]) => {
      const section = document.createElement("section");
      section.className = "group";
      section.innerHTML = `<h3>${escapeHtml(label)} (${list.length})</h3>`;
      const holder = document.createElement("div");
      holder.className = "group-items";
      list.forEach((item) => holder.appendChild(renderCard(item, false)));
      section.appendChild(holder);
      wrap.appendChild(section);
    });
  }
  el.libraryView.innerHTML = "";
  el.libraryView.appendChild(wrap);
}

function renderArchive() {
  const items = getFilteredItems().filter((x) => x.archived);
  const wrap = document.createElement("div");
  wrap.className = "library-list";
  if (!items.length) {
    wrap.innerHTML = '<p class="empty-state" style="padding:10px">No archived items.</p>';
  } else {
    const section = document.createElement("section");
    section.className = "group";
    section.innerHTML = `<h3>Archived (${items.length})</h3>`;
    const holder = document.createElement("div");
    holder.className = "group-items";
    items.forEach((item) => holder.appendChild(renderCard(item, false)));
    section.appendChild(holder);
    wrap.appendChild(section);
  }
  el.archiveView.innerHTML = "";
  el.archiveView.appendChild(wrap);
}

function renderActivity() {
  const wrap = document.createElement("div");
  wrap.className = "activity-list";
  if (!state.activity.length) wrap.innerHTML = '<p class="empty-state">No activity yet.</p>';
  else {
    state.activity.slice(0, 40).forEach((entry) => {
      const node = document.createElement("article");
      node.className = "activity-entry";
      node.textContent = `${formatDateTime(entry.at)} - ${entry.text}`;
      wrap.appendChild(node);
    });
  }
  el.activityView.innerHTML = "";
  el.activityView.appendChild(wrap);
}

function renderCard(item, withMove) {
  const frag = el.cardTemplate.content.cloneNode(true);
  const card = frag.querySelector(".item-card");
  const title = frag.querySelector(".item-title");
  const meta = frag.querySelector(".item-meta");
  const notes = frag.querySelector(".item-notes");
  const chips = frag.querySelector(".item-chips");
  const linkWrap = frag.querySelector(".item-link-wrap");
  const select = frag.querySelector(".select-item");
  const moveBack = frag.querySelector(".move-back");
  const moveForward = frag.querySelector(".move-forward");
  const edit = frag.querySelector(".edit-item");
  const remove = frag.querySelector(".delete-item");

  select.dataset.id = item.id;
  select.checked = state.selectedIds.has(item.id);
  title.textContent = item.title;
  meta.textContent = `${item.project || "No project"} | ${item.owner}`;
  notes.textContent = item.notes || "No notes yet.";

  chips.appendChild(createChip(SOURCE_LABELS[item.source] || "Unknown"));
  chips.appendChild(createChip(item.priority));
  chips.appendChild(createChip(`${Math.max(0, Number(item.effortHours || 0))}h`));
  if (item.favorite) chips.appendChild(createChip("Favorite"));
  if (item.checklist?.length) chips.appendChild(createChip(`${item.checklist.filter((x) => x.done).length}/${item.checklist.length} subtasks`));
  if (item.dueDate) chips.appendChild(createChip(`Due ${formatDate(item.dueDate)}`));

  if (item.imageData) {
    const img = document.createElement("img");
    img.className = "item-preview";
    img.alt = "Visual reference preview";
    img.src = item.imageData;
    card.insertBefore(img, notes);
  }
  if (item.reference) {
    linkWrap.innerHTML = `<a href="${escapeHtml(item.reference)}" target="_blank" rel="noreferrer">Open reference</a>`;
  }

  const sidx = STATUSES.indexOf(item.status);
  moveBack.dataset.action = "move-back";
  moveBack.dataset.id = item.id;
  moveForward.dataset.action = "move-forward";
  moveForward.dataset.id = item.id;
  moveBack.disabled = !withMove || sidx <= 0;
  moveForward.disabled = !withMove || sidx >= STATUSES.length - 1;
  edit.dataset.action = "edit";
  edit.dataset.id = item.id;
  remove.dataset.action = "delete";
  remove.dataset.id = item.id;

  const favoriteButton = document.createElement("button");
  favoriteButton.type = "button";
  favoriteButton.className = "icon-button";
  favoriteButton.dataset.action = "toggle-favorite";
  favoriteButton.dataset.id = item.id;
  favoriteButton.textContent = item.favorite ? "Unstar" : "Star";
  const archiveButton = document.createElement("button");
  archiveButton.type = "button";
  archiveButton.className = "icon-button";
  archiveButton.dataset.action = "toggle-archive";
  archiveButton.dataset.id = item.id;
  archiveButton.textContent = item.archived ? "Restore" : "Archive";
  const checklistButton = document.createElement("button");
  checklistButton.type = "button";
  checklistButton.className = "icon-button";
  checklistButton.dataset.action = "check-next";
  checklistButton.dataset.id = item.id;
  checklistButton.textContent = "Check Next";
  frag.querySelector(".card-actions").append(favoriteButton, archiveButton, checklistButton);
  return card;
}

function updateSelectionLabel() {
  el.selectionCount.textContent = `Selected: ${state.selectedIds.size}`;
}

function parseChecklist(text) {
  return text
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => ({ text: x, done: false }));
}

function pushLog(text) {
  state.activity.unshift({ id: createId(), at: new Date().toISOString(), text });
  state.activity = state.activity.slice(0, 200);
}

function getFilteredItems() {
  return state.items.filter((item) => {
    const searchPass = !state.filters.search || [item.title, item.project, item.notes, item.tags].join(" ").toLowerCase().includes(state.filters.search);
    const sourcePass = state.filters.source === "all" || item.source === state.filters.source;
    const ownerPass = state.filters.owner === "all" || item.owner === state.filters.owner;
    const statusPass = state.filters.status === "all" || item.status === state.filters.status;
    const priorityPass = state.filters.priority === "all" || item.priority === state.filters.priority;
    const favoritePass = !state.filters.favoritesOnly || item.favorite;
    return searchPass && sourcePass && ownerPass && statusPass && priorityPass && favoritePass;
  });
}

function persistAll() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  localStorage.setItem(LOG_KEY, JSON.stringify(state.activity));
  localStorage.setItem(WHITEBOARD_KEY, JSON.stringify(state.whiteboard));
}

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && x.id && x.title)
      .map((x) => ({
        id: x.id,
        title: x.title,
        source: x.source || "idea",
        project: x.project || "",
        owner: TEAM_MEMBERS.includes(x.owner) ? x.owner : TEAM_MEMBERS[0],
        status: STATUSES.includes(x.status) ? x.status : "Inbox",
        priority: ["Low", "Medium", "High"].includes(x.priority) ? x.priority : "Medium",
        dueDate: x.dueDate || "",
        reminderDate: x.reminderDate || "",
        effortHours: Number(x.effortHours || 0),
        reference: x.reference || "",
        imageData: x.imageData || "",
        tags: x.tags || "",
        notes: x.notes || "",
        checklist: Array.isArray(x.checklist) ? x.checklist : [],
        favorite: Boolean(x.favorite),
        archived: Boolean(x.archived),
        createdAt: x.createdAt || new Date().toISOString(),
        updatedAt: x.updatedAt || new Date().toISOString()
      }));
  } catch {
    return [];
  }
}

function loadActivity() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadWhiteboard() {
  try {
    const raw = localStorage.getItem(WHITEBOARD_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return { strokes: [], notes: [] };
    return {
      strokes: Array.isArray(parsed.strokes) ? parsed.strokes : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : []
    };
  } catch {
    return { strokes: [], notes: [] };
  }
}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    items: state.items,
    activity: state.activity
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "northline-studio-hub-export.json";
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    const importedItems = Array.isArray(data) ? data : data.items;
    if (!Array.isArray(importedItems)) return;
    state.items = importedItems.map((x) => ({ ...x, id: x.id || createId(), title: x.title || "Untitled" }));
    if (Array.isArray(data.activity)) state.activity = data.activity;
    pushLog("Imported data");
    persistAll();
    renderAll();
  } catch {
    window.alert("Invalid JSON file.");
  } finally {
    el.importJson.value = "";
  }
}

function seedDemoData() {
  if (state.items.length && !window.confirm("Replace current items with demo data?")) return;
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 3);
  state.items = [
    createDemo("Homepage visual direction", "screenshot", "Atlas Packaging", "Avery", "Designing", "High", next, true),
    createDemo("Client feedback digest", "email", "Northline Rebrand", "Mina", "Inbox", "Medium", "", false),
    createDemo("Moodboard structure", "idea", "Horizon Cafe", "Jordan", "Planned", "Low", "", false)
  ];
  state.activity = [];
  state.selectedIds.clear();
  pushLog("Loaded demo data");
  persistAll();
  renderAll();
}

function createDemo(title, source, project, owner, status, priority, dueDate, favorite) {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title,
    source,
    project,
    owner,
    status,
    priority,
    dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : "",
    reminderDate: "",
    effortHours: 2,
    reference: "",
    imageData: "",
    tags: "demo, studio",
    notes: "Demo item to showcase feature behavior.",
    checklist: [{ text: "Review with team", done: false }, { text: "Send client update", done: false }],
    favorite,
    archived: false,
    createdAt: now,
    updatedAt: now
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(
    new Date(value)
  );
}

function createChip(text) {
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.textContent = text;
  return chip;
}

function id(name) {
  return document.getElementById(name);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  return `item-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function initWhiteboard() {
  if (!el.wbCanvas || !el.wbStickyLayer) return;
  const ctx = el.wbCanvas.getContext("2d");
  if (!ctx) return;

  let drawing = false;
  let currentStroke = null;

  function pointFromEvent(event) {
    const rect = el.wbCanvas.getBoundingClientRect();
    const scaleX = el.wbCanvas.width / rect.width;
    const scaleY = el.wbCanvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  function drawStroke(stroke) {
    if (!stroke.points || stroke.points.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i += 1) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function renderWhiteboard() {
    ctx.clearRect(0, 0, el.wbCanvas.width, el.wbCanvas.height);
    state.whiteboard.strokes.forEach(drawStroke);
    renderStickyNotes();
  }

  function renderStickyNotes() {
    el.wbStickyLayer.innerHTML = "";
    state.whiteboard.notes.forEach((note) => {
      const wrap = document.createElement("article");
      wrap.className = "sticky-note";
      wrap.style.left = `${note.x}px`;
      wrap.style.top = `${note.y}px`;
      wrap.dataset.id = note.id;
      wrap.innerHTML = `<div class="sticky-head"><button type="button" class="icon-button sticky-remove" data-note-id="${note.id}">X</button></div><textarea>${escapeHtml(
        note.text || ""
      )}</textarea>`;
      const textarea = wrap.querySelector("textarea");
      textarea.addEventListener("input", () => {
        note.text = textarea.value;
        persistAll();
      });
      attachStickyDrag(wrap, note);
      const remove = wrap.querySelector(".sticky-remove");
      remove.addEventListener("click", () => {
        state.whiteboard.notes = state.whiteboard.notes.filter((n) => n.id !== note.id);
        persistAll();
        renderStickyNotes();
      });
      el.wbStickyLayer.appendChild(wrap);
    });
  }

  function attachStickyDrag(node, note) {
    let dragging = false;
    let dx = 0;
    let dy = 0;
    node.addEventListener("pointerdown", (event) => {
      if (event.target.tagName.toLowerCase() === "textarea" || event.target.closest(".sticky-remove")) return;
      dragging = true;
      const rect = node.getBoundingClientRect();
      dx = event.clientX - rect.left;
      dy = event.clientY - rect.top;
      node.setPointerCapture(event.pointerId);
    });
    node.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const stageRect = el.wbStickyLayer.getBoundingClientRect();
      const x = event.clientX - stageRect.left - dx;
      const y = event.clientY - stageRect.top - dy;
      note.x = Math.max(0, Math.min(stageRect.width - 190, x));
      note.y = Math.max(0, Math.min(stageRect.height - 140, y));
      node.style.left = `${note.x}px`;
      node.style.top = `${note.y}px`;
    });
    node.addEventListener("pointerup", (event) => {
      if (!dragging) return;
      dragging = false;
      node.releasePointerCapture(event.pointerId);
      persistAll();
    });
  }

  el.wbCanvas.addEventListener("pointerdown", (event) => {
    drawing = true;
    const p = pointFromEvent(event);
    currentStroke = {
      id: createId(),
      tool: state.whiteboardTool,
      color: el.wbColor?.value || "#1f2937",
      size: Number(el.wbSize?.value || 3),
      points: [p]
    };
    state.whiteboard.strokes.push(currentStroke);
  });

  el.wbCanvas.addEventListener("pointermove", (event) => {
    if (!drawing || !currentStroke) return;
    currentStroke.points.push(pointFromEvent(event));
    renderWhiteboard();
  });

  el.wbCanvas.addEventListener("pointerup", () => {
    drawing = false;
    currentStroke = null;
    persistAll();
  });

  el.wbCanvas.addEventListener("pointerleave", () => {
    drawing = false;
    currentStroke = null;
  });

  el.wbPen?.addEventListener("click", () => {
    state.whiteboardTool = "pen";
  });
  el.wbEraser?.addEventListener("click", () => {
    state.whiteboardTool = "eraser";
  });
  el.wbClear?.addEventListener("click", () => {
    state.whiteboard.strokes = [];
    persistAll();
    renderWhiteboard();
  });
  el.wbAddNote?.addEventListener("click", () => {
    state.whiteboard.notes.push({
      id: createId(),
      x: 16 + Math.floor(Math.random() * 220),
      y: 16 + Math.floor(Math.random() * 220),
      text: "New note"
    });
    persistAll();
    renderStickyNotes();
  });

  renderWhiteboard();
}
