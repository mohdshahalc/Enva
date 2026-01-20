const params = new URLSearchParams(window.location.search);
const orderId = params.get("id");

 console.log(orderId);
 let currentOrderId = null;

if (!orderId) {
  alert("Invalid order");
  window.location.href = "./orders.html";
}


let selectedItemId = null;


document.addEventListener("DOMContentLoaded", () => {
  

  loadOrderDetails();
});


async function loadOrderDetails() {
  const token = localStorage.getItem("userToken")


  const res = await apiFetch(
    `http://localhost:5000/api/user/orders/${orderId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (res.status === 403) {
      const data = await res.json();
      showToast(data.message || "Your account has been blocked", "error");

      localStorage.removeItem("userToken");
      window.location.href = "login.html";
      return;
    }

  if (!res.ok) {
    alert("Order not found");
    return;
  }

  const order = await res.json();
  renderOrderDetails(order);
}


function renderOrderDetails(order) {

 

  console.log(order);
  
    currentOrderId = order._id;
    const status = order.status;
  /* =========================
     ORDER DATE
  ========================= */
  document.getElementById("orderDate").textContent =
    "Placed on " + new Date(order.createdAt).toDateString();

 /* =========================
   HEADER STATUS BADGE
========================= */
const statusEl = document.getElementById("orderStatus");
statusEl.textContent = order.status.replace("-", " ");
statusEl.className = `order-status-badge ${order.status}`;


/* =========================
   ORDER CONFIRM STRIP
========================= */
const strip = document.getElementById("orderConfirmStrip");
const stripText = document.getElementById("orderStatusText");
const stripIcon = document.getElementById("confirmStripIcon");

strip.className = "order-confirm-strip";

switch (status) {
  case "pending":
  strip.classList.add("pending");
  stripIcon.className = "fa-solid fa-clock me-2";
  stripText.textContent = "Your order is pending confirmation";
  break;


  case "confirmed":
    strip.classList.add("success");
    stripIcon.className = "fa-solid fa-circle-check me-2";
    stripText.textContent = "Your order has been confirmed";
    break;

  case "shipped":
    strip.classList.add("info");
    stripIcon.className = "fa-solid fa-truck me-2";
    stripText.textContent = "Your order has been shipped";
    break;

  case "delivered":
    strip.classList.add("success");
    stripIcon.className = "fa-solid fa-box-open me-2";
    stripText.textContent = "Your order has been delivered";
    break;

  case "returned":
    strip.classList.add("warning");
    stripIcon.className = "fa-solid fa-rotate-left me-2";
    stripText.textContent = "Order has been returned";
    break;

  case "cancelled":
    strip.classList.add("danger");
    stripIcon.className = "fa-solid fa-ban me-2";
    stripText.textContent = "Order has been cancelled";
    break;
}




/* =========================
   TRACK ORDER STATUS
========================= */
const steps = document.querySelectorAll(".track-step");
const lines = document.querySelectorAll(".track-line");

// reset
steps.forEach(s => s.classList.remove("active", "cancelled", "returned", "pending"));
lines.forEach(l => l.classList.remove("active"));

if (status === "pending") {
  // ✅ DO NOTHING — keep all steps inactive (grey)
}

if (status === "confirmed") {
  steps[0].classList.add("active");
}

if (status === "shipped") {
  steps[0].classList.add("active");
  steps[1].classList.add("active");
  lines[0].classList.add("active");
}

if (status === "delivered") {
  steps.forEach(s => s.classList.add("active"));
  lines.forEach(l => l.classList.add("active"));
}

if (status === "returned") {
  steps.forEach(s => s.classList.add("active"));
  lines.forEach(l => l.classList.add("active"));
  steps[2].classList.add("returned");
}

if (status === "cancelled") {
  steps[0].classList.add("cancelled");
}


/* =========================
   DELIVERY ETA
========================= */
const etaEl = document.getElementById("deliveryEta");
const orderDate = new Date(order.createdAt);

if (order.status === "delivered") {
  etaEl.textContent = "Delivered";
}
else if (order.status === "returned") {
  etaEl.textContent = "Order Returned";
}
else if (order.status === "cancelled") {
  etaEl.textContent = "Order Cancelled";
}
else {
  // ⏱ DELIVERY DATE CALCULATION
  let deliveryDate;

  if (order.shippingMethod === "express") {
    // 2–3 business days → take max for safety
    deliveryDate = addDays(orderDate, 3);
    // OR: addBusinessDays(orderDate, 3)
  } else {
    // standard 5–7 business days → take max
    deliveryDate = addDays(orderDate, 7);
    // OR: addBusinessDays(orderDate, 7)
  }

  etaEl.textContent = `Expected by ${formatDate(deliveryDate)}`;
}



/* =========================
   PRICE BREAKDOWN
========================= */
document.getElementById("subtotalAmount").textContent = order.subtotal;
document.getElementById("shippingAmount").textContent = order.shippingPrice;
document.getElementById("taxAmount").textContent = order.tax;

// Coupon (only if applied)
if (order.coupon && order.discountAmount > 0) {
  document.getElementById("couponRow").classList.remove("d-none");
  document.getElementById("couponCode").textContent = order.coupon.code;
  document.getElementById("couponDiscountAmount").textContent=order.discountAmount;
}

  

  /* =========================
     ITEMS
  ========================= */
document.getElementById("orderItems").innerHTML =
  order.items.map(item => `
    <div class="order-item d-flex gap-3 py-3 border-bottom">

      <img
        src="/uploads/${item.productImage || item.product.images[0]}"
        alt="${item.productName || item.product.name}"
      />

      <div class="order-item-info w-100">
        <h6 class="fw-semibold mb-1">${item.productName || item.product.name}</h6>
        <p class="mb-1">Qty: ${item.quantity}</p>
        <p class="mb-1">Size: ${item.size}</p>

        <div class="d-flex justify-content-between align-items-center mt-2">
          <strong>₹${(item.price * item.quantity).toFixed(2)}</strong>

          <div>
            ${
              item.status === "cancelled"
                ? `<span class="badge bg-danger">Cancelled</span>`
                : item.status === "returned"
                ? `<span class="badge bg-warning text-dark">Returned</span>`
                : ["pending", "confirmed"].includes(item.status)
                ? `<button class="btn btn-sm btn-outline-danger"
                    onclick="openCancelModal('${item._id}')">
                    Cancel
                  </button>`
                : item.status === "delivered"
                ? `<button class="btn btn-sm btn-outline-primary"
                    onclick="openReturnModal('${item._id}')">
                    Return
                  </button>`
                : ""
            }
          </div>
        </div>

        <small class="text-muted d-block mt-1">
          Status: ${item.status}
        </small>
      </div>
    </div>
  `).join("");




  /* =========================
     ADDRESS
  ========================= */
  const a = order.shippingAddress;
  document.getElementById("shippingAddress").textContent =
    `${a.firstName} ${a.lastName}, ${a.street}, ${a.city}, ${a.state} - ${a.zip}`;

  /* =========================
     PAYMENT METHOD
  ========================= */
  const paymentEl = document.getElementById("paymentMethod");
  if (paymentEl) {
    paymentEl.textContent =
      order.paymentMethod === "cod"
        ? "Cash on Delivery"
        : order.paymentMethod.toUpperCase();
  }

  /* =========================
     TOTAL
  ========================= */
  document.getElementById("orderTotal").textContent = order.total;


}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
function formatDate(date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}



function openCancelModal(itemId) {
  selectedItemId = itemId;
  document.getElementById("cancelReasonInput").value = "";
  document.getElementById("cancelOrderOverlay").classList.remove("d-none");
}

async function confirmCancelOrder() {
  const reason =
    document.getElementById("cancelReasonInput").value.trim();

  if (!reason) {
    showToast("Please enter a cancellation reason", "warning");
    return;
  }

  const token = localStorage.getItem("userToken");

  const res = await fetch(
  `http://localhost:5000/api/user/orders/${currentOrderId}/items/${selectedItemId}/cancel`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ reason })
  }
);


  const data = await res.json();

  if (!res.ok) {
    showToast(data.message || "Cancel failed", "error");
    return;
  }

  showToast("Order cancelled successfully", "success");
  closeCancelModal();

  setTimeout(() => location.reload(), 1200);
}

function openReturnModal(itemId) {
  selectedItemId = itemId;
  document.getElementById("returnReasonInput").value = "";
  document.getElementById("returnOrderOverlay").classList.remove("d-none");
}

async function confirmReturnOrder() {
  const reason =
    document.getElementById("returnReasonInput").value.trim();

  if (!reason) {
    showToast("Please enter return reason", "warning");
    return;
  }

  const token = localStorage.getItem("userToken");

  const res = await fetch(
  `http://localhost:5000/api/user/orders/${currentOrderId}/items/${selectedItemId}/return`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ reason })
  }
);


  const data = await res.json();

  if (!res.ok) {
    showToast(data.message || "Return failed", "error");
    return;
  }

  showToast("Return request submitted", "success");
  closeReturnModal();

  setTimeout(() => location.reload(), 1200);
}

function closeReturnModal() {
  document
    .getElementById("returnOrderOverlay")
    .classList.add("d-none");
}

function closeCancelModal() {
  document
    .getElementById("cancelOrderOverlay")
    .classList.add("d-none");
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
