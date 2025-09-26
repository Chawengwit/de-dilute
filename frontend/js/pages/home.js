import { getProducts, createProduct, uploadProductMedia, checkPermission } from "../api.js";
import { applyTranslations } from "../i18n.js";

export function init(container) {
  /* -------------------- Markup -------------------- */
  let templateHTML = "";
  templateHTML += `<section class="home-page">`;
    templateHTML += `<h2 data-i18n="home.products">Products</h2>`;
    templateHTML += `<div id="product-action" class="product-action">`;
      templateHTML += `<button class="liquid-button primary" id="add-product" data-i18n="buttons.addProduct">Add Product</button>`;
    templateHTML += `</div>`;
    templateHTML += `<div id="product-list" class="product-list" data-i18n="home.loading">Loading...</div>`;
  templateHTML += `</section>`;

  // Modal markup
  templateHTML += `
  <div id="product-modal" class="modal" aria-hidden="true" role="dialog" aria-labelledby="product-modal-title">
    <div class="modal-content">
      <button class="close-button" id="product-modal-close" aria-label="Close">×</button>
      <h2 id="product-modal-title" data-i18n="products.add_title">Add Product</h2>

      <form id="product-form">
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
  const modalEl       = container.querySelector("#product-modal");
  const modalCloseBtn = container.querySelector("#product-modal-close");
  const cancelBtn     = container.querySelector("#product-cancel");
  const formEl        = container.querySelector("#product-form");
  const mediaInput    = container.querySelector("#prod-media");
  const mediaPreview  = container.querySelector("#media-preview");
  const slugInput     = container.querySelector("#prod-slug");
  const nameInput     = container.querySelector("#prod-name");

  /* -------------------- Helpers -------------------- */
  const renderProducts = (products = []) => {
    if (!products.length) {
      productList.innerHTML = `<p data-i18n="home.no_products">No products available.</p>`;
      applyTranslations(productList);
      return;
    }

    let html = "";
    for (let p of products) {
      html += `<div class="product-card">`;
        html += `<div class="product-image">`;
          html += `<img src="${p?.media?.[0]?.url || "/media/placeholder.png"}" alt="${p.name}" loading="lazy" />`;
        html += `</div>`;
        html += `<div class="product-content">`;
          html += `<h3 class="product-title">${p.name}</h3>`;
          html += `<p class="product-desc">${p.description || ""}</p>`;
          html += `<p class="product-price"><strong>$${Number(p.price).toFixed(2)}</strong></p>`;
        html += `</div>`;
      html += `</div>`;
    }
    productList.innerHTML = html;
  };

  const loadProducts = async () => {
    productList.setAttribute("data-i18n", "home.loading");
    productList.textContent = "Loading...";
    try {
      const products = await getProducts(10, 0);
      renderProducts(products || []);
    } catch (err) {
      console.error("Error loading products:", err);
      productList.innerHTML = `<p data-i18n="home.error">❌ Failed to load products.</p>`;
      applyTranslations(productList);
    }
  };

  const openModal = () => {
    modalEl.style.display = "block";
    modalEl.setAttribute("aria-hidden", "false");
    formEl.reset();
    mediaPreview.innerHTML = "";
    // สร้าง slug อัตโนมัติจาก name เมื่อผู้ใช้พิมพ์
    nameInput.addEventListener("input", autoSlugger);
    const first = formEl.querySelector("input, textarea, select, button");
    first && first.focus();
    document.addEventListener("keydown", escHandler);
  };

  const closeModal = () => {
    modalEl.style.display = "none";
    modalEl.setAttribute("aria-hidden", "true");
    nameInput.removeEventListener("input", autoSlugger);
    document.removeEventListener("keydown", escHandler);
  };

  const escHandler = (e) => {
    if (e.key === "Escape") closeModal();
  };

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

  /* -------------------- Init Load -------------------- */
  loadProducts();

  /* -------------------- Events -------------------- */
  addBtn.addEventListener("click", openModal);
  modalCloseBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  // click outside to close
  modalEl.addEventListener("click", (e) => {
    if (e.target === modalEl) closeModal();
  });

  // File preview
  mediaInput.addEventListener("change", () => {
    mediaPreview.innerHTML = "";
    const files = Array.from(mediaInput.files || []);
    files.forEach((file) => {
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
    });
  });

  // Submit → check ADMIN → create product → upload media → reload list
  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const isAdmin = await checkPermission("ADMIN");
      if (!isAdmin) {
        alert("Permission denied: ADMIN required.");
        return;
      }

      const slug = formEl.slug.value.trim();
      const name = formEl.name.value.trim();
      const description = formEl.description.value.trim();
      const price = formEl.price.value;

      if (!slug || !name || !price) {
        alert("Please fill in required fields.");
        return;
      }

      // 1) สร้างสินค้า
      const product = await createProduct({ slug, name, description, price });

      // 2) อัปโหลดไฟล์ (ถ้ามี)
      const files = Array.from(mediaInput.files || []);
      if (files.length) {
        try {
          await uploadProductMedia(product.id, files);
        } catch (upErr) {
          console.warn("Upload media failed:", upErr);
          // ไม่ fail ทั้ง flow — แจ้งเตือนเฉยๆ
          alert("Product created, but some media failed to upload.");
        }
      }

      // 3) ปิดโมดัล + รีโหลดสินค้า
      closeModal();
      await loadProducts();
      alert("Product created successfully.");
    } catch (err) {
      console.error("Create product failed:", err);
      const msg = err?.response?.data?.error || err?.message || "Create product failed";
      alert(msg);
    }
  });

  // Apply translation to static section + modal
  applyTranslations(container);
}
