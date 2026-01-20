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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("conformPassword").value;

    // ======================
    // VALIDATIONS
    // ======================

    if (!firstName || !lastName) {
      return showError("First and last name are required");
    }

    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
      return showError("Name must contain only letters and spaces");
    }

    if (!emailRegex.test(email)) {
  return showError("Only Gmail addresses are allowed (example: user@gmail.com)");
}



if (!phoneRegex.test(phone)) {
  return showError("Please enter a valid 10-digit mobile number");
}

if (!passwordRegex.test(password)) {
  return showError(
    "Password must be at least 6 characters and include letters & numbers"
  );
}

if (password !== confirmPassword) {
  return showError("Passwords do not match");
}


    const name = `${firstName} ${lastName}`;

    try {
      const res = await fetch("http://localhost:5000/api/auth/user/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password })
      });

      const data = await res.json();

      if (res.ok) {
        showSuccess("Account created successfully");

        setTimeout(() => {
          window.location.href = "login.html";
        }, 1500);
      } else {
        showError(data.message || "Signup failed");
      }
    } catch (err) {
      showError("Server error. Please try again later.");
    }
  });
});
