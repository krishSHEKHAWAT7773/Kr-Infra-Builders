import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  updateProfile, updatePassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, updateDoc,
  collection, getDocs, addDoc, setDoc
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

  let projects = [];
  let userProfile = {};
  let notifs = [];
  let events = []; // New variable for events

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
      const projectsSnapshot = await getDocs(collection(db, "projects"));
      projects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const eventsSnapshot = await getDocs(collection(db, "events"));
      events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        userProfile = userDoc.data();
      } else {
        // If the user document doesn't exist, create it with default values
        userProfile = {
          name: user.email.split('@')[0], // Use email as a placeholder name
          email: user.email,
          role: "user",
          phone: "",
          address: "",
        };
        await setDoc(userDocRef, userProfile);
      }

      // Placeholder for notifications
      notifs = [
        { id: 1, message: "Project Alpha is near deadline!" },
        { id: 2, message: "New task added to Project Beta." }
      ];

      return true;
    } catch (error) {
      console.error("Error fetching data:", error);
      return false;
    }
  };

  const renderOverview = () => {
    const ongoingProjects = projects.filter(p => p.status === "ongoing").length;
    const completedProjects = projects.filter(p => p.status === "completed").length;
    const onHoldProjects = projects.filter(p => p.status === "on-hold").length;
    const nearDeadline = projects.filter(p => {
      const endDate = new Date(p.endDate);
      const now = new Date();
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7 && diffDays >= 0 && p.status === 'ongoing';
    }).length;

    dashboardContent.innerHTML = `
      <section class="dashboard-panel">
        <h2 class="panel-title">Project Overview</h2>
        <div class="overview-cards">
          <div class="dashboard-card"><i class="fas fa-folder-open"></i><h3>Ongoing</h3><p>${ongoingProjects}</p></div>
          <div class="dashboard-card"><i class="fas fa-check-circle"></i><h3>Completed</h3><p>${completedProjects}</p></div>
          <div class="dashboard-card"><i class="fas fa-pause-circle"></i><h3>On Hold</h3><p>${onHoldProjects}</p></div>
          <div class="dashboard-card"><i class="fas fa-exclamation-triangle"></i><h3>Near Deadline</h3><p>${nearDeadline}</p></div>
        </div>
        <div class="chart-container">
          <canvas id="projectStatusChart"></canvas>
        </div>
      </section>
    `;

    const ctx = document.getElementById("projectStatusChart").getContext("2d");
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Ongoing', 'Completed', 'On Hold'],
        datasets: [{
          data: [ongoingProjects, completedProjects, onHoldProjects],
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
            <tbody id="eventsTableBody">
              ${events.length > 0 ? events.map(e => `
                <tr>
                  <td>${e.title}</td>
                  <td>${e.date}</td>
                  <td>${e.description}</td>
                </tr>
              `).join('') : `<tr><td colspan="3" class="no-results">No upcoming events.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    `;
    document.getElementById("addEventBtn").addEventListener("click", () => {
      document.getElementById("addEventModal").style.display = "flex";
      // Close modal logic
      document.querySelector("#addEventModal .close-btn").onclick = () => document.getElementById("addEventModal").style.display = "none";
      window.onclick = (event) => {
        if (event.target === document.getElementById("addEventModal")) {
          document.getElementById("addEventModal").style.display = "none";
        }
      };
    });
    document.getElementById("addEventForm").addEventListener("submit", addNewEvent);
  };
  
  const addNewEvent = async (e) => {
    e.preventDefault();
    const newEvent = {
      title: document.getElementById("eventTitle").value,
      date: document.getElementById("eventDate").value,
      description: document.getElementById("eventDescription").value,
    };
    try {
      await addDoc(collection(db, "events"), newEvent);
      const addEventMsg = document.getElementById("addEventMsg");
      addEventMsg.textContent = "Event added successfully!";
      addEventMsg.className = "message success";
      // Refresh the event list
      await fetchData(auth.currentUser);
      renderSchedule();
      // Hide the modal after a short delay
      setTimeout(() => {
        document.getElementById("addEventModal").style.display = "none";
      }, 1500);
    } catch (error) {
      document.getElementById("addEventMsg").textContent = "Error adding event: " + error.message;
      document.getElementById("addEventMsg").className = "message error";
      console.error("Error adding event:", error);
    }
  };

  const renderProjects = (filteredProjects = projects) => {
    const projectLeads = [...new Set(projects.map(p => p.projectLead))];

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
            ${projectLeads.map(lead => `<option value="${lead}">${lead}</option>`).join('')}
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
              </tr>
            </thead>
            <tbody id="projectsTableBody">
              ${filteredProjects.length > 0 ? filteredProjects.map(p => `
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
                </tr>
              `).join('') : `<tr><td colspan="5" class="no-results">No projects found.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
      <div id="addProjectModal" class="modal">
        <div class="modal-content">
          <span class="close-btn">&times;</span>
          <h3>Add New Project</h3>
          <form id="addProjectForm">
            <label for="projectName">Project Name:</label>
            <input type="text" id="addProjectName" required>

            <label for="projectLead">Project Lead:</label>
            <input type="text" id="addProjectLead" required>
            
            <label for="startDate">Start Date:</label>
            <input type="date" id="addStartDate" required>
            
            <label for="endDate">End Date:</label>
            <input type="date" id="addEndDate" required>
            
            <label for="status">Status:</label>
            <select id="addStatus" required>
              <option value="ongoing">Ongoing</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
            
            <label for="completion">Completion %:</label>
            <input type="number" id="addCompletion" min="0" max="100" value="0" required>
            
            <button type="submit">Create Project</button>
            <p id="addProjectMsg" class="message"></p>
          </form>
        </div>
      </div>
    `;

    document.getElementById("addNewProjectBtn").addEventListener("click", () => {
      document.getElementById("addProjectModal").style.display = "flex";
      // Close modal logic
      document.querySelector("#addProjectModal .close-btn").onclick = () => document.getElementById("addProjectModal").style.display = "none";
      window.onclick = (event) => {
        if (event.target === document.getElementById("addProjectModal")) {
          document.getElementById("addProjectModal").style.display = "none";
        }
      };
    });
    
    // NEW: Handle Add Project Form Submission
    document.getElementById("addProjectForm").addEventListener("submit", addNewProject);

    const projectSearch = document.getElementById("projectSearch");
    const statusFilter = document.getElementById("statusFilter");
    const leadFilter = document.getElementById("leadFilter");
    const applyFilters = () => {
      const searchTerm = projectSearch.value.toLowerCase();
      const statusTerm = statusFilter.value;
      const leadTerm = leadFilter.value;
      const filtered = projects.filter(p => {
        const matchesSearch = p.projectName.toLowerCase().includes(searchTerm);
        const matchesStatus = statusTerm === "all" || p.status === statusTerm;
        const matchesLead = leadTerm === "all" || p.projectLead === leadTerm;
        return matchesSearch && matchesStatus && matchesLead;
      });
      renderProjects(filtered);
    };
    projectSearch.addEventListener("input", applyFilters);
    statusFilter.addEventListener("change", applyFilters);
    leadFilter.addEventListener("change", applyFilters);
  };

  const addNewProject = async (e) => {
    e.preventDefault();
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
      const addProjectMsg = document.getElementById("addProjectMsg");
      addProjectMsg.textContent = "Project added successfully!";
      addProjectMsg.className = "message success";
      // Refresh the project list
      await fetchData(auth.currentUser);
      renderProjects();
      // Hide the modal after a short delay
      setTimeout(() => {
        document.getElementById("addProjectModal").style.display = "none";
      }, 1500);
    } catch (error) {
      document.getElementById("addProjectMsg").textContent = "Error adding project: " + error.message;
      document.getElementById("addProjectMsg").className = "message error";
      console.error("Error adding project:", error);
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
    document.getElementById("editProfileBtn").addEventListener("click", showProfileModal);
  };

  const showProfileModal = () => {
    const modal = document.getElementById("profileModal");
    const modalForm = document.getElementById("profileUpdateForm");
    const closeBtn = modal.querySelector(".close-btn");
    
    document.getElementById("modalDisplayName").value = userProfile.name || '';
    document.getElementById("modalPhone").value = userProfile.phone || '';
    document.getElementById("modalAddress").value = userProfile.address || '';
    
    modal.style.display = "flex";

    closeBtn.onclick = () => modal.style.display = "none";
    window.onclick = (event) => {
      if (event.target === modal) modal.style.display = "none";
      };

    modalForm.onsubmit = async (e) => {
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
  };

  const initDashboard = async (user) => {
    document.getElementById("userName").textContent = `Hello, ${user.email.split('@')[0]}`;
    await fetchData(user); 
    document.getElementById("userName").textContent = `Hello, ${userProfile.name || 'User'}`;
    renderOverview();
    updateNotificationBadge();
    setupNavListeners(); // Setup event listeners after initial data is loaded
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await initDashboard(user);
    } else {
      window.location.href = "login.html";
    }
  });

  logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
      window.location.href = "login.html";
    }).catch((error) => {
      console.error("Logout failed:", error);
    });
  });

  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });

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

  document.getElementById("passwordUpdateForm").addEventListener("submit", async (e) => {
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

  const updateNotificationBadge = () => {
    document.getElementById("notifCount").textContent = notifs.length;
    document.getElementById("notifCount").style.display = notifs.length > 0 ? "block" : "none";
  };
});