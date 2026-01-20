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
    const res = await fetch("http://localhost:5000/api/admin/categories", {
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
          <button class="btn btn-sm btn-outline-dark">
            Edit
          </button>

          <button
            class="btn btn-sm btn-outline-danger ms-2"
            onclick="deleteCategory('${cat._id}')">
            Delete
          </button>
        </td>
      </tr>
    `).join("");

  } catch (err) {
    console.error("Load categories error:", err);
    showToast("Failed to load categories", "error");
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
    const status = document.getElementById("categoryStatus").value;

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

    // ❌ Numbers or special characters
    if (!/^[A-Za-z\s]+$/.test(name)) {
      showToast(
        "Category name can contain only letters and spaces",
        "error"
      );
      return;
    }

    // ======================
    // SLUG VALIDATION
    // ======================

    // 🔄 Auto-generate slug if empty
    if (!slug) {
      slug = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")       // spaces → hyphen
        .replace(/[^a-z0-9-]/g, ""); // remove invalid chars
    }

    // ❌ Invalid slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      showToast(
        "Slug must contain only lowercase letters, numbers, and hyphens",
        "error"
      );
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`
        },
        body: JSON.stringify({
          name,
          slug,
          status
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message || "Category added successfully", "success");
        form.reset();
        loadCategories();
      } else {
        showToast(data.message || "Failed to add category", "error");
      }

    } catch (err) {
      showToast("Server error", "error");
    }
  });
});


// ======================
// DELETE CATEGORY
// ======================
async function deleteCategory(id) {
  if (!confirm("Delete this category?")) return;

  try {
    const res = await fetch(
      `http://localhost:5000/api/admin/categories/${id}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("adminToken")}`
        }
      }
    );

    const data = await res.json();

    if (res.ok) {
      showToast("Category deleted", "success");
      loadCategories(); // 🔥 refresh KPI + table
    } else {
      showToast(data.message || "Delete failed", "error");
    }

  } catch (err) {
    showToast("Server error", "error");
  }
}
