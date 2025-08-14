import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile, updatePassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  // 🔧 Firebase Config
  const firebaseConfig = {
    apiKey: "AIzaSyC2jY47xWVne8Dy4X83Z6szWY3_t6fZfRM",
    authDomain: "kr-infra-auth.firebaseapp.com",
    projectId: "kr-infra-auth",
    storageBucket: "kr-infra-auth.firebasestorage.app",
    messagingSenderId: "263430872882",
    appId: "1:263430872882:web:8b49bec1caaf854474412b",
    measurementId: "G-3VVNLN7QJL"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  // 🔐 Auth Check
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    // 🧭 Tab Content Definitions
    const tabs = {
      homeTab: `<h2>Home</h2><p>Welcome to KR Infra Builders’ dashboard.</p>`,
      projectsTab: `<h2>Projects</h2><p>Track ongoing and completed projects here.</p>`,
      profileTab: `
        <h2>Profile</h2>
        <div class="profile-card">
          <p><strong>Email:</strong> <span id="userEmail">Loading...</span></p>
          <label for="displayName">Display Name</label>
          <input type="text" id="displayName" placeholder="Enter your name" />
          <button id="updateProfileBtn">Update Profile</button>

          <hr />

          <label for="newPassword">New Password</label>
          <input type="password" id="newPassword" placeholder="Enter new password" />
          <button id="updatePasswordBtn">Update Password</button>
        </div>
      `
    };

    // 🧩 Tab Switching Logic
    Object.keys(tabs).forEach(id => {
      const tab = document.getElementById(id);
      if (tab) {
        tab.addEventListener("click", () => {
          document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
          tab.classList.add("active");

          const content = document.getElementById("dashboardContent");
          content.innerHTML = tabs[id];

          if (id === "profileTab") {
            renderProfileTab(user);
          }
        });
      }
    });

    // 🚪 Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        signOut(auth).then(() => {
          window.location.href = "login.html";
        });
      });
    }
  });

  // 🛠 Profile Tab Logic
  function renderProfileTab(user) {
    document.getElementById("userEmail").textContent = user.email;

    const updateBtn = document.getElementById("updateProfileBtn");
    const nameInput = document.getElementById("displayName");
    if (updateBtn && nameInput) {
      updateBtn.addEventListener("click", () => {
        const name = nameInput.value.trim();
        if (name) {
          updateProfile(user, { displayName: name })
            .then(() => alert("Profile updated!"))
            .catch(err => alert("Error: " + err.message));
        }
      });
    }

    const passBtn = document.getElementById("updatePasswordBtn");
    const passInput = document.getElementById("newPassword");
    if (passBtn && passInput) {
      passBtn.addEventListener("click", () => {
        const newPass = passInput.value.trim();
        if (newPass.length >= 6) {
          updatePassword(user, newPass)
            .then(() => alert("Password updated!"))
            .catch(err => alert("Error: " + err.message));
        } else {
          alert("Password must be at least 6 characters.");
        }
      });
    }
  }
});