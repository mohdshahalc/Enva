
let allProducts = [];   // store original products
let filteredProducts = []; // working copy


document.addEventListener("DOMContentLoaded", () => {
  loadUserProducts();
});

async function loadUserProducts() {
  try {
    const res = await fetch("http://localhost:5000/api/user/products");
    const products = await res.json();

   allProducts = products;
filteredProducts = [...products];

// 🔥 APPLY CATEGORY FILTER IF COMING FROM HOME
applyCategoryFromURL();

// If NO category in URL → show all products
if (!window.location.search.includes("category")) {
  renderUserProducts(filteredProducts);
}
  } catch (err) {
    console.error("Failed to load products", err);
  }
}

document.addEventListener("DOMContentLoaded", loadUserProducts);

function renderUserProducts(products) {
  console.log(products);
  
  const grid = document.getElementById("productGrid");
  const noProducts = document.getElementById("noProducts");

  if (!grid) return;

  if (!products.length) {
    grid.innerHTML = "";
    if (noProducts) noProducts.style.display = "block";
    return;
  }

  if (noProducts) noProducts.style.display = "none";

  grid.innerHTML = products.map(product => {
    const imageSrc = `/uploads/${product.images[0]}`;

    // 🟢 CATEGORY NAME (string OR object)
    const categoryName =
      typeof product.category === "object"
        ? product.category.name
        : product.category;

    // 🟢 OFFER LOGIC
   const hasOffer =
  product.discountPercent &&
  product.oldPrice &&
  product.finalPrice;

return `
<a href="singleProduct.html?id=${product._id}" class="product-card-premium">
  <div class="product-img-box">

    ${
      hasOffer
        ? `<span class="offer-badge">${product.discountPercent}% OFF</span>`
        : ""
    }

    <img src="${imageSrc}" alt="${product.name}" class="product-img">
  </div>

  <div class="product-card-info">
    <div class="product-content">
      <p class="product-category">${categoryName}</p>

      <h5 class="product-name">${product.name}</h5>

      <p class="product-desc">${product.description || ""}</p>

      <div class="product-rating">
        ${"★".repeat(product.rating || 4)}
        ${"☆".repeat(5 - (product.rating || 4))}
      </div>

      <div class="price-box">
        ${
          hasOffer
            ? `
              <span class="price-current">₹ ${product.finalPrice}</span>
              <span class="price-old">₹ ${product.oldPrice}</span>
            `
            : `
              <span class="price-current">
                ₹ ${product.price.toFixed(2)}
              </span>
            `
        }
      </div>
    </div>

    <button class="product-card-button">Quick View</button>
  </div>
</a>
`;

  }).join("");
}


async function loadFilterCategories() {


  const res = await fetch("http://localhost:5000/api/admin/categories");
  const categories = await res.json();

  document.getElementById("categoryFilters").innerHTML =
    categories
      .filter(cat => cat.status === "active")
      .map(cat => `
        <label>
          <input type="checkbox" name="category" value="${cat._id}">
          ${cat.name}
        </label>
      `)
      .join("");
}
document.addEventListener("DOMContentLoaded", loadFilterCategories);


