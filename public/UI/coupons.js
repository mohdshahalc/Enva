let allCoupons = [];
let currentSubtotal = 0; // pass cart subtotal here if needed

document.addEventListener("DOMContentLoaded", () => {
  loadAllCoupons(currentSubtotal);
});

async function loadAllCoupons(subtotal) {
  try {
    const res = await fetch("http://localhost:5000/api/admin/coupons", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("userToken")}`
      }
    });

    if (!res.ok) throw new Error("Failed to load coupons");

    allCoupons = await res.json();
    
    categorizeCoupons(subtotal);

  } catch (err) {
    console.error("Coupon load error:", err.message);
  }
}
function normalizeDate(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}
function categorizeCoupons() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const available = [];
  const upcoming = [];
  const used = [];

  allCoupons.forEach(c => {
    const start = new Date(c.startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(c.endDate);
    end.setHours(23, 59, 59, 999);

    // 🔴 USED
    if (c.usedBy && c.usedBy.length > 0) {
      used.push(c);
      return;
    }

    // 🚫 Disabled
    if (!c.isActive) return;

    // 🕒 Upcoming
    if (today < start) {
      upcoming.push(c);
      return;
    }

    // ❌ Expired → IGNORE (you asked to remove expired section)
    if (today > end) return;

    // ✅ AVAILABLE (no minPurchase check here)
    available.push(c);
  });

  console.log("AVAILABLE:", available);

  renderCoupons("availableCoupons", available, "available");
  renderCoupons("upcomingCoupons", upcoming, "upcoming");
  renderCoupons("usedCoupons", used, "used");
}


function renderCoupons(containerId, coupons, type) {
  const box = document.getElementById(containerId);
  if (!box) return;

  box.innerHTML = "";

  if (!coupons.length) {
    box.innerHTML = `
      <div class="small text-muted py-2">
        No ${type} coupons
      </div>
    `;
    return;
  }

  coupons.forEach(c => {
    box.innerHTML += `
      <div class="voucher-card">
        <div class="voucher-left">
          <h2>${c.discountPercent}%</h2>
          <span>OFF</span>
        </div>

        <div class="voucher-right">
          <h6 class="fw-bold mb-1">${c.code}</h6>
          <p class="small text-secondary mb-3">
            Min purchase ₹${c.minPurchase}
          </p>

          ${
            type === "available"
              ? `<button class="btn btn-dark btn-sm rounded-pill px-3"
                   onclick="applyCouponFromCard('${c.code}', ${c.discountPercent})">
                   Apply
                 </button>`
              : type === "upcoming"
              ? `<span class="small text-warning fw-semibold">
                   Coming Soon
                 </span>`
              : `<span class="small text-muted fw-semibold">
                   Used
                 </span>`
          }
        </div>
      </div>
    `;
  });
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