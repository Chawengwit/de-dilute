import {
  getProducts,
  createProduct,
  updateProduct,
  uploadProductMedia,
  checkPermission,
} from "../api.js";

import { applyTranslations } from "../i18n.js";
import { openModal, closeModal, initModal, showNotification } from "../utils.js"; // ✅ ใช้ฟังก์ชันกลาง

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

  // Modal markup (ใช้ร่วมทั้ง create/edit)
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
          <input id="prod-slug" name="slug" type="text" required pattern="[a-z0-9-]+" placeholder="dedilute-lemon-soda" />
          <small class="help-text">lowercase, ใช้ a–z, 0–9 และเครื่องหมาย - เท่านั้น</small>
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
          <small class="help-text">รองรับหลายไฟล์ • รูป/วิดีโอ</small>
        </div>

        <div class="actions">
          <button type="button" class="liquid-button" id="product-cancel" data-i18n="buttons.cancel">Cancel</button>
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
    modeInput.value = mode;

    if (mode === "create") {
      modalTitle.setAttribute("data-i18n", "products.add_title");
      modalTitle.textContent = "Add Product";
      saveBtn.setAttribute("data-i18n", "buttons.save");
      saveBtn.textContent = "Save";

      idInput.value = "";
      formEl.reset();
      mediaPreview.innerHTML = "";
      slugInput.removeAttribute("readonly");
    } else {
      modalTitle.setAttribute("data-i18n", "products.edit_title");
      modalTitle.textContent = "Edit Product";
      saveBtn.setAttribute("data-i18n", "buttons.update");
      saveBtn.textContent = "Update";

      // เติมค่าจาก product
      idInput.value    = product.id;
      slugInput.value  = product.slug || "";
      nameInput.value  = product.name || "";
      descInput.value  = product.description || "";
      priceInput.value = product.price != null ? Number(product.price) : "";
      mediaPreview.innerHTML = "";
      slugInput.setAttribute("readonly", "readonly"); // slug คงที่ ถ้าจะให้แก้ได้ก็เอาออก
    }
    applyTranslations(container);
  };

  const productCardHTML = (p) => {
    const cover = p?.media?.[0]?.url || "/media/placeholder.png";

    let html = "";
    html += `<div class="product-card">`;

      html += `<div class="product-image">`;
        html += `<img src="${cover}" alt="${p.name}" loading="lazy" />`;
      html += `</div>`;
      
      html += `<div class="product-content">`;
        html += `<h3 class="product-title">${p.name}</h3>`;
        html += `<p class="product-desc">${p.description || ""}</p>`;
        html += `<p class="product-price"><strong>$${Number(p.price).toFixed(2)}</strong></p>`;
      html += `</div>`;

    if (isAdmin) {
      html += `<div class="product-actions">`;
        html += `<button class="liquid-button" data-action="edit" data-id="${p.id}">Edit</button>`;
      html += `</div>`;
    }
    html += `</div>`;

    return html;
  };

  const renderProducts = (products = []) => {
    if (!products.length) {
      productList.innerHTML = `<p data-i18n="home.no_products">No products available.</p>`;
      applyTranslations(productList);
      return;
    }
    productList.innerHTML = products.map(productCardHTML).join("");
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
    openModal(modalId);            // ใช้ฟังก์ชันกลาง
    nameInput.addEventListener("input", autoSlugger);
    // โฟกัสช่องแรก
    const first = formEl.querySelector("input, textarea, select, button");
    first && first.focus();
  };

  const openEditModal = (productId) => {
    const product = productsCache.find((p) => p.id === Number(productId));
    if (!product) return;

    setMode("edit", product);
    openModal(modalId);            // ใช้ฟังก์ชันกลาง
    // ไม่ autoSlug ในโหมดแก้ไข
  };

  const closeProductModal = () => {
    closeModal(modalId);           // ใช้ฟังก์ชันกลาง
    nameInput.removeEventListener("input", autoSlugger);
  };

  const previewFiles = () => {
    mediaPreview.innerHTML = "";
    const files = Array.from(mediaInput.files || []);
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

  /* -------------------- Init -------------------- */
  (async () => {
    try {
      isAdmin = await checkPermission("ADMIN");
    } catch {
      isAdmin = false;
    }
    // ซ่อนปุ่ม Add ถ้าไม่ใช่แอดมิน
    if (!isAdmin && productAction) productAction.style.display = "none";

    await loadProducts();
  })();

  initModal(modalId);

  /* -------------------- Events -------------------- */
  // เปิดสร้างสินค้า
  addBtn?.addEventListener("click", () => {
    if (!isAdmin) {
      showNotification("Permission denied: ADMIN required.", "error");
      return;
    }
    openCreateModal();
  });

  // ปิดโมดัล
  cancelBtn.addEventListener("click", closeProductModal);

  // ปิดด้วย ESC (เสริมจากฟังก์ชันกลาง)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeProductModal();
  });

  // พรีวิวไฟล์
  mediaInput.addEventListener("change", previewFiles);

  // คลิกปุ่ม Edit ในการ์ด
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

  // Submit → create หรือ edit ตามโหมด → อัปโหลดสื่อ (option) → reload
  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!isAdmin) {
      showNotification("Permission denied: ADMIN required.", "error");
      return;
    }

    const mode = modeInput.value;
    const id   = idInput.value ? Number(idInput.value) : null;

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

      // อัปโหลดไฟล์ (ถ้ามี)
      const files = Array.from(mediaInput.files || []);
      if (files.length) {
        try {
          await uploadProductMedia(productId, files);
        } catch (upErr) {
          console.warn("Upload media failed:", upErr);
          showNotification("Product saved, but some media failed to upload.", "warning");
        }
      }

      closeProductModal();
      await loadProducts();
      showNotification(mode === "create" ? "Product created successfully." : "Product updated successfully.", "success");
    } catch (err) {
      console.error("Save product failed:", err);
      const msg = err?.response?.data?.error || err?.message || "Save product failed";
      showNotification(msg, "error");
    }
  });

  // แปลข้อความในหน้า + โมดัล
  applyTranslations(container);
}
