// ---- Firebase Setup ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-storage.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC6nnulMfqE6zn9g3fVZJaa2RMNV-AHScI",
  authDomain: "mymindnotebook-8e125.firebaseapp.com",
  projectId: "mymindnotebook-8e125",
  storageBucket: "mymindnotebook-8e125.firebasestorage.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Sign in anonymously
signInAnonymously(auth).catch(console.error);

// ---- Local Storage Keys ----
const NOTES_KEY = "notes";
const LINKS_KEY = "links";

let notes = JSON.parse(localStorage.getItem(NOTES_KEY)) || {};
let links = JSON.parse(localStorage.getItem(LINKS_KEY)) || [];

const notesContainer = document.getElementById("notesContainer");

// ---- Modal Functions ----
window.openNoteModal = () => document.getElementById("noteModal").style.display = "flex";
window.closeNoteModal = () => document.getElementById("noteModal").style.display = "none";

// ---- Save Note Function (with Firebase Upload + Firestore Save) ----
window.saveNote = async function () {
  const title = document.getElementById("noteTitle").value.trim();
  const content = document.getElementById("noteContent").value.trim();
  const tags = document.getElementById("noteTags").value.split(",").map(t => t.trim()).filter(Boolean);
  const attachments = document.getElementById("noteAttachment")?.files || [];

  if (!title) return alert("Title is required");

  notes[title] = { content, tags, attachments: [] };

  try {
    const userId = auth.currentUser ? auth.currentUser.uid : "anonymous";
    const timestamp = Date.now();

    // Upload note text as .txt
    if (content) {
      const blob = new Blob([content], { type: "text/plain" });
      const noteRef = ref(storage, `notebooks/${userId}/${title}_${timestamp}.txt`);
      await uploadBytes(noteRef, blob);
      const url = await getDownloadURL(noteRef);
      notes[title].attachments.push(url);
    }

    // Upload any attached files
    for (let file of attachments) {
      const fileRef = ref(storage, `notebooks/${userId}/attachments/${timestamp}_${file.name}`);
      await uploadBytes(fileRef, file);
      const fileUrl = await getDownloadURL(fileRef);
      notes[title].attachments.push(fileUrl);
    }

    // Save to Firestore
    await setDoc(doc(db, "notes", title), {
      content,
      tags,
      attachments: notes[title].attachments,
      createdAt: new Date().toISOString()
    });

    // Update localStorage
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (err) {
    console.error("Firebase upload error:", err);
  }

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

    let attachmentsHTML = "";
    if (note.attachments && note.attachments.length) {
      attachmentsHTML = "<div class='note-attachments'>" +
        note.attachments.map(url => `<a href="${url}" target="_blank">Attachment</a>`).join(" | ") +
        "</div>";
    }

    card.innerHTML = `
      <h3>${title}</h3>
      <p>${note.content.substring(0, 60)}...</p>
      <div class="note-tags">${note.tags.join(", ")}</div>
      ${attachmentsHTML}
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

  Object.keys(notes).forEach(note => {
    [src, tgt].forEach(sel => {
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
  if (!links.some(l => l.source === source && l.target === target)) {
    links.push({ source, target });
    localStorage.setItem(LINKS_KEY, JSON.stringify(links));
    renderGraph();
  }
};


async function fetchAllNotes() {
  try {
    const querySnapshot = await getDocs(collection(db, "notes"));
    querySnapshot.forEach((doc) => {
      console.log("Note ID:", doc.id);
      console.log("Note Data:", doc.data());
    });
  } catch (err) {
    console.error("Error fetching notes from Firestore:", err);
  }
}

// ---- Render Mermaid Graph ----
async function renderGraph() {
  let mermaidGraph = "graph TD\n";

  Object.keys(notes).forEach(note => {
    const safeId = note.replace(/\s+/g, "_");
    mermaidGraph += `  ${safeId}["${note}"]\n`;
  });

  links.forEach(l => {
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
fetchAllNotes();


