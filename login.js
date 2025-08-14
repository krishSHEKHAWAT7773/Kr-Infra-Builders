// login.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2jY47xWVne8Dy4X83Z6szWY3_t6fZfRM",
  authDomain: "kr-infra-auth.firebaseapp.com",
  projectId: "kr-infra-auth",
  storageBucket: "kr-infra-auth.firebasestorage.app",
  messagingSenderId: "263430872882",
  appId: "1:263430872882:web:8b49bec1caaf854474412b",
  measurementId: "G-3VVNLN7QJL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    // Basic validation
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    // Sign in with Firebase
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        alert("Login successful!");
        window.location.href = "dashboard.html";
      })
      .catch((error) => {
        alert("Login failed: " + error.message);
      });
  });
});


import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// Forgot Password handler
document.addEventListener("DOMContentLoaded", () => {
  const forgotPasswordLink = document.getElementById("forgot-password");

  forgotPasswordLink.addEventListener("click", (e) => {
    e.preventDefault();

    const email = prompt("Enter your email to reset password:");
    if (!email) {
      alert("Email is required to reset password.");
      return;
    }

    sendPasswordResetEmail(auth, email.trim())
      .then(() => {
        alert("Password reset email sent! Please check your inbox.");
      })
      .catch((error) => {
        alert("Error: " + error.message);
      });
  });
});