import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  updateProfile, updatePassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, updateDoc,
  collection, getDocs, query, orderBy, addDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const firebaseConfig = {
    apiKey: "AIzaSyC2jY47xWVne8Dy4X83Z6szWY3_t6fZfRM",
    authDomain: "kr-infra-auth.firebaseapp.com",
    projectId: "kr-infra-auth",
    storageBucket: "kr-infra-auth.appspot.com",
    messagingSenderId: "263430872882",
    appId: "1:263430872882:web:8b49bec1caaf854474412b",
    measurementId: "G-3VVNL7QJL"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const addProjectBtn = document.getElementById("addProjectBtn");

  function toggleAddButton(tabId) {
    if (addProjectBtn) {
      addProjectBtn.style.display = tabId === "projectsTab" ? "block" : "none";
    }
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) return window.location.href = "login.html";

    const userHeaderName = document.getElementById("userName");
    if (userHeaderName) {
      userHeaderName.textContent = user.displayName ? `Hi, ${user.displayName}` : "Hi";
    }

    const tabs = {
      overviewTab: `
        <section class="dashboard-grid">
          <div class="dashboard-card"><h3>Active Projects</h3><p id="activeCount">0</p></div>
          <div class="dashboard-card"><h3>Near Deadline</h3><p id="nearDeadlineCount">0</p></div>
          <div class="dashboard-card"><h3>Completed Projects</h3><p id="completedCount">0</p></div>
        </section>
      `,
      scheduleTab: `
        <div class="dashboard-panel">
          <h2>Schedule</h2>
          <ul id="scheduleList"></ul>
        </div>
      `,
      projectsTab: `
        <div class="dashboard-panel">
          <h2>Projects</h2>
          <table class="project-table">
            <thead>
              <tr><th>Name</th><th>Status</th><th>Start</th><th>End</th><th>Completion</th><th>Lead</th></tr>
            </thead>
            <tbody id="projectsTableBody"></tbody>
          </table>
        </div>
      `,
      profileTab: `
        <h2>Profile</h2>
        <div class="profile-card">
          <p><strong>Email:</strong> <span id="userEmail">Loading...</span></p>
          <label for="displayName">Display Name</label>
          <input type="text" id="displayName" />
          <label for="userRole">Role</label>
          <input type="text" id="userRole" />
          <label for="userPhone">Phone</label>
          <input type="text" id="userPhone" />
          <label for="userAddress">Address</label>
          <input type="text" id="userAddress" />
          <button id="updateProfileBtn">Update Profile</button>
          <div id="profileMsg" class="message"></div>
          <hr />
          <label for="newPassword">New Password</label>
          <input type="password" id="newPassword" />
          <button id="updatePasswordBtn">Update Password</button>
          <div id="passwordMsg" class="message"></div>
        </div>
      `
    };

    // Tab switching logic
    const tabIds = ["overviewTab", "scheduleTab", "projectsTab", "profileTab"];
    tabIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("click", () => {
          document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
          el.classList.add("active");
          document.getElementById("dashboardContent").innerHTML = tabs[id] || "";
          toggleAddButton(id);

          if (id === "overviewTab") loadOverview();
          if (id === "scheduleTab") loadSchedule();
          if (id === "projectsTab") loadProjects();
          if (id === "profileTab") renderProfileTab(user);
        });
      }
    });

    // Load default tab after listeners are set
    document.getElementById("overviewTab").click();

    // Logout logic
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        signOut(auth).then(() => {
          showToast("Logged out successfully", "success");
          window.location.href = "login.html";
        }).catch(err => {
          showToast("Logout failed: " + err.message, "error");
        });
      });
    }
  });

// Overview logic
async function loadOverview() {
  const snapshot = await getDocs(collection(db, "projects"));
  let active = 0, nearDeadline = 0, completed = 0;
  const now = new Date();

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.status === "ongoing") active++;
    if (data.status === "completed") completed++;
    if (data.endDate && data.status === "ongoing") {
      const end = data.endDate.toDate();
      const diff = (end - now) / (1000 * 60 * 60 * 24);
      if (diff <= 7 && diff >= 0) nearDeadline++;
    }
  });

  document.getElementById("activeCount").textContent = active;
  document.getElementById("nearDeadlineCount").textContent = nearDeadline;
  document.getElementById("completedCount").textContent = completed;
}

