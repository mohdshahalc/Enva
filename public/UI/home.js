let allProducts = [];
let filteredProducts = [];
let homeProducts = [];
let activeFlashOffer = null;

let timerStarted = false;



async function loadHomeProducts() {
  try {
    const res = await fetch("https://envastore.online/api/user/products/shop");
    const products = await res.json();

    homeProducts = products;        // for category images
    allProducts = products;         // for product page
    filteredProducts = [...products];

    // ✅ ONLY FOR PRODUCT PAGE
    if (window.location.pathname.includes("products.html")) {
      applyCategoryFromURL();

      if (!window.location.search.includes("category")) {
        renderUserProducts(filteredProducts);
      }
    }

    // ✅ ALWAYS FOR HOME PAGE
    loadRandomDailyBestSells();
    loadFlashDealProducts(); 
  } catch (err) {
    console.error("Failed to load products", err);
  }
}



async function loadPopularCategories() {
  const res = await fetch("https://envastore.online/api/admin/categories");
  const categories = await res.json();

  const container = document.getElementById("popularCategories");
  if (!container) return;

  container.innerHTML = categories
    .filter(cat => cat.status === "active")
    .slice(3, 7)
    .map(cat => {

      // 🔥 find product image for category
      const productForCategory = homeProducts.find(
        p => p.category?.toUpperCase() === cat.name.toUpperCase()
      );

      const imageSrc = productForCategory
        ? `/uploads/${productForCategory.images[0]}`
        : `/Images/default-category.png`;

      return `
        <div class="col-6 col-sm-4 col-md-2 text-center category-icon">
          <a
            href="products.html?category=${encodeURIComponent(cat.name)}"
            class="d-inline-block p-3 rounded-circle shadow-sm mb-3"
            style="background-color:#f7f7f7;"
          >
            <img
              src="${imageSrc}"
              alt="${cat.name}"
              class="rounded-circle"
              style="width:60px;height:60px;object-fit:cover;"
            >
          </a>

          <p class="fw-semibold mb-0">${cat.name}</p>
          <p class="small text-secondary">Explore Now</p>
        </div>
      `;
    })
    .join("");
}


function loadRandomDailyBestSells() {

  const container = document.getElementById("dailyScroll");
  if (!container || !allProducts.length) return;

  // ✅ DEFINE OFFER PRODUCTS HERE
  const offerProducts = allProducts.filter(
    p => p.discountPercent && p.oldPrice && p.finalPrice
  );

  const normalProducts = allProducts.filter(
    p => !p.discountPercent
  );

  // 🔀 Shuffle helper
  const shuffle = arr => [...arr].sort(() => 0.5 - Math.random());

  // 🧠 Pick products (prefer offers)
  let selected = [];

  selected.push(...shuffle(offerProducts).slice(0, 4));
  selected.push(...shuffle(normalProducts).slice(0, 6));

  selected = shuffle(selected).slice(0, 8);

  // 🎨 Render
  container.innerHTML = selected.map(product => {
    const imageSrc = `/uploads/${product.images[0]}`;

    const hasOffer =
      product.discountPercent &&
      product.oldPrice &&
      product.finalPrice;

    return `
      <div class="daily-card shadow-sm rounded-4 p-3 bg-white"
           style="min-width:260px; position:relative;">

        ${
          hasOffer
            ? `<span class="badge bg-danger px-3 py-2 rounded-pill position-absolute"
                     style="top:10px; left:10px;">
                Save ${product.discountPercent}%
              </span>`
            : ""
        }

        <a href="singleProduct.html?id=${product._id}"
           class="text-decoration-none text-dark">

          <img src="${imageSrc}"
               class="w-100"
               style="height:190px; object-fit:contain;">

          <p class="text-secondary small mt-2 mb-1">
            ${product.category}
          </p>

          <h6 class="fw-semibold mb-2">
            ${product.name}
          </h6>

          <div class="text-warning mb-1">
            ${"★".repeat(product.rating || 4)}
            ${"☆".repeat(5 - (product.rating || 4))}
          </div>

          <div class="d-flex align-items-center gap-2 mb-2">
            ${
              hasOffer
                ? `
                  <h5 class="text-success fw-bold">
                    ₹${product.finalPrice}
                  </h5>
                  <p class="text-secondary text-decoration-line-through small">
                    ₹${product.oldPrice}
                  </p>
                `
                : `
                  <h5 class="text-success fw-bold">
                    ₹${product.price}
                  </h5>
                `
            }
          </div>

          <button class="btn btn-danger fw-semibold w-100 rounded-3">
            Add To Cart
          </button>
        </a>
      </div>
    `;
  }).join("");
}


