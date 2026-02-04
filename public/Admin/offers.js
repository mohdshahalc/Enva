document.addEventListener("DOMContentLoaded", () => {
  loadCategories();
  loadAllProducts();
  loadOffers()

  const offerType = document.getElementById("offerType");
  const categoryBox = document.getElementById("categoryBox");
  const productBox = document.getElementById("productBox"); // ✅ ADD
  const categorySelect = document.getElementById("categorySelect");
  const productSelect = document.getElementById("productSelect");

  // 🔄 Toggle based on offer type
  offerType.addEventListener("change", () => {
    if (offerType.value === "category") {
      categoryBox.classList.remove("d-none");
      productBox.classList.add("d-none"); // ❌ HIDE product box
      productSelect.innerHTML = `<option value="">Select Product</option>`;
    } else {
      categoryBox.classList.add("d-none");
      productBox.classList.remove("d-none"); // ✅ SHOW product box
      loadAllProducts();
    }
  });
});

async function loadOffers() {
  try {
    const res = await apiFetch("/api/admin/offers", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`
      }
    });

    const offers = await res.json();
    updateOfferKPIs(offers);
    renderOffers(offers);

  } catch (err) {
    console.error(err);
    showToast("Failed to load offers", "error");
  }
}

function updateOfferKPIs(offers) {
  const now = new Date();

  let total = offers.length;
  let active = 0;
  let upcoming = 0;
  let expired = 0;

  offers.forEach(offer => {
    const start = new Date(offer.startDate);
    const end = new Date(offer.endDate);

    // ❌ Disabled offer → Expired
    if (offer.isActive === false) {
      expired++;
      return;
    }

    // ⏳ Upcoming
    if (now < start) {
      upcoming++;
      return;
    }

    // ⏰ Expired by date
    if (now > end) {
      expired++;
      return;
    }

    // ✅ Active
    active++;
  });

  document.getElementById("kpiTotalOffers").innerText = total;
  document.getElementById("kpiActiveOffers").innerText = active;
  document.getElementById("kpiUpcomingOffers").innerText = upcoming;
  document.getElementById("kpiExpiredOffers").innerText = expired;
}


function renderOffers(offers) {
  const tbody = document.getElementById("offersTableBody");
  tbody.innerHTML = "";

  if (!offers.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          No offers found
        </td>
      </tr>
    `;
    return;
  }

  offers.forEach((offer, index) => {
    const { label, className } = getOfferStatus(offer);

    const target =
      offer.offerType === "product"
        ? `${offer.product?.name || "-"}`
        : `${offer.category?.name || "-"}`;

    tbody.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${offer.name.toUpperCase()}</strong></td>
        <td>${capitalize(offer.offerType)}</td>
        <td>${target}</td>
        <td>${offer.discountPercent}%</td>
        <td>${formatDate(offer.startDate)} – ${formatDate(offer.endDate)}</td>
        <td>
          <span class="status-pill ${className}">
            ${label}
          </span>
        </td>
        <td class="text-end">
          ${
            label === "Expired"
              ? "": `
                <button class="btn btn-sm btn-outline-danger ms-2"
                  onclick="disableOffer('${offer._id}')">Disable</button>
              `
          }
        </td>
      </tr>
    `;
  });
}

async function disableOffer(id) {
  if (!confirm("Disable this offer?")) return;

  const res = await apiFetch(
    `/api/admin/offers/${id}/disable`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`
      }
    }
  );

  if (res.ok) {
    showToast("Offer disabled", "success");
    loadOffers();
  } else {
    showToast("Failed to disable offer", "error");
  }
}


function getOfferStatus(offer) {
  const now = new Date();
  const start = new Date(offer.startDate);
  const end = new Date(offer.endDate);

  if (!offer.isActive || end < now) {
    return { label: "Expired", className: "canceled" };
  }

  if (start > now) {
    return { label: "Upcoming", className: "pending" };
  }

  return { label: "Active", className: "paid" };
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short"
  });
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}


async function loadCategories() {
  const res = await apiFetch("/api/admin/categories", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("adminToken")}`
    }
  });

  const categories = await res.json();
  const select = document.getElementById("categorySelect");

  select.innerHTML = `<option value="">Select Category</option>`;

  categories.forEach(cat => {
  select.innerHTML += `
    <option value="${cat._id}">
      ${cat.name}
    </option>
  `;
});
}

async function loadProductsByCategory(category) {
  const res = await apiFetch(
    `/api/admin/products?category=${category}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`
      }
    }
  );

  const products = await res.json();
  fillProducts(products);
}

async function loadAllProducts() {
  const res = await apiFetch("/api/admin/products", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("adminToken")}`
    }
  });

  const products = await res.json();
  fillProducts(products);
}


function fillProducts(products) {
  const select = document.getElementById("productSelect");

  select.innerHTML = `<option value="">Select Product</option>`;

  products.forEach(p => {
    select.innerHTML += `
      <option value="${p._id}">
        ${p.name}
      </option>
    `;
  });
}


document
  .getElementById("createOfferBtn")
  .addEventListener("click", createOffer);

// ✅ helper for professional offer name validation
function isValidOfferName(name) {
  // allows letters, spaces, hyphen, ampersand
  const regex = /^[A-Za-z\s\-&]+$/;
  return regex.test(name);
}

async function createOffer(e) {
  e.preventDefault();

  const token = localStorage.getItem("adminToken");
  if (!token) {
    showToast("Session expired. Please login again.", "error");
    return;
  }

  const name = document.getElementById("offerName").value.trim();
  const offerType = document.getElementById("offerType").value;
  const discountPercent = Number(
    document.getElementById("discountPercent").value
  );
  const productId = document.getElementById("productSelect")?.value || null;
  const category = document.getElementById("categorySelect")?.value || null;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  /* ---------- PROFESSIONAL VALIDATION ---------- */

  // Offer name
  if (!name) {
    showToast("Please enter an offer name", "error");
    return;
  }

  if (name.length < 3) {
    showToast("Offer name must be at least 3 characters long", "error");
    return;
  }

  if (!isValidOfferName(name)) {
    showToast(
      "Offer name should contain only letters and spaces (no numbers)",
      "error"
    );
    return;
  }

  // Offer type
  if (!offerType) {
    showToast("Please select an offer type", "error");
    return;
  }

  // Discount percent
  if (isNaN(discountPercent) || discountPercent <= 0 || discountPercent > 90) {
    showToast("Discount must be between 1% and 90%", "error");
    return;
  }

  // Product / Category based on offer type
  if (offerType === "product" && !productId) {
    showToast("Please select a product for this offer", "error");
    return;
  }

  if (offerType === "category" && !category) {
    showToast("Please select a category for this offer", "error");
    return;
  }

  // Dates
  if (!startDate || !endDate) {
    showToast("Please select both start and end dates", "error");
    return;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start >= end) {
    showToast("End date must be after start date", "error");
    return;
  }

  /* ---------- PAYLOAD ---------- */

  const payload = {
    name: name
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase()), // nice formatting
    offerType,
    discountPercent,
    product: offerType === "product" ? productId : null,
    category: offerType === "category" ? category : null,
    startDate,
    endDate
  };

  /* ---------- API CALL ---------- */

  try {
    const res = await apiFetch(
      "/api/admin/offers",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || "Failed to create offer", "error");
      return;
    }

    showToast("Offer created successfully", "success");
    document.querySelector("form").reset();
    loadOffers();

  } catch (err) {
    console.error(err);
    showToast("Server error. Please try again later.", "error");
  }
}




// ======================
// TOAST
// ======================
function showToast(message, type = "success") {
    console.log("jii");
    
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