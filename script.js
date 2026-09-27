const artGrid = document.querySelector("#art-grid");
const filterButtons = document.querySelectorAll(".filter-button");
const modal = document.querySelector("#art-modal");
const modalImage = document.querySelector("#modal-image");
const modalTitle = document.querySelector("#modal-title");
const reviewForm = document.querySelector("#review-form");
const reviewStatus = document.querySelector("#review-status");
const reviewsGrid = document.querySelector("#reviews-grid");
const orderForm = document.querySelector(".order-form");
const artworkNameInput = document.querySelector("#artwork-name");
const categoryInput = document.querySelector("#category");
const referenceImageInput = document.querySelector("#reference-image");
const referencePreview = document.querySelector("#reference-preview");
const orderStatus = document.querySelector("#order-status");
const completedOrderImageInput = document.querySelector("#completed-order-image");
const completedOrderPreview = document.querySelector("#completed-order-preview");
const authPanel = document.querySelector("#auth-panel");
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const authStatus = document.querySelector("#auth-status");
const customerDashboard = document.querySelector("#customer-dashboard");
const customerName = document.querySelector("#customer-name");
const customerOrders = document.querySelector("#customer-orders");
const signOutButton = document.querySelector("#sign-out");
let customer = null;

function customerHeaders() {
  const token = localStorage.getItem("kalakriti-customer-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function renderCustomerOrders(orders) {
  if (!orders.length) {
    customerOrders.innerHTML = "<p class=\"empty-state\">You have not placed an order yet.</p>";
    return;
  }
  customerOrders.innerHTML = orders.map((order) => `
    <article class="customer-order">
      <div><strong>Order #${escapeHtml(order.id)}</strong><span>${escapeHtml(new Date(order.created_at).toLocaleString())}</span></div>
      <p>${escapeHtml(order.artwork_name || order.category)} · Quantity: ${escapeHtml(order.quantity || "Not specified")}</p>
      <span class="order-badge status-${escapeHtml(order.status.toLowerCase().replaceAll(" ", "-"))}">${escapeHtml(order.status)}</span>
    </article>
  `).join("");
}

async function loadCustomerOrders() {
  const response = await fetch("/api/my-orders", { headers: customerHeaders() });
  const result = await readApiResponse(response);
  if (!response.ok) throw new Error(result.error || "Orders could not be loaded.");
  renderCustomerOrders(result);
}

function setCustomerSession(result) {
  customer = result.customer;
  localStorage.setItem("kalakriti-customer-token", result.token);
  authPanel.classList.add("is-hidden");
  customerDashboard.classList.remove("is-hidden");
  customerName.textContent = customer.name;
  authStatus.textContent = "You are signed in. Your new orders will appear in this dashboard.";
  loadCustomerOrders().catch((error) => { authStatus.textContent = error.message; });
}

async function submitAuthForm(form, endpoint) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.fromEntries(new FormData(form))),
  });
  const result = await readApiResponse(response);
  if (!response.ok) throw new Error(result.error || "Authentication failed.");
  return result;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authStatus.textContent = "Signing in...";
  try {
    const result = await submitAuthForm(loginForm, "/api/auth/login");
    setCustomerSession(result);
    loginForm.reset();
  } catch (error) {
    authStatus.textContent = error.message;
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authStatus.textContent = "Creating your account...";
  try {
    const result = await submitAuthForm(registerForm, "/api/auth/register");
    registerForm.reset();
    document.querySelector("#login-email").value = result.customer.email;
    authStatus.textContent = "Account created successfully. Please sign in to continue.";
    document.querySelector("#login-password").focus();
  } catch (error) {
    authStatus.textContent = error.message;
  }
});

signOutButton.addEventListener("click", () => {
  localStorage.removeItem("kalakriti-customer-token");
  customer = null;
  authPanel.classList.remove("is-hidden");
  customerDashboard.classList.add("is-hidden");
  authStatus.textContent = "You have been signed out.";
});

async function restoreCustomerSession() {
  if (!localStorage.getItem("kalakriti-customer-token")) return;
  const response = await fetch("/api/auth/me", { headers: customerHeaders() });
  if (!response.ok) return localStorage.removeItem("kalakriti-customer-token");
  const result = await response.json();
  setCustomerSession({ ...result, token: localStorage.getItem("kalakriti-customer-token") });
}

// Add a View Art button to every gallery card automatically.
document.querySelectorAll(".art-card").forEach((card) => {
  addViewButton(card);
  addOrderButton(card);
});

