document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");
  const message = document.getElementById("signupMessage");

  if (!form) {
    console.error("signupForm not found");
    return;
  }

  // ======================
  // REGEX PATTERNS
  // ======================
 // Name: letters & spaces only
const nameRegex = /^[A-Za-z ]{2,40}$/;

// Email: proper real-world validation
const emailRegex = /^[a-zA-Z0-9._%+-]{3,}@gmail\.com$/i;

// Phone: Indian mobile
const phoneRegex = /^[6-9]\d{9}$/;

// Password: simple & user-friendly
// min 6 chars, at least 1 letter & 1 number
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;

  const showError = (msg) => {
    message.className = "signup-message error small mt-3";
    message.innerText = msg;
  };

  const showSuccess = (msg) => {
    message.className = "signup-message success small mt-3";
    message.innerText = msg;
  };

let signupPayload = null;

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("conformPassword").value;

  if (!firstName || !lastName) return showError("First and last name required");
  if (!nameRegex.test(firstName) || !nameRegex.test(lastName))
    return showError("Name must contain only letters");

  if (!emailRegex.test(email))
    return showError("Only Gmail addresses allowed");

  if (!phoneRegex.test(phone))
    return showError("Invalid phone number");

  if (!passwordRegex.test(password))
    return showError("Password must contain letters & numbers");

  if (password !== confirmPassword)
    return showError("Passwords do not match");

  signupPayload = {
    name: `${firstName} ${lastName}`,
    email,
    phone,
    password
  };

  try {
    // 🔐 SEND OTP
   const res = await fetch("http://localhost:5000/api/auth/user/send-signup-otp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(signupPayload)
});


    const data = await res.json();

    if (!res.ok) return showError(data.message || "Failed to send OTP");

    showSuccess("OTP sent to your email");

    const modal = new bootstrap.Modal(document.getElementById("otpModal"));
    modal.show();

  } catch {
    showError("Server error");
  }
});

  // ======================
  // VERIFY OTP BUTTON
  // ======================
  const verifyBtn = document.getElementById("verifyOtpBtn");

  if (verifyBtn) {
    verifyBtn.addEventListener("click", async () => {
      const otp = document.getElementById("otpInput").value.trim();

      if (!otp || otp.length !== 4) {
        return showError("Enter valid 4-digit OTP");
      }

      try {
        const res = await fetch("http://localhost:5000/api/auth/user/verify-signup-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: signupPayload.email,
            otp
          })
        });

        const data = await res.json();

        if (res.ok) {
          showSuccess("Email verified. Account created!");

          setTimeout(() => {
            window.location.href = "login.html";
          }, 1200);
        } else {
          showError(data.message || "Invalid OTP");
        }

      } catch {
        showError("Server error");
      }
    });
  }

});


