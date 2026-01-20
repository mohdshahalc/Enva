async function apiFetch(url, options = {}) {
  const isAdminPage = window.location.pathname.includes("/Admin/");

  const token = isAdminPage
    ? localStorage.getItem("adminToken")
    : localStorage.getItem("userToken");

  let res = await fetch(url, {
    ...options,
    credentials: "include", // refresh token cookie if you use it
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  // 🔁 BACKEND MAY SEND NEW ACCESS TOKEN
  const newToken = res.headers.get("x-access-token");

  if (newToken) {
    if (isAdminPage) {
      localStorage.setItem("adminToken", newToken);
    } else {
      localStorage.setItem("userToken", newToken);
    }
  }

  // ❌ SESSION DEAD
  if (res.status === 401) {
    if (isAdminPage) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminRole");
      window.location.href = "/Admin/login.html";
    } else {
      localStorage.removeItem("userToken");
      localStorage.removeItem("userRole");
      window.location.href = "/login.html";
    }
    return;
  }

  return res;
}
