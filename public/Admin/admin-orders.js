document.addEventListener("DOMContentLoaded", loadOrders);

let allOrders = [];
let ordersChartInstance = null;
let orderStatusChartInstance = null;

async function loadOrders() {
  try {
    const res = await apiFetch("/api/admin/orders", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`
      }
    });

    const orders = await res.json();

    if (!res.ok) {
      showToast("Failed to load orders", "error");
      return;
    }

    allOrders = orders;          // ✅ store original
    updateOrderKPIs(orders);
    renderOrders(orders);
     renderOrderCharts(orders);
  } catch (err) {
    console.error(err);
    showToast("Server error while loading orders", "error");
  }
}


function renderOrders(orders) {
  console.log(orders);
  
  const tbody = document.getElementById("ordersTableBody");
  tbody.innerHTML = "";

  if (!orders.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          No orders found
        </td>
      </tr>
    `;
    return;
  }

  orders.forEach((o, index) => {
    const canConfirm = o.status === "pending";
    const canUpdate =
      ["confirmed", "shipped"].includes(o.status);

    tbody.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${o.orderNo}</td>
        <td>${o.customer}</td>
        <td>${formatDate(o.date)}</td>

        <!-- CURRENT STATUS -->
        <td>
          <span class="status-pill ${getStatusClass(o.status)}">
            ${formatStatus(o.status)}
          </span>
        </td>

        <!-- STATUS ACTION -->
        <td>
          ${
            canConfirm
              ? `<button class="btn btn-sm btn-success"
                   onclick="updateStatus('${o.id}', 'confirmed')">
                   Confirm
                 </button>`
              : canUpdate
              ? `
                <select class="form-select form-select-sm"
                  onchange="updateStatus('${o.id}', this.value)">
                  <option value="">Change</option>
                  ${
                    o.status === "confirmed"
                      ? `<option value="shipped">Ship</option>`
                      : ""
                  }
                  ${
                    o.status === "shipped"
                      ? `<option value="delivered">Deliver</option>`
                      : ""
                  }
                </select>
              `
              : `<span class="text-muted small">—</span>`
          }
        </td>

        <!-- PAYMENT -->
        <td>
          <span class="badge ${o.paymentMethod}">
            ${o.paymentMethod.toUpperCase()}
          </span>
        </td>

        <td>₹${o.total}</td>

      
      </tr>
    `;
  });
}


function formatDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short"
  });
}

function formatStatus(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getStatusClass(status) {
  switch (status) {
    case "confirmed":
    case "delivered":
      return "paid";        // green

    case "shipped":
      return "pending";     // blue / in-progress

    case "pending":
      return "pending";     // yellow

    case "cancelled":
    case "returned":
      return "canceled";    // red

    default:
      return "pending";
  }
}


function viewOrder(orderId) {
  window.location.href = `orderDetails.html?id=${orderId}`;
}


document.querySelector(".btn.btn-dark").addEventListener("click", applyOrderFilters);
document.querySelector(".btn.btn-outline-secondary").addEventListener("click", resetOrderFilters);

function applyOrderFilters() {
  const orderId = document.getElementById("filterOrderId").value.trim().toLowerCase();
  const date = document.getElementById("filterDate").value;
  const status = document.getElementById("filterStatus").value;
  const payment = document.getElementById("filterPayment").value;

  let filtered = [...allOrders];

  /* 🔢 ORDER ID */
  if (orderId) {
    filtered = filtered.filter(o =>
      o.orderNo.toLowerCase().includes(orderId)
    );
  }

  /* 📅 DATE */
  if (date) {
    filtered = filtered.filter(o => {
      const orderDate = new Date(o.date).toISOString().split("T")[0];
      return orderDate === date;
    });
  }

  /* 📦 STATUS */
  if (status) {
    filtered = filtered.filter(o => o.status === status);
  }

  /* 💳 PAYMENT METHOD */
  if (payment) {
    filtered = filtered.filter(o => o.paymentMethod === payment);
  }

  renderOrders(filtered);
  updateOrderKPIs(filtered); 
 
}

function resetOrderFilters() {
  document.getElementById("filterOrderId").value = "";
  document.getElementById("filterDate").value = "";
  document.getElementById("filterStatus").value = "";
  document.getElementById("filterPayment").value = "";

  renderOrders(allOrders);
  updateOrderKPIs(allOrders)
}

function updateOrderKPIs(orders) {

  // 📦 TOTAL ORDERS
  const totalOrders = orders.length;

  // 💰 TOTAL REVENUE (exclude cancelled & returned)
  const revenue = orders
    .filter(o => !["cancelled", "returned"].includes(o.status))
    .reduce((sum, o) => sum + o.total, 0);

  // ❌ CANCELED ORDERS
  const canceledOrders = orders.filter(
    o => o.status === "cancelled"
  ).length;

  // 🔄 UPDATE UI
  document.getElementById("kpiTotalOrders").innerText =
    totalOrders.toLocaleString();

  document.getElementById("kpiRevenue").innerText =
    `₹${revenue.toLocaleString("en-IN")}`;

  document.getElementById("kpiCanceledOrders").innerText =
    canceledOrders.toLocaleString();
}


function renderOrderCharts(orders) {

    
  renderWeeklyOrdersChart(orders);
  renderOrderStatusChart(orders);
}

function renderWeeklyOrdersChart(orders) {
  const canvas = document.getElementById("ordersChart");
  if (!canvas) return;

  // 🔥 FORCE DESTROY CHART ATTACHED TO CANVAS
  const existingChart = Chart.getChart(canvas);
  if (existingChart) {
    existingChart.destroy();
  }

  const ctx = canvas.getContext("2d");

  const labels = [];
  const data = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);

    labels.push(
      d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short"
      })
    );

    const count = orders.filter(o => {
      const od = new Date(o.date);
      return (
        od.getDate() === d.getDate() &&
        od.getMonth() === d.getMonth() &&
        od.getFullYear() === d.getFullYear()
      );
    }).length;

    data.push(count);
  }

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Orders",
          data,
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function renderOrderStatusChart(orders) {
  const canvas = document.getElementById("orderStatusChart");
  if (!canvas) return;

  // 🔥 FORCE DESTROY
  const existingChart = Chart.getChart(canvas);
  if (existingChart) {
    existingChart.destroy();
  }

  const ctx = canvas.getContext("2d");

  const statusCount = {
    confirmed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    returned: 0
  };

  orders.forEach(o => {
    if (statusCount[o.status] !== undefined) {
      statusCount[o.status]++;
    }
  });

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(statusCount),
      datasets: [
        {
          data: Object.values(statusCount)
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: { position: "bottom" }
      }
    }
  });
}


function renderStatusAction(order) {
  const transitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
    returned: []
  };

  const allowed = transitions[order.status];

  // ❌ No actions possible
  if (!allowed || allowed.length === 0) return "";

  return `
    <select class="form-select form-select-sm"
      onchange="updateOrderStatus('${order.id}', this.value)">
      <option value="">Change</option>
      ${allowed
        .map(
          s =>
            `<option value="${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
        )
        .join("")}
    </select>
  `;
}


async function updateStatus(orderId, status) {
  if (!status) return;

  if (!confirm(`Change order status to "${status}"?`)) return;

  try {
    const res = await apiFetch(
      `/api/admin/orders/${orderId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`
        },
        body: JSON.stringify({ status })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || "Status update failed", "error");
      return;
    }

    showToast("Order status updated", "success");
    loadOrders(); // 🔄 refresh table

  } catch (err) {
    console.error(err);
    showToast("Server error", "error");
  }
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