// Projects logic
async function loadProjects() {
  const tbody = document.getElementById("projectsTableBody");
  const snapshot = await getDocs(collection(db, "projects"));
  tbody.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${data.name}</td>
      <td><span class="status-badge status-${data.status}">${data.status}</span></td>
      <td>${data.startDate?.toDate().toLocaleDateString()}</td>
      <td>${data.endDate?.toDate().toLocaleDateString()}</td>
      <td>${data.completion || 0}%</td>
      <td>${data.lead || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Schedule logic
async function loadSchedule() {
  const list = document.getElementById("scheduleList");
  const scheduleSnap = await getDocs(query(collection(db, "schedule"), orderBy("date")));
  list.innerHTML = "";
  for (const docSnap of scheduleSnap.docs) {
    const data = docSnap.data();
    let projectName = "";
    if (data.projectId) {
      const projDoc = await getDoc(doc(db, "projects", data.projectId));
      if (projDoc.exists()) projectName = projDoc.data().name;
    }
    const li = document.createElement("li");
    li.textContent = `${data.title} (${projectName}) – ${data.date.toDate().toLocaleDateString()}`;
    list.appendChild(li);
  }
}

// Profile logic
async function renderProfileTab(user) {
  const uid = user.uid;
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  const emailSpan = document.getElementById("userEmail");
  const nameInput = document.getElementById("displayName");
  const roleInput = document.getElementById("userRole");
  const phoneInput = document.getElementById("userPhone");
  const addressInput = document.getElementById("userAddress");

  if (userSnap.exists()) {
    const data = userSnap.data();
    emailSpan.textContent = data.email || user.email;
    nameInput.value = data.name || "";
    roleInput.value = data.role || "";
    phoneInput.value = data.phone || "";
    addressInput.value = data.address || "";
  }

  // Update profile
  const updateBtn = document.getElementById("updateProfileBtn");
  updateBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    const role = roleInput.value.trim();
    const phone = phoneInput.value.trim();
    const address = addressInput.value.trim();

    updateBtn.disabled = true;
    updateBtn.textContent = "Updating...";

    try {
      await updateProfile(user, { displayName: name });
      await updateDoc(userRef, { name, role, phone, address });
      showToast("Profile updated successfully.", "success");
    } catch (err) {
      showToast("Error: " + err.message, "error");
    } finally {
      updateBtn.disabled = false;
      updateBtn.textContent = "Update Profile";
    }
  });

  // Update password
  const passBtn = document.getElementById("updatePasswordBtn");
  const passInput = document.getElementById("newPassword");

  passBtn.addEventListener("click", () => {
    const newPass = passInput.value.trim();
    passBtn.disabled = true;
    passBtn.textContent = "Updating...";

    if (newPass.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      passBtn.disabled = false;
      passBtn.textContent = "Update Password";
      return;
    }

    updatePassword(user, newPass)
      .then(() => showToast("Password updated successfully.", "success"))
      .catch(err => showToast("Error: " + err.message, "error"))
      .finally(() => {
        passBtn.disabled = false;
        passBtn.textContent = "Update Password";
      });
  });
}

// Theme toggle logic
const themeToggleBtn = document.getElementById("themeToggleBtn");
if (themeToggleBtn) {
  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-mode");
    themeToggleBtn.textContent = "☀️";
  } else {
    themeToggleBtn.textContent = "🌙";
  }

  themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    const isLight = document.body.classList.contains("light-mode");
    themeToggleBtn.textContent = isLight ? "☀️" : "🌙";
    localStorage.setItem("theme", isLight ? "light" : "dark");
  });
}

// Toast logic
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  const container = document.getElementById("toastContainer");
  if (container.children.length >= 3) {
    container.removeChild(container.firstChild);
  }
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// Add Project Modal Logic
const addProjectBtn = document.getElementById("addProjectBtn");
if (addProjectBtn) {
  addProjectBtn.addEventListener("click", () => {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal">
        <h2>Add New Project</h2>

        <label for="newProjectName">Project Name</label>
        <input type="text" id="newProjectName" placeholder="Enter project name" />

        <label for="newProjectLead">Project Lead</label>
        <input type="text" id="newProjectLead" placeholder="Enter project lead" />

        <label for="newProjectStart">Start Date</label>
        <input type="date" id="newProjectStart" />

        <label for="newProjectEnd">End Date</label>
        <input type="date" id="newProjectEnd" />

        <label for="newProjectStatus">Status</label>
        <select id="newProjectStatus">
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="onhold">On Hold</option>
        </select>

        <label for="newProjectCompletion">Completion (%)</label>
        <input type="number" id="newProjectCompletion" min="0" max="100" value="0" />

        <button id="saveProjectBtn">Save</button>
        <button id="cancelProjectBtn">Cancel</button>
      </div>
    `;
    document.body.appendChild(modal);

    // Cancel button closes modal
    document.getElementById("cancelProjectBtn").onclick = () => modal.remove();

    // Save button logic
    document.getElementById("saveProjectBtn").onclick = async () => {
      const name = document.getElementById("newProjectName").value.trim();
      const lead = document.getElementById("newProjectLead").value.trim();
      const start = document.getElementById("newProjectStart").value;
      const end = document.getElementById("newProjectEnd").value;
      const status = document.getElementById("newProjectStatus").value;
      const completion = parseInt(document.getElementById("newProjectCompletion").value, 10);

      // Validation
      if (!name || !lead || !start || !end || isNaN(completion)) {
        showToast("All fields are required.", "error");
        return;
      }
      if (completion < 0 || completion > 100) {
        showToast("Completion must be between 0 and 100.", "error");
        return;
      }
      if (new Date(end) < new Date(start)) {
        showToast("End date cannot be before start date.", "error");
        return;
      }

      // Firestore write
      try {
        await addDoc(collection(db, "projects"), {
          name,
          lead,
          startDate: new Date(start),
          endDate: new Date(end),
          status,
          completion,
          ownerUID: auth.currentUser.uid
        });
        showToast("Project added successfully.", "success");
        setTimeout(() => modal.remove(), 1000);
        loadProjects(); // Refresh table
      } catch (err) {
        showToast("Error: " + err.message, "error");
      }
    };
  });
}