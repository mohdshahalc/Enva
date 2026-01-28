document.addEventListener("DOMContentLoaded", loadWishlist);

async function loadWishlist() {
  const token = localStorage.getItem("userToken");

 if (!token) {
  const modal = new bootstrap.Modal(
    document.getElementById("loginRequiredModal")
  );
  modal.show();
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
      alert(data.message || "Your account has been blocked");

      localStorage.removeItem("userToken");
      window.location.href = "login.html";
      return;
    }

 

    // ✅ SUCCESS
    const data = await res.json();
    renderWishlist(data.items);

  } catch (err) {
    console.error(err);
    alert("Failed to load wishlist");
  }
}

function renderWishlist(items) {
  console.log(items);
  
  const box = document.getElementById("wishlistItems");
  const emptyBox = document.getElementById("emptyWishlist");

  // ✅ REMOVE NULL PRODUCTS
  const validItems = (items || []).filter(item => item.product);

  if (!validItems.length) {
    box.innerHTML = "";
    emptyBox.classList.remove("d-none");
    return;
  }

  emptyBox.classList.add("d-none");
box.innerHTML = validItems.map(item => {
  const { product, size, finalPrice, oldPrice, discountPercent } = item;

  return `
    <div class="wishlist-item">
      <div class="item-image-wrapper">
        <img 
          src="/uploads/${product.images?.[0] || "placeholder.png"}" 
          class="item-image"
          alt="${product.name}"
        >
      </div>

      <div class="item-info-main">
        <div class="title-row">
          <h3>${product.name}</h3>
          <span class="item-status">In Stock</span>
        </div>

        <p class="product-description">
          ${product.description || "No description available for this premium piece."}
        </p>

        <p class="small text-muted">
          Size: <strong>${size}</strong>
        </p>
      </div>

      <div class="item-actions">
        <div class="price-container">
            <p class="item-price">
              ₹${finalPrice}
              ${
                oldPrice
                  ? `<span class="text-muted text-decoration-line-through ms-2">₹${oldPrice}</span>`
                  : ""
              }
            </p>
        </div>

        ${
          discountPercent
            ? `<span class="badge bg-danger mb-2">${discountPercent}% OFF</span>`
            : ""
        }

        <a 
          href="singleProduct.html?id=${product._id}"
          class="btn btn-outline-secondary btn-sm mb-2 w-100"
        >
          <i class="fas fa-eye me-2"></i> View
        </a>

        <button 
          class="btn btn-dark btn-sm mb-2 w-100"
          onclick="addWishlistItemToCart('${product._id}', '${size}')"
        >
          <i class="fas fa-cart-plus me-2"></i> Add to Cart
        </button>

        <button 
  class="remove-btn w-100"
  onclick="removeWishlistItem('${product._id}', '${size}')"
>

          <i class="fas fa-trash-alt me-1"></i> Remove
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
        quantity: 1,        // ✅ default
        size                // ✅ from wishlist
      })
    });

    // 🚫 BLOCKED USER
    if (res.status === 403) {
      const data = await res.json();
      alert(data.message || "Your account has been blocked");

      localStorage.removeItem("userToken");
      window.location.href = "login.html";
      return;
    }

    const data = await res.json();

    if (data.status === "exists") {
      showToast(
        "Item already in cart. <a href='cart.html' style='color:#fff;text-decoration:underline'>View Cart</a>",
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
//       removeWishlistItem(productId);
//       showToast("Moved to cart", "success");
//     });
// }


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
