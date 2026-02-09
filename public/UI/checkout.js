let currentSubtotal = 0;
let couponDiscountAmount = 0;
let allCoupons = [];
let appliedCoupon = null;
let walletBalance = 0;
window.currentAddresses = [];

let stripe;
let elements;
let clientSecret = null;



document.addEventListener("DOMContentLoaded", () => {
  stripe = Stripe("pk_test_51SoqWH7nvlhy1FXapKbULahIUR2DQJRNMGNVnteAptDr49sd1K5PiueXfBy7x06A9OfZtGdmgAj7CyOttF3Oj5Iz00tWGzvVZ4"); // 🔑 your Stripe TEST key
});

document.addEventListener("DOMContentLoaded", () => {
  loadOrderSummary();
});

document
  .querySelectorAll('input[name="paymentMethod"]')
  .forEach(radio => {
    radio.addEventListener("change", () => {
      console.log("Selected payment:", radio.id);
    });
  });


  document
  .querySelectorAll('input[name="shippingMethod"]')
  .forEach(radio => {
    radio.addEventListener("change", () => {
      updateSummaryTotals(currentSubtotal);
      updateShippingLabel();
    });
  });

  function updateShippingLabel() {
  const selected = document.querySelector(
    'input[name="shippingMethod"]:checked'
  );

  const label = document.getElementById("shippingLabel");

  if (!selected || !label) return;

  label.textContent =
    selected.id === "expressShipping"
      ? "Shipping (Express)"
      : "Shipping (Standard)";
}



async function loadOrderSummary() {
  const token = localStorage.getItem("userToken")
  if (!token) return;

  const res = await apiFetch("https://envastore.online/api/user/cart", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const cart = await res.json();
  renderOrderSummary(cart.items || []);
}


function renderOrderSummary(items) {
  const box = document.getElementById("summaryItems");

  if (!items.length) {
    box.innerHTML = `<p class="small text-secondary">Your cart is empty</p>`;

    currentSubtotal = 0;
    couponDiscountAmount = 0;

    document.getElementById("couponRow")?.classList.add("d-none");
    document.getElementById("availableCoupons")?.classList.add("d-none");

    updateSummaryTotals(0);
    return;
  }

  currentSubtotal = 0;

  box.innerHTML = items.map((item, index) => {
    const product = item.product;

    // ✅ USE OFFER PRICE
    const unitPrice = item.finalPrice ?? product.price;
    const total = unitPrice * item.quantity;

    currentSubtotal += total;

    return `
      <div class="summary-item ${index === items.length - 1 ? "border-0" : ""}">
        <img
          src="/uploads/${product.images[0]}"
          class="summary-item-image"
          alt="${product.name}"
        >

        <div class="summary-item-info">
          <div class="small fw-semibold">${product.name}</div>
          <div class="small text-secondary">Qty: ${item.quantity}</div>
        </div>

        <div class="summary-item-price">
          ₹${total.toFixed(2)}
        </div>
      </div>
    `;
  }).join("");

  // ❗ Reset coupon when cart changes
  couponDiscountAmount = 0;
  document.getElementById("couponRow")?.classList.add("d-none");

  // ✅ Update totals
  updateSummaryTotals(currentSubtotal);
  showCouponsByStatus(currentSubtotal);
  loadAllCoupons(currentSubtotal);
}


async function loadAllCoupons(subtotal) {
  try {
    const res = await apiFetch("https://envastore.online/api/admin/coupons", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("userToken")}`
      }
    });

    if (!res.ok) throw new Error("Failed to load coupons");

    allCoupons = await res.json(); // 🔥 THIS WAS MISSING

    console.log("ALL COUPONS:", allCoupons);

    showCouponsByStatus(subtotal); // ✅ now works

  } catch (err) {
    console.error("Coupon load error:", err.message);
  }
}

function showCouponsByStatus(subtotal) {
  const now = new Date();

  const available = [];
  const upcoming = [];
  const invalid = [];
  const used = [];

  allCoupons.forEach(c => {
    const start = new Date(c.startDate);
    const end = new Date(c.endDate);

    // 🔴 USED (already used by someone)
    if (c.usedBy && c.usedBy.length > 0) {
      used.push(c);
      return;
    }

    if (!c.isActive) {
      invalid.push({ ...c, reason: "Disabled" });
      return;
    }

    if (start > now) {
      upcoming.push(c);
      return;
    }

    
if (end < now) {
  return;
}

   if (subtotal < c.minPurchase) {
  invalid.push({
    ...c,
    reason: `Min ₹${c.minPurchase} required`
  });
  return;
}

if (c.maxPurchase && subtotal > c.maxPurchase) {
  invalid.push({
    ...c,
    reason: `Valid up to ₹${c.maxPurchase}`
  });
  return;
}


    available.push(c);
  });

  renderCouponList("availableCouponList", available, "available");
  renderCouponList("upcomingCouponList", upcoming, "upcoming");
  renderCouponList("invalidCouponList", invalid, "invalid");
  const limitedUsed = used.slice(0, 3);
  renderCouponList("usedCouponList", limitedUsed, "used");
}


function renderCouponList(containerId, coupons, type) {
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
      <div class="coupon-card ${type}">
        <div>
          <div class="coupon-code">${c.code}</div>
          <div class="coupon-desc">
         ${
  c.type === "flat"
    ? `Flat ₹${c.flatAmount} OFF`
    : `${c.discountPercent}% OFF`
}
 • Min ₹${c.minPurchase}
${c.type === "percentage" && c.maxPurchase ? ` – Max ₹${c.maxPurchase}` : ""}

            ${
              type === "used"
                ? `<br><span class="text-danger">Already used</span>`
                : c.reason
                ? `<br><span class="text-muted">${c.reason}</span>`
                : ""
            }
          </div>
        </div>

        ${
          type === "available"
            ? `<button class="apply-mini-btn"
                onclick="applyCouponFromCard('${c.code}')">
                Apply
              </button>`
            : ""
        }
      </div>
    `;
  });
}


