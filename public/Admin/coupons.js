const couponForm = document.getElementById("couponForm");
document.addEventListener("DOMContentLoaded", () => {
  loadCoupons();
   loadCouponStats();
});

let allCoupons = [];

document.addEventListener("DOMContentLoaded", () => {

  const couponForm = document.getElementById("couponForm");
  if (!couponForm) return;

  couponForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("adminToken");
    if (!token) {
      showToast("Unauthorized. Please login again.", "error");
      return;
    }

    // SAFE READ
    const maxPurchaseEl = document.getElementById("maxPurchase");

    if (!maxPurchaseEl || maxPurchaseEl.value.trim() === "") {
      showToast("Max purchase amount is required", "error");
      return;
    }

    const couponData = {
      code: document.getElementById("code").value.trim().toUpperCase(),
      discountPercent: Number(document.getElementById("discount").value),
      usageLimit: Number(document.getElementById("usageLimit").value),
      minPurchase: Number(document.getElementById("minPurchase").value),
      maxPurchase: Number(maxPurchaseEl.value),
      startDate: document.getElementById("startDate").value,
      endDate: document.getElementById("endDate").value,
      description: document.getElementById("description")?.value.trim() || ""
    };

    /* ======================
       VALIDATIONS
    ====================== */

    if (!/^[A-Z0-9]{4,20}$/.test(couponData.code)) {
      showToast("Coupon code must be 4–20 uppercase letters or numbers", "error");
      return;
    }

    if (couponData.discountPercent < 1 || couponData.discountPercent > 90) {
      showToast("Discount must be between 1% and 90%", "error");
      return;
    }

    if (couponData.usageLimit < 1) {
      showToast("Usage limit must be at least 1", "error");
      return;
    }

    if (couponData.minPurchase < 0) {
      showToast("Minimum purchase cannot be negative", "error");
      return;
    }

    if (couponData.maxPurchase <= couponData.minPurchase) {
      showToast(
        "Max purchase must be greater than minimum purchase",
        "error"
      );
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (new Date(couponData.startDate) < today) {
      showToast("Start date cannot be in the past", "error");
      return;
    }

    if (new Date(couponData.startDate) >= new Date(couponData.endDate)) {
      showToast("End date must be after start date", "error");
      return;
    }

    console.log("FINAL COUPON DATA:", couponData);

    try {
      const res = await apiFetch("http://localhost:5000/api/admin/coupons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(couponData)
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Failed to create coupon", "error");
        return;
      }

      showToast("Coupon created successfully", "success");
      couponForm.reset();
      loadCoupons();
      loadCouponStats();

    } catch (err) {
      console.error(err);
      showToast("Server error", "error");
    }
  });
});


async function loadCoupons() {
  const token =localStorage.getItem("adminToken")

  try {
    const res = await apiFetch("http://localhost:5000/api/admin/coupons", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const coupons = await res.json();
     allCoupons = coupons;
    renderCoupons(coupons);
  } catch (err) {
    showToast("Failed to load coupons", "error");
  }
}


function renderCoupons(coupons) {
  const tbody = document.getElementById("couponTableBody");
  tbody.innerHTML = "";

  if (!coupons.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-5">
          <div class="text-muted fw-semibold mb-1">
            No coupons found
          </div>
          <div class="small text-secondary">
            Try adjusting your search or filters
          </div>
        </td>
      </tr>
    `;
    return;
  }

  coupons.forEach((coupon, index) => {
    const status = getCouponStatus(coupon);

    tbody.innerHTML += `
      <tr>
        <td>${index + 1}</td>

        <td><strong>${coupon.code}</strong></td>

        <td>${coupon.discountPercent}%</td>

        <!-- ✅ MIN PURCHASE -->
        <td>₹${coupon.minPurchase}</td>

        <!-- ✅ MAX DISCOUNT -->
        <td>₹${coupon.maxPurchase}</td>

        <!-- ✅ USAGE -->
        <td>${coupon.usedCount} / ${coupon.usageLimit}</td>

        <!-- ✅ STATUS -->
        <td>
          <span class="status-pill ${status.class}">
            ${status.label}
          </span>
        </td>

        <!-- ✅ EXPIRY -->
        <td>${formatDate(coupon.endDate)}</td>

        <td class="text-end">
          <button
            class="btn btn-sm btn-outline-danger"
            onclick="deleteCoupon('${coupon._id}')"
          >
            Delete
          </button>
        </td>
      </tr>
    `;
  });
}


function getCouponStatus(coupon) {
  const now = new Date();
  const start = new Date(coupon.startDate);
  const end = new Date(coupon.endDate);

  if (now < start) {
    return { label: "Upcoming", class: "pending" };
  }

  if (now > end) {
    return { label: "Expired", class: "canceled" };
  }

  return { label: "Active", class: "paid" };
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}


async function deleteCoupon(id) {
  if (!confirm("Delete this coupon?")) return;

  const token = localStorage.getItem("adminToken");

  try {
    await apiFetch(`http://localhost:5000/api/admin/coupons/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    showToast("Coupon deleted", "success");
    loadCoupons();
    loadCouponStats();
  } catch {
    showToast("Delete failed", "error");
  }
}

async function loadCouponStats() {
  const token = localStorage.getItem("adminToken")

  try {
    const res = await apiFetch(
      "http://localhost:5000/api/admin/coupons/stats",
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const stats = await res.json();

    document.getElementById("activeCoupons").textContent =
      stats.activeCoupons;

    document.getElementById("expiredCoupons").textContent =
      stats.expiredCoupons;

    document.getElementById("maxDiscount").textContent =
      stats.maxDiscount + "%";

    document.getElementById("usedToday").textContent =
      stats.usedToday;

  } catch (err) {
    showToast("Failed to load coupon statistics", "error");
    console.error(err);
  }
}

document.getElementById("applyFilterBtn").addEventListener("click", applyFilters);
document.getElementById("resetFilterBtn").addEventListener("click", resetFilters);
function applyFilters() {
  const search = document.getElementById("searchCoupon").value.toLowerCase();
  const status = document.getElementById("filterStatus").value;
  const sortBy = document.getElementById("sortBy").value;
console.log(sortBy);

  let filtered = [...allCoupons];

  /* 🔍 SEARCH */
  if (search) {
    filtered = filtered.filter(c =>
      c.code.toLowerCase().includes(search)
    );
  }

  /* 🏷 STATUS */
  if (status !== "all") {
    filtered = filtered.filter(c => {
      return getCouponStatus(c).label.toLowerCase() === status;
    });
  }

  /* 🔃 SORT */
  switch (sortBy) {
    case "discount":
      filtered = [...filtered].sort(
        (a, b) => b.discountPercent - a.discountPercent
      );
      console.log(filtered);
      
      break;

    case "used":
      filtered = [...filtered].sort(
        (a, b) => b.usedCount - a.usedCount
      );
      break;

    case "newest":
      filtered = [...filtered].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      break;
  }

  renderCoupons(filtered);
}


function resetFilters() {
  document.getElementById("searchCoupon").value = "";
  document.getElementById("filterStatus").value = "all";
  document.getElementById("sortBy").value = "newest";

  renderCoupons(allCoupons);
}




function showToast(message, type = "success") {
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


