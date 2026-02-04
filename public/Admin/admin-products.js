
let allProducts = [];
let editingProductId = null;
  let selectedFiles = [];

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
  const newFiles = Array.from(imageInput.files);

  // append instead of replace
  selectedFiles.push(...newFiles);

  // max 3 images total
  if (selectedFiles.length > 3) {
    showToast("Maximum 3 images allowed", "warning");
    selectedFiles = selectedFiles.slice(0, 3);
  }

  renderPreview();
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

  let name = productName.value
  const price = productPrice.value;
  const category = productCategory.value;
  let description = productDescription.value
 const images = selectedFiles;



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
// =========================
// 🏷 PRODUCT NAME (Enterprise Level)
// =========================

// =========================
// ✅ ENTERPRISE VALIDATION
// =========================

// ---------- PRODUCT NAME ----------
if (!name) {
  showToast("Product name is required", "error");
  return;
}

name = name.trim();

if (!name) {
  showToast("Product name cannot be empty", "error");
  return;
}

if (name.length < 3 || name.length > 120) {
  showToast("Product name must be between 3–120 characters", "error");
  return;
}

// No multiple spaces
if (/\s{2,}/.test(name)) {
  showToast("Product name cannot contain multiple spaces", "error");
  return;
}

// Must start with letter or number
if (!/^[A-Za-z0-9]/.test(name)) {
  showToast("Product name must start with a letter or number", "error");
  return;
}

// Allowed characters (now includes dot)
if (!/^[A-Za-z0-9\s\-,'().]+$/.test(name)) {
  showToast("Product name contains invalid characters", "error");
  return;
}

// Prevent junk like aaaaa
if (/^(.)\1{3,}$/i.test(name.replace(/\s/g, ""))) {
  showToast("Please enter a meaningful product name", "error");
  return;
}

// Must contain at least one word
if (!/\b[A-Za-z]{3,}\b/.test(name)) {
  showToast("Product name must contain a valid word", "error");
  return;
}



// ---------- PRICE ----------
const parsedPrice = Number(price);

if (!price || isNaN(parsedPrice)) {
  showToast("Product price is required", "error");
  return;
}

if (parsedPrice <= 0) {
  showToast("Price must be greater than zero", "error");
  return;
}

if (!/^\d+(\.\d{1,2})?$/.test(price)) {
  showToast("Price can have only 2 decimal places", "error");
  return;
}

if (parsedPrice > 1000000) {
  showToast("Price seems unusually high", "warning");
  return;
}



// ---------- CATEGORY ----------
if (!category) {
  showToast("Please select a category", "error");
  return;
}



// ---------- DESCRIPTION ----------
description = description.trim();

if (!description) {
  showToast("Product description is required", "warning");
  return;
}

if (description.length < 20) {
  showToast("Description must be at least 20 characters", "warning");
  return;
}

if (description.length > 2000) {
  showToast("Description cannot exceed 2000 characters", "warning");
  return;
}

// Block emoji + strange symbols
if (!/^[A-Za-z0-9\s.,\-'"()]+$/.test(description)) {
  showToast("Description contains invalid characters", "error");
  return;
}



// ---------- SIZE STOCK ----------
if (Object.keys(sizes).length === 0) {
  showToast("Enter quantity for at least one size", "warning");
  return;
}

for (const [size, qty] of Object.entries(sizes)) {
  if (!Number.isInteger(qty) || qty <= 0) {
    showToast(`Invalid quantity for size ${size}`, "error");
    return;
  }

  if (qty > 5000) {
    showToast(`Quantity too high for size ${size}`, "warning");
    return;
  }
}



// ---------- TOTAL STOCK ----------
if (totalStock <= 0) {
  showToast("Total stock must be greater than zero", "error");
  return;
}

if (totalStock > 10000) {
  showToast("Total stock unusually high — please verify", "warning");
  return;
}



// ---------- IMAGES ----------
if (!editingProductId && images.length === 0) {
  showToast("Please upload at least one product image", "warning");
  return;
}

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

 selectedFiles
  .filter(f => !f.existing)
  .slice(0, 3)
  .forEach(img => formData.append("images", img));


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
selectedFiles = [];
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


function renderPreview() {
  const preview = document.getElementById("imagePreview");
  if (!preview) return;

  preview.innerHTML = "";

  selectedFiles.forEach((file, index) => {
    const wrap = document.createElement("div");
    wrap.style.position = "relative";

    const img = document.createElement("img");

    img.src = file.existing
      ? `/uploads/${file.name}`
      : URL.createObjectURL(file);

    img.className = "preview-thumb";

    const close = document.createElement("button");
    close.innerHTML = "×";
    close.className = "preview-close";

    close.onclick = () => {
      selectedFiles.splice(index, 1);
      renderPreview();
    };

    wrap.appendChild(img);
    wrap.appendChild(close);
    preview.appendChild(wrap);
  });
}


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

 selectedFiles = [];

product.images?.forEach(img => {
  selectedFiles.push({
    existing: true,
    name: img
  });
});

renderPreview();


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