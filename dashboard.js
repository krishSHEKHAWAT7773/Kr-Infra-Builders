import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

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
    if (!user) window.location.href = "login.html";
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
    profileTab: `<h2>Profile</h2><p>Manage your account details.</p>`
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