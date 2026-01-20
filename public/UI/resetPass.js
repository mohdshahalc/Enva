document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgotPasswordForm");
  const emailInput = document.getElementById("emailInput");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
     
    const message = document.getElementById("resetMessage");

const showError = (msg) => {
  message.className = "signup-message error small mt-3";
  message.innerText = msg;
};

const showSuccess = (msg) => {
  message.className = "signup-message success small mt-3";
  message.innerText = msg;
};



    const email = emailInput.value.trim();
    if (!email) {
  showError("Email is required");
  return;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailRegex.test(email)) {
  showError("Please enter a valid email address");
  return;
}
    try {
      const res = await fetch(
        "http://localhost:5000/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email })
        }
      );

      const data = await res.json();

      if (!res.ok) {
 showError(data.message || "Failed to send OTP");
  return;
}

showSuccess("OTP sent to your email");

// ⏳ WAIT BEFORE REDIRECT (1.5 seconds)
setTimeout(() => {
  window.location.href = "./newPass.html";
}, 2000);

} catch (err) {
  showError("Server error. Try again.");
}
     
  });
});




