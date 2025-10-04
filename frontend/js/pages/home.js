// @frontend/js/pages/home.js
import {
  getProducts,
  createProduct,
  updateProduct,
  uploadProductMedia,
  checkPermission,
} from "../api.js";

import { applyTranslations } from "../i18n.js";
import {
  openModal,
  closeModal,
  initModal,
  showNotification,
  attachMediaFallback,
  DEFAULT_FALLBACK_IMAGE,
} from "../utils.js";

// -------- NEW: derive key & proxy url helpers --------
function deriveKeyFromUrl(url) {
  try {
    if (!url) return null;

    // 1) ถ้า backend ส่ง s3_key มา ให้ใช้ s3_key โดยตรง (จะจัดการใน mediaCoverHTML)
    //    ฟังก์ชันนี้รองรับเฉพาะกรณีมีแต่ url

    // 2) พยายามตัด prefix domain ออก
    //    สมมุติ public base เป็น .../products/... เสมอ ให้ดึงตั้งแต่ /products/ เป็นต้นไป
    const idx = url.indexOf("/products/");
    if (idx !== -1) {
      return url.substring(idx + 1); // ตัด "/" แรกออก → products/...
    }

    // 3) fallback: ลองตัด protocol/host ตรง ๆ
    const u = new URL(url);
    // ตัด leading "/" ออก
    return u.pathname.replace(/^\/+/, "");
  } catch {
    return null;
  }
}

function toProxyUrl(mediaItem) {
  if (!mediaItem) return null;
  // ถ้ามี s3_key จาก backend ใช้ตรง ๆ
  const key = mediaItem.s3_key || deriveKeyFromUrl(mediaItem.url);
  return key ? `/api/media/file/${key}` : (mediaItem.url || null);
}