document.querySelector("#filterPopup .popup-apply")
  ?.addEventListener("click", () => {

    /* =========================
       CATEGORY (STRING BASED)
    ========================== */
    const selectedCategories = [
      ...document.querySelectorAll('input[name="category"]:checked')
    ].map(i =>
      i.closest("label").textContent.trim().toUpperCase()
    );

    /* =========================
       SIZE (FIXED: UPPERCASE)
    ========================== */
    const selectedSizes = [
      ...document.querySelectorAll('input[name="size"]:checked')
    ].map(i => i.value.toUpperCase()); // ✅ S, M, L, XL

    /* =========================
       PRICE
    ========================== */
    const maxPrice = Number(
      document.getElementById("priceRange")?.value
    );

    filteredProducts = allProducts.filter(product => {

      /* CATEGORY MATCH */
      const productCategory = product.category?.toUpperCase();
      const matchCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(productCategory);

      /* SIZE MATCH (NOW WORKS) */
      const matchSize =
        selectedSizes.length === 0 ||
        selectedSizes.some(size =>
          product.sizes &&
          product.sizes[size] > 0
        );

      /* PRICE MATCH */
      const matchPrice =
        !maxPrice || product.price <= maxPrice;

      return matchCategory && matchSize && matchPrice;
    });

    renderUserProducts(filteredProducts);

    showToast(
      filteredProducts.length
        ? `Filters applied (${filteredProducts.length} products found)`
        : "No products match your filters",
      filteredProducts.length ? "success" : "warning"
    );
  });

  document.getElementById("clearFilters")
  ?.addEventListener("click", () => {

    // ✅ Uncheck all checkboxes (category + size)
    document
      .querySelectorAll('#filterPopup input[type="checkbox"]')
      .forEach(i => i.checked = false);

    // ✅ Reset price range to max
    const priceRange = document.getElementById("priceRange");
    if (priceRange) {
      priceRange.value = priceRange.max;

      // update price label if exists
      document.getElementById("priceValue").textContent = priceRange.max;
    }

    // ✅ Reset product list
    filteredProducts = [...allProducts];
    renderUserProducts(filteredProducts);

    showToast("Filters cleared", "info");
  });


document.querySelector("#sortPopup .popup-apply")
  ?.addEventListener("click", () => {

    const selectedSort =
      document.querySelector('#sortPopup input[name="sort"]:checked')?.value;

    if (!selectedSort) {
      showToast("Please select a sort option", "warning");
      return;
    }

    // ✅ ALWAYS SORT CURRENT VIEW
    let baseList =
      filteredProducts.length > 0
        ? [...filteredProducts]
        : [...allProducts];

    if (selectedSort === "low-high") {
      baseList.sort((a, b) => {
        const priceA = a.finalPrice ?? a.price;
        const priceB = b.finalPrice ?? b.price;
        return priceA - priceB;
      });
    }

    if (selectedSort === "high-low") {
      baseList.sort((a, b) => {
        const priceA = a.finalPrice ?? a.price;
        const priceB = b.finalPrice ?? b.price;
        return priceB - priceA;
      });
    }

    if (selectedSort === "newest") {
      baseList.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    }

    // Featured → reset order
    if (selectedSort === "featured") {
      baseList = [...allProducts];
    }

    filteredProducts = baseList;
    renderUserProducts(filteredProducts);

    showToast("Products sorted successfully", "info");
  });


document.getElementById("clearProductFilters")
  ?.addEventListener("click", () => {

    // Uncheck all filter checkboxes
    document
      .querySelectorAll('#filterPopup input[type="checkbox"]')
      .forEach(i => i.checked = false);

    // Reset price range
    const priceRange = document.getElementById("priceRange");
    if (priceRange) {
      priceRange.value = priceRange.max;
      document.getElementById("priceValue").textContent = priceRange.max;
    }

    filteredProducts = [...allProducts];
    renderUserProducts(filteredProducts);

    showToast("Filters cleared", "info");
  });

  document.getElementById("clearSort")
  ?.addEventListener("click", () => {

    // Uncheck sort radios
    document
      .querySelectorAll('#sortPopup input[name="sort"]')
      .forEach(i => i.checked = false);

    // Reset to original order
    filteredProducts = [...allProducts];
    renderUserProducts(filteredProducts);

    showToast("Sorting cleared", "info");
  });


  function applyCategoryFromURL() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get("category");

  if (!category) return;

  const selectedCategory = category.toUpperCase();

  filteredProducts = allProducts.filter(
    product =>
      product.category &&
      product.category.toUpperCase() === selectedCategory
  );

  renderUserProducts(filteredProducts);

  showToast(`Showing ${category} products`, "info");
}


function showToast(message, type = "success") {
  const toastBox = document.getElementById("toastBox");

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
