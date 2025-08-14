import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile, updatePassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
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

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

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
          <div id="profileMsg" class="message"></div>

          <hr />

          <label for="newPassword">New Password</label>
          <input type="password" id="newPassword" placeholder="Enter new password" />
          <button id="updatePasswordBtn">Update Password</button>
          <div id="passwordMsg" class="message"></div>
        </div>
      `
    };

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

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        signOut(auth).then(() => {
          window.location.href = "login.html";
        });
      });
    }
  });

  function renderProfileTab(user) {
    document.getElementById("userEmail").textContent = user.email;

    const updateBtn = document.getElementById("updateProfileBtn");
    const nameInput = document.getElementById("displayName");
    const profileMsg = document.getElementById("profileMsg");

    updateBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      profileMsg.textContent = "";
      updateBtn.disabled = true;
      updateBtn.textContent = "Updating...";

      if (!name) {
        profileMsg.textContent = "Display name cannot be empty.";
        profileMsg.className = "message error";
        updateBtn.disabled = false;
        updateBtn.textContent = "Update Profile";
        return;
      }

      updateProfile(user, { displayName: name })
        .then(() => {
          profileMsg.textContent = "Profile updated successfully.";
          profileMsg.className = "message success";
        })
        .catch(err => {
          profileMsg.textContent = "Error: " + err.message;
          profileMsg.className = "message error";
        })
        .finally(() => {
          updateBtn.disabled = false;
          updateBtn.textContent = "Update Profile";
        });
    });

    const passBtn = document.getElementById("updatePasswordBtn");
    const passInput = document.getElementById("newPassword");
    const passwordMsg = document.getElementById("passwordMsg");

    passBtn.addEventListener("click", () => {
      const newPass = passInput.value.trim();
      passwordMsg.textContent = "";
      passBtn.disabled = true;
      passBtn.textContent = "Updating...";

      if (newPass.length < 6) {
        passwordMsg.textContent = "Password must be at least 6 characters.";
        passwordMsg.className = "message error";
        passBtn.disabled = false;
        passBtn.textContent = "Update Password";
        return;
      }

      updatePassword(user, newPass)
        .then(() => {
          passwordMsg.textContent = "Password updated successfully.";
          passwordMsg.className = "message success";
        })
        .catch(err => {
          passwordMsg.textContent = "Error: " + err.message;
          passwordMsg.className = "message error";
        })
        .finally(() => {
          passBtn.disabled = false;
          passBtn.textContent = "Update Password";
        });
    });
  }
});