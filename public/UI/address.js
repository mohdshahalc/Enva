document.addEventListener("DOMContentLoaded", loadAddresses);

async function loadAddresses() {
  const token = localStorage.getItem("userToken")

  const res = await apiFetch("http://localhost:5000/api/user/address", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (res.status === 403) {
        const data = await res.json();
        alert(data.message || "Your account has been blocked");

        // clear ONLY user token
        localStorage.removeItem("userToken");
        window.location.href = "login.html";
        return;
      }

  const addresses = await res.json();
  renderAddresses(addresses);
}

document.addEventListener("DOMContentLoaded", loadUserName);

async function loadUserName() {
  const token =  localStorage.getItem("userToken")

  if (!token) return;

  const res = await apiFetch("http://localhost:5000/api/user/profile", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const user = await res.json();

  // user.name already contains "First Last"
  document.getElementById("fullName").textContent = user.name || "";
} 

function renderAddresses(addresses) {

  const container = document.getElementById("savedAddresses");

  if (!addresses || addresses.length === 0) {
    container.innerHTML = `
      <p class="small text-secondary">No saved addresses yet.</p>
    `;
    return;
  }

  container.innerHTML = addresses.map(address => {

    const isHome = address.type === "Home";

    const icon = isHome
      ? `<i class="fa-solid fa-house me-2"></i>`
      : `<i class="fa-solid fa-building me-2"></i>`;

    const title = isHome ? "Home Address" : "Office Address";

    const borderClass = address.isDefault
      ? "border border-primary border-2"
      : "border";

    const defaultBadge = address.isDefault
      ? `<span class="badge bg-primary-subtle text-primary fw-bold ms-2">DEFAULT</span>`
      : "";

  return `
  <div class="${borderClass} rounded-3 p-3 mb-3 bg-light shadow-sm">
    <div class="d-flex justify-content-between align-items-start">

      <div class="me-3">
        <h6 class="fw-bold mb-1 ${address.isDefault ? "text-primary" : ""}">
          ${icon} ${title}
          ${defaultBadge}
        </h6>

        <p class="small mb-2" style="line-height: 1.5;">
          <!-- 1️⃣ Name -->
          <span class="fw-semibold">
            ${address.firstName} ${address.lastName}
          </span><br>

          <!-- 2️⃣ Email + Phone -->
          ${address.email} | +91 ${address.phone}<br>

          <!-- 3️⃣ Address -->
          ${address.street}, ${address.city}, ${address.state}<br>

          <!-- 4️⃣ PIN -->
          PIN: ${address.postcode}
        </p>
      </div>

      <!-- 🔘 ACTION BUTTONS -->
      <div class="d-flex gap-2 flex-shrink-0 mt-1">

        ${
          !address.isDefault
            ? `
              <button
                class="btn btn-outline-primary btn-sm fw-semibold"
                onclick="setDefaultAddress('${address._id}')">
                Set Default
              </button>
            `
            : ""
        }

        <button
          class="btn btn-outline-dark btn-sm fw-semibold"
          onclick="editAddress('${address._id}')">
          Edit
        </button>

        <button
          class="btn btn-outline-danger btn-sm fw-semibold"
          onclick="deleteAddress('${address._id}')">
          Delete
        </button>

      </div>

    </div>
  </div>
`;

  }).join("");
}


document.querySelector("#addressForm").addEventListener("submit", async e => {
  e.preventDefault();

  const data = {
    type: document.querySelector('input[name="addressType"]:checked')?.value,
    email: document.getElementById("email").value.trim(),
    firstName: document.getElementById("firstName").value.trim(),
    lastName: document.getElementById("lastName").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    street: document.getElementById("street").value.trim(),
    city: document.getElementById("city").value.trim(),
    state: document.getElementById("state").value,
    postcode: document.getElementById("postalCode").value.trim()
  };

  /* =========================
     VALIDATION REGEX
  ========================= */
  const nameRegex = /^[A-Za-z\s]{2,}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phoneRegex = /^[6-9]\d{9}$/;      // 🇮🇳 Indian mobile
  const pinRegex = /^\d{6}$/;             // 🇮🇳 PIN code

  /* =========================
     FIELD VALIDATION
  ========================= */
  if (!data.type) {
    showToast("Select address type", "warning");
    return;
  }

  if (!nameRegex.test(data.firstName)) {
    showToast("Enter a valid first name", "warning");
    return;
  }

  if (!nameRegex.test(data.lastName)) {
    showToast("Enter a valid last name", "warning");
    return;
  }

  if (!emailRegex.test(data.email)) {
    showToast("Enter a valid email address", "warning");
    return;
  }

  if (!phoneRegex.test(data.phone)) {
    showToast("Enter a valid 10-digit mobile number", "warning");
    return;
  }

  if (data.street.length < 5) {
    showToast("Street address is too short", "warning");
    return;
  }

  if (!nameRegex.test(data.city)) {
    showToast("Enter a valid city name", "warning");
    return;
  }

  if (!data.state) {
    showToast("Please select a state", "warning");
    return;
  }

  if (!pinRegex.test(data.postcode)) {
    showToast("Enter a valid 6-digit PIN code", "warning");
    return;
  }

  /* =========================
     API CALL
  ========================= */
  try {
    const res = await apiFetch(
      "http://localhost:5000/api/user/address/add",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("userToken")}`
        },
        body: JSON.stringify(data)
      }
    );

    const result = await res.json();

    if (!res.ok) {
      showToast(result.message || "Failed to add address", "error");
      return;
    }

    showToast("Address added successfully", "success");
    loadAddresses();
    e.target.reset();

  } catch (err) {
    console.error(err);
    showToast("Server error. Please try again.", "error");
  }
});


async function deleteAddress(id) {
  await apiFetch(`http://localhost:5000/api/user/address/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${ localStorage.getItem("userToken")}`
    }
  });

  loadAddresses();
}


function setDefaultAddress(addressId) {
  apiFetch(`http://localhost:5000/api/user/address/default/${addressId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${ localStorage.getItem("userToken")}`
    }
  })
    .then(res => res.json())
    .then(data => {
      renderAddresses(data.addresses);
      showToast("Default address updated", "success");
    })
    .catch(err => {
      console.error(err);
      showToast("Failed to update default address", "error");
    });
}



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


