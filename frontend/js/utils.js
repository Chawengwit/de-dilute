/**
 * Open a modal by ID
 * @param {string} modalId - The ID of the modal element
 */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "block";
}

/**
 * Close a modal by ID
 * @param {string} modalId - The ID of the modal element
 */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = "none";
}

/**
 * Initialize modal closing when clicking outside or on .close-button
 * @param {string} modalId - The ID of the modal element
 */
export function initModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  // Close when click outside
  window.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(modalId);
  });

  // Close when click close button
  const closeBtn = modal.querySelector(".close-button");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => closeModal(modalId));
  }
}

/**
 * API Request Wrapper (fetch)
 * @param {string} url
 * @param {string} method
 * @param {object} body
 * @returns {Promise<object>}
 */
export async function apiRequest(url, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("token");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "API Request failed");
  }
  return res.json();
}
