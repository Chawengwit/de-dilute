import { getCurrentUser, logout, checkPermission } from "./api.js";
import { initSettings, getLanguage, setLanguageSetting, setThemeSetting } from "./settings.js";
import { setLanguage, applyTranslations } from "./i18n.js";

export default class App {
  constructor() {
    this.mainContent = document.getElementById("main-content");
    this.navContainer = document.getElementById("nav-container");
    this.footer = document.querySelector("footer");

    this.routes = {
      "/": "home",
      "/home": "home",
      "/login": "login",
      "/admin": "admin",
      "/404": "404",
    };

    this.currentUser = null; // เก็บ user state
  }

  async init() {
    // 1. โหลด settings
    await initSettings();
    const lang = getLanguage();
    await setLanguage(lang);

    // 2. โหลด navigation + หน้าแรก
    this.loadNavigation().then(() => {
      this.setupNavigation();
      this.loadPage(window.location.pathname);
    });

    window.addEventListener("popstate", () => {
      this.loadPage(window.location.pathname);
    });
  }

  async loadNavigation() {
    try {
      const res = await fetch("nav.html");
      if (!res.ok) throw new Error("Failed to load navigation");

      this.navContainer.innerHTML = await res.text();
      applyTranslations(this.navContainer);

      // Language / Theme selectors
      const langSelect = this.navContainer.querySelector("#lang-select");
      if (langSelect) {
        langSelect.value = getLanguage();
        langSelect.addEventListener("change", async (e) => {
          const newLang = e.target.value;
          await setLanguageSetting(newLang);
          await setLanguage(newLang);
          applyTranslations(document);
        });
      }

      const themeSelect = this.navContainer.querySelector("#theme-select");
      if (themeSelect) {
        themeSelect.addEventListener("change", async (e) => {
          await setThemeSetting(e.target.value);
        });
      }

      // --- ตรวจสอบ login ---
      this.currentUser = await getCurrentUser();
      if (this.currentUser) {
        console.info("ℹ️ Logged in as:", this.currentUser.email);
        const loginLink = this.navContainer.querySelector('a[href="/login"]');
        if (loginLink) {
          loginLink.textContent = "Logout";
          loginLink.setAttribute("href", "#logout");
          loginLink.setAttribute("data-logout", "true");
          loginLink.removeAttribute("data-link");
        }
      } else {
        console.info("ℹ️ Guest mode: user not logged in");
      }

      // --- ตรวจสอบ admin ---
      const hasPermission = await checkPermission("ADMIN");
      if (!hasPermission) {
        const adminLink = this.navContainer.querySelector('a[href="/admin"]');
        if (adminLink) adminLink.parentElement.remove();
      }
    } catch (err) {
      console.error("❌ Navigation load error:", err);
      this.navContainer.innerHTML = `
        <nav>
          <ul>
            <li><a href="/" data-link data-i18n="nav.home">Home</a></li>
            <li><a href="/login" data-link data-i18n="nav.login">Login</a></li>
          </ul>
        </nav>`;
    }
  }

  setupNavigation() {
    this.navContainer.addEventListener("click", async (e) => {
      const link = e.target.closest("a[data-link], a[data-logout]");
      if (!link) return;
      e.preventDefault();

      if (link.dataset.logout) {
        try {
          await logout();
          this.currentUser = null; // reset user
          this.navigateTo("/login");
        } catch (err) {
          console.error("⚠️ Logout failed:", err.message);
        }
        return;
      }

      this.navigateTo(link.getAttribute("href"));
    });
  }

  normalizePath(path) {
    return this.routes[path] ? path : "/404";
  }

  async navigateTo(path) {
    window.history.pushState({}, "", path);
    await this.loadPage(path);
  }

  async loadPage(path) {
    const normalized = this.normalizePath(path);
    const pageName = this.routes[normalized];

    // ป้องกันเข้า /admin ถ้าไม่ได้ login หรือไม่มีสิทธิ์
    if (normalized === "/admin") {
      const hasPermission = await checkPermission("ADMIN");
      if (!hasPermission) {
        console.warn("⚠️ Access denied: redirecting to login");
        return this.navigateTo("/login");
      }
    }

    // ซ่อน nav/footer บน /login
    if (normalized === "/login") {
      this.navContainer.style.display = "none";
      if (this.footer) this.footer.style.display = "none";
    } else {
      this.navContainer.style.display = "block";
      if (this.footer) this.footer.style.display = "block";
    }

    await this.loadPageModule(pageName);
  }

  async loadPageModule(pageName) {
    try {
      const module = await import(`./pages/${pageName}.js`);
      this.initPageModule(module, pageName);
      applyTranslations(this.mainContent);
    } catch (err) {
      console.error(`❌ Error loading page module "${pageName}":`, err);
      if (pageName !== "404") {
        this.loadPageModule("404");
      } else {
        this.mainContent.innerHTML = "<h1>404 - Page Not Found</h1>";
      }
    }
  }

  initPageModule(module, pageName) {
    if (module && typeof module.init === "function") {
      this.mainContent.innerHTML = "";
      module.init(this.mainContent);
    } else {
      console.error(`⚠️ Module "${pageName}" missing init() function.`);
      this.mainContent.innerHTML = "<h1>Error loading page</h1>";
    }
  }
}
