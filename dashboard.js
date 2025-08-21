import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  updateProfile, updatePassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, updateDoc, collection, getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

document.addEventListener("DOMContentLoaded", () => {
  const firebaseConfig = {
    apiKey: "AIzaSyC2jY47xWVne8Dy4X83Z6szWY3_t6fZfRM",
    authDomain: "kr-infra-auth.firebaseapp.com",
    projectId: "kr-infra-auth",
    storageBucket: "kr-infra-auth.appspot.com",
    messagingSenderId: "263430872882",
    appId: "1:263430872882:web:8b49bec1caaf854474412b",
    measurementId: "G-3VVNLN7QJL"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    // Populate header greeting/avatar
    const userHeaderName = document.getElementById("userName");
    const headerAvatar = document.getElementById("headerAvatar");
    if (userHeaderName) userHeaderName.textContent = user.displayName ? `Hi, ${user.displayName}` : "Hello";
    if (headerAvatar) headerAvatar.src = user.photoURL || "default.jpg";

    // Example: preload notification count (placeholder value)
    const notifCountEl = document.getElementById("notifCount");
    if (notifCountEl) notifCountEl.textContent = "0"; // TODO: wire to real data

    const tabs = {
      overviewTab: `
        <section class="dashboard-grid">
          <div class="dashboard-card">
            <h3>Total Projects</h3>
            <p id="totalProjects">Loading...</p>
          </div>
          <div class="dashboard-card">
            <h3>Ongoing</h3>
            <p id="ongoingCount">Loading...</p>
          </div>
          <div class="dashboard-card">
            <h3>Completed</h3>
            <p id="completedCount">Loading...</p>
          </div>
        </section>
      `,
      scheduleTab: `
        <div class="dashboard-panel">
          <h2>Schedule</h2>
          <p>Upcoming events, tasks, and deadlines will appear here.</p>
        </div>
      `,
      projectsTab: `
        <div class="dashboard-panel">
          <h2>Projects</h2>
          <p>Track ongoing and completed projects.</p>
        </div>
      `,
      profileTab: `
        <h2>Profile</h2>
        <div class="profile-card">
          <img id="profileImage" src="default.jpg" alt="Profile Image" class="profile-pic" />
          <input type="file" id="imageUpload" />
          <button id="uploadImageBtn">Upload Image</button>

          <p><strong>Email:</strong> <span id="userEmail">Loading...</span></p>

          <label for="displayName">Display Name</label>
          <input type="text" id="displayName" placeholder="Enter your name" />

          <label for="userRole">Role</label>
          <input type="text" id="userRole" placeholder="Enter your role" />

          <label for="userPhone">Phone</label>
          <input type="text" id="userPhone" placeholder="Enter your phone number" />

          <label for="userAddress">Address</label>
          <input type="text" id="userAddress" placeholder="Enter your address" />

          <button id="updateProfileBtn">Update Profile</button>
          <div id="profileMsg" class="message"></div>

          <hr />

          <label for="newPassword">New Password</label>
          <input type="password" id="newPassword" placeholder="Enter new password" />
          <button id="updatePasswordBtn">Update Password</button>
          <div id="passwordMsg" class="message"></div>

          <hr />
          <h3>Live Profile Preview</h3>
          <div class="preview-card">
            <img id="previewImage" src="default.jpg" class="preview-pic" />
            <p><strong>Name:</strong> <span id="previewName">—</span></p>
            <p><strong>Role:</strong> <span id="previewRole">—</span></p>
            <p><strong>Phone:</strong> <span id="previewPhone">—</span></p>
            <p><strong>Address:</strong> <span id="previewAddress">—</span></p>
          </div>
        </div>
      `
    };

    // Tab click handling
    ["overviewTab", "scheduleTab", "projectsTab", "profileTab"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("click", () => {
          document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
          el.classList.add("active");
          document.getElementById("dashboardContent").innerHTML = tabs[id] || "";
          if (id === "profileTab") {
            renderProfileTab(user);
          }
          if (id === "overviewTab") {
            loadOverviewMetrics();
          }
        });
      }
    });

    // Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        signOut(auth).then(() => window.location.href = "login.html");
      });
    }
  });

  // Profile tab logic
  async function renderProfileTab(user) {
    const uid = user.uid;
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    const emailSpan = document.getElementById("userEmail");
    const nameInput = document.getElementById("displayName");
    const roleInput = document.getElementById("userRole");
    const profileImg = document.getElementById("profileImage");
    const phoneInput = document.getElementById("userPhone");
    const addressInput = document.getElementById("userAddress");

    const previewName = document.getElementById("previewName");
    const previewRole = document.getElementById("previewRole");
    const previewPhone = document.getElementById("previewPhone");
    const previewAddress = document.getElementById("previewAddress");
    const previewImage = document.getElementById("previewImage");

    if (userSnap.exists()) {
      const data = userSnap.data();
      emailSpan.textContent = data.email || user.email;
      nameInput.value = data.name || "";
      roleInput.value = data.role || "";
      phoneInput.value = data.phone || "";
      addressInput.value = data.address || "";
      profileImg.src = data.profileImage || "default.jpg";

      previewName.textContent = data.name || "—";
      previewRole.textContent = data.role || "—";
      previewPhone.textContent = data.phone || "—";
      previewAddress.textContent = data.address || "—";
      previewImage.src = data.profileImage || "default.jpg";
    }

        // Live preview
    nameInput.addEventListener("input", () => previewName.textContent = nameInput.value);
    roleInput.addEventListener("input", () => previewRole.textContent = roleInput.value);
    phoneInput.addEventListener("input", () => previewPhone.textContent = phoneInput.value);
    addressInput.addEventListener("input", () => previewAddress.textContent = addressInput.value);

    // Update profile
    const updateBtn = document.getElementById("updateProfileBtn");
    const profileMsg = document.getElementById("profileMsg");

    updateBtn.addEventListener("click", async () => {
      const name = nameInput.value.trim();
      const role = roleInput.value.trim();
      const phone = phoneInput.value.trim();
      const address = addressInput.value.trim();

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

      try {
        await updateProfile(user, { displayName: name });
        await updateDoc(userRef, { name, role, phone, address });
        profileMsg.textContent = "Profile updated successfully.";
        profileMsg.className = "message success";
      } catch (err) {
        profileMsg.textContent = "Error: " + err.message;
        profileMsg.className = "message error";
      } finally {
        updateBtn.disabled = false;
        updateBtn.textContent = "Update Profile";
      }
    });

    // Update password
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

    // Image upload
    const uploadBtn = document.getElementById("uploadImageBtn");
    const imageInput = document.getElementById("imageUpload");

    uploadBtn.addEventListener("click", async () => {
      const file = imageInput.files[0];
      if (!file) return;

      uploadBtn.disabled = true;
      uploadBtn.textContent = "Uploading...";

      try {
        const storageRef = ref(storage, `profileImages/${uid}`);
        await uploadBytes(storageRef, file);
        const imageUrl = await getDownloadURL(storageRef);
        await updateDoc(userRef, { profileImage: imageUrl });
        profileImg.src = imageUrl;
        previewImage.src = imageUrl;
        alert("Profile image updated!");
      } catch (err) {
        alert("Error uploading image: " + err.message);
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload Image";
      }
    });
  } // end of renderProfileTab
}); // end of DOMContentLoaded