document.addEventListener("DOMContentLoaded", loadCustomers);

let allCustomers = [];

async function loadCustomers() {
  const token = localStorage.getItem("adminToken");

  try {
    const res = await apiFetch("/api/admin/customers", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const customers = await res.json();

    if (!res.ok) {
      showToast(customers.message || "Failed to load customers", "error");
      return;
    }

    allCustomers = customers;
    renderCustomers(customers);
     updateCustomerKPIs(customers); 
  } catch (err) {
    showToast("Server error while loading customers", "error");
    console.error(err);
  }
}

function renderCustomers(customers) {
  const tbody = document.getElementById("customerTableBody");
  tbody.innerHTML = "";

  if (!customers.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          No customers found
        </td>
      </tr>
    `;
    return;
  }

  customers.forEach((c, index) => {
    tbody.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.email}</td>
        <td>${new Date(c.joinedAt).toDateString()}</td>
        <td>${c.totalOrders}</td>
        <td>₹${c.totalSpent}</td>
        <td>
          <span class="status-pill ${c.status === "Active" ? "paid" : "canceled"}">
            ${c.status}
          </span>
        </td>
        <td class="text-end">

        <button
  class="btn btn-sm ${
    c.status === "Active"
      ? "btn-outline-danger"
      : "btn-outline-success"
  } ms-2"
  onclick="${
    c.status === "Active"
      ? `blockCustomer('${c.id}')`
      : `unblockCustomer('${c.id}')`
  }">
  ${c.status === "Active" ? "Block" : "Unblock"}
</button>

        </td>
      </tr>
    `;
  });
}

document.getElementById("applyFilterBtn")
  .addEventListener("click", applyCustomerFilters);

document.getElementById("resetFilterBtn")
  .addEventListener("click", resetCustomerFilters);

function applyCustomerFilters() {
  const search = document
    .getElementById("searchCustomer")
    .value.toLowerCase();

  const status = document.getElementById("filterStatus").value;
  const sortBy = document.getElementById("sortBy").value;

  let filtered = [...allCustomers];

  /* 🔍 SEARCH */
  if (search) {
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.email.toLowerCase().includes(search)
    );
  }

  /* 🏷 STATUS */
  if (status !== "all") {
    filtered = filtered.filter(
      c => c.status.toLowerCase() === status
    );
  }

  /* 🔃 SORT */
  switch (sortBy) {
    case "name":
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;

    case "orders":
      filtered.sort((a, b) => b.totalOrders - a.totalOrders);
      break;

    case "spent":
      filtered.sort((a, b) => b.totalSpent - a.totalSpent);
      break;

    case "newest":
      filtered.sort(
        (a, b) => new Date(b.joinedAt) - new Date(a.joinedAt)
      );
      break;
  }

  renderCustomers(filtered);
}

function resetCustomerFilters() {
  document.getElementById("searchCustomer").value = "";
  document.getElementById("filterStatus").value = "all";
  document.getElementById("sortBy").value = "newest";

  renderCustomers(allCustomers);
}

function updateCustomerKPIs(customers) {
  const now = new Date();

  // TOTAL
  const totalCustomers = customers.length;

  // ACTIVE
  const activeCustomers = customers.filter(
    c => c.status.toLowerCase() === "active"
  ).length;

  // NEW THIS MONTH
  const newThisMonth = customers.filter(c => {
    const joined = new Date(c.joinedAt);
    return (
      joined.getMonth() === now.getMonth() &&
      joined.getFullYear() === now.getFullYear()
    );
  }).length;

  // RETURNING (customers with orders > 1)
  const returningCustomers = customers.filter(
    c => c.totalOrders > 1
  ).length;

  // UPDATE UI
  document.getElementById("kpiTotalCustomers").innerText =
    totalCustomers.toLocaleString();

  document.getElementById("kpiActiveCustomers").innerText =
    activeCustomers.toLocaleString();

  document.getElementById("kpiNewCustomers").innerText =
    newThisMonth.toLocaleString();

  document.getElementById("kpiReturningCustomers").innerText =
    returningCustomers.toLocaleString();
}

function isActiveLast30Days(customer) {
  if (!customer.lastOrderDate) return false;

  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(customer.lastOrderDate) <= THIRTY_DAYS;
}

function blockCustomer(customerId) {
  if (!confirm("Are you sure you want to block this customer?")) return;

  apiFetch(`/api/admin/customers/block-user/${customerId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("adminToken")}`
    }
  })
    .then(res => res.json())
    .then(data => {
      showToast(data.message, "warning");

      const customer = allCustomers.find(c => c.id === customerId);
      if (customer) customer.status = "Blocked";

      renderCustomers(allCustomers);
      updateCustomerKPIs(allCustomers);
    })
    .catch(() => {
      showToast("Failed to block customer", "error");
    });
}

function unblockCustomer(customerId) {
  if (!confirm("Are you sure you want to unblock this customer?")) return;

  apiFetch(`/api/admin/customers/unblock-user/${customerId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("adminToken")}`
    }
  })
    .then(res => res.json())
    .then(data => {
      showToast(data.message, "success");

      const customer = allCustomers.find(c => c.id === customerId);
      if (customer) customer.status = "Active";

      renderCustomers(allCustomers);
      updateCustomerKPIs(allCustomers);
    })
    .catch(() => {
      showToast("Failed to unblock customer", "error");
    });
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