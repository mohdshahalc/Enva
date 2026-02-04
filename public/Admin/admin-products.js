let allProducts = [];
let editingProductId = null;


async function loadCategoriesForProduct() {
  const res = await apiFetch("/api/admin/categories", {
    headers: {
      "Authorization": `Bearer ${localStorage.getItem("adminToken")}`
    }
  });

  const categories = await res.json();

 const selects = document.querySelectorAll(".productCategory");

selects.forEach(select => {
  select.innerHTML += categories.map(cat =>
    `<option value="${cat.name}">${cat.name}</option>`
  ).join("");
});

}

// ======================
// LOAD PRODUCTS TABLE
// ======================

async function loadProducts() {
  try {
    const res = await apiFetch("/api/admin/products", {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("adminToken")}`
      }
    });

    const products = await res.json();
    allProducts = products;

    // ---------- KPI ----------
    document.getElementById("totalProducts").innerText = products.length;

    document.getElementById("lowStockProducts").innerText =
      products.filter(p => p.stock > 0 && p.stock <= 15).length;

    document.getElementById("outOfStockProducts").innerText =
      products.filter(p => p.stock === 0).length;

    const now = new Date();
    document.getElementById("newProducts").innerText =
      products.filter(p => {
        const d = new Date(p.createdAt);
        return d.getMonth() === now.getMonth() &&
               d.getFullYear() === now.getFullYear();
      }).length;

    // ---------- TABLE ----------
    renderProducts(products);

  } catch (err) {
    console.error(err);
    showToast("Failed to load products", "error");
  }
}

function renderProducts(products) {
  const tbody = document.getElementById("productTableBody");
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          No products found
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = products.map((product, index) => {

    let statusClass = "paid";
    let statusText = "In Stock";

    if (product.stock === 0) {
      statusClass = "canceled";
      statusText = "Out of Stock";
    } else if (product.stock > 0 && product.stock <= 15) {
      statusClass = "pending";
      statusText = "Low Stock";
    }

    const imageSrc = product.images?.length
      ? `/uploads/${product.images[0]}`
      : "../Images/no-image.png";

    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <div class="d-flex align-items-center gap-3">
            <img src="${imageSrc}" class="product-thumb">
            <strong>${product.name}</strong>
          </div>
        </td>
        <td>${product.category}</td>
        <td>${product.price.toFixed(2)}</td>
        <td>${product.stock}</td>
        <td>
          <span class="status-pill ${statusClass}">
            ${statusText}
          </span>
        </td>
        <td class="text-end">
<button
  class="btn btn-sm btn-outline-primary"
  onclick="openEditProduct('${product._id}')">
  Edit
</button>

          <button class="btn btn-sm btn-outline-danger ms-2" onclick="openDeleteModal('${product._id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}


document.getElementById("searchBtn").addEventListener("click", applyFilters);
document.getElementById("resetBtn").addEventListener("click", resetFilters);

function applyFilters() {
  const searchValue = document.getElementById("searchInput").value.toLowerCase();
  const categoryValue = document.getElementById("categoryFilter").value;
  const stockValue = document.getElementById("stockFilter").value;

  let filtered = allProducts.filter(product => {

    // 🔍 Search filter
    const matchesSearch =
      product.name.toLowerCase().includes(searchValue);

    // 🏷 Category filter
    const matchesCategory =
      !categoryValue || product.category === categoryValue;

    // 📦 Stock filter
    let matchesStock = true;
    if (stockValue === "in") {
      matchesStock = product.stock > 15;
    } else if (stockValue === "low") {
      matchesStock = product.stock > 0 && product.stock <= 15;
    } else if (stockValue === "out") {
      matchesStock = product.stock === 0;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  renderProducts(filtered);
}
function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("categoryFilter").value = "";
  document.getElementById("stockFilter").value = "";

  renderProducts(allProducts);
}


// ======================
// PRODUCT PAGE SCRIPT
// ======================
document.addEventListener("DOMContentLoaded", () => {

    loadCategoriesForProduct();
    loadProducts();

  // ======================
  // PRODUCT IMAGE PREVIEW
  // ======================
  const uploadBox = document.getElementById("uploadBox");
  const imageInput = document.getElementById("productImages");
  const preview = document.getElementById("imagePreview");

  if (uploadBox && imageInput && preview) {
    uploadBox.addEventListener("click", () => imageInput.click());

    imageInput.addEventListener("change", () => {
      preview.innerHTML = "";

      const files = Array.from(imageInput.files).slice(0, 3);

      files.forEach(file => {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.style.width = "80px";
        img.style.height = "80px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "10px";
        img.classList.add("me-2");
        preview.appendChild(img);
      });
    });
  }

  // ======================
  // ADD PRODUCT FORM SUBMIT
  // ======================
  const form = document.getElementById("productForm");

  if (!form) {
    console.error("productForm not found");
    return;
  }


  form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const productName = document.getElementById("productName");
  const productPrice = document.getElementById("productPrice");
  const productCategory = document.getElementById("productCategory");
  const productDescription = document.getElementById("productDescription");
  const productImages = document.getElementById("productImages");

  const name = productName.value.trim();
  const price = productPrice.value;
  const category = productCategory.value;
  const description = productDescription.value.trim();
  const images = productImages.files;

  // =========================
  // 🟦 SIZE-WISE QUANTITY
  // =========================
  const sizeInputs = document.querySelectorAll(".size-qty");
  const sizes = {};
  let totalStock = 0;

  sizeInputs.forEach(input => {
    const size = input.dataset.size;
    const qty = Number(input.value) || 0;

    if (qty > 0) {
      sizes[size] = qty;
      totalStock += qty;
    }
  });

  // =========================
  // ✅ VALIDATION
  // =========================
 // =========================
// 🏷 PRODUCT NAME
// =========================
if (!name || name.trim().length < 3) {
  showToast("Product name must be at least 3 characters", "error");
  return;
}

if (name.length > 120) {
  showToast("Product name cannot exceed 120 characters", "error");
  return;
}

if (!/[a-zA-Z0-9]/.test(name)) {
  showToast("Product name must contain letters or numbers", "error");
  return;
}


// =========================
// 💰 PRICE
// =========================
const parsedPrice = Number(price);

if (!price || isNaN(parsedPrice) || parsedPrice <= 0) {
  showToast("Enter a valid product price", "error");
  return;
}

if (!/^\d+(\.\d{1,2})?$/.test(price)) {
  showToast("Price can have only 2 decimal places", "error");
  return;
}


// =========================
// 🏷 CATEGORY
// =========================
if (!category) {
  showToast("Please select a product category", "error");
  return;
}


// =========================
// 📝 DESCRIPTION
// =========================
if (!description || description.length < 20) {
  showToast("Product description must be at least 20 characters", "warning");
  return;
}

if (description.length > 2000) {
  showToast("Description cannot exceed 2000 characters", "warning");
  return;
}


// =========================
// 📦 SIZE-WISE STOCK
// =========================
if (Object.keys(sizes).length === 0) {
  showToast("Please enter quantity for at least one size", "warning");
  return;
}

for (const [size, qty] of Object.entries(sizes)) {
  if (!Number.isInteger(qty) || qty <= 0) {
    showToast(`Invalid quantity for size ${size}`, "error");
    return;
  }
}


// =========================
// 📊 TOTAL STOCK
// =========================
if (totalStock <= 0) {
  showToast("Total stock must be greater than zero", "error");
  return;
}

if (totalStock > 10000) {
  showToast("Stock quantity is unusually high. Please verify.", "warning");
  return;
}


// =========================
// 🖼 IMAGE RULES (CREATE vs EDIT)
// =========================

// ❌ Image required ONLY when creating product
if (!editingProductId && images.length === 0) {
  showToast("Please upload at least one product image", "warning");
  return;
}

// ❌ Max 3 images always
if (images.length > 3) {
  showToast("Maximum 3 images allowed", "warning");
  return;
}

// ✅ Append images ONLY if selected (important for edit)



  // =========================
  // 📦 FORM DATA
  // =========================
  const formData = new FormData();
  formData.append("name", name);
  formData.append("price", price);
  formData.append("stock", totalStock); // ✅ auto calculated
  formData.append("sizes", JSON.stringify(sizes)); // 🔥 IMPORTANT
  formData.append("category", category);
  formData.append("description", description);

  Array.from(images).slice(0, 3).forEach(img => {
    formData.append("images", img);
  });

  try {
   const url = editingProductId
  ? `/api/admin/products/${editingProductId}`
  : "/api/admin/products";

const method = editingProductId ? "PUT" : "POST";

const res = await apiFetch(url, {
  method,
  headers: {
    Authorization: `Bearer ${localStorage.getItem("adminToken")}`
  },
  body: formData
});


    const data = await res.json();

    if (res.ok) {
  showToast(
    editingProductId ? "Product updated successfully" : "Product added successfully",
    "success"
  );

  editingProductId = null;
  form.reset();
  document.getElementById("imagePreview").innerHTML = "";
  loadProducts();
}
 else {
      showToast(data.message || "Failed to add product", "error");
    }

  } catch (err) {
    console.error(err);
    showToast("Server error", "error");
  }
});


});


async function openDeleteModal(id) {
  if (!id) {
    showToast("Invalid product ID", "error");
    return;
  }

  if (!confirm("Delete this product?")) return;

  try {
    const res = await apiFetch(
      `/api/admin/products/${id}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("adminToken")}`
        }
      }
    );

    const data = await res.json();

    if (res.ok) {
      showToast(data.message || "Product deleted", "success");
      loadProducts();
    } else {
      showToast(data.message || "Delete failed", "error");
    }

  } catch (err) {
    console.error(err);
    showToast("Server error", "error");
  }
}

function openEditProduct(id) {
  const product = allProducts.find(p => p._id === id);
  if (!product) {
    showToast("Product not found", "error");
    return;
  }

  editingProductId = id;

  // Fill form
  document.getElementById("productName").value = product.name;
  document.getElementById("productPrice").value = product.price;
  document.getElementById("productCategory").value = product.category;
  document.getElementById("productDescription").value = product.description || "";

  // Sizes
  const sizeInputs = document.querySelectorAll(".size-qty");
  sizeInputs.forEach(input => {
    const size = input.dataset.size;
    input.value = product.sizes?.[size] || "";
  });

  // Image preview
  const preview = document.getElementById("imagePreview");
  preview.innerHTML = "";

  product.images?.forEach(img => {
    const image = document.createElement("img");
    image.src = `/uploads/${img}`;
    image.style.width = "80px";
    image.style.height = "80px";
    image.style.objectFit = "cover";
    image.style.borderRadius = "10px";
    image.classList.add("me-2");
    preview.appendChild(image);
  });

  showToast("Editing product mode enabled", "info");
}



// ======================
// TOAST
// ======================
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