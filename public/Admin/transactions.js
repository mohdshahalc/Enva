let allTransactions = [];

document.addEventListener("DOMContentLoaded", loadTransactions);



async function loadTransactions() {
  try {
    const res = await apiFetch("/api/admin/transactions", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`
      }
    });

     allTransactions = await res.json();
    renderTransactions(allTransactions);
    updateKPIs(allTransactions);

  } catch (err) {
    console.error("Failed to load transactions", err);
  }
}

function renderTransactions(transactions) {
  const tbody = document.getElementById("transactionsTableBody");
  tbody.innerHTML = "";

  if (!transactions.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          No transactions found
        </td>
      </tr>
    `;
    return;
  }

  transactions.forEach((t, index) => {
    tbody.innerHTML += `
      <tr class="row-${getRowClass(t.status)}">
        <td>${index + 1}</td>
        <td><strong>#${t.txnId}</strong></td>
        <td>${t.user}</td>
        <td>${formatMethod(t.method)}</td>
        <td>₹${t.amount.toLocaleString("en-IN")}</td>
        <td>${formatDate(t.date)}</td>
        <td>
          <span class="status-pill ${getStatusClass(t.status)}">
            ${formatStatus(t.status)}
          </span>
        </td>
        <td class="text-end">
          ${
            t.status === "failed"
              ? `<button class="btn btn-sm btn-outline-danger">Retry</button>`
              : `<button class="btn btn-sm btn-outline-dark">View</button>`
          }
        </td>
      </tr>
    `;
  });
}


function getStatusClass(status) {
  if (status === "success") return "paid";
  if (status === "pending") return "pending";
  return "canceled";
}

function getRowClass(status) {
  if (status === "success") return "paid";
  if (status === "pending") return "pending";
  return "cancel";
}

function formatStatus(status) {
  if (status === "success") return "Success";
  if (status === "pending") return "Pending";
  return "Failed";
}

function formatMethod(method) {
  return method.toUpperCase();
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}


document.getElementById("searchBtn").addEventListener("click", applyFilters);
document.getElementById("resetBtn").addEventListener("click", resetFilters);

function applyFilters() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const status = document.getElementById("statusFilter").value;
  const method = document.getElementById("methodFilter").value;

  const filtered = allTransactions.filter(t => {

    // 🔍 SEARCH (txnId, user, orderId)
    const matchesSearch =
      !search ||
      t.txnId?.toLowerCase().includes(search) ||
      t.user?.toLowerCase().includes(search) ||
      t.orderId?.toLowerCase().includes(search);

    // 📌 STATUS
    const matchesStatus = !status || t.status === status;

    // 💳 METHOD
    const matchesMethod = !method || t.method === method;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  renderTransactions(filtered);
  updateKPIs(filtered); 
}

function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("statusFilter").value = "";
  document.getElementById("methodFilter").value = "";

  renderTransactions(allTransactions);
  updateKPIs(allTransactions);
}


function updateKPIs(transactions) {
  const total = transactions.length;

  const success = transactions.filter(t => t.status === "success").length;
  const pending = transactions.filter(t => t.status === "pending").length;
  const failed  = transactions.filter(t => t.status === "failed").length;

  document.getElementById("kpiTotal").textContent = total.toLocaleString();
  document.getElementById("kpiSuccess").textContent = success.toLocaleString();
  document.getElementById("kpiPending").textContent = pending.toLocaleString();
  document.getElementById("kpiFailed").textContent  = failed.toLocaleString();
}