document
  .getElementById("applyCouponBtn")
  .addEventListener("click", applyCouponFromInput);

function applyCouponFromInput() {
  const input = document.getElementById("couponInput");
  const feedback = document.getElementById("couponFeedback");

  const code = input.value.trim().toUpperCase();

  feedback.textContent = "";
  feedback.className = "coupon-feedback";

  if (!code) {
    feedback.textContent = "Please enter a coupon code";
    feedback.classList.add("error");
    return;
  }

  // 🔍 find coupon
  const coupon = allCoupons.find(c => c.code === code);

  if (!coupon) {
    feedback.textContent = "Invalid coupon code";
    feedback.classList.add("error");
    return;
  }

  const now = new Date();
  const start = new Date(coupon.startDate);
  const end = new Date(coupon.endDate);

  if (!coupon.isActive) {
    feedback.textContent = "Coupon is disabled";
    feedback.classList.add("error");
    return;
  }

  if (start > now) {
    feedback.textContent = "Coupon not active yet";
    feedback.classList.add("error");
    return;
  }

  if (end < now) {
    feedback.textContent = "Coupon expired";
    feedback.classList.add("error");
    return;
  }

  // 🔴 MIN PURCHASE CHECK
  if (currentSubtotal < coupon.minPurchase) {
    feedback.textContent =
      `Minimum ₹${coupon.minPurchase} required`;
    feedback.classList.add("error");
    return;
  }

  // MAX ONLY FOR PERCENTAGE
if (coupon.type === "percentage" && coupon.maxPurchase && currentSubtotal > coupon.maxPurchase) {
  feedback.textContent =
    `Coupon valid only up to ₹${coupon.maxPurchase}`;
  feedback.classList.add("error");
  return;
}




  // ✅ APPLY COUPON
  applyCoupon();
}


