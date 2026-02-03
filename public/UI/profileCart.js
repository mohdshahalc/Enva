  document.addEventListener("DOMContentLoaded", loadCart);
  let isUpdatingQty = false;

  async function loadCart() {
    const token = localStorage.getItem("userToken");

    if (!token) {
      window.location.href = "login.html";
      return;
    }

    try {
      const res = await fetch("https://envastore.online/api/user/cart", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // 🚫 BLOCKED USER
      if (res.status === 403) {
        const data = await res.json();
        showToast(data.message || "Your account has been blocked", "error");

        localStorage.removeItem("userToken");
        window.location.href = "login.html";
        return;
      }

    

      // ✅ SUCCESS
      const cart = await res.json();
      renderCart(cart);

    } catch (err) {
      console.error(err);
      showToast("Failed to load cart", "error");
    }
  }


  function renderCart(cart) {
    const cartItems = document.getElementById("cartItemsList");
    const emptyCart = document.getElementById("emptyCart");
    const summaryCard = document.querySelector(".cart-summary-card");

    // 🛑 EMPTY CART — SAME LOGIC AS cart.js
    if (!cart.items || cart.items.length === 0) {
      cartItems.innerHTML = "";
      emptyCart.classList.remove("d-none");
      summaryCard.classList.add("d-none");
      updateSummary(0);
      return;
    }

    // ✅ CART HAS ITEMS
    emptyCart.classList.add("d-none");
    summaryCard.classList.remove("d-none");

    let subtotal = 0;

cartItems.innerHTML = cart.items
  .map(item => {
    const product = item.product;
    const quantity = item.quantity;
    const size = item.size; // ✅ FIX
    const unitPrice = product.price;
    const itemTotal = unitPrice * quantity;

    subtotal += itemTotal;

    return `
      <div class="cart-item d-flex gap-3">
        <img src="/uploads/${product.images[0]}" class="cart-img">

        <div class="flex-grow-1">
          <div class="d-flex justify-content-between">
            <h6 class="fw-bold mb-1">${product.name}</h6>
            <button class="btn btn-sm text-danger p-0 border-0"
              onclick="removeFromCart('${product._id}', '${size}')">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>

          <div class="d-flex justify-content-between align-items-center">
            <div class="qty-control">
              <button class="qty-btn"
                onclick="updateQuantity('${product._id}', '${size}', ${quantity - 1})">-</button>

              <input type="text" class="qty-input" value="${quantity}" readonly>

              <button class="qty-btn"
                onclick="updateQuantity('${product._id}', '${size}', ${quantity + 1})">+</button>
            </div>

            <span class="fw-bold">₹${itemTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    `;
  })
  .join("");

    updateSummary(subtotal);
  }

  function updateSummary(subtotal) {
    const shipping = subtotal === 0 ? 0 : 15;
    const tax = subtotal === 0 ? 0 : subtotal * 0.07;
    const total = subtotal + shipping + tax;

    document.getElementById("subtotal").textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById("shipping").textContent =
      shipping === 0 ? "FREE" : `₹${shipping.toFixed(2)}`;
    document.getElementById("tax").textContent = `₹${tax.toFixed(2)}`;
    document.getElementById("total").textContent = `₹${total.toFixed(2)}`;
  }


function updateQuantity(productId, size, quantity) {
  if (quantity < 1 || isUpdatingQty) return;

  isUpdatingQty = true;

  fetch("https://envastore.online/api/user/cart/update", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("userToken")}`,
    },
    body: JSON.stringify({ productId, size, quantity }),
  })
    .then(res => res.json())
    .then(data => {
      if (data.cart) {
        renderCart(data.cart);
      } else {
        showToast(data.message || "Failed to update quantity", "error");
      }
    })
    .catch(() => {
      showToast("Failed to update quantity", "error");
    })
    .finally(() => {
      isUpdatingQty = false;
    });
}

function removeFromCart(productId, size) {
  if (!confirm(`Remove size ${size} from cart?`)) return;

  apiFetch(`https://envastore.online/api/user/cart/remove/${productId}/${size}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("userToken")}`
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data.cart) {
        renderCart(data.cart);
        showToast("Item removed from cart", "success");
      }
    })
    .catch(() => {
      showToast("Failed to remove item", "error");
    });
}


  document.addEventListener("DOMContentLoaded", loadUserName);

  async function loadUserName() {
    const token =  localStorage.getItem("userToken")

    if (!token) return;

    const res = await apiFetch("https://envastore.online/api/user/profile", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const user = await res.json();

    // user.name already contains "First Last"
    document.getElementById("fullName").textContent = user.name || "";
  } 

  function showToast(message, type = "info") {
  const toastBox = document.getElementById("toastBox");
  if (!toastBox) {
    alert(message); // fallback
    return;
  }

  const toast = document.createElement("div");
  toast.className = `custom-toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;

  toastBox.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}
