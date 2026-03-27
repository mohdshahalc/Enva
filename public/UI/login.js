document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const message = document.getElementById("loginMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("emailInput").value.trim();
    const password = document.getElementById("passwordInput").value;

    try {
      const res = await fetch(
        "https://envastore.online/api/auth/user/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // ✅ sets refresh token cookie
          body: JSON.stringify({ email, password })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        message.className = "signup-message error small mt-3";
        message.innerText = "Email or password is incorrect";
        return;
      }

      const { accessToken, user } = data;

      if (!accessToken || !user?.role) {
        throw new Error("Invalid login response");
      }

      // ✅ ROLE-BASED STORAGE
      if (user.role === "admin") {
        localStorage.setItem("adminToken", accessToken);
        localStorage.setItem("adminRole", "admin");
        window.location.href = "../Admin/dashbord.html";
      } else {
        localStorage.setItem("userToken", accessToken);
        localStorage.setItem("userRole", "user");
        window.location.href = "home.html";
      }

    } catch (err) {
      console.error(err);
      message.className = "signup-message error small mt-3";
      message.innerText = "Server error";
    }
  });
});
