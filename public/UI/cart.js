document.addEventListener("DOMContentLoaded", loadCart);

async function loadCart() {
  const token = localStorage.getItem("userToken");

     if (!token) {
    const modal = new bootstrap.Modal(
      document.getElementById("loginRequiredModal")
    );
    modal.show();
    return;
  }

  try {
    const res = await apiFetch("https://envastore.online/api/user/cart", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // 🚫 BLOCKED USER
    if (res.status === 403) {
      const data = await res.json();
      alert(data.message || "Your account has been blocked");

      // clear ONLY user token
      localStorage.removeItem("userToken");
      window.location.href = "login.html";
      return;
    }

  

    // ✅ SUCCESS
    const cart = await res.json();
    renderCart(cart);

  } catch (err) {
    console.error(err);
    alert("Failed to load cart");
  }
}



function renderCart(cart) {

  const cartItems = document.getElementById("cartItems");
  const emptyCart = document.getElementById("emptyCart");
  const cartRight = document.getElementById("cartRight");
  const cartContinue = document.getElementById("cartContinue");
  const title = document.getElementById("cartTitle");

  if (!cart.items || cart.items.length === 0) {
    cartItems.innerHTML = "";
    emptyCart.classList.remove("d-none");
    cartRight.classList.add("d-none");
    cartContinue.classList.remove("d-none");

    title.textContent = "Your Shopping Bag (0 Items)";
    updateSummary(0);
    return;
  }

  emptyCart.classList.add("d-none");
  cartRight.classList.remove("d-none");
  cartContinue.classList.remove("d-none");

  title.textContent = `Your Shopping Bag (${cart.items.length} Items)`;

  let subtotal = 0;

  cartItems.innerHTML = cart.items.map(item => {
    const product = item.product;
    const quantity = item.quantity;
    const size = item.size;

    // ✅ USE OFFER PRICE
    const unitPrice = item.finalPrice ?? product.price;
    const itemTotal = unitPrice * quantity;

    subtotal += itemTotal;

   return `
  <div class="cart-item">
    <div class="item-details">
      <img src="/uploads/${product.images[0]}" class="item-image">

      <div class="item-info">
        <h3>${product.name}</h3>

        <p class="item-meta">
          Size: <strong>${size}</strong>
        </p>

        ${
          item.discountPercent
            ? `
              <div class="cart-price-box">
                <span class="cart-price-current">
                  ₹${unitPrice.toFixed(2)}
                </span>

                <div class="cart-price-old-line">
                  <span class="cart-price-old">
                    ₹${item.oldPrice.toFixed(2)}
                  </span>
                  <span class="cart-offer-badge">
                    ${item.discountPercent}% OFF
                  </span>
                </div>
              </div>
            `
            : `
              <p class="item-meta">
                Price: ₹${unitPrice.toFixed(2)}
              </p>
            `
        }

        <p class="item-price-mobile">
          ₹${itemTotal.toFixed(2)}
        </p>
      </div>
    </div>

    <div class="item-actions">
      <div class="quantity-control">
        <button class="qty-btn"
          onclick="updateQuantity('${product._id}', '${size}', ${quantity - 1})">−</button>

        <input type="text" class="qty-input" value="${quantity}" readonly>

        <button class="qty-btn"
          onclick="updateQuantity('${product._id}', '${size}', ${quantity + 1})">+</button>
      </div>

      <p class="item-price">
        ₹${itemTotal.toFixed(2)}
      </p>

      <button class="remove-btn"
        onclick="removeFromCart('${product._id}', '${size}')">
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>
  </div>
`;

  }).join("");

  updateSummary(subtotal);
}





function updateSummary(subtotal) {
  const shipping = subtotal === 0 ? 0 : 15;   // ✅ key logic
  const tax = subtotal === 0 ? 0 : subtotal * 0.07;
  const total = subtotal + shipping + tax;

  document.getElementById("subtotal").textContent = `₹${subtotal.toFixed(2)}`;
  document.getElementById("shipping").textContent = `₹${shipping.toFixed(2)}`;
  document.getElementById("tax").textContent = `₹${tax.toFixed(2)}`;
  document.getElementById("total").textContent = `₹${total.toFixed(2)}`;
}

let isUpdatingQty = false;

function updateQuantity(productId, size, quantity) {
  if (quantity < 1 || isUpdatingQty) return;

  isUpdatingQty = true;

  apiFetch("https://envastore.online/api/user/cart/update", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("userToken")}`
    },
    body: JSON.stringify({ productId, size, quantity })
  })
    .then(res => res.json())
    .then(data => {
      if (data.cart) {
        renderCart(data.cart);
      } else {
        showToast(data.message || "Failed to update", "error");
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


  const encodedSize = encodeURIComponent(size);
 
  apiFetch(
    `https://envastore.online/api/user/cart/remove/${productId}/${encodedSize}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("userToken")}`
      }
    }
  )
    .then(res => {
      if (!res.ok) throw new Error("Remove failed");
      return res.json();
    })
    .then(data => {
      renderCart(data.cart);
      showToast("Item removed from cart", "success");
    })
    .catch(err => {
      console.error(err);
      showToast("Failed to remove item", "error");
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



function redirectToLogin() {
  window.location.href = "login.html";
}

function redirectToProducts() {
  window.location.href = "home.html";
}