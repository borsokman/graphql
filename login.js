// login.js

const form = document.getElementById("login-form");
const errMsg = document.getElementById("error-message");
const loginSec = document.getElementById("login-section");
const profSec = document.getElementById("profile-section");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value;
  const creds = btoa(`${user}:${pass}`);

  try {
    const res = await fetch("https://01.gritlab.ax/api/auth/signin", {
      method: "POST",
      headers: { Authorization: `Basic ${creds}` },
    });

    if (!res.ok) throw new Error("Invalid credentials");

    const { token } = await res.json();
    localStorage.setItem("jwt", token);

    // **Instead of redirect**, show the profile section:
    loginSec.style.display = "none";
    profSec.style.display = "block";

    // Call your function that fetches & renders profile data:
    showProfile(token);
  } catch (err) {
    errMsg.textContent = err.message;
  }
});
