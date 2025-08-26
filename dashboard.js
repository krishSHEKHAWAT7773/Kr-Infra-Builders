import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  updateProfile, updatePassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, updateDoc, setDoc, // Added setDoc as per previous versions
  collection, getDocs, query, orderBy,
  addDoc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Chart.js is no longer needed or imported directly as the chart has been removed.

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

  // --- DOM Elements (Updated to match new dashboard.html) ---
  const dashboardWrapper = document.querySelector(".dashboard-wrapper"); // New wrapper element
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const currentPanelTitle = document.getElementById("currentPanelTitle"); // New element for header title
  const userNameSpan = document.getElementById("userName"); // Updated ID for user greeting
  const logoutBtn = document.getElementById("logoutBtn");
  const themeToggleBtn = document.getElementById("themeToggleBtn");

  // Modals (IDs are retained from new dashboard.html)
  const addProjectModal = document.getElementById("addProjectModal");
  const editProjectModal = document.getElementById("editProjectModal");
  const addEventModal = document.getElementById("addEventModal");
  const editProfileModal = document.getElementById("editProfileModal");
  const changePasswordModal = document.getElementById("changePasswordModal"); // New password modal

  let userProfile = {};
  // projectStatusChartInstance is removed as chart is no longer needed.

  // --- Utility Functions for Modals & Messages ---
  const showMessage = (elementId, message, isSuccess) => {
    const msgElement = document.getElementById(elementId);
    if (msgElement) {
      msgElement.textContent = message;
      msgElement.className = `message ${isSuccess ? 'success' : 'error'}`;
      msgElement.style.display = 'block';
    } else {
      console.warn(`Message element with ID '${elementId}' not found.`);
    }
  };

  const hideMessage = (elementId) => {
    const msgElement = document.getElementById(elementId);
    if (msgElement) {
      msgElement.textContent = '';
      msgElement.className = 'message';
      msgElement.style.display = 'none';
    }
  };

  const closeModal = (modal) => {
    if (modal) {
      modal.style.display = "none";
      const messageElement = modal.querySelector('.message');
      if (messageElement && messageElement.id) {
        hideMessage(messageElement.id); // Clear message on close
      }
      const form = modal.querySelector('form');
      if (form) {
        form.reset(); // Reset form fields
      }
    }
  };

  const openModal = (modal) => {
    if (modal) {
      modal.style.display = "flex";
      const closeBtn = modal.querySelector(".close-btn");
      if (closeBtn) {
        closeBtn.onclick = () => closeModal(modal);
      }
    } else {
      console.error("Attempted to open a null modal.");
    }
  };
  
  window.onclick = (event) => {
    document.querySelectorAll(".modal").forEach(modal => {
      if (event.target === modal) {
        closeModal(modal);
      }
    });
  };

  // --- Firebase Data Fetching ---
  const fetchData = async (user) => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        userProfile = userDoc.data();
        userProfile.email = user.email; // Ensure email is part of profile
      } else {
        userProfile = {
          name: user.displayName || user.email.split('@')[0], // Use displayName if available
          email: user.email,
          role: "user", // Default role
          phone: "",
          address: "",
        };
        await setDoc(userDocRef, userProfile);
      }
      return true;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return false;
    }
  };

  // --- Dashboard Panel Management ---
  const showPanel = (panelId, title) => {
    document.querySelectorAll(".dashboard-panel").forEach(panel => {
      panel.classList.remove("active");
    });
    const activePanel = document.getElementById(panelId);
    if (activePanel) {
      activePanel.classList.add("active");
      currentPanelTitle.textContent = title; // Update the header title
    } else {
      console.error(`Panel with ID '${panelId}' not found. Cannot show panel.`);
    }
    // Close sidebar on mobile after navigating
    if (window.innerWidth <= 768) {
      dashboardWrapper.classList.remove("sidebar-open");
    }
  };

  // Map nav item IDs to panel IDs and rendering functions
  const navTabs = {
    overviewTab: { panelId: "overview-panel", title: "Dashboard Overview", render: () => renderOverview() },
    scheduleTab: { panelId: "schedule-panel", title: "Upcoming Schedule", render: () => renderSchedule() },
    projectsTab: { panelId: "projects-panel", title: "Project Management", render: () => renderProjects() },
    profileTab: { panelId: "profile-panel", title: "My Profile", render: () => renderProfile() }
  };

  const setupNavListeners = () => {
    document.querySelectorAll(".nav-item").forEach(tab => {
      // Exclude logoutBtn from main navTabs handling, it has its own listener
      if (tab.id === 'logoutBtn') return; 

      if (navTabs[tab.id]) { // Ensure it's a recognized navigation tab
        tab.addEventListener("click", () => {
          document.querySelector(".nav-item.active")?.classList.remove("active");
          tab.classList.add("active");
          const { panelId, title, render } = navTabs[tab.id];
          showPanel(panelId, title);
          render();
        });
      } else {
          console.warn(`Nav item with ID '${tab.id}' found, but not configured in navTabs.`);
      }
    });
  };

  // --- Render Functions for Each Panel ---

  const renderOverview = () => {
    showPanel("overview-panel", "Dashboard Overview");

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

      // Removed updateProjectStatusChart call
    });
  };

  const renderSchedule = () => {
    showPanel("schedule-panel", "Upcoming Schedule");

    const eventsList = document.getElementById("eventsList"); // Target the container within the static panel
    if (!eventsList) {
        console.error("eventsList container not found in schedule panel. Cannot render schedule.");
        return;
    }

    const addEventBtn = document.getElementById("addEventBtn");
    if (addEventBtn) {
      // Only show add button if user is admin
      if (userProfile.role === 'admin') {
        addEventBtn.style.display = 'flex'; // Use flex for icon alignment
        addEventBtn.onclick = () => openModal(addEventModal);
      } else {
        addEventBtn.style.display = 'none';
      }
    }
    
    onSnapshot(collection(db, "events"), (snapshot) => {
      const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      eventsList.innerHTML = events.length > 0 ? events.map(e => `
        <div class="event-card">
          <h4>${e.eventTitle || e.title}</h4>
          <p><strong>Date:</strong> ${e.eventDate || e.date}</p>
          <p>${e.eventDescription || e.description}</p>
          ${userProfile.role === 'admin' ? `
            <button class="delete-btn" data-id="${e.id}"><i class="fas fa-trash"></i></button>
          ` : ''}
        </div>
      `).join('') : `<p class="no-results">No upcoming events.</p>`;
      
      // Attach listeners for delete buttons (if admin)
      if (userProfile.role === 'admin') {
        document.querySelectorAll("#schedule-panel .delete-btn").forEach(btn => {
          btn.addEventListener("click", (e) => deleteEvent(e.target.dataset.id || e.target.closest('button').dataset.id));
        });
      }
    });

    // Attach listener for add event form
    const addEventForm = document.getElementById("addEventForm");
    if (addEventForm) {
      addEventForm.onsubmit = addNewEvent;
    }
  };
  
  const addNewEvent = async (e) => {
    e.preventDefault();
    hideMessage("addEventMsg"); // Clear previous message

    const newEvent = {
      eventTitle: document.getElementById("eventTitle").value,
      eventDate: document.getElementById("eventDate").value,
      eventDescription: document.getElementById("eventDescription").value,
    };
    try {
      await addDoc(collection(db, "events"), newEvent);
      showMessage("addEventMsg", "Event added successfully!", true);
      setTimeout(() => closeModal(addEventModal), 1500);
      document.getElementById("addEventForm").reset(); // Clear form
    } catch (error) {
      showMessage("addEventMsg", "Error adding event: " + error.message, false);
      console.error("Error adding event:", error);
    }
  };

  const renderProjects = () => {
    showPanel("projects-panel", "Project Management");

    const projectsTableBody = document.getElementById("projectsTableBody"); // Target the tbody within the static panel
    if (!projectsTableBody) {
        console.error("projectsTableBody not found in projects panel. Cannot render projects.");
        return;
    }

    const addNewProjectBtn = document.getElementById("addNewProjectBtn");
    if (addNewProjectBtn) {
      // Only show add button if user is admin
      if (userProfile.role === 'admin') {
        addNewProjectBtn.style.display = 'flex'; // Use flex for icon alignment
        addNewProjectBtn.onclick = () => openModal(addProjectModal);
      } else {
        addNewProjectBtn.style.display = 'none';
      }
    }

    onSnapshot(collection(db, "projects"), (snapshot) => {
      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const projectLeads = [...new Set(projects.map(p => p.projectLead))];
      const leadFilterSelect = document.getElementById("leadFilter");
      if (leadFilterSelect) {
        leadFilterSelect.innerHTML = `<option value="all">All Leads</option>` + projectLeads.map(lead => `<option value="${lead}">${lead}</option>`).join('');
      }
      
      const applyFilters = () => {
        // Ensure elements exist before trying to read their values
        const searchTerm = document.getElementById("projectSearch")?.value.toLowerCase() || '';
        const statusTerm = document.getElementById("statusFilter")?.value || 'all';
        const leadTerm = document.getElementById("leadFilter")?.value || 'all';

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
            <td class="action-buttons">
              ${userProfile.role === 'admin' ? `
                <button class="edit-btn" data-id="${p.id}"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" data-id="${p.id}"><i class="fas fa-trash"></i></button>
              ` : ''}
            </td>
          </tr>
        `).join('') : `<tr><td colspan="6" class="no-results">No projects found.</td></tr>`;
        addEventListenersForProjectActions(); // Re-attach listeners after content update
      };

      // Attach filter/search listeners (ensure elements exist)
      document.getElementById("projectSearch")?.addEventListener("input", applyFilters);
      document.getElementById("statusFilter")?.addEventListener("change", applyFilters);
      document.getElementById("leadFilter")?.addEventListener("change", applyFilters);
      applyFilters(); // Initial render with filters
    });

    // Attach listener for add project form
    const addProjectForm = document.getElementById("addProjectForm");
    if (addProjectForm) {
      addProjectForm.onsubmit = addNewProject;
    }
  };
  
  const addEventListenersForProjectActions = () => {
    // Only attach if user is admin
    if (userProfile.role === 'admin') {
      document.querySelectorAll("#projects-panel .delete-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          // Get ID from button or its closest parent if an icon inside was clicked
          const projectId = e.target.dataset.id || e.target.closest('button').dataset.id; 
          if (confirm("Are you sure you want to delete this project?")) {
            try {
              await deleteDoc(doc(db, "projects", projectId));
              alert("Project deleted successfully!"); // onSnapshot will re-render
            } catch (err) {
              alert("Error deleting project: " + err.message);
              console.error("Error deleting project:", err);
            }
          }
        });
      });

      document.querySelectorAll("#projects-panel .edit-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          // Get ID from button or its closest parent if an icon inside was clicked
          const projectId = e.target.dataset.id || e.target.closest('button').dataset.id;
          try {
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
            } else {
              alert("Project not found!");
            }
          } catch (error) {
            alert("Error fetching project data: " + error.message);
            console.error("Error fetching project for edit:", error);
          }
        });
      });
    }

    // Edit Project form submission
    const editProjectForm = document.getElementById("editProjectForm");
    if (editProjectForm) {
      editProjectForm.onsubmit = async (e) => {
        e.preventDefault();
        hideMessage("editProjectMsg"); // Clear previous message

        const projectId = document.getElementById("editProjectId").value;
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
          showMessage("editProjectMsg", "Project updated successfully!", true);
          setTimeout(() => closeModal(editProjectModal), 1500);
        } catch (err) {
          showMessage("editProjectMsg", "Error updating project: " + err.message, false);
          console.error("Error updating project:", err);
        }
      };
    }
  };

  const addNewProject = async (e) => {
    e.preventDefault();
    hideMessage("addProjectMsg"); // Clear previous message

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
      showMessage("addProjectMsg", "Project added successfully!", true);
      setTimeout(() => closeModal(addProjectModal), 1500);
      document.getElementById("addProjectForm").reset(); // Clear form
    } catch (error) {
      showMessage("addProjectMsg", "Error adding project: " + error.message, false);
      console.error("Error adding project:", error);
    }
  };

  const renderProfile = () => {
    showPanel("profile-panel", "My Profile");

    // Populate profile details from userProfile object
    document.getElementById("profileName").textContent = userProfile.name || "N/A";
    document.getElementById("profileEmail").textContent = userProfile.email || "N/A";
    document.getElementById("profileRole").textContent = userProfile.role || "N/A";
    document.getElementById("profilePhone").textContent = userProfile.phone || "N/A";
    document.getElementById("profileAddress").textContent = userProfile.address || "N/A";

    const editProfileBtn = document.getElementById("editProfileBtn");
    const changePasswordBtn = document.getElementById("changePasswordBtn"); // Get the new password button

    if (editProfileBtn) {
      editProfileBtn.addEventListener("click", () => {
        openModal(editProfileModal);
        document.getElementById("modalName").value = userProfile.name || "";
        document.getElementById("modalEmail").value = userProfile.email || ""; // Email is disabled
        document.getElementById("modalPhone").value = userProfile.phone || "";
        document.getElementById("modalAddress").value = userProfile.address || "";
        hideMessage("profileUpdateMessage"); // Hide message when opening modal
      });
    }
    
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener("click", () => {
        openModal(changePasswordModal); // Open specific modal for password
        document.getElementById("newPassword").value = ''; // Clear password field
        hideMessage("passwordMsg"); // Hide any previous message
      });
    }
  };

  // --- Delete Functions ---
  const deleteProject = async (id) => {
    if (confirm("Are you sure you want to delete this project?")) {
      try {
        await deleteDoc(doc(db, "projects", id));
        alert("Project deleted successfully!"); // onSnapshot will re-render
      } catch (error) {
        alert("Error deleting project: " + error.message);
        console.error("Error deleting project:", error);
      }
    }
  };

  const deleteEvent = async (id) => {
    if (confirm("Are you sure you want to delete this event?")) {
      try {
        await deleteDoc(doc(db, "events", id));
        alert("Event deleted successfully!"); // onSnapshot will re-render
      } catch (error) {
        alert("Error deleting event: " + error.message);
        console.error("Error deleting event:", error);
      }
    }
  };

  // --- Form Submission Handlers ---
  const profileEditForm = document.getElementById("profileEditForm");
  if (profileEditForm) {
    profileEditForm.onsubmit = async (e) => {
      e.preventDefault();
      hideMessage("profileUpdateMessage"); // Clear previous message

      const updatedProfile = {
        name: document.getElementById("modalName").value,
        phone: document.getElementById("modalPhone").value,
        address: document.getElementById("modalAddress").value,
      };
      try {
        await updateDoc(doc(db, "users", auth.currentUser.uid), updatedProfile);
        userProfile = { ...userProfile, ...updatedProfile };
        showMessage("profileUpdateMessage", "Profile updated successfully!", true);
        renderProfile(); // Re-render profile with updated data
        setTimeout(() => closeModal(editProfileModal), 1500); // Close after message
      } catch (error) {
        showMessage("profileUpdateMessage", "Error updating profile: " + error.message, false);
        console.error("Error updating profile:", error);
      }
    };
  }

  const passwordUpdateForm = document.getElementById("passwordUpdateForm");
  if (passwordUpdateForm) {
    passwordUpdateForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideMessage("passwordMsg"); // Clear previous message

      const newPassword = document.getElementById("newPassword").value;
      if (newPassword.length < 6) {
        showMessage("passwordMsg", "Password must be at least 6 characters.", false);
        return;
      }
      try {
        await updatePassword(auth.currentUser, newPassword);
        showMessage("passwordMsg", "Password updated successfully.", true);
        setTimeout(() => closeModal(changePasswordModal), 1500); // Close after message
      } catch (err) {
        showMessage("passwordMsg", "Error: " + err.message, false);
        console.error("Error updating password:", err);
      }
    });
  }

  // --- Initial Dashboard Setup ---
  const initDashboard = async (user) => {
    userNameSpan.textContent = `Hello, ${user.displayName || user.email.split('@')[0]}`;
    const dataFetched = await fetchData(user); 
    if (dataFetched) {
      userNameSpan.textContent = `Hello, ${userProfile.name || 'User'}`;
      setupNavListeners();
      // Initially render the overview panel
      showPanel("overview-panel", "Dashboard Overview");
      renderOverview(); 
    } else {
      alert("Failed to load user data. Please try again.");
      signOut(auth);
    }
  };

  // --- Authentication State Observer ---
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      initDashboard(user);
    } else {
      window.location.href = "login.html";
    }
  });

  // --- Event Listeners for Sidebar & Theme ---
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      dashboardWrapper.classList.toggle("collapsed"); // Toggle wrapper for grid change
      // For mobile: toggle sidebar-open class
      if (window.innerWidth <= 768) {
        dashboardWrapper.classList.toggle("sidebar-open");
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      signOut(auth)
        .then(() => {
          alert("Logged out successfully!");
          window.location.href = "login.html";
        })
        .catch((error) => {
          alert("Logout failed: " + error.message);
          console.error("Logout failed:", error);
        });
    });
  }

  if (themeToggleBtn) {
    // Determine initial theme based on localStorage, default to dark if not set
    const savedTheme = localStorage.getItem("theme");
    const isDarkModeInitial = savedTheme === "dark" || savedTheme === null; // Default to dark

    const applyTheme = (isDarkMode) => {
      document.body.classList.toggle("dark-mode", isDarkMode);
      themeToggleBtn.textContent = isDarkMode ? "☀️" : "🌙";
      localStorage.setItem("theme", isDarkMode ? "dark" : "light");
      // Chart related theme update logic removed.
    };

    applyTheme(isDarkModeInitial); // Apply initial theme

    themeToggleBtn.addEventListener("click", () => {
      const isDarkMode = document.body.classList.contains("dark-mode");
      applyTheme(!isDarkMode); // Toggle theme
    });
  }
});
