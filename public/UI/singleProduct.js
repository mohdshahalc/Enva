let productSizes = {};
let selectedSize = null;

document.addEventListener("DOMContentLoaded", async () => {
  const qtyInput = document.getElementById("qtyInput");
if (qtyInput) qtyInput.disabled = true;
  // checkWishlistStatus();

  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) {
    console.error("Product ID missing in URL");
    return;
  }

  try {
    const res = await fetch(`https://envastore.online/api/user/products/${productId}`);

    if (!res.ok) {
      throw new Error("Product not found");
    }

    const product = await res.json();

    // ✅ IMPORTANT LINE (THIS FIXES THE ERROR)
    productSizes = product.sizes || {};
     console.log(product);
     
    renderSingleProduct(product);
    setupSizeButtons(); // ✅ activate size logic

  } catch (err) {
    console.error("Error loading product", err.message);
  }
});



function setupSizeButtons() {
  const stockText = document.getElementById("sizeStockText");
  const qtyInput = document.getElementById("qtyInput");

  // 🔒 Disable quantity until size selected
  if (qtyInput) {
    qtyInput.disabled = true;
    qtyInput.value = 1;
  }

  document.querySelectorAll(".size-btn").forEach(btn => {
    const size = btn.dataset.size;
    const stock = productSizes[size] || 0;

    // ❌ OUT OF STOCK
    if (stock === 0) {
      btn.disabled = true;
      btn.classList.add("disabled");
      return;
    }

    btn.addEventListener("click", () => {
      // remove active from all
      document.querySelectorAll(".size-btn")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");

      // ✅ SET SELECTED SIZE
      selectedSize = {
        label: size,
        stock
      };

      // ✅ ENABLE & RESET QUANTITY
      if (qtyInput) {
        qtyInput.disabled = false;
        qtyInput.value = 1;
      }
        checkWishlistStatus();
      // 🔴 LOW STOCK WARNING
      if (stock < 7) {
        stockText.textContent = `Only ${stock} left in size ${size}!`;
        stockText.classList.remove("text-muted");
        stockText.classList.add("text-danger", "fw-semibold");
      } else {
        stockText.textContent = "";
        stockText.classList.remove("text-danger", "fw-semibold");
        stockText.classList.add("text-muted");
      }
    });
  });
}


function renderSingleProduct(product) {

  /* ======================
     BASIC INFO
  ====================== */
  document.getElementById("productName").textContent = product.name;
  document.getElementById("productDesc").textContent = product.description;

  /* ======================
     PRICE + OFFER
  ====================== */
  const finalPriceEl = document.getElementById("productFinalPrice");
  const oldPriceEl = document.getElementById("productOldPrice");
  const offerBadgeEl = document.getElementById("offerBadge");

  // Reset
  oldPriceEl.textContent = "";
  oldPriceEl.classList.add("d-none");
  offerBadgeEl.classList.add("d-none");

  if (product.oldPrice && product.finalPrice && product.discountPercent) {
    finalPriceEl.textContent = `₹${product.finalPrice}`;
    oldPriceEl.textContent = `₹${product.oldPrice}`;
    oldPriceEl.classList.remove("d-none");

    offerBadgeEl.textContent = `${product.discountPercent}% OFF`;
    offerBadgeEl.classList.remove("d-none");
  } else {
    finalPriceEl.textContent = `₹${product.price}`;
  }

  /* ======================
     PRODUCT DETAILS TABLE
  ====================== */
  const table = document.getElementById("productDetailsTable");

  table.innerHTML = `
    <tr><td class="fw-semibold">Brand</td><td>: ${product.brand || "—"}</td></tr>
    <tr><td class="fw-semibold">Material</td><td>: ${product.material || "—"}</td></tr>
    <tr><td class="fw-semibold">Style</td><td>: ${product.style || "—"}</td></tr>
    <tr><td class="fw-semibold">Fit Type</td><td>: ${product.fitType || "—"}</td></tr>
    <tr>
      <td class="fw-semibold">Occasion</td>
      <td>: ${Array.isArray(product.occasion) ? product.occasion.join(", ") : "—"}</td>
    </tr>
  `;

  /* ======================
     MAIN IMAGE
  ====================== */
  const mainImg = document.getElementById("zoomImage");
  mainImg.src = `/uploads/${product.images[0]}`;

  /* ======================
     THUMBNAILS
  ====================== */
  const thumbs = document.getElementById("thumbImages");
  thumbs.innerHTML = "";

  product.images.forEach((img, index) => {
    thumbs.innerHTML += `
      <img 
        src="/uploads/${img}"
        class="thumb-img ${index === 0 ? "active-thumb" : ""}"
        onclick="changeImage(this)">
    `;
  });
}





