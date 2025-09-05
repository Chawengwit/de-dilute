// SPA Router + Page Loader (Class-based)
import { apiRequest } from "./utils.js";

export default class App {
  constructor() {
    this.mainContent = document.getElementById("main-content");
    this.navContainer = document.getElementById("nav-container");
    this.footer = document.querySelector("footer"); // reference footer

    // Map URL path → page module (in /pages)
    this.routes = {
      "/": "home",
      "/home": "home",
      "/login": "login",
      "/admin": "admin",
      "/404": "404",
    };
  }

  init() {
    this.loadNavigation().then(() => {
      this.setupNavigation();
      this.loadPage(window.location.pathname);
    });

    // Handle browser back/forward
    window.addEventListener("popstate", () => {
      this.loadPage(window.location.pathname);
    });
  }

  async loadNavigation() {
    try {
      const res = await fetch("nav.html");
      if (!res.ok) throw new Error("Failed to load navigation");

      this.navContainer.innerHTML = await res.text();

      try {
        const data = await apiRequest(
          "/api/auth/permissions",
          "POST",
          { permission: "ADMIN" }
        );

        if (!data.hasPermission) {
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
            <li><a href="/" data-link>Home</a></li>
            <li><a href="/login" data-link>Login</a></li>
          </ul>
        </nav>`;
    }
  }


  setupNavigation() {
    this.navContainer.addEventListener("click", (e) => {
      const link = e.target.closest("a[data-link]");
      if (link) {
        e.preventDefault();
        this.navigateTo(link.getAttribute("href"));
      }
    });
  }

  normalizePath(path) {
    return this.routes[path] ? path : "/404";
  }

  navigateTo(path) {
    window.history.pushState({}, "", path);
    this.loadPage(path);
  }

  async loadPage(path) {
    const normalized = this.normalizePath(path);
    const pageName = this.routes[normalized];

    if (normalized === "/admin") {
      try {
        const data = await apiRequest(
          "/api/auth/permissions",
          "POST",
          { permission: "ADMIN" }
        );

        if (!data.hasPermission) {
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
    } catch (err) {
      console.error(`❌ Error loading page module "${pageName}":`, err);
      // Fallback to 404
      if (pageName !== "404") {
        this.loadPageModule("404");
      } else {
        this.mainContent.innerHTML = "<h1>404 - Page Not Found</h1>";
      }
    }
  }

  initPageModule(module, pageName) {
    if (module && typeof module.init === "function") {
      this.mainContent.innerHTML = ""; // clear old content
      module.init(this.mainContent);
    } else {
      console.error(`⚠️ Module "${pageName}" missing init() function.`);
      this.mainContent.innerHTML = "<h1>Error loading page</h1>";
    }
  }
}
