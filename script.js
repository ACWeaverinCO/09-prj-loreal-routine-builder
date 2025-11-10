/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const productSearch = document.getElementById("productSearch");
const clearSearchBtn = document.getElementById("clearSearch");

/* Store conversation history for context */
const conversationHistory = [];

/* Store current filter state */
let currentCategory = "";
let currentSearchTerm = "";

/* Automatic RTL Detection */
/* List of RTL language codes */
const rtlLanguages = [
  "ar",
  "he",
  "fa",
  "ur",
  "yi",
  "arc",
  "azb",
  "ckb",
  "dv",
  "ha",
  "khw",
  "ks",
  "ku",
  "ps",
  "sd",
  "ug",
];

/* Detect browser language and set direction automatically */
function detectAndSetDirection() {
  /* Get browser language (e.g., 'en-US', 'ar-SA', 'he-IL') */
  const userLang = navigator.language || navigator.userLanguage;
  /* Extract the base language code (e.g., 'en' from 'en-US') */
  const langCode = userLang.split("-")[0].toLowerCase();

  /* Check if the language is RTL */
  const isRTL = rtlLanguages.includes(langCode);

  /* Set the direction attribute on the HTML element */
  const direction = isRTL ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", direction);
  document.documentElement.setAttribute("lang", langCode);
}

/* Run on page load */
detectAndSetDirection();

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

  /* Render the selected list on initial load if there are saved selections */
  if (selectedIds.size > 0) {
    renderSelectedList();
  }

  return data.products;
}

/* Create HTML for displaying product cards */
/* track selected product ids in a Set for fast lookup */
/* Load selected IDs from localStorage on page load */
const savedIds = localStorage.getItem("selectedProductIds");
const selectedIds = savedIds ? new Set(JSON.parse(savedIds)) : new Set();

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

  /* Update the "Generate Routine" button to show/hide "Clear All" button */
  updateClearAllButton();
}

/* Function to update or create the "Clear All" button */
function updateClearAllButton() {
  const selectedProductsSection = document.querySelector(".selected-products");
  let clearAllBtn = document.getElementById("clearAllBtn");

  if (selectedIds.size > 0) {
    /* Show clear all button if there are selected products */
    if (!clearAllBtn) {
      clearAllBtn = document.createElement("button");
      clearAllBtn.id = "clearAllBtn";
      clearAllBtn.className = "clear-all-btn";
      clearAllBtn.innerHTML =
        '<i class="fa-solid fa-trash"></i> Clear All Selections';
      clearAllBtn.addEventListener("click", clearAllSelections);

      /* Insert before the generate button */
      const generateBtn = document.getElementById("generateRoutine");
      selectedProductsSection.insertBefore(clearAllBtn, generateBtn);
    }
  } else {
    /* Remove clear all button if no products selected */
    if (clearAllBtn) {
      clearAllBtn.remove();
    }
  }
}

/* Function to clear all selections */
function clearAllSelections() {
  /* Clear the Set */
  selectedIds.clear();

  /* Clear localStorage */
  localStorage.removeItem("selectedProductIds");

  /* Update all product cards to remove selected state */
  const allCards = productsContainer.querySelectorAll(".product-card");
  allCards.forEach((card) => {
    card.classList.remove("selected");
    card.setAttribute("aria-pressed", "false");
  });

  /* Re-render the selected list */
  renderSelectedList();
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

  /* Save to localStorage */
  localStorage.setItem(
    "selectedProductIds",
    JSON.stringify(Array.from(selectedIds))
  );

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
  currentCategory = e.target.value;

  /* Apply both category and search filters */
  applyFilters(products);
});

/* Search products as user types */
productSearch.addEventListener("input", async (e) => {
  currentSearchTerm = e.target.value.trim().toLowerCase();

  /* Show or hide clear button */
  if (currentSearchTerm) {
    clearSearchBtn.style.display = "flex";
  } else {
    clearSearchBtn.style.display = "none";
  }

  /* If no category selected, show placeholder */
  if (!currentCategory) {
    if (currentSearchTerm) {
      /* Load all products if searching without category */
      const products = await loadProducts();
      applyFilters(products);
    } else {
      productsContainer.innerHTML = `
        <div class="placeholder-message">
          Select a category to view products
        </div>
      `;
    }
    return;
  }

  /* Apply filters if category is selected */
  const products = await loadProducts();
  applyFilters(products);
});

/* Clear search button handler */
clearSearchBtn.addEventListener("click", async () => {
  productSearch.value = "";
  currentSearchTerm = "";
  clearSearchBtn.style.display = "none";

  /* Re-apply filters without search term */
  if (currentCategory) {
    const products = await loadProducts();
    applyFilters(products);
  }
});

/* Function to apply both category and search filters */
function applyFilters(products) {
  let filteredProducts = products;

  /* Filter by category if selected */
  if (currentCategory) {
    filteredProducts = filteredProducts.filter(
      (product) => product.category === currentCategory
    );
  }

  /* Filter by search term if provided */
  if (currentSearchTerm) {
    filteredProducts = filteredProducts.filter((product) => {
      /* Search in name, brand, and description */
      const searchableText =
        `${product.name} ${product.brand} ${product.description}`.toLowerCase();
      return searchableText.includes(currentSearchTerm);
    });
  }

  /* Display filtered results */
  if (filteredProducts.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found matching your search.
      </div>
    `;
  } else {
    displayProducts(filteredProducts);
  }
}

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

  /* Add user message to conversation history */
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  /* Display user's message in chat window */
  chatWindow.innerHTML += `<div class="message user-message">${escapeHtml(
    userMessage
  )}</div>`;

  /* Clear input field */
  userInput.value = "";

  /* Show loading indicator */
  chatWindow.innerHTML += `<div class="message bot-message loading">Thinking...</div>`;

  try {
    /* Send POST request to your Cloudflare Worker with conversation history */
    const response = await fetch(
      "https://floral-unit-4d9b.ashley-weaver.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversationHistory,
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

    /* Add assistant response to conversation history */
    conversationHistory.push({
      role: "assistant",
      content: reply,
    });

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

    /* Add the routine to conversation history so chatbot remembers it */
    conversationHistory.push({
      role: "assistant",
      content: `I generated this personalized routine for you:\n\n${routine}`,
    });
  } catch (err) {
    chatWindow.innerHTML += `<div class="message bot-message error">Error generating routine. Please try again.</div>`;
    console.error(err);
  }
});