function setDealDateRange(start, end) {
  const el = document.getElementById("dealDateRange");
  if (!el) return;

  const s = new Date(start);
  const e = new Date(end);

  const opts = { month: "short", day: "numeric" };

  const startText = s.toLocaleDateString("en-US", opts);
  const endText = e.toLocaleDateString("en-US", opts);

  el.textContent = `${startText.toUpperCase()} – ${endText.toUpperCase()}`;
}



function loadFlashDealProducts() {
  const grid = document.getElementById("flashDealsGrid");
  if (!grid || !allProducts.length || !activeFlashOffer) return;

  let offerProducts = [];

  if (activeFlashOffer.offerType === "category") {
    offerProducts = allProducts.filter(
      p => p.category === activeOfferCategoryName
    );
  }

  if (activeFlashOffer.offerType === "product") {
    offerProducts = allProducts.filter(
      p => p._id === activeFlashOffer.product
    );
  }

  console.log("Matched offer products:", offerProducts.length);

  if (!offerProducts.length) {
    grid.innerHTML = `
      <p class="text-center text-secondary">
        No flash deals available right now
      </p>`;
    return;
  }

  const selected = offerProducts.slice(0, 4);

  grid.innerHTML = selected.map(product => {
    const imageSrc = `/uploads/${product.images[0]}`;

    return `
      <div class="col-6 col-md-4 col-lg-3 d-flex">
        <a href="singleProduct.html?id=${product._id}"
           class="pro-card flex-fill text-decoration-none text-dark">

          <span class="deal-tag">
            ${activeFlashOffer.discountPercent}% OFF
          </span>

          <div class="pro-img">
            <img src="${imageSrc}">
          </div>

          <div class="pro-body">
            <p class="pro-category">${product.category}</p>
            <h5 class="pro-title">${product.name}</h5>
            <div class="pro-price">
              <span class="old">₹${product.oldPrice}</span>
              <span class="new">₹${product.finalPrice}</span>
            </div>
          </div>
        </a>
      </div>
    `;
  }).join("");
}



let activeOfferCategoryName = null;

async function loadActiveFlashOffer() {
  try {
    const offerRes = await fetch("https://envastore.online/api/admin/offers/active");
    const offer = await offerRes.json();

    if (!offer || !offer.isActive) return;

    activeFlashOffer = offer;

    // TITLE
    document.querySelector(".deal-main-title").textContent =
      offer.name.toUpperCase();

    // DATE RANGE
setDealDateRange(offer.startDate, offer.endDate);


    // CATEGORY NAME (AWAITED!)
    if (offer.offerType === "category") {
      const catRes = await fetch("https://envastore.online/api/admin/categories");
      const categories = await catRes.json();

      const matchedCategory = categories.find(
        c => c._id === offer.category
      );

      activeOfferCategoryName = matchedCategory?.name;
    }

  } catch (err) {
    console.error("Failed to load active offer", err);
  }
}





document.addEventListener("DOMContentLoaded", async () => {
  await loadHomeProducts();
  await loadActiveFlashOffer();   // 🔥 must come before
  loadFlashDealProducts();
  await loadPopularCategories();
});

