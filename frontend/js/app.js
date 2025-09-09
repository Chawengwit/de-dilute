import {
  getCurrentUser,
  logout,
  checkPermission,
} from "./api.js";

import {
  initSettings,
  getLanguage,
  setLanguageSetting,
  setThemeSetting,
} from "./settings.js";

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
  }

  async init() {
    // 1. load settings
    await initSettings();
    const lang = getLanguage();
    await setLanguage(lang);

    // 2. load navigation + page
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

      // Apply translations to nav
      applyTranslations(this.navContainer);

      // --- Setup Language & Theme Selectors ---
      const langSelect = this.navContainer.querySelector("#lang-select");
      if (langSelect) {
        langSelect.value = getLanguage();
        langSelect.addEventListener("change", async (e) => {
          const newLang = e.target.value;
          await setLanguageSetting(newLang);
          await setLanguage(newLang);
          applyTranslations(document); // update UI
        });
      }

      const themeSelect = this.navContainer.querySelector("#theme-select");
      if (themeSelect) {
        themeSelect.addEventListener("change", async (e) => {
          const newTheme = e.target.value;
          await setThemeSetting(newTheme);
        });
      }

      // --- Check login status via /api/auth/me ---
      try {
        const me = await getCurrentUser();
        if (me) {
          const loginLink = this.navContainer.querySelector('a[href="/login"]');
          if (loginLink) {
            loginLink.textContent = "Logout";
            loginLink.setAttribute("href", "#logout");
            loginLink.setAttribute("data-logout", "true");
            loginLink.removeAttribute("data-link");
          }
        }
      } catch {
        // not logged in → keep Login link
      }

      // --- Check admin permission ---
      try {
        const hasPermission = await checkPermission("ADMIN");
        if (!hasPermission) {
          const adminLink = this.navContainer.querySelector('a[href="/admin"]');
          if (adminLink) adminLink.parentElement.remove();
        }
      } catch (err) {
        if (err.message.includes("Unauthorized")) {
          const adminLink = this.navContainer.querySelector('a[href="/admin"]');
          if (adminLink) adminLink.parentElement.remove();
        } else {
          console.error("⚠️ Permission check error:", err.message);
        }
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

      // Handle logout
      if (link.dataset.logout) {
        try {
          await logout();
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

    if (normalized === "/admin") {
      try {
        const hasPermission = await checkPermission("ADMIN");
        if (!hasPermission) {
          return this.navigateTo("/login");
        }
      } catch (err) {
        console.error("⚠️ Admin permission check failed:", err.message);
        return this.navigateTo("/login");
      }
    }

    // Hide navbar + footer on /login
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
      // re-apply translation after page render
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
