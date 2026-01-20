
document.addEventListener("DOMContentLoaded", loadUserName,loadMyOrders);
document.addEventListener("DOMContentLoaded",loadMyOrders);

async function loadUserName() {
  const token = localStorage.getItem("userToken")

  if (!token) return;

  const res = await fetch("http://localhost:5000/api/user/profile", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const user = await res.json();

  // user.name already contains "First Last"
  document.getElementById("fullName").textContent = user.name || "";
} 

async function loadMyOrders() {
    
  const token = localStorage.getItem("userToken")

  const res = await fetch("http://localhost:5000/api/user/orders", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (res.status === 403) {
        const data = await res.json();
        alert(data.message || "Your account has been blocked");

        // clear ONLY user token
        localStorage.removeItem("userToken");
        window.location.href = "login.html";
        return;
      }

  if (!res.ok) {
    console.error("Failed to load orders");
    return;
  }

  const orders = await res.json();
  renderOrders(orders);
}

function renderOrders(orders) {
  console.log(orders);
  
  const container = document.getElementById("ordersContainer");
  if (!orders.length) {
    container.innerHTML = `
      <p class="text-secondary">You have no orders yet.</p>
    `;
    return;
  }

  container.innerHTML = orders.map(order=> {


      console.log(order);
      
   const statusMap = {
  pending: {
    cls: "bg-warning-subtle text-warning",
    icon: "fa-clock",
    text: "Pending"
  },
  confirmed: {
    cls: "bg-success-subtle text-success",
    icon: "fa-circle-check",
    text: "Confirmed"
  },
  shipped: {
    cls: "bg-primary-subtle text-primary",
    icon: "fa-truck",
    text: "Shipped"
  },
  delivered: {
    cls: "bg-success-subtle text-success",
    icon: "fa-check-circle",
    text: "Delivered"
  },
  cancelled: {
    cls: "bg-danger-subtle text-danger",
    icon: "fa-ban",
    text: "Cancelled"
  },
  returned: {
    cls: "bg-warning-subtle text-warning",
    icon: "fa-rotate-left",
    text: "Returned"
  }
};


    const status = statusMap[order.status] || statusMap.pending;
    
    
    return `
      <div class="card border-0 shadow-sm rounded-4 mb-4" style="max-width: 800px;">
        <div class="card-body p-4">

          <!-- HEADER -->
          <div class="d-flex justify-content-between align-items-center flex-wrap mb-3 border-bottom pb-3">
            <div class="small">
              <h5 class="fw-bold mb-1">Order #${order._id.slice(-8)}</h5>
              <p class="text-secondary mb-0">
                Placed on: ${new Date(order.createdAt).toDateString()}
              </p>
            </div>

            <span class="badge ${status.cls} fw-bold px-3 py-2 rounded-pill fs-6">
              <i class="fa-solid ${status.icon} me-1"></i> ${status.text}
            </span>
          </div>

         ${order.items.map(item => `
  <div class="d-flex gap-4 py-3 border-bottom">
    <img
      src="/uploads/${item.productImage || item.product.images[0]}"
      class="rounded flex-shrink-0"
      style="width: 80px; height: 80px; object-fit: cover;"
      alt="${item.productName || item.product.name}"
    >

    <div class="small w-100">
      <h6 class="fw-semibold mb-1">
        ${item.productName || item.product.name}
      </h6>

      <p class="text-secondary mb-1">Qty: ${item.quantity}</p>
      <p class="text-secondary mb-1">Size: ${item.size}</p>

      <!-- PRICE -->
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <span class="fw-bold fs-6">
            ₹${item.price}
          </span>

          ${
            item.oldPrice
              ? `
                <span class="text-muted text-decoration-line-through ms-2">
                  ₹${item.oldPrice}
                </span>

                <span class="badge bg-success ms-2">
                  ${item.discountPercent}% OFF
                </span>
              `
              : ""
          }
        </div>

        <p class="text-secondary mb-0">
          Total: ₹${(item.price * item.quantity).toFixed(2)}
        </p>
      </div>
    </div>
  </div>
`).join("")}


          <hr class="mt-3 mb-3">

          <!-- TOTAL -->
          <div class="d-flex justify-content-end mb-4">
            <p class="fw-bold fs-5 mb-0">
              Order Total: ₹${order.total}
            </p>
          </div>

          <!-- ACTIONS -->
          <div class="d-flex justify-content-end gap-3 flex-wrap">
           

            

            <button
    class="btn btn-primary fw-bold px-4 py-2 shadow-sm"
    onclick="viewOrder('${order._id}')">
    View Details
  </button>

          </div>

        </div>
      </div>
    `;
  }).join("");
}


function viewOrder(orderId) {
  window.location.href = `viewOrder.html?id=${orderId}`;
}

