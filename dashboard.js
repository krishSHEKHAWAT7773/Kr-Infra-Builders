import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  updateProfile, updatePassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, updateDoc,
  collection, getDocs, query, orderBy,
  addDoc, deleteDoc, onSnapshot
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

  const sidebar = document.querySelector(".sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const dashboardContent = document.getElementById("dashboardContent");
  const logoutBtn = document.getElementById("logoutBtn");
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const notifBtn = document.getElementById("notifBtn");
  const profileModal = document.getElementById("profileModal");
  const addProjectModal = document.getElementById("addProjectModal");
  const editProjectModal = document.getElementById("editProjectModal");
  const addEventModal = document.getElementById("addEventModal");
  const editProfileModal = document.getElementById("editProfileModal");
  
  let userProfile = {};

  const navTabs = {
    overviewTab: () => renderOverview(),
    scheduleTab: () => renderSchedule(),
    projectsTab: () => renderProjects(),
    profileTab: () => renderProfile()
  };

  const setupNavListeners = () => {
    document.querySelectorAll(".nav-item").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelector(".nav-item.active").classList.remove("active");
        tab.classList.add("active");
        navTabs[tab.id]();
      });
    });
  };

  const fetchData = async (user) => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        userProfile = userDoc.data();
      } else {
        userProfile = {
          name: user.email.split('@')[0],
          email: user.email,
          role: "user",
          phone: "",
          address: "",
        };
        await setDoc(userDocRef, userProfile);
      }
      return true;
    } catch (error) {
      console.error("Error fetching data:", error);
      return false;
    }
  };

  const closeModal = (modal) => {
    modal.style.display = "none";
  };

  const openModal = (modal) => {
    modal.style.display = "flex";
    modal.querySelector(".close-btn").onclick = () => closeModal(modal);
  };
  
  window.onclick = (event) => {
    if (event.target.classList.contains("modal")) {
      closeModal(event.target);
    }
  };

  const renderOverview = () => {
    dashboardContent.innerHTML = `
      <section class="dashboard-panel">
        <h2 class="panel-title">Project Overview</h2>
        <div class="overview-cards">
          <div class="dashboard-card"><i class="fas fa-folder-open"></i><h3>Ongoing</h3><p id="ongoingCount">0</p></div>
          <div class="dashboard-card"><i class="fas fa-check-circle"></i><h3>Completed</h3><p id="completedCount">0</p></div>
          <div class="dashboard-card"><i class="fas fa-pause-circle"></i><h3>On Hold</h3><p id="onHoldCount">0</p></div>
          <div class="dashboard-card"><i class="fas fa-exclamation-triangle"></i><h3>Near Deadline</h3><p id="nearDeadlineCount">0</p></div>
        </div>
        <div class="chart-container">
          <canvas id="projectStatusChart"></canvas>
        </div>
      </section>
    `;

    // Real-time listener for Overview
    onSnapshot(collection(db, "projects"), (snapshot) => {
      let ongoing = 0, completed = 0, onHold = 0, nearDeadline = 0;
      const now = new Date();

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === "ongoing") ongoing++;
        if (data.status === "completed") completed++;
        if (data.status === "on-hold") onHold++;
        if (data.endDate && data.status === "ongoing") {
          const end = new Date(data.endDate);
          const diff = (end - now) / (1000 * 60 * 60 * 24);
          if (diff <= 7 && diff >= 0) nearDeadline++;
        }
      });
      document.getElementById("ongoingCount").textContent = ongoing;
      document.getElementById("completedCount").textContent = completed;
      document.getElementById("onHoldCount").textContent = onHold;
      document.getElementById("nearDeadlineCount").textContent = nearDeadline;

      const ctx = document.getElementById("projectStatusChart")?.getContext("2d");
      if (ctx) {
        new Chart(ctx, {
          type: 'pie',
          data: {
            labels: ['Ongoing', 'Completed', 'On Hold'],
            datasets: [{
              data: [ongoing, completed, onHold],
              backgroundColor: ['#28a745', '#007bff', '#ffc107'],
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: 'top' },
              title: { display: true, text: 'Project Status Distribution' }
            }
          },
        });
      }
    });
  };

  const renderSchedule = () => {
    dashboardContent.innerHTML = `
      <section class="dashboard-panel">
        <h2 class="panel-title">Upcoming Schedule</h2>
        <button id="addEventBtn" class="primary-btn">Add New Event</button>
        <div class="table-container" style="margin-top: 20px;">
          <table class="project-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody id="eventsTableBody"></tbody>
          </table>
        </div>
      </section>
    `;
    onSnapshot(collection(db, "events"), (snapshot) => {
      const events = snapshot.docs.map(doc => doc.data());
      const eventsTableBody = document.getElementById("eventsTableBody");
      eventsTableBody.innerHTML = events.length > 0 ? events.map(e => `
        <tr>
          <td>${e.title}</td>
          <td>${e.date}</td>
          <td>${e.description}</td>
        </tr>
      `).join('') : `<tr><td colspan="3" class="no-results">No upcoming events.</td></tr>`;
    });

    document.getElementById("addEventBtn").addEventListener("click", () => openModal(addEventModal));
    document.getElementById("addEventForm").addEventListener("submit", addNewEvent);
  };
  
  const addNewEvent = async (e) => {
    e.preventDefault();
    const addEventMsg = document.getElementById("addEventMsg");
    const newEvent = {
      title: document.getElementById("eventTitle").value,
      date: document.getElementById("eventDate").value,
      description: document.getElementById("eventDescription").value,
    };
    try {
      await addDoc(collection(db, "events"), newEvent);
      addEventMsg.textContent = "Event added successfully!";
      addEventMsg.className = "message success";
      setTimeout(() => closeModal(addEventModal), 1500);
    } catch (error) {
      addEventMsg.textContent = "Error adding event: " + error.message;
      addEventMsg.className = "message error";
    }
  };

  const renderProjects = () => {
    dashboardContent.innerHTML = `
      <section class="dashboard-panel">
        <h2 class="panel-title">Project Management</h2>
        <div class="project-toolbar">
          <input type="text" id="projectSearch" placeholder="Search projects...">
          <select id="statusFilter">
            <option value="all">All Statuses</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
          </select>
          <select id="leadFilter">
            <option value="all">All Leads</option>
          </select>
          <button id="addNewProjectBtn" class="primary-btn">Add New Project</button>
        </div>
        <div class="table-container">
          <table class="project-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Status</th>
                <th>Completion</th>
                <th>Project Lead</th>
                <th>End Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="projectsTableBody"></tbody>
          </table>
        </div>
      </section>
    `;

    // Real-time listener for projects
    onSnapshot(collection(db, "projects"), (snapshot) => {
      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const projectsTableBody = document.getElementById("projectsTableBody");
      const projectLeads = [...new Set(projects.map(p => p.projectLead))];
      const leadFilterSelect = document.getElementById("leadFilter");
      leadFilterSelect.innerHTML = `<option value="all">All Leads</option>` + projectLeads.map(lead => `<option value="${lead}">${lead}</option>`).join('');
      
      const applyFilters = () => {
        const searchTerm = document.getElementById("projectSearch").value.toLowerCase();
        const statusTerm = document.getElementById("statusFilter").value;
        const leadTerm = document.getElementById("leadFilter").value;
        const filtered = projects.filter(p => {
          const matchesSearch = p.projectName.toLowerCase().includes(searchTerm);
          const matchesStatus = statusTerm === "all" || p.status === statusTerm;
          const matchesLead = leadTerm === "all" || p.projectLead === leadTerm;
          return matchesSearch && matchesStatus && matchesLead;
        });
        projectsTableBody.innerHTML = filtered.length > 0 ? filtered.map(p => `
          <tr>
            <td>${p.projectName}</td>
            <td class="status-${p.status}">${p.status}</td>
            <td>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${p.completion}%"></div>
                <div class="progress-text">${p.completion}%</div>
              </div>
            </td>
            <td>${p.projectLead}</td>
            <td>${p.endDate}</td>
            <td>
              <button class="edit-btn" data-id="${p.id}">Edit</button>
              <button class="delete-btn" data-id="${p.id}">Delete</button>
            </td>
          </tr>
        `).join('') : `<tr><td colspan="6" class="no-results">No projects found.</td></tr>`;
        addEventListenersForProjectActions();
      };

      applyFilters();
      document.getElementById("projectSearch").addEventListener("input", applyFilters);
      document.getElementById("statusFilter").addEventListener("change", applyFilters);
      document.getElementById("leadFilter").addEventListener("change", applyFilters);
    });

    document.getElementById("addNewProjectBtn").addEventListener("click", () => openModal(addProjectModal));
    document.getElementById("addProjectForm").addEventListener("submit", addNewProject);
  };
  
  const addEventListenersForProjectActions = () => {
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const projectId = e.target.dataset.id;
        if (confirm("Are you sure you want to delete this project?")) {
          try {
            await deleteDoc(doc(db, "projects", projectId));
            alert("Project deleted successfully!");
          } catch (err) {
            alert("Error deleting project: " + err.message);
          }
        }
      });
    });

    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const projectId = e.target.dataset.id;
        const projectDoc = await getDoc(doc(db, "projects", projectId));
        if (projectDoc.exists()) {
          const data = projectDoc.data();
          document.getElementById("editProjectId").value = projectId;
          document.getElementById("editProjectName").value = data.projectName;
          document.getElementById("editProjectLead").value = data.projectLead;
          document.getElementById("editStartDate").value = data.startDate;
          document.getElementById("editEndDate").value = data.endDate;
          document.getElementById("editStatus").value = data.status;
          document.getElementById("editCompletion").value = data.completion;
          openModal(editProjectModal);
        }
      });
    });
    document.getElementById("editProjectForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const projectId = document.getElementById("editProjectId").value;
      const editProjectMsg = document.getElementById("editProjectMsg");
      const updatedProject = {
        projectName: document.getElementById("editProjectName").value,
        projectLead: document.getElementById("editProjectLead").value,
        startDate: document.getElementById("editStartDate").value,
        endDate: document.getElementById("editEndDate").value,
        status: document.getElementById("editStatus").value,
        completion: Number(document.getElementById("editCompletion").value),
      };

      try {
        await updateDoc(doc(db, "projects", projectId), updatedProject);
        editProjectMsg.textContent = "Project updated successfully!";
        editProjectMsg.className = "message success";
        setTimeout(() => closeModal(editProjectModal), 1500);
      } catch (err) {
        editProjectMsg.textContent = "Error updating project: " + err.message;
        editProjectMsg.className = "message error";
      }
    });
  };

  const addNewProject = async (e) => {
    e.preventDefault();
    const addProjectMsg = document.getElementById("addProjectMsg");
    const newProject = {
      projectName: document.getElementById("addProjectName").value,
      projectLead: document.getElementById("addProjectLead").value,
      startDate: document.getElementById("addStartDate").value,
      endDate: document.getElementById("addEndDate").value,
      status: document.getElementById("addStatus").value,
      completion: Number(document.getElementById("addCompletion").value),
    };
    try {
      await addDoc(collection(db, "projects"), newProject);
      addProjectMsg.textContent = "Project added successfully!";
      addProjectMsg.className = "message success";
      setTimeout(() => closeModal(addProjectModal), 1500);
    } catch (error) {
      addProjectMsg.textContent = "Error adding project: " + error.message;
      addProjectMsg.className = "message error";
    }
  };

  const renderProfile = () => {
    dashboardContent.innerHTML = `
      <section class="dashboard-panel">
        <h2 class="panel-title">My Profile</h2>
        <div class="profile-card">
          <p><strong>Name:</strong> <span id="profileName">${userProfile.name || 'Not set'}</span></p>
          <p><strong>Email:</strong> <span id="profileEmail">${auth.currentUser.email}</span></p>
          <p><strong>Role:</strong> <span id="profileRole">${userProfile.role || 'Not set'}</span></p>
          <p><strong>Phone:</strong> <span id="profilePhone">${userProfile.phone || 'Not set'}</span></p>
          <p><strong>Address:</strong> <span id="profileAddress">${userProfile.address || 'Not set'}</span></p>
          <button id="editProfileBtn" class="primary-btn">Edit Profile</button>
        </div>
      </section>
    `;
    document.getElementById("editProfileBtn").addEventListener("click", () => openModal(editProfileModal));
  };

  const initDashboard = async (user) => {
    document.getElementById("userName").textContent = `Hello, ${user.email.split('@')[0]}`;
    await fetchData(user); 
    document.getElementById("userName").textContent = `Hello, ${userProfile.name || 'User'}`;
    renderOverview();
    setupNavListeners(); 
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await initDashboard(user);
    } else {
      window.location.href = "login.html";
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      signOut(auth).then(() => {
        window.location.href = "login.html";
      }).catch((error) => {
        console.error("Logout failed:", error);
      });
    });
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
    });
  }

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

  const profileUpdateForm = document.getElementById("profileUpdateForm");
  const passwordUpdateForm = document.getElementById("passwordUpdateForm");

  if (profileUpdateForm) {
    profileUpdateForm.onsubmit = async (e) => {
      e.preventDefault();
      const updatedProfile = {
        name: document.getElementById("modalDisplayName").value,
        phone: document.getElementById("modalPhone").value,
        address: document.getElementById("modalAddress").value,
      };
      try {
        await updateDoc(doc(db, "users", auth.currentUser.uid), updatedProfile);
        userProfile = { ...userProfile, ...updatedProfile };
        document.getElementById("profileUpdateMessage").textContent = "Profile updated successfully!";
        document.getElementById("profileUpdateMessage").className = "message success";
        renderProfile();
      } catch (error) {
        document.getElementById("profileUpdateMessage").textContent = "Error updating profile: " + error.message;
        document.getElementById("profileUpdateMessage").className = "message error";
      }
    };
  }

  if (passwordUpdateForm) {
    passwordUpdateForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById("newPassword").value;
      const passwordMsg = document.getElementById("passwordMsg");
      if (newPassword.length < 6) {
        passwordMsg.textContent = "Password must be at least 6 characters.";
        passwordMsg.className = "message error";
        return;
      }
      try {
        await updatePassword(auth.currentUser, newPassword);
        passwordMsg.textContent = "Password updated successfully.";
        passwordMsg.className = "message success";
      } catch (err) {
        passwordMsg.textContent = "Error: " + err.message;
        passwordMsg.className = "message error";
      }
    });
  }

  const profileEditForm = document.getElementById("profileEditForm");
  if (profileEditForm) {
    profileEditForm.onsubmit = async (e) => {
      e.preventDefault();
      const updatedProfile = {
        name: document.getElementById("modalName").value,
        phone: document.getElementById("modalPhone").value,
        address: document.getElementById("modalAddress").value,
      };
      try {
        await updateDoc(doc(db, "users", auth.currentUser.uid), updatedProfile);
        userProfile = { ...userProfile, ...updatedProfile };
        document.getElementById("profileUpdateMessage").textContent = "Profile updated successfully!";
        document.getElementById("profileUpdateMessage").className = "message success";
        renderProfile();
      } catch (error) {
        document.getElementById("profileUpdateMessage").textContent = "Error updating profile: " + error.message;
        document.getElementById("profileUpdateMessage").className = "message error";
      }
    };
  }
});