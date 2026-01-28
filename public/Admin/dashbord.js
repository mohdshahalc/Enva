document.addEventListener("DOMContentLoaded", loadDashboard);

let allOrders = [];

document
  .getElementById("downloadWeeklyReport")
  .addEventListener("click", () => {
    window.open("/api/admin/dashboard/weekly-report/pdf", "_blank");
  });


async function loadDashboard() {
  try {
    const res = await apiFetch("/api/admin/dashboard", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`
      }
    });

    const data = await res.json();
    if (!res.ok) throw new Error("Dashboard load failed");

    updateDashboardKPIs(data.kpis);
    renderWeeklySalesChart(data.weeklySales);
    updateQuickStats(data.quickStats); 
    renderRecentTransactions(data.recentOrders);
    updateWeeklyReport(data.weeklyReport);
    renderTopProducts(data.topProducts);


  } catch (err) {
    console.error(err);
  }
}

function renderTopProducts(products) {
  const container = document.getElementById("topProductsContainer");
  if (!container || !Array.isArray(products)) return;

  container.innerHTML = "";

  products.forEach(p => {
    const imgSrc = p.image
      ? `/uploads/${p.image}`   // ✅ CORRECT PATH
      : `/Images/default-product.png`;

    container.innerHTML += `
      <div class="top-product-item">
        <img src="${imgSrc}" class="tp-img" alt="${p.name}">
        <div>
          <div class="tp-title">${p.name}</div>
          <div class="tp-price">₹${p.revenue.toLocaleString("en-IN")}</div>
        </div>
        <span class="badge bg-light text-dark ms-auto">
          ${p.qty} sold
        </span>
      </div>
    `;
  });
}



function updateQuickStats(stats) {
  if (!stats) return;

  document.getElementById("qsVisitors").innerText =
    stats.visitorsToday.toLocaleString();

  document.getElementById("qsConversion").innerText =
    `${stats.conversionRate}%`;

  document.getElementById("qsBounce").innerText =
    `${stats.bounceRate}%`;
}

function updateWeeklyReport(report) {
  if (!report) return;

  document.getElementById("weeklySalesAmount").innerText =
    `₹${report.weeklySalesAmount.toLocaleString("en-IN")}`;

  document.getElementById("weeklyOrdersCount").innerText =
    report.weeklyOrdersCount.toLocaleString();

  document.getElementById("weeklyGrowthRate").innerText =
    `+${report.weeklyGrowthRate}%`;
}




function updateDashboardKPIs(kpis) {
  if (!kpis) return;

  document.getElementById("kpiTotalSales").innerText =
    `₹${(kpis.totalSales / 1000).toFixed(1)}K`;

  document.getElementById("kpiTotalOrders").innerText =
    kpis.totalOrders.toLocaleString();

  document.getElementById("kpiPendingCancelled").innerText =
    kpis.pendingOrders + kpis.cancelledOrders;

  document.getElementById("kpiCancelledOnly").innerText =
    kpis.cancelledOrders;
}


function renderWeeklySalesChart(weeklySales) {
  const canvas = document.getElementById("salesChart");
  if (!canvas || !Array.isArray(weeklySales)) return;

  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  const ctx = canvas.getContext("2d");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: weeklySales.map(d => d.day),
      datasets: [{
        data: weeklySales.map(d => d.total),
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.15)",
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderRecentTransactions(orders) {
  console.log(orders);
  
  const tbody = document.querySelector(".recent-transactions tbody");
  if (!tbody || !Array.isArray(orders)) return;

  tbody.innerHTML = "";

  orders.forEach((o, i) => {
    tbody.innerHTML += `
      <tr class="row-${getRowClass(o.status)}">
        <td>${i + 1}</td>
        <td>${o.orderNo}</td>
        <td>${o.customer}</td>
        <td>${new Date(o.date).toLocaleDateString("en-IN")}</td>
        <td>
  <span class="status-pill ${getStatusClass(o.status)}">
    <i class="${getStatusIcon(o.status)}"></i>
    ${o.status}
  </span>
</td>
        <td class="text-end">₹${o.total}</td>
      </tr>
    `;
  });
}

function getStatusIcon(status) {
  switch (status) {
    case "pending": return "fa-regular fa-clock";
    case "confirmed": return "fa-solid fa-circle-check";
    case "shipped": return "fa-solid fa-truck";
    case "delivered": return "fa-solid fa-box-open";
    case "cancelled": return "fa-solid fa-circle-xmark";
    case "returned": return "fa-solid fa-rotate-left";
    default: return "fa-regular fa-clock";
  }
}



function getStatusClass(status) {
  switch (status) {
    case "pending":
      return "pending";
    case "confirmed":
      return "confirmed";
    case "shipped":
      return "shipped";
    case "delivered":
      return "delivered";
    case "cancelled":
      return "cancelled";
    case "returned":
      return "returned";
    default:
      return "pending";
  }
}
function getRowClass(status) {
  if (["confirmed", "shipped", "delivered"].includes(status)) return "paid";
  if (status === "pending") return "pending";
  return "cancel";
}





