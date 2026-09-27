const authForm = document.querySelector("#admin-auth");
const tokenInput = document.querySelector("#admin-token");
const statusMessage = document.querySelector("#admin-status");
const ordersBody = document.querySelector("#orders-body");
const statusOptions = ["Pending", "Confirmed", "In Progress", "Completed", "Cancelled"];

tokenInput.value = sessionStorage.getItem("kalakriti-admin-token") || "";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
}

function requestOptions(method = "GET", body) {
  return {
    method,
    headers: {
      Authorization: `Bearer ${tokenInput.value}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
}

async function parseResponse(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

function renderOrders(orders) {
  ordersBody.innerHTML = orders.map((order) => `
    <tr>
      <td>#${escapeHtml(order.id)}<br>${escapeHtml(new Date(order.created_at).toLocaleString())}</td>
      <td>${escapeHtml(order.customer_name)}<br>${escapeHtml(order.category)}</td>
      <td><a href="mailto:${escapeHtml(order.email)}">${escapeHtml(order.email)}</a><br>${escapeHtml(order.mobile)}</td>
      <td>${escapeHtml(order.artwork_name)}</td>
      <td>${escapeHtml(order.size)} ${order.color ? `· ${escapeHtml(order.color)}` : ""}<br>Qty: ${escapeHtml(order.quantity)}${order.budget ? `<br>Budget: ${escapeHtml(order.budget)}` : ""}${order.required_date ? `<br>Needed: ${escapeHtml(order.required_date)}` : ""}${order.customization_details ? `<br>${escapeHtml(order.customization_details)}` : ""}${order.message ? `<br>${escapeHtml(order.message)}` : ""}</td>
      <td>${order.reference_image ? `<a href="${escapeHtml(order.reference_image)}" target="_blank" rel="noopener">View image</a>` : "None"}</td>
      <td><select aria-label="Status for order ${escapeHtml(order.id)}" data-order-id="${escapeHtml(order.id)}">${statusOptions.map((status) => `<option${order.status === status ? " selected" : ""}>${status}</option>`).join("")}</select></td>
    </tr>
  `).join("");
}

async function loadOrders() {
  statusMessage.textContent = "Loading orders...";
  try {
    const response = await fetch("/api/orders", requestOptions());
    const orders = await parseResponse(response);
    renderOrders(orders);
    statusMessage.textContent = `${orders.length} order${orders.length === 1 ? "" : "s"} loaded.`;
    sessionStorage.setItem("kalakriti-admin-token", tokenInput.value);
  } catch (error) {
    statusMessage.textContent = error.message;
    if (error.message.includes("token")) sessionStorage.removeItem("kalakriti-admin-token");
  }
}

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadOrders();
});

ordersBody.addEventListener("change", async (event) => {
  const select = event.target.closest("select[data-order-id]");
  if (!select) return;
  select.disabled = true;
  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(select.dataset.orderId)}`, requestOptions("PUT", { status: select.value }));
    await parseResponse(response);
    statusMessage.textContent = `Order #${select.dataset.orderId} updated to ${select.value}.`;
  } catch (error) {
    statusMessage.textContent = error.message;
    loadOrders();
  } finally {
    select.disabled = false;
  }
});

if (tokenInput.value) loadOrders();