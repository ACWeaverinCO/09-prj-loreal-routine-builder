/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  /* cache products for later lookups when selecting */
  window.allProducts = data.products;
  return data.products;
}

/* Create HTML for displaying product cards */
/* track selected product ids in a Set for fast lookup */
const selectedIds = new Set();

function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedIds.has(product.id);
      return `
    <div class="product-card ${isSelected ? "selected" : ""}" data-id="${
        product.id
      }" role="button" tabindex="0" aria-pressed="${isSelected}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <div class="product-controls">
          <button class="details-btn" aria-expanded="false" aria-controls="desc-${
            product.id
          }">Details</button>
        </div>
        <div class="product-desc" id="desc-${
          product.id
        }" role="region" aria-hidden="true">${escapeHtml(
        product.description
      )}</div>
      </div>
    </div>
  `;
    })
    .join("");

  // If products were rendered, ensure keyboard accessibility for cards
  const cards = productsContainer.querySelectorAll(".product-card");
  cards.forEach((card) => {
    card.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        const id = Number(card.dataset.id);
        toggleSelect(id);
      }
    });
  });

  // wire up details buttons inside cards (delegated-style but per-render)
  const details = productsContainer.querySelectorAll(".details-btn");
  details.forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      // prevent the click from bubbling to the card selection handler
      ev.stopPropagation();
      const card = btn.closest(".product-card");
      if (!card) return;
      const desc = card.querySelector(".product-desc");
      const isExpanded = card.classList.toggle("expanded");
      btn.setAttribute("aria-expanded", isExpanded);
      if (desc) desc.setAttribute("aria-hidden", !isExpanded);
    });
  });
}

function renderSelectedList() {
  if (!selectedProductsList) return;
  const items = Array.from(selectedIds).map((id) => {
    const p = window.allProducts && window.allProducts.find((x) => x.id === id);
    const name = p ? p.name : `Product ${id}`;
    return `
      <div class="selected-chip" data-id="${id}">
        ${escapeHtml(name)}
        <button class="remove-chip" aria-label="Remove ${escapeHtml(
          name
        )}" data-id="${id}">×</button>
      </div>`;
  });

  selectedProductsList.innerHTML =
    items.join("") ||
    `<div class="placeholder-message">No products selected</div>`;
}

/* small helper to avoid injecting raw HTML from product names */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toggleSelect(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);

  // update card visual state if present
  const card = productsContainer.querySelector(
    `.product-card[data-id="${id}"]`
  );
  if (card) {
    card.classList.toggle("selected", selectedIds.has(id));
    card.setAttribute("aria-pressed", selectedIds.has(id));
  }

  renderSelectedList();
}

// allow removing by clicking the remove button in the selected list
if (selectedProductsList) {
  selectedProductsList.addEventListener("click", (e) => {
    const btn = e.target.closest(".remove-chip");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    toggleSelect(id);
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* product card click toggles selection */
productsContainer.addEventListener("click", (e) => {
  // If the click came from inside a details button, ignore so we don't toggle selection
  if (e.target.closest(".details-btn")) return;

  const card = e.target.closest(".product-card");
  if (!card) return;
  const id = Number(card.dataset.id);
  if (!id) return;
  toggleSelect(id);
});

/* Chat form submission handler - sends request to Cloudflare Worker */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  /* Get the user's message from the input field */
  const userInput = document.getElementById("userInput");
  const userMessage = userInput.value.trim();

  if (!userMessage) return;

  /* Display user's message in chat window */
  chatWindow.innerHTML += `<div class="message user-message">${escapeHtml(
    userMessage
  )}</div>`;

  /* Clear input field */
  userInput.value = "";

  /* Show loading indicator */
  chatWindow.innerHTML += `<div class="message bot-message loading">Thinking...</div>`;

  try {
    /* Send POST request to your Cloudflare Worker */
    const response = await fetch(
      "https://floral-unit-4d9b.ashley-weaver.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      }
    );

    /* Parse the response from the worker */
    const data = await response.json();

    /* Remove loading indicator */
    const loadingMsg = chatWindow.querySelector(".loading");
    if (loadingMsg) loadingMsg.remove();

    /* Display the AI response */
    const reply = data.reply || "Sorry, I couldn't get a response.";
    chatWindow.innerHTML += `<div class="message bot-message">${escapeHtml(
      reply
    )}</div>`;

    /* Scroll to bottom of chat */
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (error) {
    /* Remove loading indicator */
    const loadingMsg = chatWindow.querySelector(".loading");
    if (loadingMsg) loadingMsg.remove();

    /* Display error message */
    chatWindow.innerHTML += `<div class="message bot-message error">Error connecting to the server. Please try again.</div>`;
    console.error("Error:", error);
  }
});

/* Generate Routine button handler */
const generateButton = document.getElementById("generateRoutine");

generateButton.addEventListener("click", async () => {
  /* Gather selected products */
  const selectedProducts = Array.from(selectedIds)
    .map((id) => {
      return window.allProducts.find((p) => p.id === id);
    })
    .filter(Boolean);

  if (selectedProducts.length === 0) {
    alert("Please select some products first!");
    return;
  }

  /* Show a message in chat for feedback */
  chatWindow.innerHTML += `<div class="message bot-message">Generating your personalized routine...</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    /* Send selected products to your Worker */
    const response = await fetch(
      "https://floral-unit-4d9b.ashley-weaver.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ products: selectedProducts }),
      }
    );

    const data = await response.json();

    /* Display the generated routine */
    const routine = data.routine || "Sorry, I couldn't generate a routine.";
    chatWindow.innerHTML += `<div class="message bot-message">${escapeHtml(
      routine
    )}</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (err) {
    chatWindow.innerHTML += `<div class="message bot-message error">Error generating routine. Please try again.</div>`;
    console.error(err);
  }
});
