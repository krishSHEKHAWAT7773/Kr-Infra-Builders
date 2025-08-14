firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "login.html";
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  firebase.auth().signOut().then(() => {
    window.location.href = "login.html";
  });
});

document.getElementById("homeTab").addEventListener("click", () => {
  document.getElementById("dashboardContent").innerHTML = `
    <h2>Home</h2><p>Welcome to KR Infra Builders’ dashboard.</p>`;
});

document.getElementById("projectsTab").addEventListener("click", () => {
  document.getElementById("dashboardContent").innerHTML = `
    <h2>Projects</h2><p>Track ongoing and completed projects here.</p>`;
});

document.getElementById("profileTab").addEventListener("click", () => {
  document.getElementById("dashboardContent").innerHTML = `
    <h2>Profile</h2><p>Manage your account details.</p>`;
});