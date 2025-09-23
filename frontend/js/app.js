import { getCurrentUser, logout, checkPermission } from "./api.js";
import { initSettings, getLanguage, setLanguageSetting, setThemeSetting, getTheme } from "./settings.js";
import { setLanguage, applyTranslations, t } from "./i18n.js";

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
    /* -------------------- Preload จาก localStorage -------------------- */
    const preloadLang = localStorage.getItem("language") || "en";
    const preloadTheme = localStorage.getItem("theme") || "light";

    document.documentElement.setAttribute("data-theme", preloadTheme);
    await setLanguage(preloadLang);

    /* -------------------- Load API Settings -------------------- */
    await initSettings();
    const lang = getLanguage();
    const theme = getTheme();

    await setLanguage(lang);
    document.documentElement.setAttribute("data-theme", theme);

    /* -------------------- โหลด user state -------------------- */
    try {
      this.currentUser = await getCurrentUser();
    } catch (err) {
      console.warn("Could not fetch current user:", err.message);
      this.currentUser = null;
    }

    /* -------------------- Navigation + Page -------------------- */
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

      /* -------------------- Action Box & Toggles -------------------- */
      const hamburger = this.navContainer.querySelector("#hamburger");
      const actionBox = this.navContainer.querySelector("#actionBox");

      const themeSwitch = this.navContainer.querySelector("#themeSwitch");
      const langSwitch = this.navContainer.querySelector("#langSwitch");
      const loginSwitch = this.navContainer.querySelector("#loginSwitch");

      const themeThumb = themeSwitch?.querySelector(".thumb");
      const langThumb = langSwitch?.querySelector(".thumb");
      const loginThumb = loginSwitch?.querySelector(".thumb");
      const loginLabel = this.navContainer.querySelector("#loginLabel");

      /* --- Hamburger --- */
      if (hamburger && actionBox) {
        hamburger.addEventListener("click", () => {
          actionBox.classList.toggle("active");
        });
      }

      /* --- Theme Switch --- */
      if (themeSwitch && themeThumb) {
        const currentTheme = getTheme();
        document.documentElement.setAttribute("data-theme", currentTheme);

        if (currentTheme === "dark") {
          themeSwitch.classList.remove("day");
          themeSwitch.classList.add("night");
          themeThumb.textContent = "🌙";
        } else {
          themeSwitch.classList.remove("night");
          themeSwitch.classList.add("day");
          themeThumb.textContent = "☀️";
        }

        themeSwitch.addEventListener("click", async () => {
          const newTheme = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
          await setThemeSetting(newTheme);
          document.documentElement.setAttribute("data-theme", newTheme);

          if (newTheme === "dark") {
            themeSwitch.classList.remove("day");
            themeSwitch.classList.add("night");
            themeThumb.textContent = "🌙";
          } else {
            themeSwitch.classList.remove("night");
            themeSwitch.classList.add("day");
            themeThumb.textContent = "☀️";
          }
        });
      }

      /* --- Language Switch --- */
      if (langSwitch && langThumb) {
        const currentLang = getLanguage();

        if (currentLang === "th") {
          langSwitch.classList.remove("uk");
          langSwitch.classList.add("us");
          langThumb.textContent = "🇹🇭";
        } else {
          langSwitch.classList.remove("us");
          langSwitch.classList.add("uk");
          langThumb.textContent = "🇬🇧";
        }

        langSwitch.addEventListener("click", async () => {
          const newLang = getLanguage() === "en" ? "th" : "en";
          await setLanguageSetting(newLang);
          await setLanguage(newLang);
          applyTranslations(this.navContainer);
          applyTranslations(this.mainContent);

          if (newLang === "th") {
            langSwitch.classList.remove("uk");
            langSwitch.classList.add("us");
            langThumb.textContent = "🇹🇭";
          } else {
            langSwitch.classList.remove("us");
            langSwitch.classList.add("uk");
            langThumb.textContent = "🇬🇧";
          }
        });
      }

      /* --- Login Switch --- */
      if (loginSwitch && loginThumb && loginLabel) {
        let isLoggedIn = !!this.currentUser;

        const updateLoginUI = () => {
          if (isLoggedIn) {
            loginSwitch.classList.remove("off");
            loginSwitch.classList.add("on");
            loginThumb.textContent = "🚪";
            loginLabel.textContent = t("nav.logout");
          } else {
            loginSwitch.classList.remove("on");
            loginSwitch.classList.add("off");
            loginThumb.textContent = "🔑";
            loginLabel.textContent = t("nav.login");
          }
        };

        updateLoginUI();

        loginSwitch.addEventListener("click", async () => {
          if (isLoggedIn) {
            try {
              await logout();
              this.currentUser = null;
              isLoggedIn = false;
              updateLoginUI();
              this.navigateTo("/login");
            } catch (err) {
              console.error("Logout failed:", err.message);
            }
          } else {
            this.navigateTo("/login");
          }
        });
      }

      /* --- ตรวจสอบ login link (desktop nav) --- */
      if (this.currentUser) {
        const loginLink = this.navContainer.querySelector('a[href="/login"]');
        if (loginLink) {
          loginLink.setAttribute("href", "#logout");
          loginLink.setAttribute("data-logout", "true");
          loginLink.removeAttribute("data-link");
          loginLink.setAttribute("data-i18n", "nav.logout");
          loginLink.textContent = t("nav.logout");
        }
      }

      /* --- ตรวจสอบ admin --- */
      const hasPermission = await checkPermission("ADMIN");
      if (!hasPermission) {
        const adminLink = this.navContainer.querySelector('a[href="/admin"]');
        if (adminLink) adminLink.parentElement.remove();
      }
    } catch (err) {
      console.error("Navigation load error:", err);
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
          this.currentUser = null;
          link.setAttribute("href", "/login");
          link.setAttribute("data-link", "true");
          link.removeAttribute("data-logout");
          link.setAttribute("data-i18n", "nav.login");
          link.textContent = t("nav.login");
          this.navigateTo("/login");
        } catch (err) {
          console.error("Logout failed:", err.message);
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
      const hasPermission = await checkPermission("ADMIN");
      if (!hasPermission) {
        console.warn("Access denied: redirecting to login");
        return this.navigateTo("/login");
      }
    }

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
      console.error(`Error loading page module "${pageName}":`, err);
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
      console.error(`Module "${pageName}" missing init() function.`);
      this.mainContent.innerHTML = "<h1>Error loading page</h1>";
    }
  }
}