async function handleAddToCart() {
  const token = localStorage.getItem("userToken");

  if (!token) {
  const modal = new bootstrap.Modal(
    document.getElementById("loginRequiredModal")
  );
  modal.show();
  return;
}


  if (!selectedSize) {
    showToast("Please select a size before adding to cart", "warning");
    return;
  }

  const productId = new URLSearchParams(window.location.search).get("id");
  const quantity = Number(document.getElementById("qtyInput")?.value || 1);

  // ❌ Quantity exceeds stock
  if (quantity > selectedSize.stock) {
    showToast(`Only ${selectedSize.stock} items available for this size`, "error");
    return;
  }

  try {
    const res = await fetch("https://envastore.online/api/user/cart/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        productId,
        quantity,
        size: selectedSize.label,   // "M"
      })
    });

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




let isWishlisted = false;

function handleAddToWishlist() {
  const token = localStorage.getItem("userToken");

  if (!token) {
  const modal = new bootstrap.Modal(
    document.getElementById("loginRequiredModal")
  );
  modal.show();
  return;
}


  // 🚫 SIZE REQUIRED
  if (!selectedSize || !selectedSize.label) {
    showToast("Please select a size first", "warning");
    return;
  }

  const productId = new URLSearchParams(window.location.search).get("id");
  const size = selectedSize.label.trim().toUpperCase(); // ✅ normalize once
  const encodedSize = encodeURIComponent(size);

  // ❤️ REMOVE from wishlist
  if (isWishlisted) {
    fetch(`https://envastore.online/api/user/wishlist/remove/${productId}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`
  }
})
      .then(res => res.json())
      .then(data => {
        if (data.status === "removed") {
          isWishlisted = false;
          toggleWishlistIcon(false);
          showToast("Removed from wishlist", "info");
        } else {
          showToast(data.message || "Failed to remove", "error");
        }
      })
      .catch(() => showToast("Server error", "error"));

    return;
  }

  // 🤍 ADD to wishlist
  fetch("https://envastore.online/api/user/wishlist/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      productId,
      size
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.status === "exists") {
        isWishlisted = true;
        toggleWishlistIcon(true);
        showToast(
          "Already in wishlist. <a href='wishlist.html' style='color:#fff;text-decoration:underline'>View Wishlist</a>",
          "info"
        );
      } else if (data.status === "added") {
        isWishlisted = true;
        toggleWishlistIcon(true);
        showToast(`Added size ${size} to wishlist ❤️`, "success");
      } else {
        showToast(data.message || "Failed to add", "error");
      }
    })
    .catch(() => showToast("Server error", "error"));
}


async function checkWishlistStatus() {
  const token = localStorage.getItem("userToken");
  if (!token || !selectedSize) return;

  const productId = new URLSearchParams(window.location.search).get("id");
  const size = selectedSize.label;

  try {
    const res = await fetch("https://envastore.online/api/user/wishlist", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const wishlist = await res.json();

    const exists = wishlist.items?.some(
      item =>
        item.product &&
        item.product._id === productId &&
        item.size === size
    );

    if (exists) {
      isWishlisted = true;
      toggleWishlistIcon(true);
    } else {
      isWishlisted = false;
      toggleWishlistIcon(false);
    }
  } catch (err) {
    console.error("Wishlist check failed", err);
  }
}

function toggleWishlistIcon(active) {
  const btn = document.getElementById("addToWishlistBtn");
  if (!btn) return;

  const icon = btn.querySelector("i");
  if (!icon) return;

  if (active) {
    icon.classList.remove("fa-regular");
    icon.classList.add("fa-solid");
    icon.style.color = "#dc3545";
  } else {
    icon.classList.remove("fa-solid");
    icon.classList.add("fa-regular");
    icon.style.color = "";
  }
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

