document.addEventListener("DOMContentLoaded", loadWishlist);

async function loadWishlist() {
  const token = localStorage.getItem("userToken");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await apiFetch("http://localhost:5000/api/user/wishlist", {
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
    const data = await res.json();
    renderWishlist(data.items);

  } catch (err) {
    console.error(err);
    showToast("Failed to load wishlist", "error");
  }
}

function renderWishlist(items) {
  const box = document.getElementById("wishlistContainer");
  const countEl = document.getElementById("wishlistCount");
  const emptyBox = document.getElementById("emptyWishlist");

  if (!box || !countEl || !emptyBox) {
    console.error("Wishlist DOM elements missing");
    return;
  }

  // ✅ FILTER OUT NULL PRODUCTS
  const validItems = (items || []).filter(item => item.product);

  if (validItems.length === 0) {
    countEl.textContent = "0";
    box.innerHTML = "";
    emptyBox.classList.remove("d-none");
    return;
  }

  emptyBox.classList.add("d-none");
  countEl.textContent = validItems.length;
box.innerHTML = validItems.map(item => {
  const { product, size, finalPrice, oldPrice, discountPercent } = item;

  return `
    <div class="wishlist-item wishlist-flex d-flex align-items-center justify-content-between gap-3">


      <div class="d-flex align-items-center gap-3">
        <img src="/uploads/${product.images?.[0] || "placeholder.png"}"
             class="wishlist-img">

        <div class="item-details">
          <span class="sidebar-label p-0 mb-1" style="font-size:9px;">Saved</span>

          <h6>${product.name}</h6>

          <div class="d-flex align-items-center gap-2">
            <span class="item-price">₹${finalPrice || product.price}</span>

            ${
              oldPrice
                ? `<span class="text-muted text-decoration-line-through small">
                     ₹${oldPrice}
                   </span>`
                : ""
            }

            ${
              discountPercent
                ? `<span class="badge bg-danger">
                     ${discountPercent}% OFF
                   </span>`
                : ""
            }
          </div>

          <p class="small text-muted mb-0">
            Size: <strong>${size}</strong>
          </p>

          <p class="small text-success mt-1 mb-0">
            <i class="fa-solid fa-check-circle me-1"></i> In Stock
          </p>
        </div>
      </div>

      <div class="item-actions d-flex align-items-center gap-2">
        <button class="btn btn-dark btn-sm"
          onclick="addWishlistItemToCart('${product._id}', '${size}')">
          <i class="fa-solid fa-cart-plus"></i>
        </button>

        <a href="singleProduct.html?id=${product._id}" class="view-product-btn">
          View
        </a>

        <button class="remove-wish-btn"
 onclick="removeWishlistItem('${product._id}', '${size}')">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    </div>
  `;
}).join("");

}

async function addWishlistItemToCart(productId, size) {
  const token = localStorage.getItem("userToken");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await apiFetch("http://localhost:5000/api/user/cart/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        productId,
        size,
        quantity: 1
      })
    });

    // 🚫 BLOCKED USER
    if (res.status === 403) {
      const data = await res.json();
      showToast(data.message || "Your account has been blocked", "error");
      localStorage.removeItem("userToken");
      window.location.href = "login.html";
      return;
    }

    const data = await res.json();

    if (data.status === "exists") {
      showToast(
        "Already in cart. <a href='cart.html' style='color:#fff;text-decoration:underline'>View Cart</a>",
        "info"
      );
    } else if (res.ok) {
      showToast("Added to cart successfully", "success");
    } else {
      showToast(data.message || "Failed to add to cart", "error");
    }

  } catch (err) {
    console.error(err);
    showToast("Server error", "error");
  }
}


/* ❌ REMOVE FROM WISHLIST */
function removeWishlistItem(productId, size) {
  apiFetch(
    `http://localhost:5000/api/user/wishlist/remove/${productId}/${size}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("userToken")}`
      }
    }
  )
    .then(() => loadWishlist())
    .then(() => showToast("Removed from wishlist", "success"))
    .catch(() => showToast("Remove failed", "error"));
}


/* 🛒 MOVE TO CART */
// function moveToCart(productId) {
//   fetch("http://localhost:5000/api/user/cart/add", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${localStorage.getItem("userToken")}`
//     },
//     body: JSON.stringify({ productId, quantity: 1 })
//   })
//     .then(() => {
//       showToast("Moved to cart", "success");
//       removeWishlistItem(productId);
//     })
//     .catch(() => showToast("Failed to move to cart", "error"));
// }

/* 🔔 TOAST (UNCHANGED LOGIC) */
function showToast(message, type = "success") {
  const toastBox = document.getElementById("toastBox");
  if (!toastBox) return;

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