function addOrderButton(card) {
  const orderButton = card.querySelector(".btn-primary[href=\"#order\"]");
  const title = card.querySelector("h3");
  const category = card.querySelector(".category-tag");

  if (!orderButton || !title || !category || orderButton.dataset.orderConnected) {
    return;
  }

  orderButton.dataset.orderConnected = "true";
  orderButton.addEventListener("click", () => {
    artworkNameInput.value = title.textContent.trim();
    categoryInput.value = getCategoryOption(category.textContent.trim());
    orderStatus.textContent = `${title.textContent.trim()} selected. Please complete your details below.`;
    orderForm.scrollIntoView({ behavior: "smooth", block: "start" });
    artworkNameInput.focus();
  });
}

function getCategoryOption(categoryName) {
  const options = Array.from(categoryInput.options);
  const aliases = {
    "Sketches": "Sketching",
    "Portraits": "Portrait Art",
    "Phone Covers": "Mobile Cover Painting",
    "Other Art": "Other Custom Artworks",
  };
  const matchingOption = options.find((option) => option.textContent.trim() === (aliases[categoryName] || categoryName));
  return matchingOption ? matchingOption.value : options[0].value;
}

function addViewButton(card) {
  if (card.querySelector(".view-art-button")) {
    return;
  }

  const image = card.querySelector("img");
  const title = card.querySelector("h3");
  const button = document.createElement("button");
  button.className = "view-art-button";
  button.type = "button";
  button.textContent = "View Art  →";
  button.addEventListener("click", () => openArtwork(image.src, title.textContent));
  card.querySelector(".card-body").appendChild(button);
  image.addEventListener("click", () => openArtwork(image.src, title.textContent));
}

// Filter the gallery by category.
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedCategory = button.dataset.filter;

    filterButtons.forEach((filterButton) => filterButton.classList.remove("active"));
    button.classList.add("active");

    document.querySelectorAll(".art-card").forEach((card) => {
      const categories = card.dataset.category.split(" ");
      const shouldShow = selectedCategory === "all" || categories.includes(selectedCategory);
      card.classList.toggle("is-hidden", !shouldShow);
    });
  });
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);
}

async function readApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `The API returned HTTP ${response.status} instead of JSON. Configure MySQL, run npm start, and open http://localhost:5000.`
    );
  }
  try {
    return await response.json();
  } catch {
    throw new Error(
      `The API returned an invalid response (HTTP ${response.status}). Configure MySQL, run npm start, and open http://localhost:5000.`
    );
  }
}

function openArtwork(imageSource, title) {
  modalImage.src = imageSource;
  modalImage.alt = title;
  modalTitle.textContent = title;
  modalImage.classList.remove("zoomed");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeArtwork() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  modalImage.classList.remove("zoomed");
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-close-modal]").forEach((element) => {
  element.addEventListener("click", closeArtwork);
});

modalImage.addEventListener("click", () => {
  modalImage.classList.toggle("zoomed");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeArtwork();
  }
});

reviewForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!customer) {
    reviewStatus.textContent = "Sign in from My Account before submitting a review.";
    return;
  }
  const submitButton = reviewForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  reviewStatus.textContent = "Saving your review...";
  try {
    const response = await fetch("/api/reviews", { method: "POST", headers: customerHeaders(), body: new FormData(reviewForm) });
    const result = await readApiResponse(response);
    if (!response.ok) throw new Error(result.error || "Review could not be submitted.");
    await loadReviews();
    reviewStatus.textContent = "Your review has been saved.";
    reviewForm.reset();
    completedOrderPreview.classList.remove("is-visible");
    completedOrderPreview.innerHTML = "";
  } catch (error) {
    reviewStatus.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

completedOrderImageInput.addEventListener("change", (event) => {
  const [selectedFile] = event.target.files;

  if (!selectedFile) {
    completedOrderPreview.classList.remove("is-visible");
    completedOrderPreview.innerHTML = "";
    return;
  }

  const imageUrl = URL.createObjectURL(selectedFile);
  completedOrderPreview.innerHTML = `<img src="${imageUrl}" alt="Completed order preview"><span>${escapeHtml(selectedFile.name)} selected</span>`;
  completedOrderPreview.classList.add("is-visible");
});

function appendReviewCard(review) {
  const name = review.customer_name;
  const image = review.completed_order_image;
  const rating = Number(review.rating);
  const reviewCard = document.createElement("article");
  reviewCard.className = "review-card";
  reviewCard.innerHTML = `
    ${image ? `<img class="review-order-image" src="${escapeHtml(image)}" alt="Customized order for ${escapeHtml(name)}">` : ""}
    <div class="stars">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</div>
    <p>“${escapeHtml(review.message)}”</p>
    <div class="review-author"><strong>${escapeHtml(name)}</strong><span>Happy Kalakriti client</span></div>
  `;
  reviewsGrid.appendChild(reviewCard);
}

async function loadArtworks() {
  try {
    const response = await fetch("/api/artworks");
    if (!response.ok) throw new Error("Artwork catalog could not be loaded.");
    const artworks = await response.json();
    artGrid.innerHTML = artworks.map((artwork) => `
      <article class="art-card" data-category="${escapeHtml(getArtworkFilters(artwork))}">
        <img src="${escapeHtml(artwork.image)}" alt="${escapeHtml(artwork.category)} artwork" />
        <div class="card-body">
          <span class="category-tag">${escapeHtml(artwork.category)}</span>
          <h3>${escapeHtml(artwork.name)}</h3>
          ${artwork.medium ? `<h4>Medium:- ${escapeHtml(artwork.medium)}</h4>` : ""}
          <p>${escapeHtml(artwork.description)}</p>
          <p class="price">${escapeHtml(artwork.price || "Price on Request")}</p>
          <a href="#order" class="btn btn-small btn-primary">Order Now</a>
        </div>
      </article>
    `).join("");
    document.querySelectorAll(".art-card").forEach((card) => {
      addViewButton(card);
      addOrderButton(card);
    });
  } catch (error) {
    console.error(error);
    artGrid.innerHTML = `<p class="order-status">Artwork could not be loaded. Check the server and MySQL connection, then reload.</p>`;
  }
}

function getArtworkFilters(artwork) {
  const categoryFilters = {
    "Canvas Painting": "canvas",
    "Sketching": "sketch",
    "Sketches": "sketch",
    "Portrait Art": "portrait",
    "Portraits": "portrait",
    "Wall Painting": "wall",
    "Antarpat Designs": "antarpat",
    "Phone Covers": "phone-cover",
    "Mobile Cover Painting": "phone-cover",
    "Other Art": "other",
  };
  const filters = [categoryFilters[artwork.category]];
  if (artwork.category === "Rangoli") filters.push("rangoli");
  if (artwork.medium?.toLowerCase() === "acrylic") filters.push("acrylic");
  return [...new Set(filters.filter(Boolean))].join(" ");
}

async function loadReviews() {
  const response = await fetch("/api/reviews");
  if (!response.ok) throw new Error("Reviews could not be loaded.");
  const reviews = await response.json();
  reviewsGrid.replaceChildren();
  reviews.forEach(appendReviewCard);
}

referenceImageInput.addEventListener("change", (event) => {
  const [selectedFile] = event.target.files;

  if (!selectedFile) {
    referencePreview.classList.remove("is-visible");
    referencePreview.innerHTML = "";
    return;
  }

  const imageUrl = URL.createObjectURL(selectedFile);
  referencePreview.innerHTML = `<img src="${imageUrl}" alt="Reference image preview"><span>${escapeHtml(selectedFile.name)} selected</span>`;
  referencePreview.classList.add("is-visible");
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!customer) {
    orderStatus.textContent = "Sign in from My Account before placing an order.";
    document.querySelector("#account").scrollIntoView({ behavior: "smooth" });
    return;
  }
  const submitButton = orderForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  orderStatus.textContent = "Saving your order request...";
  try {
    const response = await fetch("/api/orders", { method: "POST", headers: customerHeaders(), body: new FormData(orderForm) });
    const result = await readApiResponse(response);
    if (!response.ok) throw new Error(result.error || "Order request could not be saved.");
    orderStatus.textContent = `Your order request #${result.id} has been saved. We will be in touch soon.`;
    if (customer) loadCustomerOrders().catch(() => {});
    orderForm.reset();
    referencePreview.classList.remove("is-visible");
    referencePreview.innerHTML = "";
  } catch (error) {
    orderStatus.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

loadArtworks();
loadReviews().catch((error) => {
  console.error(error);
  reviewStatus.textContent = "Reviews could not be loaded. Check the server and MySQL connection.";
});
restoreCustomerSession().catch((error) => {
  authStatus.textContent = error.message;
});