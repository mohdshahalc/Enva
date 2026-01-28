
(function authGuard() {
  const token = localStorage.getItem("adminToken");

  if (!token) {
    // No token → redirect to login
     window.location.replace("../UI/login.html");
  }
})();


document.addEventListener("DOMContentLoaded", () => {

  const logoutBtn = document.getElementById("logoutBtn");
  const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");

  // Open logout confirmation modal
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      const modal = new bootstrap.Modal(
        document.getElementById("logoutModal")
      );
      modal.show();
    });
  }

  // Confirm logout
  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener("click", () => {
      // 🔥 CLEAR AUTH DATA
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("admin");

      // Optional: clear everything
      // localStorage.clear();

      // Disable back navigation
      history.pushState(null, null, location.href);
      window.onpopstate = () => history.go(1);

      // Redirect to login page
      window.location.replace("../UI/login.html");
    });
  }

});

document.addEventListener("DOMContentLoaded", loadAdminProfile);

async function loadAdminProfile() {
  try {
    const res = await apiFetch("/api/admin/profile", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || "Failed to load profile", "error");
      return;
    }

    document.getElementById("adminName").value = data.name || "";
    document.getElementById("adminEmail").value = data.email || "";
    document.getElementById("adminPhone").value = data.phone || "";
    document.getElementById("adminRole").value = data.role || "Admin";

  } catch (err) {
    showToast("Server error", "error");
  }
}

document
  .getElementById("updatePasswordBtn")
  .addEventListener("click", async () => {

    const currentPassword =
      document.getElementById("currentPassword").value.trim();
    const newPassword =
      document.getElementById("newPassword").value.trim();
    const confirmPassword =
      document.getElementById("confirmPassword").value.trim();

    // 🔹 Basic required check
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("All fields are required", "error");
      return;
    }

    // 🔹 Password strength check
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

    if (!passwordRegex.test(newPassword)) {
      showToast(
        "Password must be at least 6 characters and include a letter and a number",
        "error"
      );
      return;
    }

    // 🔹 Match check
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    // 🔹 Prevent reuse
    if (newPassword === currentPassword) {
      showToast(
        "New password must be different from current password",
        "error"
      );
      return;
    }

    try {
      const res = await apiFetch("/api/admin/profile/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Failed to update password", "error");
        return;
      }

      showToast("Password updated successfully", "success");

      // Clear inputs
      document.getElementById("currentPassword").value = "";
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmPassword").value = "";

    } catch (err) {
      showToast("Server error", "error");
    }
  });

  

function showToast(message, type = "success") {
  const toastBox = document.getElementById("toastBox");

  const toast = document.createElement("div");
  toast.className = `custom-toast ${type}`;

  let icon = "fa-circle-check";
  if (type === "error") icon = "fa-circle-xmark";
  if (type === "warning") icon = "fa-triangle-exclamation";

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  toastBox.appendChild(toast);

  setTimeout(() => toast.remove(), 3200);
}