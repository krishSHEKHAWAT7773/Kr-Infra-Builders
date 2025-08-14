import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { updateProfile, updatePassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

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

  // Show user email in profile tab
  const emailSpan = document.getElementById("userEmail");
  if (emailSpan) emailSpan.textContent = user.email;

  // Handle profile update
  const updateBtn = document.getElementById("updateProfileBtn");
  const nameInput = document.getElementById("displayName");
  if (updateBtn && nameInput) {
    updateBtn.addEventListener("click", () => {
      updateProfile(user, { displayName: nameInput.value.trim() })
        .then(() => alert("Profile updated!"))
        .catch(err => alert("Error: " + err.message));
    });
  }

  // Handle password update
  const passBtn = document.getElementById("updatePasswordBtn");
  const passInput = document.getElementById("newPassword");
  if (passBtn && passInput) {
    passBtn.addEventListener("click", () => {
      updatePassword(user, passInput.value.trim())
        .then(() => alert("Password updated!"))
        .catch(err => alert("Error: " + err.message));
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

Object.keys(tabs).forEach(id => {
  const tab = document.getElementById(id);
  if (tab) {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("dashboardContent").innerHTML = tabs[id];
    });
  }
});



document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
    item.classList.add("active");
  });
});