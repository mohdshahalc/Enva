let currentSubtotal = 0;
let couponDiscountAmount = 0;
let allCoupons = [];
let appliedCoupon = null;
let walletBalance = 0;

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
      invalid.push({ ...c, reason: "Expired" });
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
  renderCouponList("usedCouponList", used, "used");
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
           ${c.discountPercent}% OFF • ₹${c.minPurchase} – ₹${c.maxPurchase}
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
                onclick="applyCouponFromCard('${c.code}', ${c.discountPercent})">
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

  // 🔴 MAX PURCHASE CHECK (🔥 THIS WAS MISSING)
  if (coupon.maxPurchase && currentSubtotal > coupon.maxPurchase) {
    feedback.textContent =
      `Coupon valid only up to ₹${coupon.maxPurchase}`;
    feedback.classList.add("error");
    return;
  }

  // ✅ APPLY COUPON
  applyCoupon(coupon.code, coupon.discountPercent);
}


function applyCouponFromCard(code, discountPercent) {
  document.getElementById("couponInput").value = code;
  applyCoupon(code, discountPercent);
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
    appliedCoupon = {
      code: data.code,
      discountPercent: data.discountPercent
    };

    couponDiscountAmount =
      (currentSubtotal * data.discountPercent) / 100;

    document.getElementById("couponRow").classList.remove("d-none");
    document.getElementById("couponLabel").textContent =
      `Coupon (${data.code})`;
    document.getElementById("couponDiscount").textContent =
      `- ₹${couponDiscountAmount.toFixed(2)}`;

    showCouponMessage(
      `Coupon ${data.code} applied (${data.discountPercent}% OFF)
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

  const total =
    subtotal + shipping + tax - couponDiscountAmount;

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
  const token = localStorage.getItem("userToken")
  if (!token) return;

  const res = await apiFetch("https://envastore.online/api/user/address", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const addresses = await res.json();
  console.log(addresses);
  
  const select = document.getElementById("existingAddress");

  if (!select) return;

  // reset dropdown
  select.innerHTML = `
    <option value="" selected disabled>
      Select or Enter a New Address...
    </option>
  `;

  addresses.forEach(addr => {
    addressMap[addr._id] = addr;

    const option = document.createElement("option");
    option.value = addr._id;
    option.textContent =
      `${addr.type}: ${addr.street}, ${addr.city}, ${addr.postcode}`;

    select.appendChild(option);
  });

  // ✅ THIS IS THE MISSING PART
  select.addEventListener("change", (e) => {
    loadAddress(e.target.value);
  });
}


window.loadAddress = function (addressId) {
  if (!addressId) return;

  const addr = addressMap[addressId];
  if (!addr) return;
console.log(addr.state);

  document.getElementById("email").value = addr.email || "";
  document.getElementById("firstName").value = addr.firstName || "";
  document.getElementById("lastName").value = addr.lastName || "";
  document.getElementById("address").value = addr.street || "";
  document.getElementById("city").value = addr.city || "";
  document.getElementById("state").value = addr.state || "";
  document.getElementById("zip").value = addr.postcode || "";
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
    alert("Please select a payment method");
    return;
  }

  const selectedMethod = selectedRadio.value; // ✅ use value
  const loader = document.getElementById("paymentLoader");

  const totalText = document.getElementById("total").textContent;
  const total = Number(totalText.replace(/[^\d.]/g, ""));

  if (!total || total <= 0) {
    alert("Invalid order total");
    return;
  }

  try {
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = "Processing…";
    console.log(selectedMethod);
    
    // ================================
    // 💳 STRIPE
    // ================================
    if (selectedMethod === "stripe") {
  loader?.classList.remove("d-none");

  // ✅ GET SHIPPING METHOD
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

        // 🔥 SEND SHIPPING DATA TO STRIPE
        shippingAddress: {
          email: email.value,
          firstName: firstName.value,
          lastName: lastName.value,
          street: address.value,
          city: city.value,
          state: state.value,
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

  setTimeout(() => {
    window.location.href = data.url;
  }, 400);

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

  // ❌ INSUFFICIENT BALANCE
  if (walletData.balance < total) {
    loader?.classList.add("d-none");
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = "Place Order";

    const overlay = document.getElementById("walletOverlay");
    const msg = document.getElementById("walletOverlayMsg");

    msg.innerText =
      `Your wallet balance is ₹${walletData.balance}, ` +
      `but your order total is ₹${total}.`;

    document.getElementById("rechargeWalletBtn").onclick = () => { window.location.href = "wallet.html"; }; document.getElementById("changePaymentBtn").onclick = () => { overlay.classList.add("d-none"); document.getElementById("wallet").checked = false; };

    overlay.classList.remove("d-none");
    return;
  }

  try {
    // ⏳ ENSURE LOADER VISIBLE FOR 2 SECONDS
    // await wait(2000);

    // ✅ PLACE ORDER
    const order = await placeOrder("wallet");

loader?.classList.add("d-none");
placeOrderBtn.textContent = "Order Placed ✓";
placeOrderBtn.disabled = true;

redirectToThankYou(order.orderId);

  } catch (err) {
    console.error(err);
    loader?.classList.add("d-none");
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = "Place Order";
    showToast(err.message || "Wallet payment failed", "error");
  }

  return;
}



    // ================================
    // 💵 CASH ON DELIVERY
    // ================================
    const order = await placeOrder("cod");

    placeOrderBtn.textContent = "Order Placed ✓";
    redirectToThankYou(order.orderId);

  } catch (err) {
    console.error("CHECKOUT ERROR:", err);

    loader?.classList.add("d-none");
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = "Place Order";

    alert("Payment failed. Please try again.");
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
    alert("Payment cancelled. You can try again.");
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
