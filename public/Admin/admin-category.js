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


// ======================
// LOAD CATEGORIES (KPI + TABLE)
// ======================
async function loadCategories() {
  try {
    const res = await apiFetch("http://localhost:5000/api/admin/categories", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`
      }
    });

    const categories = await res.json();

    // ---------- KPI ----------
    document.getElementById("totalCategories").innerText = categories.length;

    document.getElementById("activeCategories").innerText =
      categories.filter(c => c.status === "active").length;

    document.getElementById("inactiveCategories").innerText =
      categories.filter(c => c.status === "inactive").length;

    document.getElementById("subCategories").innerText =
      categories.filter(c => c.parentId).length;

    // ---------- TABLE ----------
    const tbody = document.getElementById("categoryTableBody");
    if (!tbody) return;

    tbody.innerHTML = categories.map((cat, index) => `
      <tr>
        <td>${index + 1}</td>

        <td>
          <strong>${cat.name}</strong>
        </td>

        <td>${cat.slug}</td>

        <!-- ✅ PRODUCT COUNT -->
        <td>${cat.productCount ?? 0}</td>

        <td>
          <span class="status-pill ${
            cat.status === "active" ? "paid" : "pending"
          }">
            ${cat.status}
          </span>
        </td>

        <td class="text-end">
          

        <button
  class="btn btn-sm ${
    cat.status === "active"
      ? "btn-outline-danger"
      : "btn-outline-success"
  } ms-2"
  onclick="toggleCategoryStatus('${cat._id}', '${cat.status}')">
  ${cat.status === "active" ? "Disable" : "Enable"}
</button>

        </td>
      </tr>
    `).join("");

  } catch (err) {
    console.error("Load categories error:", err);
    showToast("Failed to load categories", "error");
  }
}
async function toggleCategoryStatus(categoryId, currentStatus) {
  const action =
    currentStatus === "active" ? "disable" : "enable";

  const confirmMsg =
    currentStatus === "active"
      ? "Are you sure you want to disable this category?"
      : "Are you sure you want to enable this category?";

  if (!confirm(confirmMsg)) return;

  try {
    const res = await apiFetch(
      `/api/admin/categories/${categoryId}/${action}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`
        }
      }
    );

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || "Action failed", "error");
      return;
    }

    showToast(data.message, "success");
    loadCategories(); // 🔄 reload list

  } catch (err) {
    showToast("Server error", "error");
  }
}


document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("categoryForm");

  loadCategories();

  if (!form) return;

  form.addEventListener("submit", async (e) => {
  e.preventDefault();

  let name = document.getElementById("categoryName").value.trim();
  let slug = document.getElementById("categorySlug").value.trim();

  // ======================
  // NAME VALIDATION
  // ======================
  if (!name) {
    showToast("Category name is required", "error");
    return;
  }

  if (name.length < 3) {
    showToast("Category name must be at least 3 characters", "error");
    return;
  }

  if (!/^[A-Za-z\s]+$/.test(name)) {
    showToast("Category name can contain only letters and spaces", "error");
    return;
  }

  // ======================
  // SLUG VALIDATION
  // ======================
  if (!slug) {
    slug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    showToast(
      "Slug must contain only lowercase letters, numbers, and hyphens",
      "error"
    );
    return;
  }

  try {
    const res = await apiFetch(
      "http://localhost:5000/api/admin/categories",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`
        },
        body: JSON.stringify({ name, slug })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || "Failed to add category", "error");
      return;
    }

    showToast("Category added successfully", "success");
    form.reset();
    loadCategories();

  } catch (err) {
    showToast("Server error", "error");
  }
});

});