function applyCouponFromCard(code) {
  document.getElementById("couponInput").value = code;
  applyCoupon();
}


async function applyCoupon() {
  const code = document.getElementById("couponInput").value.trim();

  if (!code) {
    showCouponMessage("Please enter a coupon code", "error");
    return;
  }

  try {
    const res = await apiFetch(
      "https://envastore.online/api/user/orders/validate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("userToken")}`
        },
        body: JSON.stringify({
          couponCode: code,
          subtotal: currentSubtotal
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      showCouponMessage(data.message, "error");
      return;
    }

    // ✅ VALID COUPON
    appliedCoupon = data;

// 🔥 CALCULATE DISCOUNT
// 🔥 CALCULATE DISCOUNT
if (data.type === "flat") {
  // ✅ Prevent flat discount from exceeding subtotal
  couponDiscountAmount = Math.min(data.flatAmount, currentSubtotal);
} else {
  couponDiscountAmount =
    (currentSubtotal * data.discountPercent) / 100;

  if (data.maxPurchase) {
    couponDiscountAmount = Math.min(
      couponDiscountAmount,
      data.maxPurchase
    );
  }
}



    document.getElementById("couponRow").classList.remove("d-none");
    document.getElementById("couponLabel").textContent =
      `Coupon (${data.code})`;
    document.getElementById("couponDiscount").textContent =
      `- ₹${couponDiscountAmount.toFixed(2)}`;

    showCouponMessage(
      `Coupon ${data.code} applied (${
  data.type === "flat"
    ? `₹${data.flatAmount} OFF`
    : `${data.discountPercent}% OFF`
})

       <span style="color:#c62828; cursor:pointer; margin-left:8px;"
         onclick="removeCoupon()">Remove</span>`,
      "success"
    );

    updateSummaryTotals(currentSubtotal);

  } catch (err) {
    showCouponMessage("Something went wrong", "error");
  }
}



function removeCoupon() {
  appliedCoupon = null;
  couponDiscountAmount = 0;

  // Reset input
  const input = document.getElementById("couponInput");
  input.value = "";
  input.disabled = false;

  // Hide applied row
  document.getElementById("couponRow").classList.add("d-none");

  // Remove green message
  document.getElementById("couponFeedback").innerHTML = "";

  updateSummaryTotals(currentSubtotal);
}


function updateSummaryTotals(subtotal) {
  const selectedShipping =
    document.querySelector('input[name="shippingMethod"]:checked');

  const shipping = selectedShipping ? Number(selectedShipping.value) : 0;
  const tax = subtotal * 0.07;

  let total =
    subtotal + shipping + tax - couponDiscountAmount;

  if (total < 0) total = 0;

  document.getElementById("subtotal").textContent =
    `₹${subtotal.toFixed(2)}`;

  document.getElementById("shipping").textContent =
    `₹${shipping.toFixed(2)}`;

  document.getElementById("tax").textContent =
    `₹${tax.toFixed(2)}`;

  document.getElementById("total").textContent =
    `₹${total.toFixed(2)}`;

  const btn = document.getElementById("placeOrderBtn");
  if (btn) {
    btn.textContent = `Place Order – ₹${total.toFixed(2)}`;
  }
}





document.addEventListener("DOMContentLoaded", () => {
  loadSavedAddresses();
});

let addressMap = {};

async function loadSavedAddresses() {
  const token = localStorage.getItem("userToken");
  if (!token) return;

  const res = await apiFetch("https://envastore.online/api/user/address", {
    headers: { Authorization: `Bearer ${token}` }
  });

  const addresses = await res.json();

  // 🚨 No address → redirect
  if (!addresses.length) {
    window.location.href = "address.html";
    return;
  }

  // ✅ Pick default OR first
  const addr = addresses.find(a => a.isDefault) || addresses[0];

  // Fill hidden fields
  email.value = addr.email || "";
  firstName.value = addr.firstName || "";
  lastName.value = addr.lastName || "";
  phone.value = addr.phone || "";
  address.value = addr.street || "";
  city.value = addr.city || "";
  state.value = addr.state || "";
  zip.value = addr.postcode || "";

  // ✅ Render UI
  document.getElementById("addressList").innerHTML = `
    <div class="saved-address-card">

      <div class="address-header">
        <span class="fw-semibold">Delivering To</span>

        <button
          type="button"
          class="btn btn-sm btn-outline-dark"
          onclick="window.location.href='address.html'"
        >
          Change Address
        </button>
      </div>

      <div class="address-content">

        ${addr.firstName || addr.lastName ? `
          <div><strong>Name:</strong> ${addr.firstName || ""} ${addr.lastName || ""}</div>
        ` : ""}

        ${addr.email ? `
          <div><strong>Email:</strong> ${addr.email}</div>
        ` : ""}

        ${addr.phone ? `
          <div><strong>Phone:</strong> ${addr.phone}</div>
        ` : ""}

        ${addr.city ? `
          <div><strong>City:</strong> ${addr.city}</div>
        ` : ""}

        ${addr.postcode ? `
          <div><strong>Pincode:</strong> ${addr.postcode}</div>
        ` : ""}

        <div>
          <strong>Address:</strong>
          ${addr.street}, ${addr.state}
        </div>

      </div>
    </div>
  `;
}





function selectAddress(id){
  document.querySelectorAll(".address-card").forEach(c => c.classList.remove("active"));

  const addr = [...document.querySelectorAll(".address-card")]
    .find(c => c.innerHTML.includes(id));

  const selected = window.currentAddresses.find(a => a._id === id);
  fillHiddenAddress(selected);

  // highlight
  event.currentTarget.classList.add("active");
}

function fillHiddenAddress(addr){
  if(!addr) return;


  email.value = addr.email || "";
  firstName.value = addr.firstName || "";
  lastName.value = addr.lastName || "";
  phone.value = addr.phone || "";
  address.value = addr.street || "";
  city.value = addr.city || "";
  state.value = addr.state || "";
  zip.value = addr.postcode || "";
}



window.loadAddress = function (addressId) {
  if (!addressId) return;
  
  const addr = addressMap[addressId];
  if (!addr) return;


  document.getElementById("email").value = addr.email || "";
  document.getElementById("firstName").value = addr.firstName || "";
  document.getElementById("lastName").value = addr.lastName || "";
  document.getElementById("address").value = addr.street || "";
  document.getElementById("city").value = addr.city || "";
  document.getElementById("state").value = addr.state || "";
  document.getElementById("zip").value = addr.postcode || "";
  document.getElementById("phone").value = addr.phone || ""; // ✅ ADD

};


async function placeOrder(paymentMethod, paymentIntentId = null) {
  const token = localStorage.getItem("userToken");

  const res = await apiFetch("https://envastore.online/api/user/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      shippingAddress: {
        email: email.value,
        firstName: firstName.value,
        lastName: lastName.value,
        street: address.value,
        city: city.value,
          phone: phone.value,
        state: state.value,
        zip: zip.value
      },
      shippingMethod:
        document.querySelector('input[name="shippingMethod"]:checked').id ===
        "expressShipping"
          ? "express"
          : "standard",

      paymentMethod,
      paymentIntentId,
      couponCode: appliedCoupon ? appliedCoupon.code : null
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Order failed");
  }

  return res.json();
}


