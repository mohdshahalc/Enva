async function apiFetch(url, options = {}, retry = true) {
  const isAdminPage = window.location.pathname.includes("/Admin/");
  const tokenKey = isAdminPage ? "adminToken" : "userToken";
  const token = localStorage.getItem(tokenKey);

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  // 🔁 CHECK FOR NEW ACCESS TOKEN FIRST
  const newToken = res.headers.get("x-access-token");

  if (newToken) {
    localStorage.setItem(tokenKey, newToken);

    // 🔄 retry original request ONCE with fresh token
    if (retry) {
      return apiFetch(url, options, false);
    }
  }

  // ❌ REAL SESSION DEAD
  if (res.status === 401) {
    localStorage.removeItem(tokenKey);

    if (isAdminPage) {
      localStorage.removeItem("adminRole");
      window.location.replace("/UI/login.html");
    } else {
      localStorage.removeItem("userRole");
      window.location.replace("/UI/login.html");
    }

    return Promise.reject("Session expired");
  }

  return res;
}
