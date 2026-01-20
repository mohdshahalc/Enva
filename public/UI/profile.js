document.addEventListener("DOMContentLoaded", loadProfile);

async function loadProfile() {
  const token = localStorage.getItem("userToken")

  // 🔐 Not logged in
  if (!token) {
    document.body.innerHTML = `
      <div class="text-center mt-5">
        <h4>Please login to view your profile</h4>
        <a href="login.html" class="btn btn-dark mt-3">Go to Login</a>
      </div>
    `;
    return;
  }

  const res = await apiFetch("http://localhost:5000/api/user/profile", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const user = await res.json();
 
  if (res.status === 403) {
      const data = await res.json();
      alert(data.message || "Your account has been blocked");

      // clear ONLY user token
      localStorage.removeItem("userToken");
      window.location.href = "login.html";
      return;
    }

  // ✅ Split name into first & last
  const nameParts = user.name?.split(" ") || [];
  document.getElementById("firstName").value = nameParts[0] || "";
  document.getElementById("lastName").value = nameParts.slice(1).join(" ") || "";

  document.getElementById("email").value = user.email || "";
  document.getElementById("address").value = user.address || "";
  document.getElementById("fullName").textContent = user.name
  
}


document.addEventListener("DOMContentLoaded", () => {

  const profileForm = document.getElementById("profileForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");

  // ---------- PROFILE SAVE ----------
  if (profileForm) {
  profileForm.addEventListener("submit", async e => {
    e.preventDefault();

    const data = {
      firstName: document.getElementById("firstName")?.value.trim() || "",
      lastName: document.getElementById("lastName")?.value.trim() || "",
      address: document.getElementById("address")?.value.trim() || "",
      currentPassword: document.getElementById("currentPassword")?.value || "",
      newPassword: document.getElementById("newPassword")?.value || "",
      confirmPassword: document.getElementById("confirmPassword")?.value || ""
    };

    /* =========================
       PASSWORD VALIDATION
    ========================= */
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;

    // If user is trying to change password
    if (data.newPassword || data.confirmPassword) {

      if (!data.currentPassword) {
        showToast("Enter your current password", "warning");
        return;
      }

      if (!passwordRegex.test(data.newPassword)) {
        showToast(
          "Password must be at least 6 characters and contain letters & numbers",
          "warning"
        );
        return;
      }

      if (data.newPassword !== data.confirmPassword) {
        showToast("Passwords do not match", "warning");
        return;
      }
    }

    /* =========================
       API CALL
    ========================= */
    try {
      const res = await apiFetch("http://localhost:5000/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("userToken")}`
        },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      showToast(result.message || "Profile updated", res.ok ? "success" : "error");

      if (res.ok) {
        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";
      }

    } catch {
      showToast("Server error", "error");
    }
  });
}

  // ---------- LOGOUT BUTTON (OPEN MODAL) ----------
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      const modal = new bootstrap.Modal(
        document.getElementById("logoutModal")
      );
      modal.show();
    });
  }

  // ---------- CONFIRM LOGOUT ----------
  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      showToast("Logged out successfully", "success");

      setTimeout(() => {
        window.location.href = "login.html";
      }, 800);
    });
  }

});


function showToast(message, type = "success") {
  const toastBox = document.getElementById("toastBox");

  const toast = document.createElement("div");
  toast.className = `custom-toast ${type}`;

  let icon = "fa-circle-check";
  if (type === "error") icon = "fa-circle-xmark";
  if (type === "warning") icon = "fa-triangle-exclamation";
  if (type === "info") icon = "fa-circle-info";

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  toastBox.appendChild(toast);

  setTimeout(() => toast.remove(), 3200);
}
