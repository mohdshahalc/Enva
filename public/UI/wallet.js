
document.addEventListener("DOMContentLoaded", loadWallet);

document.addEventListener("DOMContentLoaded", loadUserName);

let showAllTransactions = false;
let cachedTransactions = [];


async function loadUserName() {
  const token =  localStorage.getItem("userToken")

  if (!token) return;

  const res = await apiFetch("http://localhost:5000/api/user/profile", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const user = await res.json();

  // user.name already contains "First Last"
  document.getElementById("fullName").textContent = user.name || "";
} 

async function loadWallet() {
  const token = localStorage.getItem("userToken");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/user/wallet", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (res.status === 403) {
      const data = await res.json();
      showToast(data.message || "Your account has been blocked", "error");

      localStorage.removeItem("userToken");
      window.location.href = "login.html";
      return;
    }

    if (!res.ok) throw new Error("Failed to load wallet");

    const data = await res.json();
    renderWallet(data);

  } catch (err) {
    console.error(err);
    showToast("Unable to load wallet", "error");
  }
}

function renderWallet({ balance, transactions }) {
  // 💰 Balance
  document.getElementById("walletBalance").textContent =
    Number(balance).toFixed(2);

  // 🆔 Wallet ID
  document.getElementById("walletId").textContent =
    "ENVA-" + Math.floor(1000 + Math.random() * 9000);

  // 📦 Cache transactions once
  cachedTransactions = transactions || [];

  // Render based on toggle
  renderTransactionList();
}

function renderTransactionList() {
  const list = document.getElementById("transactionList");

  if (!cachedTransactions.length) {
    list.innerHTML = `
      <div class="p-4 text-center text-muted small">
        No wallet transactions yet
      </div>
    `;
    return;
  }

  const data = showAllTransactions
    ? [...cachedTransactions].reverse()        // ALL (newest first)
    : cachedTransactions.slice(-5).reverse(); // LAST 5

  list.innerHTML = data.map(renderTransaction).join("");
}



function renderWallet({ balance, transactions }) {
  document.getElementById("walletBalance").textContent =
    Number(balance).toFixed(2);

  document.getElementById("walletId").textContent =
    "ENVA-" + Math.floor(1000 + Math.random() * 9000);

  cachedTransactions = transactions || [];
  renderTransactionList();
}

document
  .getElementById("toggleTransactions")
  ?.addEventListener("click", (e) => {
    e.preventDefault();

    showAllTransactions = !showAllTransactions;

    document.getElementById("toggleTransactions").textContent =
      showAllTransactions ? "Show Less" : "View All";

    renderTransactionList();
  });


function toggleTransactions() {
  showAllTransactions = !showAllTransactions;

  const btn = document.getElementById("viewAllBtn");
  btn.textContent = showAllTransactions ? "Show Less" : "View All";

  renderTransactionList();
}


function renderTransaction(tx) {
  const isCredit = tx.type === "credit";

  const iconMap = {
    credit: "fa-arrow-down",
    debit: "fa-bag-shopping",
    refund: "fa-rotate-left"
  };

  const iconClass = isCredit ? "icon-deposit" : "icon-spent";
  const amountClass = isCredit ? "text-success" : "text-danger";
  const sign = isCredit ? "+" : "-";

  return `
    <div class="transaction-item d-flex align-items-center justify-content-between">
      <div class="d-flex align-items-center gap-3">
        <div class="icon-circle ${iconClass}">
          <i class="fa-solid ${iconMap[tx.type] || "fa-wallet"}"></i>
        </div>
        <div>
          <h6 class="mb-0 fw-bold small">${tx.reason || "Wallet transaction"}</h6>
          <p class="text-secondary mb-0" style="font-size:11px;">
            ${formatDate(tx.date)}
          </p>
        </div>
      </div>

      <div class="text-end">
        <div class="fw-bold ${amountClass} small">
          ${sign} ₹${tx.amount.toFixed(2)}
        </div>
        <span class="text-secondary" style="font-size:10px;">
          ${tx.type.toUpperCase()}
        </span>
      </div>
    </div>
  `;
}

function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}


function openWalletTopupModal() {
  document.getElementById("walletTopupOverlay")
    .classList.remove("d-none");
}

function closeWalletTopupModal() {
  document.getElementById("walletTopupOverlay")
    .classList.add("d-none");
}

async function startWalletTopup() {
  const amount = Number(
    document.getElementById("walletTopupAmount").value
  );

  if (!amount || amount < 100) {
    showToast("Minimum ₹100 required", "warning");
    return;
  }

  try {
    const res = await apiFetch(
      "http://localhost:5000/api/payment/wallet-topup",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("userToken")}`
        },
        body: JSON.stringify({ amount })
      }
    );

    const data = await res.json();

    if (!res.ok || !data.url) {
      throw new Error("Stripe session failed");
    }

    window.location.href = data.url;

  } catch (err) {
    console.error(err);
    showToast("Unable to start wallet top-up", "error");
  }
}

const params = new URLSearchParams(window.location.search);

if (params.get("topup") === "success") {
  showToast("Wallet recharged successfully", "success");
  history.replaceState({}, "", "wallet.html");
  loadWallet();
}



// ======================
// TOAST
// ======================
function showToast(message, type = "success") {
    console.log("jii");
    
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

