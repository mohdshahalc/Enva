document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetPasswordForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // 🔥 STOP PAGE REFRESH

    const otp = document.getElementById("otpInput").value.trim();
    const password = document.getElementById("newPassword").value;
    const confirmPassword =
      document.getElementById("confirmPassword").value;

   const message = document.getElementById("resetMessage"); // ✅ error box

const showError = (msg) => {
  message.className = "signup-message error small mt-3";
  message.innerText = msg;
};

const showSuccess = (msg) => {
  message.className = "signup-message success small mt-3";
  message.innerText = msg;
};

// 🔐 OTP VALIDATION (4 DIGITS ONLY)
if (!otp || !/^\d{4}$/.test(otp)) {
  showError("Invalid OTP. Please enter the 4-digit code sent to your email.");
  return;
}

// 🔒 PASSWORD RULE (MIN 6, LETTER + NUMBER)
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

if (!passwordRegex.test(password)) {
  showError(
    "Password must be at least 6 characters and include both letters and numbers."
  );
  return;
}

// 🔁 CONFIRM PASSWORD
if (password !== confirmPassword) {
  showError("Passwords do not match.");
  return;
}


    try {
      const res = await fetch(
        "https://envastore.online/api/auth/user/reset-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            otp,
            newPassword: password
          })
        }
      );

      const data = await res.json();

if (!res.ok) {
  showError(data.message || "Invalid OTP");
  return;
}

showSuccess("Password reset successful. Redirecting to login...");

setTimeout(() => {
  window.location.href = "./login.html";
}, 1500);


    } catch (err) {
  showError("Server error. Please try again later.");
}

  });
});