const orderForm = document.querySelector(".checkout-form form");
const placeOrderBtn = document.getElementById("placeOrderBtn");


orderForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (placeOrderBtn.disabled) return;

  const selectedRadio = document.querySelector(
    'input[name="paymentMethod"]:checked'
  );

  if (!selectedRadio) {
    showToast("Please select a payment method", "warning");
    return;
  }

  const selectedMethod = selectedRadio.value;
  const loader = document.getElementById("paymentLoader");

  const totalText = document.getElementById("total").textContent;
  const total = Number(totalText.replace(/[^\d.]/g, ""));

  if (!total || total <= 0) {
    showToast("Invalid order total", "error");

    return;
  }

  // ================================
  // 🔒 STOCK CHECK (ADD THIS HERE)
  // ================================
  const stockCheck = await validateCartStockBeforeCheckout();

  if (!stockCheck.valid) {
    if (stockCheck.issues?.length) {
    
const msg = stockCheck.issues
  .map(i => `${i.product} (${i.size}) – ${i.reason}`)
  .join("\n");

showStockPopup(
  "Some items are out of stock:\n\n" + msg
);
return;

    } else {
      showStockPopup(stockCheck.message || "Stock unavailable");

    }

    return; // ⛔ STOP PAYMENT FLOW COMPLETELY
  }

  // ✅ ONLY AFTER STOCK IS OK
  try {
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = "Processing…";
    console.log(selectedMethod);

    // ================================
    // 💳 STRIPE
    // ================================
    if (selectedMethod === "stripe") {
      loader?.classList.remove("d-none");

      const selectedShipping = document.querySelector(
        'input[name="shippingMethod"]:checked'
      );

      const shippingMethod =
        selectedShipping?.id === "expressShipping" ? "express" : "standard";

      const shippingPrice = Number(selectedShipping?.value || 15);

      const res = await apiFetch(
        "https://envastore.online/api/payment/create-checkout-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("userToken")}`
          },
          body: JSON.stringify({
            amount: Math.round(total * 100),
            shippingAddress: {
              email: email.value,
              firstName: firstName.value,
              lastName: lastName.value,
              street: address.value,
              city: city.value,
              state: state.value,
               phone: phone.value, 
              zip: zip.value
            },
            shippingMethod,
            shippingPrice
          })
        }
      );

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error("Stripe session creation failed");
      }

      window.location.href = data.url;
      return;
    }

    // ================================
    // 👛 WALLET
    // ================================
    if (selectedMethod === "wallet") {
      loader?.classList.remove("d-none");

      const walletRes = await apiFetch(
        "https://envastore.online/api/user/wallet",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("userToken")}`
          }
        }
      );

      const walletData = await walletRes.json();

      if (walletData.balance < total) {
        loader?.classList.add("d-none");
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = "Place Order";
showToast("Insufficient wallet balance", "error");
        return;
      }

      const order = await placeOrder("wallet");
      redirectToThankYou(order.orderId);
      return;
    }

    // ================================
    // 💵 CASH ON DELIVERY
    // ================================
    const order = await placeOrder("cod");
    redirectToThankYou(order.orderId);

  } catch (err) {
  console.error("CHECKOUT ERROR:", err);

  const msg = err.message || "Order failed";

  // 🔒 STOCK ERROR FROM BACKEND
  if (
    msg.toLowerCase().includes("insufficient stock") ||
    msg.toLowerCase().includes("only")
  ) {
    showStockPopup(
      msg + "\n\nPlease update your cart."
    );
    return;
  }

  showToast("Order failed. Please try again.", "error");
}


});







document.addEventListener("DOMContentLoaded", () => {

  const continueBtn = document.getElementById("continueShoppingBtn");
  const viewOrdersBtn = document.getElementById("viewOrdersBtn");

  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      window.location.href = "./products.html";
    });
  }

  if (viewOrdersBtn) {
    viewOrdersBtn.addEventListener("click", () => {
      window.location.href = "./orders.html";
    });
  }

});  

function showCouponMessage(message, type = "success") {
  const box = document.getElementById("couponFeedback");

  if (!box) return;

  box.className = "coupon-feedback"; // reset classes

  if (type === "error") {
    box.classList.add("error");
    box.innerHTML = `
      <div class="coupon-error">
        ${message}
      </div>
    `;
  } else {
    box.classList.add("success");
    box.innerHTML = `
      <div class="coupon-success">
        ${message}
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);

  if (params.get("payment") === "success") {
    redirectToThankYou();
  }

  if (params.get("payment") === "cancel") {
   showToast("Payment cancelled. You can try again.", "warning");

    window.history.replaceState({}, document.title, "checkout.html");
  }
});


