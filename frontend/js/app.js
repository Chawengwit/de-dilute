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

    /* -------------------- โหลด settings จาก API/local -------------------- */
    await initSettings();
    const lang = getLanguage();
    const theme = getTheme();
    await setLanguage(lang);
    document.documentElement.setAttribute("data-theme", theme);

    /* -------------------- โหลดสถานะผู้ใช้ -------------------- */
    try {
      this.currentUser = await getCurrentUser();
    } catch (err) {
      console.warn("Could not fetch current user:", err?.message || err);
      this.currentUser = null;
    }

    /* -------------------- โหลด Navigation & หน้าแรก -------------------- */
    this.loadNavigation().then(() => {
      this.setupNavigation();
      this.loadPage(window.location.pathname);
    });

    window.addEventListener("popstate", () => {
      this.loadPage(window.location.pathname);
    });

    /* -------------------- ฟังอีเวนต์ auth สำหรับ SPA -------------------- */
    window.addEventListener("auth:changed", async (e) => {
      try {
        this.currentUser = await getCurrentUser();
      } catch {
        this.currentUser = null;
      }

      // อัปเดตปุ่ม
      this._updateAuthButtons();

      // อัปเดตลิงก์ Admin ตามสิทธิ์ล่าสุด
      await this._syncAdminLink();

      // ถ้าเพิ่ง login สำเร็จ นำทางไป Home
      if (e.detail?.status === "logged-in") {
        this.navigateTo("/");
      }
    });
  }

  /* -------------------------------------------------- */
  /* Navigation                                         */
  /* -------------------------------------------------- */
  async loadNavigation() {
    if (this._navCleanup && typeof this._navCleanup === "function") {
      this._navCleanup();
    }
    const cleanups = [];

    try {
      const res = await fetch("nav.html");
      if (!res.ok) throw new Error("Failed to load navigation");

      this.navContainer.innerHTML = await res.text();
      applyTranslations(this.navContainer);

      const settingsBox = this.navContainer.querySelector("#settings-box");
      const actionBox   = this.navContainer.querySelector("#actionBox");
      const themeSwitch = this.navContainer.querySelector("#themeSwitch");
      const langSwitch  = this.navContainer.querySelector("#langSwitch");
      const themeThumb  = themeSwitch?.querySelector(".thumb");
      const langThumb   = langSwitch?.querySelector(".thumb");

      // ---------- Helpers ----------
      const openActionBox  = () => actionBox?.classList.add("active");
      const closeActionBox = () => actionBox?.classList.remove("active");
      const toggleActionBox = () => actionBox?.classList.toggle("active");

      /* -------------------- Settings Box -------------------- */
      if (settingsBox && actionBox) {
        const onSettingsClick = (e) => {
          e.stopPropagation();
          toggleActionBox();
        };
        settingsBox.addEventListener("click", onSettingsClick);
        cleanups.push(() => settingsBox.removeEventListener("click", onSettingsClick));

        const onActionBoxClick = (e) => {
          // กันคลิกภายใน actionBox ไปปิดเอง
          e.stopPropagation();
        };
        actionBox.addEventListener("click", onActionBoxClick);
        cleanups.push(() => actionBox.removeEventListener("click", onActionBoxClick));

        // ปิดเมื่อคลิก/ทัชนอกกรอบ
        const outsideHandler = (ev) => {
          if (actionBox.classList.contains("active") &&
              !actionBox.contains(ev.target) &&
              ev.target !== settingsBox) {
            closeActionBox();
          }
        };
        document.addEventListener("click", outsideHandler);
        document.addEventListener("touchstart", outsideHandler);
        cleanups.push(() => {
          document.removeEventListener("click", outsideHandler);
          document.removeEventListener("touchstart", outsideHandler);
        });

        // ปิดด้วย Escape
        const onKeydown = (ev) => {
          if (ev.key === "Escape" && actionBox.classList.contains("active")) {
            closeActionBox();
          }
        };
        document.addEventListener("keydown", onKeydown);
        cleanups.push(() => document.removeEventListener("keydown", onKeydown));
      }

      /* -------------------- Theme Switch -------------------- */
      if (themeSwitch && themeThumb) {
        const currentTheme = getTheme();
        document.documentElement.setAttribute("data-theme", currentTheme);

        const updateThemeUI = (theme) => {
          if (theme === "dark") {
            themeSwitch.classList.remove("day");
            themeSwitch.classList.add("night");
            themeThumb.textContent = "🌙";
          } else {
            themeSwitch.classList.remove("night");
            themeSwitch.classList.add("day");
            themeThumb.textContent = "☀️";
          }
        };
        updateThemeUI(currentTheme);

        const onThemeClick = async () => {
          const newTheme = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
          await setThemeSetting(newTheme);
          document.documentElement.setAttribute("data-theme", newTheme);
          updateThemeUI(newTheme);
        };
        themeSwitch.addEventListener("click", onThemeClick);
        cleanups.push(() => themeSwitch.removeEventListener("click", onThemeClick));
      }

      /* -------------------- Language Switch -------------------- */
      if (langSwitch && langThumb) {
        const currentLang = getLanguage();

        const updateLangUI = (lang) => {
          if (lang === "th") {
            langSwitch.classList.remove("uk");
            langSwitch.classList.add("us");
            langThumb.textContent = "🇹🇭";
          } else {
            langSwitch.classList.remove("us");
            langSwitch.classList.add("uk");
            langThumb.textContent = "🇬🇧";
          }
        };
        updateLangUI(currentLang);

        const onLangClick = async () => {
          const newLang = getLanguage() === "en" ? "th" : "en";
          await setLanguageSetting(newLang);
          await setLanguage(newLang);

          applyTranslations(this.navContainer);
          this.loadPage(window.location.pathname); // refresh main content

          updateLangUI(newLang);
        };
        langSwitch.addEventListener("click", onLangClick);
        cleanups.push(() => langSwitch.removeEventListener("click", onLangClick));
      }

      /* -------------------- Login / Logout -------------------- */
      const btnLogin  = this.navContainer.querySelector("#btnLogin");
      const btnLogout = this.navContainer.querySelector("#btnLogout");

      if (btnLogin) {
        const onLogin = () => this.navigateTo("/login");
        btnLogin.addEventListener("click", onLogin);
        cleanups.push(() => btnLogin.removeEventListener("click", onLogin));
      }

      if (btnLogout) {
        const onLogout = async () => {
          try {
            await logout();
            this.currentUser = null;
            this._updateAuthButtons();

            // ลบลิงก์ admin ถ้ามี
            const admin = this.navContainer.querySelector('a[href="/admin"]');
            if (admin) admin.parentElement?.remove();

            this.navigateTo("/login");
          } catch (err) {
            console.error("Logout failed:", err?.message || err);
          }
        };
        btnLogout.addEventListener("click", onLogout);
        cleanups.push(() => btnLogout.removeEventListener("click", onLogout));
      }

      // ตั้งค่าเริ่มต้น
      this._updateAuthButtons();
      await this._syncAdminLink();

    } catch (err) {
      console.error("Navigation load error:", err);
      this.navContainer.innerHTML = `
        <nav>
          <ul>
            <li><a href="/" data-link data-i18n="nav.home">Home</a></li>
          </ul>
        </nav>`;
    } finally {
      // เก็บฟังก์ชัน cleanup ไว้ใช้รอบหน้า
      this._navCleanup = () => cleanups.forEach(fn => { try { fn(); } catch {} });
    }
  }


  setupNavigation() {
    // รองรับคลิกลิงก์ทั่วไปใน nav (เช่น logo, เมนู)
    this.navContainer.addEventListener("click", async (e) => {
      const link = e.target.closest("a[data-link], a[data-logout]");
      if (!link) return;
      e.preventDefault();

      if (link.dataset.logout) {
        try {
          await logout();
          this.currentUser = null;
          this._updateAuthButtons();
          this.navigateTo("/login");
        } catch (err) {
          console.error("Logout failed:", err.message);
        }
        return;
      }

      this.navigateTo(link.getAttribute("href"));
    });
  }

  /* -------------------------------------------------- */
  /* Routing                                             */
  /* -------------------------------------------------- */
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

    // กันเข้า /admin เมื่อไม่ได้สิทธิ์
    if (normalized === "/admin") {
      const hasPermission = await checkPermission("ADMIN");
      if (!hasPermission) {
        console.warn("Access denied: redirecting to login");
        return this.navigateTo("/login");
      }
    }

    // ซ่อน nav/footer เมื่ออยู่หน้า login
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

  /* -------------------------------------------------- */
  /* Helpers                                            */
  /* -------------------------------------------------- */
  _updateAuthButtons() {
    const btnLogin  = this.navContainer.querySelector("#btnLogin");
    const btnLogout = this.navContainer.querySelector("#btnLogout");
    const isLoggedIn = !!this.currentUser;

    if (btnLogin)  btnLogin.style.display  = isLoggedIn ? "none" : "inline-flex";
    if (btnLogout) btnLogout.style.display = isLoggedIn ? "inline-flex" : "none";
  }

  async _syncAdminLink() {
    // เช็คสิทธิ์ ADMIN (backend จะอิง .env ตามระบบของคุณ)
    const isAdmin = await checkPermission("ADMIN").catch(() => false);

    const navUl = this.navContainer.querySelector("#navMenu");
    if (!navUl) return;

    let adminLink = this.navContainer.querySelector('a[href="/admin"]');

    if (isAdmin) {
      // ถ้ายังไม่มีลิงก์ admin ให้เพิ่มเข้าไป
      if (!adminLink) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "/admin";
        a.setAttribute("data-link", "");
        a.className = "nav-admin";
        a.setAttribute("data-i18n", "nav.admin");
        a.textContent = t ? t("nav.admin") : "Admin";
        li.appendChild(a);
        navUl.appendChild(li);
        applyTranslations(this.navContainer);
      }
    } else {
      // ไม่มีสิทธิ์ → ถ้ามีลิงก์อยู่ให้ถอดออก
      if (adminLink) adminLink.parentElement?.remove();
    }
  }
}