export function init(container) {
  /* -------------------- Markup -------------------- */
  let templateHTML = "";
  templateHTML += `<section class="home-page">`;
  templateHTML += `  <h2 data-i18n="home.products">Products</h2>`;
  templateHTML += `  <div id="product-action" class="product-action">`;
  templateHTML += `    <button class="liquid-button primary" id="add-product" data-i18n="buttons.addProduct">Add Product</button>`;
  templateHTML += `  </div>`;
  templateHTML += `  <div id="product-list" class="product-list" data-i18n="home.loading">Loading...</div>`;
  templateHTML += `</section>`;

  // Modal markup
  templateHTML += `
  <div id="product-modal" class="modal" role="dialog" aria-hidden="true" aria-labelledby="product-modal-title">
    <div class="modal-content">
      <button class="close-button" aria-label="Close">&times;</button>
      <h2 id="product-modal-title" data-i18n="products.add_title">Add Product</h2>

      <form id="product-form">
        <input type="hidden" id="prod-id" name="id" value="">
        <input type="hidden" id="form-mode" name="mode" value="create">

        <div class="form-group">
          <label for="prod-slug">Slug</label>
          <!-- FIX: ใช้ regex เต็ม + escape ขีดกลาง -->
          <input id="prod-slug" name="slug" type="text" required pattern="^[a-z0-9\\-]+$" placeholder="dedilute-lemon-soda" />
          <small class="help-text">lowercase, ใช้ a–z, 0–9 และ -</small>
        </div>

        <div class="form-group">
          <label for="prod-name" data-i18n="form.name">Name</label>
          <input id="prod-name" name="name" type="text" required placeholder="DeDilute Lemon Soda" />
        </div>

        <div class="form-group">
          <label for="prod-desc" data-i18n="form.description">Description</label>
          <textarea id="prod-desc" name="description" rows="3" placeholder="Refreshing lemon soda with a fizzy kick."></textarea>
        </div>

        <div class="form-group">
          <label for="prod-price" data-i18n="form.price">Price</label>
          <input id="prod-price" name="price" type="number" min="0" step="0.01" required placeholder="2.99" />
        </div>

        <div class="form-group">
          <label for="prod-media" data-i18n="form.media">Image or Video</label>
          <input id="prod-media" name="media" type="file" accept="image/*,video/*" multiple />
          <div id="media-preview" class="media-preview"></div>
        </div>

        <div class="actions">
          <button type="button" class="liquid-button cancel" id="product-cancel" data-i18n="buttons.cancel">Cancel</button>
          <button type="submit" class="liquid-button primary" id="product-save" data-i18n="buttons.save">Save</button>
        </div>
      </form>
    </div>
  </div>`;

  container.innerHTML = templateHTML;

  /* -------------------- Refs -------------------- */
  const productList   = container.querySelector("#product-list");
  const addBtn        = container.querySelector("#add-product");
  const productAction = container.querySelector("#product-action");

  // Modal refs
  const modalId     = "product-modal";
  const formEl      = container.querySelector("#product-form");
  const idInput     = container.querySelector("#prod-id");
  const modeInput   = container.querySelector("#form-mode");
  const slugInput   = container.querySelector("#prod-slug");
  const nameInput   = container.querySelector("#prod-name");
  const descInput   = container.querySelector("#prod-desc");
  const priceInput  = container.querySelector("#prod-price");
  const mediaInput  = container.querySelector("#prod-media");
  const mediaPreview= container.querySelector("#media-preview");
  const modalTitle  = container.querySelector("#product-modal-title");
  const cancelBtn   = container.querySelector("#product-cancel");
  const saveBtn     = container.querySelector("#product-save");

  /* -------------------- State -------------------- */
  let isAdmin = false;
  let productsCache = [];
  let currentEditProduct = null;

  /* -------------------- Helpers -------------------- */
  const autoSlugger = () => {
    if (!slugInput.value) {
      slugInput.value = nameInput.value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
    }
  };

  const setMode = (mode = "create", product = null) => {
    formEl.reset();
    modeInput.value = mode;
    mediaPreview.innerHTML = "";
    mediaPreview.dataset.state = mode;
    currentEditProduct = mode === "edit" ? product : null;

    if (mode === "create") {
      modalTitle.setAttribute("data-i18n", "products.add_title");
      modalTitle.textContent = "Add Product";
      saveBtn.setAttribute("data-i18n", "buttons.save");
      saveBtn.textContent = "Save";

      idInput.value = "";
      slugInput.removeAttribute("readonly");
      mediaInput.value = "";
    } else {
      modalTitle.setAttribute("data-i18n", "products.edit_title");
      modalTitle.textContent = "Edit Product";
      saveBtn.setAttribute("data-i18n", "buttons.update");
      saveBtn.textContent = "Update";

      idInput.value    = product.id;
      slugInput.value  = product.slug || "";
      nameInput.value  = product.name || "";
      descInput.value  = product.description || "";
      priceInput.value = product.price != null ? Number(product.price) : "";
      slugInput.setAttribute("readonly", "readonly");
      mediaInput.value = "";
      renderExistingMediaPreview(product?.media || []);
    }
    applyTranslations(formEl);
  };

  // Media cover (ผ่าน proxy) + fallback
  const mediaCoverHTML = (item, altText) => {
    const type = item?.type || "image";
    const fb = DEFAULT_FALLBACK_IMAGE;

    // ใช้ proxy URL เป็นหลัก
    const proxyUrl = toProxyUrl(item) || fb;

    if (type === "video") {
      return `<video src="${proxyUrl}" controls preload="metadata" data-fallback="${fb}" aria-label="${altText}"></video>`;
    }
    return `<img src="${proxyUrl}" alt="${altText}" loading="lazy" data-fallback="${fb}" />`;
  };

  const productCardHTML = (p) => {
    const coverItem = p?.media?.[0] || null;
    const safeMedia = mediaCoverHTML(coverItem, p.name);

    return `
      <div class="product-card">
        <div class="product-image">
          ${safeMedia}
        </div>
        <div class="product-content">
          <h3 class="product-title">${p.name}</h3>
          <p class="product-desc">${p.description || ""}</p>
          <p class="product-price"><strong>$${Number(p.price).toFixed(2)}</strong></p>
        </div>
        ${isAdmin ? `<div class="product-actions">
          <button class="liquid-button" data-action="edit" data-id="${p.id}">Edit</button>
        </div>` : ""}
      </div>`;
  };

  const renderProducts = (products = []) => {
    if (!products.length) {
      productList.innerHTML = `<p data-i18n="home.no_products">No products available.</p>`;
      applyTranslations(productList);
      return;
    }
    productList.innerHTML = products.map(productCardHTML).join("");
    attachMediaFallback(productList);
  };

  const renderExistingMediaPreview = (items = []) => {
    const safeItems = Array.isArray(items) ? items : [];

    mediaPreview.innerHTML = "";
    mediaPreview.dataset.hasExisting = safeItems.length ? "true" : "false";

    if (!safeItems.length) {
      const empty = document.createElement("p");
      empty.className = "media-note";
      empty.textContent = "No media uploaded for this product yet.";
      mediaPreview.appendChild(empty);
      return;
    }

    // const title = document.createElement("p");
    // title.className = "media-note";
    // title.textContent = "Existing media";
    // mediaPreview.appendChild(title);

    for (const item of safeItems) {
      if (!item || typeof item !== "object") continue;
      const wrap = document.createElement("div");
      wrap.className = "preview-item existing";
      wrap.dataset.type = item.type || "image";
      wrap.innerHTML = mediaCoverHTML(item, item.alt || currentEditProduct?.name || "");
      mediaPreview.appendChild(wrap);
    }

    // const note = document.createElement("p");
    // note.className = "media-note";
    // note.textContent = "Selecting new files will replace the existing media on save.";
    // mediaPreview.appendChild(note);

    attachMediaFallback(mediaPreview);
  };

  const renderSelectedMediaPreview = (files = []) => {
    mediaPreview.innerHTML = "";

    if (!files.length) {
      if (modeInput.value === "edit" && currentEditProduct) {
        renderExistingMediaPreview(currentEditProduct.media || []);
      }
      return;
    }

    if (modeInput.value === "edit") {
      const note = document.createElement("p");
      note.className = "media-note";
      note.textContent = "New upload selected – existing media will be replaced.";
      mediaPreview.appendChild(note);
    }

    for (const file of files) {
      const url = URL.createObjectURL(file);
      const wrap = document.createElement("div");
      wrap.className = "preview-item";

      if (file.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = url;
        img.alt = file.name;
        img.loading = "lazy";
        wrap.appendChild(img);
      } else if (file.type.startsWith("video/")) {
        const vid = document.createElement("video");
        vid.src = url;
        vid.controls = true;
        vid.preload = "metadata";
        wrap.appendChild(vid);
      } else {
        const span = document.createElement("span");
        span.textContent = file.name;
        wrap.appendChild(span);
      }
      mediaPreview.appendChild(wrap);
    }
  };

  const loadProducts = async () => {
    productList.setAttribute("data-i18n", "home.loading");
    productList.textContent = "Loading...";
    try {
      const rows = await getProducts(10, 0);
      productsCache = rows || [];
      renderProducts(productsCache);
    } catch (err) {
      console.error("Error loading products:", err);
      productList.innerHTML = `<p data-i18n="home.error">❌ Failed to load products.</p>`;
      applyTranslations(productList);
    }
  };

  const openCreateModal = () => {
    setMode("create");
    openModal(modalId);
    nameInput.addEventListener("input", autoSlugger);
    formEl.querySelector("input, textarea, select")?.focus();
  };

  const resolveProductById = (value) => {
    const strId = value != null ? String(value) : "";
    if (!strId) return null;
    return (
      productsCache.find((p) => String(p.id) === strId) ||
      productsCache.find((p) => Number(p.id) === Number(strId)) ||
      null
    );
  };

  const openEditModal = (productId) => {
    const product = resolveProductById(productId);
    if (!product) {
      console.warn("Product not found for edit", productId);
      showNotification("Unable to open product for editing.", "error");
      return;
    }
    setMode("edit", product);
    openModal(modalId);
  };

  const closeProductModal = () => {
    closeModal(modalId);
    nameInput.removeEventListener("input", autoSlugger);
  };

  const previewFiles = () => {
    const files = Array.from(mediaInput.files || []);
    renderSelectedMediaPreview(files);
  };

  /* -------------------- Init -------------------- */
  (async () => {
    try {
      isAdmin = await checkPermission("ADMIN");
    } catch {
      isAdmin = false;
    }
    if (!isAdmin && productAction) productAction.style.display = "none";
    await loadProducts();
  })();

  initModal(modalId);

  /* -------------------- Events -------------------- */
  addBtn?.addEventListener("click", () => {
    if (!isAdmin) {
      showNotification("Permission denied: ADMIN required.", "error");
      return;
    }
    openCreateModal();
  });

  cancelBtn.addEventListener("click", closeProductModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeProductModal();
  });

  mediaInput.addEventListener("change", previewFiles);

  productList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action='edit']");
    if (!btn) return;
    if (!isAdmin) {
      showNotification("Permission denied: ADMIN required.", "error");
      return;
    }
    const id = btn.getAttribute("data-id");
    openEditModal(id);
  });

  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showNotification("Permission denied: ADMIN required.", "error");
      return;
    }

    const mode = modeInput.value;
    const rawId = idInput.value?.trim();
    const id = rawId ? Number(rawId) : null;
    if (rawId && Number.isNaN(id)) {
      showNotification("Invalid product identifier.", "error");
      return;
    }
    const slug = slugInput.value.trim();
    const name = nameInput.value.trim();
    const description = descInput.value.trim();
    const price = priceInput.value;

    if (!name || !price || (!slug && mode === "create")) {
      showNotification("Please fill in required fields.", "warning");
      return;
    }

    try {
      let productId;
      if (mode === "create") {
        const product = await createProduct({ slug, name, description, price });
        productId = product.id;
      } else {
        await updateProduct(id, { name, description, price });
        productId = id;
      }

      const files = Array.from(mediaInput.files || []);
      if (files.length) {
        try {
          // generic upload: entity_type=product, purpose=gallery
          await uploadProductMedia(productId, files, {
            purpose: "gallery",
            replace: mode === "edit",
          });
        } catch (upErr) {
          console.warn("Upload media failed:", upErr);
          showNotification("Product saved, but some media failed to upload.", "warning");
        }
      }

      closeProductModal();
      await loadProducts(); // reload only after save/update
      showNotification(
        mode === "create" ? "Product created successfully." : "Product updated successfully.",
        "success"
      );
    } catch (err) {
      console.error("Save product failed:", err);
      const msg = err?.response?.data?.error || err?.message || "Save product failed";
      showNotification(msg, "error");
    }
  });

  applyTranslations(container);
}