async function loadWalletBalance() {
  try {
    const res = await apiFetch("https://envastore.online/api/user/wallet", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("userToken")}`
      }
    });

    const data = await res.json();
    walletBalance = Number(data.balance) || 0;

    document.getElementById("walletBalance").textContent =
      `₹${walletBalance.toFixed(2)}`;

    // updateWalletPayable(); // 🔥 IMPORTANT
  } catch (err) {
    console.error("Wallet load failed");
  }
}

document.addEventListener("DOMContentLoaded", loadWalletBalance);

async function redirectToThankYou(orderId = null) {
  const overlay = document.getElementById("statusOverlay");
  const loaderIcon = document.getElementById("loaderIcon");
  const successIcon = document.getElementById("successIcon");
  const heading = document.getElementById("statusHeading");
  const subtext = document.getElementById("statusSubtext");

  // 1. Reveal Overlay
  overlay.classList.remove("d-none");

  // 2. Hold loader (simulate processing)
  await new Promise(resolve => setTimeout(resolve, 2500));

  // 3. Transition to success
  loaderIcon.classList.add("d-none");
  successIcon.classList.remove("d-none");

  heading.textContent = "Order Confirmed";
  subtext.textContent = "Your journey begins now.";
  heading.classList.add("text-fade-in");

  // 4. Final redirect
  setTimeout(() => {
    document.body.classList.add("page-fade-out");
    setTimeout(() => {
      window.location.href = `thankyou.html?order=${orderId}`
      
    }, 800);
  }, 2000);
}



function showToast(message, type = "success") {
  const toastBox = document.getElementById("toastBox");
  if (!toastBox) return;

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

document.getElementById("existingAddress")?.addEventListener("change", e => {
  const addr = addressMap[e.target.value];
  if (!addr) return;

  document.getElementById("email").value = addr.email || "";
  document.getElementById("firstName").value = addr.firstName || "";
  document.getElementById("lastName").value = addr.lastName || "";
  document.getElementById("address").value = addr.street || "";
  document.getElementById("city").value = addr.city || "";
  document.getElementById("state").value = addr.state || "";
  document.getElementById("zip").value = addr.postcode || "";
});


async function validateCartStockBeforeCheckout() {
  const token = localStorage.getItem("userToken");

  const res = await apiFetch("https://envastore.online/api/user/cart", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const cart = await res.json();

  if (!cart.items || !cart.items.length) {
    return { valid: false, message: "Your cart is empty" };
  }

  const stockIssues = [];

  cart.items.forEach(item => {
    const availableStock = item.product?.sizes?.[item.size] ?? 0;

    if (availableStock === 0) {
      stockIssues.push({
        product: item.product.name,
        size: item.size,
        reason: "Out of stock"
      });
    } else if (item.quantity > availableStock) {
      stockIssues.push({
        product: item.product.name,
        size: item.size,
        reason: `Only ${availableStock} left`
      });
    }
  });

  if (stockIssues.length) {
    return { valid: false, issues: stockIssues };
  }

  return { valid: true };
}


function showStockPopup(message) {
  document.getElementById("stockErrorMessage").innerText = message;

  const modal = new bootstrap.Modal(
    document.getElementById("stockErrorModal"),
    {
      backdrop: "static", // ⛔ cannot click outside
      keyboard: false     // ⛔ cannot press ESC
    }
  );

  modal.show();
}

function goToCart() {
  window.location.href = "cart.html";
}
