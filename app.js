// ---- Local Storage Keys ----
const NOTES_KEY = "notes";
const LINKS_KEY = "links";

// Load saved data
let notes = JSON.parse(localStorage.getItem(NOTES_KEY)) || {};
let links = JSON.parse(localStorage.getItem(LINKS_KEY)) || [];

// Cache DOM elements
const notesContainer = document.getElementById("notesContainer");

// ---- Modal Functions ----
window.openNoteModal = () => (document.getElementById("noteModal").style.display = "flex");
window.closeNoteModal = () => (document.getElementById("noteModal").style.display = "none");

// ---- Save Note (Local Only) ----
window.saveNote = function () {
  const title = document.getElementById("noteTitle").value.trim();
  const content = document.getElementById("noteContent").value.trim();
  const tags = document
    .getElementById("noteTags")
    .value.split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (!title) return alert("Title is required");

  notes[title] = {
    content,
    tags,
    createdAt: new Date().toISOString(),
  };

  // Save to localStorage
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));

  // Reset modal
  document.getElementById("noteTitle").value = "";
  document.getElementById("noteContent").value = "";
  document.getElementById("noteTags").value = "";

  closeNoteModal();
  renderNotes();
  refreshDropdowns();
  renderGraph();
};

// ---- Render Notes ----
function renderNotes(filter = "") {
  notesContainer.innerHTML = "";
  const q = filter.toLowerCase();

  Object.entries(notes).forEach(([title, note]) => {
    if (q && !(title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q))) return;

    const card = document.createElement("div");
    card.className = "note-card";

    card.innerHTML = `
      <h3>${title}</h3>
      <p>${note.content.substring(0, 60)}...</p>
      <div class="note-tags">${note.tags.join(", ")}</div>
    `;

    notesContainer.appendChild(card);
  });
}

// ---- Search Notes ----
window.searchNotes = function () {
  const query = document.getElementById("searchBox").value;
  renderNotes(query);
};

// ---- Dropdowns for Linking ----
function refreshDropdowns() {
  const src = document.getElementById("sourceNote");
  const tgt = document.getElementById("targetNote");
  src.innerHTML = tgt.innerHTML = "";

  Object.keys(notes).forEach((note) => {
    [src, tgt].forEach((sel) => {
      const opt = document.createElement("option");
      opt.value = note;
      opt.textContent = note;
      sel.appendChild(opt);
    });
  });
}

// ---- Add Link ----
window.addLink = function () {
  const source = document.getElementById("sourceNote").value;
  const target = document.getElementById("targetNote").value;
  if (source === target) return alert("Cannot link a note to itself!");
  if (!links.some((l) => l.source === source && l.target === target)) {
    links.push({ source, target });
    localStorage.setItem(LINKS_KEY, JSON.stringify(links));
    renderGraph();
  }
};

// ---- Render Mermaid Graph ----
async function renderGraph() {
  let mermaidGraph = "graph TD\n";

  Object.keys(notes).forEach((note) => {
    const safeId = note.replace(/\s+/g, "_");
    mermaidGraph += `  ${safeId}["${note}"]\n`;
  });

  links.forEach((l) => {
    const sourceId = l.source.replace(/\s+/g, "_");
    const targetId = l.target.replace(/\s+/g, "_");
    mermaidGraph += `  ${sourceId} --> ${targetId}\n`;
  });

  try {
    const { svg } = await window.mermaid.render("graphDiv", mermaidGraph.trim());
    document.getElementById("graph").innerHTML = svg;
  } catch (err) {
    document.getElementById("graph").innerHTML = `<pre style="color:red;">Mermaid Error:\n${mermaidGraph}</pre>`;
    console.error("Mermaid rendering error:", err);
  }
}

// ---- Init ----
renderNotes();
refreshDropdowns();
renderGraph();
