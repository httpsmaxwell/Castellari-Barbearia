(function () {
  const data = window.CastellariData || {};
  let SERVICES = data.SERVICES || [];
  let PLANS = data.PLANS || [];
  let BARBERS = data.BARBERS || [];
  let CATEGORIES = [...new Set(SERVICES.map((service) => service.category))];
  let SHOP_SETTINGS = { openingTime: "09:00", closingTime: "20:00", openDays: [1, 2, 3, 4, 5, 6], slotIntervalMinutes: 60 };
  const BOOKING_STORAGE_KEY = "castellari-booking";
  const THEME_STORAGE_KEY = "castellari-theme-preference";

  let currentUser = null;
  let currentProfile = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function fb() {
    return window.CastellariFirebase || null;
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function normalize(value) {
    return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function money(value) {
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function servicePrice(service) {
    return (service.pricePrefix || "") + money(service.price);
  }

  function initials(name) {
    return String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  }

  function phoneDigits(value) {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
    return digits.slice(0, 11);
  }

  function isValidPhone(value) {
    const digits = phoneDigits(value);
    return digits.length === 10 || digits.length === 11;
  }

  function readStorageJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeStorageJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function setTheme(theme) {
    const resolved = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = resolved;
    const themeMeta = $('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", resolved === "dark" ? "#111b16" : "#f4f0e7");

    $$("[data-theme-toggle]").forEach((button) => {
      button.textContent = resolved === "dark" ? "☼" : "☾";
      button.setAttribute("aria-label", resolved === "dark" ? "Ativar tema claro" : "Ativar tema escuro");
      button.setAttribute("aria-pressed", String(resolved === "dark"));
    });
    try {
      localStorage.setItem(THEME_STORAGE_KEY, resolved);
    } catch (_) {}
  }

  function initTheme() {
    let saved = "dark";
    try {
      saved = localStorage.getItem(THEME_STORAGE_KEY) || "dark";
    } catch (_) {}
    setTheme(saved);
    $$("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
      });
    });
  }

  function initNavigation() {
    const page = document.body.dataset.page;
    $$("[data-nav]").forEach((link) => {
      if (link.dataset.nav === page) link.setAttribute("aria-current", "page");
    });

    const button = $("[data-menu-toggle]");
    const panel = $("#mobile-panel");
    if (!button || !panel) return;

    const closeMenu = () => {
      panel.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Abrir menu");
    };

    button.addEventListener("click", () => {
      const opening = !panel.classList.contains("is-open");
      panel.classList.toggle("is-open", opening);
      button.setAttribute("aria-expanded", String(opening));
      button.setAttribute("aria-label", opening ? "Fechar menu" : "Abrir menu");
    });

    $$("a", panel).forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && panel.classList.contains("is-open")) {
        closeMenu();
        button.focus();
      }
    });
  }

  function updateAccountLinks(user) {
    const label = user
      ? "Conta (" + String(user.displayName || user.email || "Cliente").trim().split(/\s+/)[0] + ")"
      : "Entrar";
    $$("[data-account-link]").forEach((link) => {
      link.textContent = label;
    });
  }

  function serviceCard(service, index) {
    const hasClubPrice = service.clubPrice && service.clubPrice < service.price;
    const hasOriginalPrice = service.originalPrice && service.originalPrice > service.price;
    return (
      '<a class="service-card" href="agendar.html?service=' + encodeURIComponent(service.id) + '" aria-label="Escolher ' + escapeHTML(service.name) + '">' +
      '<div class="service-topline"><span class="service-number">' + String(index + 1).padStart(2, "0") + "</span>" +
      (service.badge ? '<span class="service-badge">' + escapeHTML(service.badge) + "</span>" : "") +
      "</div>" +
      "<h3>" + escapeHTML(service.name) + "</h3><p>" + escapeHTML(service.desc) + "</p>" +
      '<div class="service-bottom"><div class="price"><small>' + service.duration + " min</small>" +
      (hasOriginalPrice ? '<span style="text-decoration:line-through;color:var(--muted);font-size:16px;margin-right:6px;">' + money(service.originalPrice) + "</span>" : "") +
      escapeHTML(servicePrice(service)) +
      (hasClubPrice ? '<span style="display:block;font-size:11px;color:var(--gold,#b38e46);font-family:var(--sans);font-weight:700;margin-top:4px;">No Clube: ' + money(service.clubPrice) + "</span>" : "") +
      "</div>" +
      '<span class="text-link service-choose">Escolher <span aria-hidden="true">→</span></span></div></a>'
    );
  }

  function renderCatalog() {
    const grid = $("#services-grid");
    const categories = $("#category-list");
    const search = $("#service-search");
    const count = $("#service-count");
    if (!grid || !categories) return;

    let active = CATEGORIES[0] || "";
    const draw = () => {
      const query = normalize(search ? search.value.trim() : "");
      const results = SERVICES.filter((service) => {
        const matchesCategory = query ? true : (!active || service.category === active);
        const matchesQuery = !query || normalize(service.name + " " + service.desc + " " + service.category).includes(query);
        return matchesCategory && matchesQuery;
      });

      grid.innerHTML = results.length
        ? results.map((service, index) => serviceCard(service, index)).join("")
        : '<p class="empty-state">Nenhum serviço encontrado. Tente outro termo ou categoria.</p>';

      if (count) {
        const suffix = results.length === 1 ? " serviço" : " serviços";
        count.textContent = query ? results.length + suffix + " no catálogo" : results.length + suffix;
      }
    };

    categories.innerHTML =
      CATEGORIES.map((category, index) =>
        '<button type="button" class="category-button" data-category="' + escapeHTML(category) + '" aria-pressed="' + String(index === 0) + '">' + escapeHTML(category) + "</button>"
      ).join("") +
      '<button type="button" class="category-button" data-category="" aria-pressed="false">Todos</button>';

    $$("[data-category]", categories).forEach((button) => {
      button.addEventListener("click", () => {
        active = button.dataset.category;
        if (search && search.value) search.value = "";
        $$("[data-category]", categories).forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
        draw();
      });
    });

    if (search) search.addEventListener("input", draw);
    draw();
    grid.setAttribute("aria-busy", "false");
  }

  function renderPlans() {
    const grid = $("#plans-grid");
    if (!grid) return;
    grid.innerHTML = PLANS.length
      ? PLANS.map((plan, index) => {
          const soldOut = plan.slots === 0 || plan.badge === "Esgotado";
          const badge = soldOut ? "Lista de espera" : (plan.badge || "Clube Castellari");
          const availability = soldOut
            ? "Vagas temporariamente preenchidas"
            : (plan.slots ? plan.slots + " vagas informadas · confirme com a equipe" : "Consulte a equipe");
          const planParam = encodeURIComponent(plan.id || String(index));
          return (
            '<article class="plan-card ' + (plan.badgeType === "gold" ? "is-featured" : "") + '">' +
            '<span class="plan-status">' + escapeHTML(badge) + "</span><h3>" + escapeHTML(plan.name) + "</h3>" +
            "<p>" + escapeHTML(plan.days) + '</p><div class="plan-price">' + money(plan.price) + "<span> / mês</span></div>" +
            "<ul>" + (plan.benefits || []).map((benefit) => "<li>" + escapeHTML(benefit) + "</li>").join("") + "</ul>" +
            '<p class="plan-availability">' + escapeHTML(availability) + "</p>" +
            '<a class="button ' + (plan.badgeType === "gold" ? "" : "button-outline") + '" href="agendar.html?plano=' + planParam + '">Tenho interesse <span aria-hidden="true">→</span></a></article>'
          );
        }).join("")
      : '<p class="empty-state">Nenhum plano disponível.</p>';
    grid.setAttribute("aria-busy", "false");
  }

  function renderTeam() {
    const grid = $("#team-grid");
    if (!grid) return;
    const people = BARBERS.filter((person) => person.id !== "sem-preferencia");
    grid.innerHTML = people.length
      ? people.map((person) => {
          const photoHtml = person.photo
            ? '<img class="team-photo" src="' + escapeHTML(person.photo) + '" alt="' + escapeHTML(person.name) + '" loading="lazy">'
            : '<span class="team-monogram" aria-hidden="true">' + escapeHTML(person.initials || initials(person.name)) + "</span>";
          const badgeHtml = person.featured
            ? '<span class="team-card-badge">★ Destaque</span>'
            : "";
          return (
            '<a class="team-card" href="agendar.html?barber=' + encodeURIComponent(person.id) + '">' +
            badgeHtml +
            '<div class="team-photo-wrap">' + photoHtml + "</div>" +
            "<h3>" + escapeHTML(person.name) + "</h3><p>" + escapeHTML(person.role) + "</p>" +
            '<span class="text-link">Agendar com ' + escapeHTML(person.name.split(" ")[0]) + ' <span aria-hidden="true">→</span></span></a>'
          );
        }).join("")
      : '<p class="empty-state">Nenhum profissional disponível.</p>';
    grid.setAttribute("aria-busy", "false");
  }

  function renderHomePlans() {
    const grid = $("#home-club-grid");
    if (!grid) return;
    const preferred = ["essencial-corte", "essencial-corte-barba"];
    const chosen = preferred.map((id) => PLANS.find((plan) => plan.id === id)).filter(Boolean);
    PLANS.forEach((plan) => {
      if (chosen.length < 2 && !chosen.some((item) => item.id === plan.id)) chosen.push(plan);
    });
    grid.innerHTML = chosen.map((plan) => {
      const soldOut = plan.slots === 0 || plan.badge === "Esgotado";
      const action = soldOut ? "Entrar na lista de espera" : "Tenho interesse";
      const shortAction = soldOut ? "Lista de espera" : "Tenho interesse";
      return '<article class="home-club-card"><span class="home-club-plan-label">Assinatura mensal</span><h3>' + escapeHTML(plan.name) + '</h3>' +
        '<p>' + escapeHTML(plan.days || "Consulte os dias de atendimento") + '</p>' +
        (plan.discount ? '<p class="home-club-benefit">' + escapeHTML(plan.discount) + '</p>' : '') +
        '<div class="home-club-card-footer"><div class="home-club-price"><small>Mensalidade</small>' + money(plan.price) + '<span> por mês</span></div>' +
        '<a class="button button-small" href="agendar.html?plano=' + encodeURIComponent(plan.id) + '" aria-label="' + escapeHTML(action + ': ' + plan.name) + '">' +
        '<span class="home-club-action-full">' + action + '</span><span class="home-club-action-short">' + shortAction + '</span><span aria-hidden="true">→</span></a></div></article>';
    }).join("") || '<p class="empty-state">Nenhum plano disponível no momento. Fale com a barbearia para consultar opções.</p>';
    const more = $("#home-club-more");
    more.hidden = PLANS.length === 0;
    if (PLANS.length) {
      const remaining = PLANS.length - chosen.length;
      $("#home-club-more-copy").textContent = remaining > 0
        ? "Além destes, há mais " + remaining + (remaining === 1 ? " plano mensal" : " planos mensais") + " para comparar."
        : "Compare benefícios e condições de todos os planos mensais.";
      $("#home-club-all-link").textContent = "Comparar os " + PLANS.length + (PLANS.length === 1 ? " plano mensal →" : " planos mensais →");
    }
    grid.setAttribute("aria-busy", "false");
  }

  function localISO(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function upcomingDays(openDays = SHOP_SETTINGS.openDays) {
    const days = [];
    const today = new Date();
    for (let offset = 1; days.length < 7 && offset < 31; offset += 1) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
      if (!openDays.includes(date.getDay())) continue;
      const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", "");
      const month = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", "");
      days.push({
        iso: localISO(date),
        label: weekday.charAt(0).toUpperCase() + weekday.slice(1) + ", " + date.getDate() + " " + month,
        full: new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(date),
      });
    }
    return days;
  }

  function clockMinutes(value, fallback) {
    const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
    return match ? Number(match[1]) * 60 + Number(match[2]) : fallback;
  }

  function timeSlotsForDuration(duration = 0) {
    const interval = [15, 30, 60].includes(Number(SHOP_SETTINGS.slotIntervalMinutes))
      ? Number(SHOP_SETTINGS.slotIntervalMinutes)
      : 60;
    const opening = clockMinutes(SHOP_SETTINGS.openingTime, 540);
    const closing = clockMinutes(SHOP_SETTINGS.closingTime, 1200);
    const reservedDuration = Math.max(interval, Math.ceil(duration / interval) * interval);
    const result = [];
    for (let minute = opening; minute + reservedDuration <= closing; minute += interval) {
      result.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
    }
    return result;
  }

  function findPlan(param) {
    if (!param) return null;
    const byId = PLANS.find((item) => item.id === param);
    if (byId) return byId;
    const index = Number(param);
    return Number.isInteger(index) ? PLANS[index] || null : null;
  }

  function refreshAuthUIInBooking() {
    const planAuthBox = $("#plan-auth-box");
    const signedInfo = $("#booking-signed-user");
    const nameInput = $("#client-name");
    const phoneInput = $("#client-phone");
    const planNameInput = $("#plan-client-name");
    const planPhoneInput = $("#plan-client-phone");

    if (currentUser) {
      if (planAuthBox) planAuthBox.hidden = true;
      if (signedInfo) {
        signedInfo.hidden = false;
        signedInfo.textContent = "Conectado como " + (currentUser.displayName || currentUser.email);
      }
      const bestName = (currentProfile && currentProfile.name) || currentUser.displayName || "";
      const bestPhone = (currentProfile && currentProfile.phone) || "";
      if (nameInput && !nameInput.value) nameInput.value = bestName;
      if (phoneInput && !phoneInput.value) phoneInput.value = bestPhone;
      if (planNameInput && !planNameInput.value) planNameInput.value = bestName;
      if (planPhoneInput && !planPhoneInput.value) planPhoneInput.value = bestPhone;
    } else {
      if (planAuthBox) planAuthBox.hidden = false;
      if (signedInfo) signedInfo.hidden = true;
    }
  }

  function initPlanInterest(form) {
    const planParam = new URLSearchParams(location.search).get("plano");
    const plan = findPlan(planParam);
    if (!plan) return;

    const soldOut = plan.slots === 0 || plan.badge === "Esgotado";
    $("#booking-workflow").hidden = true;
    const stickyBar = $("#booking-sticky-bar");
    if (stickyBar) stickyBar.hidden = true;
    $("#plan-interest").hidden = false;

    $("#booking-page-title").textContent = soldOut ? "Lista de espera do Clube." : "Consulte o Clube Castellari.";
    $("#booking-page-lead").textContent = soldOut
      ? "Este plano está com vagas preenchidas no momento. Registre seu interesse."
      : "Veja os detalhes do plano selecionado e envie sua solicitação.";
    $("#plan-interest-heading").textContent = soldOut ? "Entrar na lista de espera" : "Consultar um plano";
    $("#plan-interest-name").textContent = plan.name;
    $("#plan-interest-price").textContent = money(plan.price) + " / mês";
    $("#plan-interest-details").textContent = soldOut
      ? "As vagas deste plano estão temporariamente preenchidas. Registre seu interesse para entrar na lista de espera."
      : "A equipe confirmará condições e disponibilidade com você.";

    const planGoogleBtn = $("#plan-google-login");
    if (planGoogleBtn) {
      planGoogleBtn.addEventListener("click", async () => {
        if (!fb()) return;
        try {
          await fb().signInWithGoogle();
        } catch (err) {
          alert(fb().formatFirebaseError(err));
        }
      });
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const phoneInput = $("#plan-client-phone");
      if (phoneInput && !isValidPhone(phoneInput.value)) {
        phoneInput.setCustomValidity("Informe um WhatsApp com DDD (10 ou 11 dígitos).");
        phoneInput.reportValidity();
        return;
      }

      if (!fb()) {
        alert("O envio de solicitações está temporariamente indisponível. Tente novamente mais tarde ou fale com a barbearia.");
        return;
      }

      if (fb() && currentUser) {
        try {
          const result = await fb().createPlanRequest({
            user: currentUser,
            plan,
            clientName: $("#plan-client-name").value,
            clientPhone: phoneInput.value,
          });
          $("#plan-success-note").textContent =
            "Sua solicitação para o plano " + (result.planName || plan.name) + " foi registrada. Acompanhe o status em Minha Conta.";
        } catch (err) {
          alert(fb().formatFirebaseError(err));
          return;
        }
      } else if (fb() && !currentUser) {
        alert("Entre com sua conta Google ou e-mail antes de enviar a solicitação.");
        return;
      }

      $("#plan-interest").hidden = true;
      $("#plan-interest-success").hidden = false;
      $("#plan-success-name").textContent = $("#plan-client-name").value.trim().split(/\s+/)[0];
      $("#plan-success-title").textContent = plan.name;
    });
  }

  function isComboWithCut(service) {
    return Boolean(service && service.includesCut && service.id.startsWith("combo-"));
  }

  function isStandaloneCut(service) {
    return Boolean(service && service.includesCut && !service.id.startsWith("combo-"));
  }

  function initBooking() {
    const form = $("#booking-form");
    const planForm = $("#plan-interest-form");
    if (planForm) initPlanInterest(planForm);
    if (!form || !$("#booking-workflow") || $("#booking-workflow").hidden) return;

    const params = new URLSearchParams(location.search);
    const firstService = params.get("service");
    const firstBarber = params.get("barber");
    const saved = readStorageJSON(BOOKING_STORAGE_KEY, {});
    let days = upcomingDays();

    const savedIds = Array.isArray(saved.selectedServiceIds)
      ? saved.selectedServiceIds.filter((id) => SERVICES.some((service) => service.id === id))
      : [];
    const selected = new Set(savedIds);
    if (SERVICES.some((service) => service.id === firstService)) selected.add(firstService);

    let selectedDay = days.find((day) => day.iso === saved.selectedDayIso) || null;
    let selectedTime = timeSlotsForDuration(0).includes(saved.selectedTime) ? saved.selectedTime : null;

    const serviceRoot = $("#booking-services");
    const quickChoicesRoot = $("#booking-quick-choices");
    const serviceTabsRoot = $("#booking-service-tabs");
    const selectedChipsRoot = $("#selected-services-chips");
    const searchInput = $("#booking-service-search");
    let activeServiceTab = "all";
    const quickChoices = [
      { label: "Corte", id: "corte-tradicional" },
      { label: "Barba", id: "barba-tradicional" },
      { label: "Corte Infantil", id: "corte-infantil" },
      { label: "Barboterapia", id: "barboterapia" },
      { label: "Limpeza de Sobrancelha", id: "sobrancelha-limpeza" },
      { label: "Terapia Capilar", id: "terapia-capilar" },
    ];

    function showBookingAlert(msg) {
      const errEl = $("#booking-error");
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = msg;
      }
      const toast = $("#booking-toast");
      if (toast) {
        toast.textContent = msg;
        toast.hidden = false;
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
          toast.hidden = true;
        }, 3600);
      }
    }

    function clearBookingAlert() {
      const errEl = $("#booking-error");
      if (errEl) errEl.hidden = true;
      const toast = $("#booking-toast");
      if (toast) toast.hidden = true;
    }

    function renderSelectedChips() {
      if (!selectedChipsRoot) return;
      const chosen = SERVICES.filter((s) => selected.has(s.id));
      if (!chosen.length) {
        selectedChipsRoot.hidden = true;
        selectedChipsRoot.innerHTML = "";
        return;
      }
      if (chosen.every((service) => quickChoices.some((choice) => choice.id === service.id))) {
        selectedChipsRoot.hidden = true;
        selectedChipsRoot.innerHTML = "";
        return;
      }
      selectedChipsRoot.hidden = false;
      selectedChipsRoot.innerHTML = chosen.map((s) =>
        '<button type="button" class="selected-chip" data-remove-service="' + escapeHTML(s.id) + '" aria-label="Remover ' + escapeHTML(s.name) + '">' +
        escapeHTML(s.name) + ' <span aria-hidden="true">×</span></button>'
      ).join("");
    }

    function renderServiceTabs() {
      if (!serviceTabsRoot) return;
      const tabs = [
        { key: "all", label: "Todos" },
        ...CATEGORIES.map((c) => ({ key: c, label: c })),
      ];
      serviceTabsRoot.innerHTML = tabs.map((t) =>
        '<button type="button" class="service-tab-pill' + (activeServiceTab === t.key ? " is-active" : "") + '" data-service-tab="' + escapeHTML(t.key) + '" aria-pressed="' + String(activeServiceTab === t.key) + '">' + escapeHTML(t.label) + "</button>"
      ).join("");
    }

    function renderQuickChoices() {
      quickChoicesRoot.innerHTML = quickChoices.map((choice) => {
        const service = SERVICES.find((item) => item.id === choice.id);
        if (!service) return "";
        const active = selected.has(choice.id);
        return '<button type="button" class="booking-quick-choice' + (active ? ' is-selected' : '') + '" data-quick-choice="' + escapeHTML(choice.id) + '" aria-pressed="' + String(active) + '">' +
          '<span class="booking-quick-check" aria-hidden="true">✓</span><span class="booking-quick-text"><strong>' + escapeHTML(choice.label) + '</strong><small>' + Number(service.duration || 0) + ' min</small></span><span class="booking-quick-price">' + money(Number(service.price || 0)) + '</span></button>';
      }).join("");
      quickChoicesRoot.hidden = !quickChoicesRoot.children.length;
    }

    function renderServiceList() {
      if (!serviceRoot) return;
      const query = searchInput ? normalize(searchInput.value) : "";
      let items = SERVICES;
      if (query) {
        items = SERVICES.filter((s) => normalize(s.name + " " + s.desc + " " + s.category).includes(query));
      } else if (activeServiceTab !== "all") {
        items = SERVICES.filter((s) => s.category === activeServiceTab);
      }

      serviceRoot.innerHTML = items.length
        ? '<div class="booking-service-list">' +
          items.map((service) =>
            '<label class="booking-choice' + (selected.has(service.id) ? " is-checked" : "") + '" data-service-option="' + escapeHTML(service.id) + '">' +
            '<input type="checkbox" value="' + escapeHTML(service.id) + '"' + (selected.has(service.id) ? " checked" : "") + ">" +
            '<span class="booking-choice-body">' +
            '<strong class="booking-choice-title">' + escapeHTML(service.name) + (service.badge ? ' <em class="service-inline-badge">' + escapeHTML(service.badge) + "</em>" : "") + "</strong>" +
            '<small class="booking-service-meta"><span class="booking-service-price">' + escapeHTML(servicePrice(service)) + '</span><span class="booking-service-duration">' + service.duration + " min</span></small>" +
            "</span></label>"
          ).join("") +
          "</div>"
        : '<p class="empty-state">Nenhum serviço encontrado para essa busca.</p>';
      serviceRoot.setAttribute("aria-busy", "false");
    }

    renderServiceTabs();
    renderServiceList();
    renderQuickChoices();
    renderSelectedChips();

    const catalogPanel = $("#booking-catalog-panel");
    const catalogToggle = $("#booking-catalog-toggle");
    catalogToggle.addEventListener("click", () => {
      const expanded = catalogPanel.hidden;
      catalogPanel.hidden = !expanded;
      catalogToggle.setAttribute("aria-expanded", String(expanded));
      catalogToggle.firstChild.textContent = expanded ? "Ocultar catálogo " : "Ver todos os serviços ";
    });
    quickChoicesRoot.addEventListener("click", (event) => {
      const button = event.target.closest("[data-quick-choice]");
      if (!button) return;
      const id = button.dataset.quickChoice;
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      clearBookingAlert();
      updateSelectedCount();
      renderSelectedChips();
      renderServiceList();
      renderQuickChoices();
      $$("[data-quick-choice]", quickChoicesRoot).find((item) => item.dataset.quickChoice === id)?.focus();
      renderTimeButtons();
      persistBooking();
      updateSummary();
    });

    if (serviceTabsRoot) {
      serviceTabsRoot.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-service-tab]");
        if (!btn) return;
        activeServiceTab = btn.dataset.serviceTab;
        if (searchInput && searchInput.value) searchInput.value = "";
        renderServiceTabs();
        renderServiceList();
      });
    }

    if (selectedChipsRoot) {
      selectedChipsRoot.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-remove-service]");
        if (!btn) return;
        selected.delete(btn.dataset.removeService);
        updateSelectedCount();
        renderSelectedChips();
        renderServiceList();
        renderQuickChoices();
        persistBooking();
        updateSummary();
      });
    }

    const selectedCount = $("#selected-service-count");
    const updateSelectedCount = () => {
      $("#selected-services-bar").hidden = selected.size === 0;
      if (selectedCount) {
        selectedCount.textContent = selected.size + (selected.size === 1 ? " serviço selecionado" : " serviços selecionados");
      }
    };
    updateSelectedCount();

    let currentStep = 1;
    let contactConfirmedUid = null;
    let submittingBooking = false;
    let loginPending = false;
    let registering = false;
    let recovering = false;
    const detailsDialog = $("#booking-details-dialog");
    const loginForm = $("#booking-login-form");
    const registerForm = $("#booking-register-form");
    const recoveryForm = $("#booking-recovery-form");
    const contactForm = $("#booking-contact-form");

    function contactIsConfirmed() {
      return !!currentUser && contactConfirmedUid === currentUser.uid;
    }

    function showDialogError(message) {
      const error = $("#booking-dialog-error");
      error.textContent = message;
      error.hidden = false;
      error.focus();
    }

    function renderDetailsDialog() {
      const signedIn = !!currentUser;
      $("#booking-login-panel").hidden = signedIn;
      contactForm.hidden = !signedIn;
      $("#booking-dialog-step").textContent = signedIn ? "2 de 2 · Seus dados" : "1 de 2 · Acesso";
      $("#booking-dialog-title").textContent = signedIn ? "Como podemos falar com você?" : "Entre na sua conta";
      $("#booking-dialog-description").textContent = signedIn
        ? "Confira seu nome e WhatsApp. Depois, você volta ao resumo para confirmar."
        : "Seu horário continua selecionado. Entre para seguir com o agendamento.";
      $("#booking-dialog-error").hidden = true;
      refreshAuthUIInBooking();
      if (detailsDialog.open) $("#booking-dialog-title").focus();
    }

    function setRegisterMode(enabled) {
      if (loginPending) return;
      registering = enabled;
      recovering = false;
      loginForm.hidden = enabled;
      registerForm.hidden = !enabled;
      recoveryForm.hidden = true;
      $("#booking-create-prompt").hidden = enabled;
      $("#booking-login-prompt").hidden = !enabled;
      $("#booking-forgot-prompt").hidden = enabled;
      $("#booking-recovery-back").hidden = true;
      $("#booking-google-login").hidden = false;
      $("#booking-login-divider").hidden = enabled;
      $("#booking-dialog-title").textContent = enabled ? "Crie sua conta" : "Entre na sua conta";
      $("#booking-dialog-description").textContent = enabled
        ? "Seu horário continua selecionado. Depois, informe seu nome e WhatsApp."
        : "Seu horário continua selecionado. Entre para seguir com o agendamento.";
      $("#booking-dialog-error").hidden = true;
      $("#booking-dialog-status").hidden = true;
      $("#booking-dialog-title").focus();
    }

    function setRecoveryMode(enabled) {
      if (loginPending) return;
      recovering = enabled;
      registering = false;
      loginForm.hidden = enabled;
      registerForm.hidden = true;
      recoveryForm.hidden = !enabled;
      $("#booking-create-prompt").hidden = enabled;
      $("#booking-login-prompt").hidden = true;
      $("#booking-forgot-prompt").hidden = enabled;
      $("#booking-recovery-back").hidden = !enabled;
      $("#booking-google-login").hidden = enabled;
      $("#booking-login-divider").hidden = enabled;
      $("#booking-dialog-title").textContent = enabled ? "Recupere sua senha" : "Entre na sua conta";
      $("#booking-dialog-description").textContent = enabled
        ? "Informe o e-mail da sua conta. Seu agendamento continua selecionado enquanto você recupera a senha."
        : "Seu horário continua selecionado. Entre para seguir com o agendamento.";
      $("#booking-dialog-error").hidden = true;
      $("#booking-dialog-status").hidden = true;
      if (enabled) $("#booking-recovery-email").value = $("#booking-email").value.trim();
      $("#booking-dialog-title").focus();
    }

    function openDetailsDialog() {
      if (submittingBooking) return;
      clearBookingAlert();
      renderDetailsDialog();
      if (!currentUser && (registering || recovering)) setRegisterMode(false);
      if (!detailsDialog.open) detailsDialog.showModal();
      document.body.classList.add("booking-dialog-open");
      // Focus the heading so opening the dialog does not summon the mobile keyboard.
      $("#booking-dialog-title").focus();
    }

    $("#booking-dialog-close").addEventListener("click", () => detailsDialog.close());
    detailsDialog.addEventListener("close", () => {
      document.body.classList.remove("booking-dialog-open");
      $("#booking-password").value = "";
      $("#booking-register-password").value = "";
      $("#booking-register-confirm").value = "";
    });
    $("#booking-edit-contact").addEventListener("click", openDetailsDialog);
    $("#booking-show-register").addEventListener("click", () => setRegisterMode(true));
    $("#booking-show-login").addEventListener("click", () => setRegisterMode(false));
    $("#booking-show-recovery").addEventListener("click", () => setRecoveryMode(true));
    $("#booking-back-to-login").addEventListener("click", () => setRecoveryMode(false));

    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!currentUser) {
        renderDetailsDialog();
        return;
      }
      const name = $("#client-name");
      const phone = $("#client-phone");
      name.value = name.value.trim();
      name.setCustomValidity(name.value ? "" : "Informe seu nome.");
      phone.setCustomValidity(isValidPhone(phone.value) ? "" : "Informe um WhatsApp com DDD (10 ou 11 dígitos).");
      if (!contactForm.reportValidity()) return;
      contactConfirmedUid = currentUser.uid;
      updateSummary();
      detailsDialog.close();
    });

    window.addEventListener("castellari:auth-updated", () => {
      if (!currentUser || currentUser.uid !== contactConfirmedUid) contactConfirmedUid = null;
      if (detailsDialog.open) renderDetailsDialog();
      updateSummary();
    });

    function scrollToActiveStep() {
      const targetEl = $(".booking-stepper") || $("#booking-form");
      if (!targetEl) return;
      const top = targetEl.getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    }

    const barberSelect = $("#booking-barber");
    function populateBarberSelect(preferredId) {
      barberSelect.innerHTML =
        '<option value="">Selecione um profissional...</option>' +
        BARBERS.map((person) =>
          '<option value="' + escapeHTML(person.id) + '">' + escapeHTML(person.name === "Sem preferência" ? person.name : person.name + " · " + person.role) + "</option>"
        ).join("");
      if (preferredId && BARBERS.some((person) => person.id === preferredId)) {
        barberSelect.value = preferredId;
      } else {
        barberSelect.value = "";
      }
    }
    populateBarberSelect(
      BARBERS.some((p) => p.id === firstBarber) ? firstBarber :
      (BARBERS.some((p) => p.id === saved.barberId) ? saved.barberId : "")
    );

    function goToStep(stepNumber, scroll = true) {
      if (submittingBooking) return;
      const target = Math.max(1, Math.min(4, stepNumber));
      if (target > 1 && selected.size === 0) {
        showBookingAlert("Você ainda não selecionou nenhum serviço. Escolha pelo menos 1 serviço para continuar.");
        currentStep = 1;
      } else if (target > 2 && !barberSelect.value) {
        showBookingAlert("Você ainda não selecionou o profissional. Escolha um barbeiro ou 'Sem preferência'.");
        currentStep = 2;
      } else if (target === 4 && !selectedDay) {
        showBookingAlert("Você ainda não selecionou a data. Escolha um dia disponível para continuar.");
        currentStep = 3;
      } else if (target === 4 && !selectedTime) {
        showBookingAlert("Você ainda não selecionou o horário. Escolha um horário disponível para continuar.");
        currentStep = 3;
      } else {
        clearBookingAlert();
        currentStep = target;
      }

      $$("[data-booking-step]").forEach((block) => {
        const step = Number(block.dataset.bookingStep);
        block.hidden = step !== currentStep;
      });
      document.body.classList.toggle("booking-selection-step", currentStep <= 3);
      document.body.classList.toggle("booking-review-step", currentStep === 4);
      document.body.dataset.currentBookingStep = String(currentStep);

      $$("[data-step-indicator]").forEach((item) => {
        const number = Number(item.dataset.stepIndicator);
        item.classList.toggle("is-complete", number < currentStep);
        if (number === currentStep) item.setAttribute("aria-current", "step");
        else item.removeAttribute("aria-current");
      });

      updateSummary();
      if (scroll) scrollToActiveStep();
    }

    const barbersGrid = $("#booking-barbers-grid");
    function renderBarbersGrid() {
      if (!barbersGrid) return;
      barbersGrid.innerHTML = BARBERS.map((b) => {
        const isSel = barberSelect.value === b.id;
        const photoHtml = b.photo
          ? '<img class="barber-card-photo" src="' + escapeHTML(b.photo) + '" alt="' + escapeHTML(b.name) + '" loading="lazy">'
          : '<span class="barber-card-monogram" aria-hidden="true">' + escapeHTML(b.initials || "★") + "</span>";
        const badgeHtml = b.featured
          ? '<span class="barber-card-badge">★ Destaque</span>'
          : "";
        return (
          '<button type="button" class="barber-choice-card ' + (isSel ? "is-selected" : "") + '" data-barber-choice="' + escapeHTML(b.id) + '">' +
          badgeHtml +
          '<div class="barber-card-avatar-wrap">' + photoHtml + "</div>" +
          '<div class="barber-card-info">' +
          "<strong>" + escapeHTML(b.name) + "</strong>" +
          "<span>" + escapeHTML(b.role) + "</span>" +
          "</div>" +
          "</button>"
        );
      }).join("");

      $$("[data-barber-choice]", barbersGrid).forEach((btn) => {
        btn.addEventListener("click", () => {
          barberSelect.value = btn.dataset.barberChoice;
          renderBarbersGrid();
          $$("[data-barber-choice]", barbersGrid).find((item) => item.dataset.barberChoice === barberSelect.value)?.focus();
          persistBooking();
          updateSummary();
          refreshAvailability();
        });
      });
    }
    renderBarbersGrid();

    // Cliques nos indicadores do stepper
    $$("[data-step-indicator]").forEach((item) => {
      item.addEventListener("click", () => {
        const targetStep = Number(item.dataset.stepIndicator);
        goToStep(targetStep);
      });
      item.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        goToStep(Number(item.dataset.stepIndicator));
      });
    });

    // Botões de voltar
    $$("[data-step-back]").forEach((btn) => {
      btn.addEventListener("click", () => {
        goToStep(Number(btn.dataset.stepBack));
      });
    });

    const btnStep1Next = $("#btn-step-1-next");
    if (btnStep1Next) {
      btnStep1Next.addEventListener("click", () => goToStep(2));
    }
    const btnStep2Next = $("#btn-step-2-next");
    if (btnStep2Next) {
      btnStep2Next.addEventListener("click", () => goToStep(3));
    }
    const btnStep3Next = $("#btn-step-3-next");
    if (btnStep3Next) {
      btnStep3Next.addEventListener("click", () => goToStep(4));
    }

    const dayRoot = $("#booking-days");
    function renderDayButtons() {
      dayRoot.innerHTML = days.map((day) =>
        '<button type="button" class="choice-button" data-day="' + day.iso + '" aria-label="' + escapeHTML(day.full) + '" aria-pressed="' + String(Boolean(selectedDay && selectedDay.iso === day.iso)) + '">' + escapeHTML(day.label) + "</button>"
      ).join("") || '<p class="empty-state">Não há datas disponíveis na agenda configurada.</p>';
      dayRoot.setAttribute("aria-busy", "false");
    }
    renderDayButtons();

    const timeRoot = $("#booking-times");
    let bookedSlots = [];
    let availabilityReady = false;
    let availabilityError = false;
    let availabilityRequest = 0;

    function isTimeUnavailable(time, duration) {
      if (!availabilityReady) return true;
      const interval = [15, 30, 60].includes(Number(SHOP_SETTINGS.slotIntervalMinutes))
        ? Number(SHOP_SETTINGS.slotIntervalMinutes)
        : 60;
      const [hours, minutes] = time.split(":").map(Number);
      const start = hours * 60 + minutes;
      const blocks = [];
      for (let minute = start; minute < start + Math.max(interval, duration); minute += interval) {
        blocks.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
      }
      const barberIds = barberSelect.value === "sem-preferencia"
        ? BARBERS.filter((person) => person.id !== "sem-preferencia" && person.active !== false).map((person) => person.id)
        : [barberSelect.value];
      if (!barberIds.length) return true;
      return barberIds.every((barberId) => blocks.some((block) =>
        bookedSlots.some((slot) => slot.barberId === barberId && slot.time === block)
      ));
    }

    function renderTimeButtons() {
      const duration = chosenServices().reduce((sum, service) => sum + Number(service.duration || 0), 0);
      const times = timeSlotsForDuration(duration);
      if (selectedTime && !times.includes(selectedTime)) selectedTime = null;
      if (!selectedDay) {
        timeRoot.innerHTML = '<p class="empty-state">Selecione uma data para consultar os horários.</p>';
        timeRoot.setAttribute("aria-busy", "false");
        return;
      }
      if (!fb()) {
        timeRoot.innerHTML = '<p class="empty-state">A agenda está temporariamente indisponível. Atualize a página ou fale com a barbearia.</p>';
        timeRoot.setAttribute("aria-busy", "false");
        return;
      }
      if (availabilityError) {
        timeRoot.innerHTML = '<p class="empty-state" role="status">Não foi possível consultar os horários agora.</p><button type="button" class="button button-small button-outline" data-retry-availability>Tentar novamente</button>';
        timeRoot.setAttribute("aria-busy", "false");
        return;
      }
      if (!availabilityReady) {
        timeRoot.innerHTML = '<p class="empty-state">Consultando horários disponíveis…</p>';
        timeRoot.setAttribute("aria-busy", "true");
        return;
      }
      timeRoot.innerHTML = times.map((time) => {
        const busy = isTimeUnavailable(time, duration);
        const pressed = !busy && selectedTime === time;
        return '<button type="button" class="choice-button" data-time="' + time + '" aria-pressed="' + String(pressed) + '"' + (busy ? " disabled" : "") + ">" + time + "</button>";
      }).join("") || '<p class="empty-state">Não há horários que comportem os serviços selecionados.</p>';
      timeRoot.setAttribute("aria-busy", "false");
    }
    renderTimeButtons();

    async function refreshAvailability() {
      const requestId = ++availabilityRequest;
      if (!selectedDay || !fb()) {
        bookedSlots = [];
        availabilityReady = false;
        availabilityError = false;
        renderTimeButtons();
        return;
      }
      availabilityReady = false;
      availabilityError = false;
      renderTimeButtons();
      try {
        const dateIso = selectedDay.iso;
        const barberId = barberSelect.value;
        const barberIds = barberId === "sem-preferencia"
          ? BARBERS.filter((person) => person.id !== "sem-preferencia" && person.active !== false).map((person) => person.id)
          : [barberId];
        const interval = [15, 30, 60].includes(Number(SHOP_SETTINGS.slotIntervalMinutes))
          ? Number(SHOP_SETTINGS.slotIntervalMinutes)
          : 60;
        const opening = clockMinutes(SHOP_SETTINGS.openingTime, 540);
        const closing = clockMinutes(SHOP_SETTINGS.closingTime, 1200);
        const slotTimes = [];
        for (let minute = opening; minute < closing; minute += interval) {
          slotTimes.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
        }
        const result = await fb().getBookedTimesForDay(dateIso, barberIds, slotTimes);
        if (requestId !== availabilityRequest) return;
        const priorSelectedTime = selectedTime;
        bookedSlots = result;
        availabilityReady = true;
        renderTimeButtons();
        if (priorSelectedTime && selectedTime && isTimeUnavailable(selectedTime, chosenServices().reduce((sum, service) => sum + Number(service.duration || 0), 0))) {
          selectedTime = null;
          persistBooking();
          updateSummary();
        } else if (priorSelectedTime && !selectedTime) {
          persistBooking();
          updateSummary();
        }
      } catch (_) {
        if (requestId !== availabilityRequest) return;
        availabilityReady = false;
        availabilityError = true;
        selectedTime = null;
        persistBooking();
        updateSummary();
        renderTimeButtons();
      }
    }

    timeRoot.addEventListener("click", (event) => {
      if (event.target.closest("[data-retry-availability]")) refreshAvailability();
    });

    window.addEventListener("castellari:schedule-updated", () => {
      const previousIso = selectedDay && selectedDay.iso;
      days = upcomingDays();
      selectedDay = days.find((day) => day.iso === previousIso) || null;
      if (!selectedDay) selectedTime = null;
      renderDayButtons();
      renderTimeButtons();
      persistBooking();
      updateSummary();
      refreshAvailability();
    });

    const persistBooking = () => {
      writeStorageJSON(BOOKING_STORAGE_KEY, {
        selectedServiceIds: [...selected],
        barberId: barberSelect.value,
        selectedDayIso: selectedDay ? selectedDay.iso : null,
        selectedTime,
      });
    };

    const duplicationAlert = $("#booking-duplication-alert");
    const removeDuplicateCutBtn = $("#remove-duplicate-cut");

    function chosenServices() {
      return SERVICES.filter((service) => selected.has(service.id));
    }

    function updateSummary() {
      const services = chosenServices();
      const total = services.reduce((sum, service) => sum + service.price, 0);
      const duration = services.reduce((sum, service) => sum + service.duration, 0);
      const barber = BARBERS.find((person) => person.id === barberSelect.value);

      $("#summary-services").textContent = services.length ? services.map((service) => service.name).join(", ") : "Selecione um serviço";
      $("#summary-professional").textContent = barber ? barber.name : "Escolha um profissional";
      $("#summary-date").textContent = selectedDay && selectedTime ? selectedDay.full + " · " + selectedTime : "Escolha data e horário";
      $("#summary-duration").textContent = duration ? duration + " min" : "—";
      $("#summary-total").textContent = money(total);

      // Atualiza o resumo da etapa 4
      const recapSrv = $("#recap-services");
      if (recapSrv) recapSrv.textContent = services.length ? services.map((s) => s.name).join(", ") : "Nenhum";
      const recapBarber = $("#recap-barber");
      if (recapBarber) recapBarber.textContent = barber ? barber.name : "Escolha um profissional";
      const recapDt = $("#recap-datetime");
      if (recapDt) recapDt.textContent = selectedDay && selectedTime ? selectedDay.full + " às " + selectedTime : "Escolha data e horário";
      const recapDur = $("#recap-duration");
      if (recapDur) recapDur.textContent = duration ? duration + " min" : "—";
      const recapTot = $("#recap-total");
      if (recapTot) recapTot.textContent = money(total);

      // Botões das etapas (mantidos ativos para exibir aviso claro se faltar seleção)
      if (btnStep1Next) {
        btnStep1Next.textContent = selected.size
          ? "Próximo (" + selected.size + " selecionado" + (selected.size > 1 ? "s" : "") + ") →"
          : "Próximo →";
      }

      const prevBtn = $("#booking-prev");
      if (prevBtn) {
        prevBtn.disabled = currentStep === 1;
      }

      const continueBtn = $("#booking-continue");
      if (continueBtn) {
        continueBtn.textContent = submittingBooking ? "Confirmando…" :
          currentStep === 4 && contactIsConfirmed() ? "Confirmar →" : "Próximo →";
        continueBtn.disabled = submittingBooking;
      }
      const reviewNext = $("#booking-review-next");
      reviewNext.textContent = submittingBooking ? "Confirmando…" :
        contactIsConfirmed() ? "Confirmar agendamento →" : "Próximo →";
      reviewNext.disabled = submittingBooking;
      $("#booking-edit-contact").disabled = submittingBooking;
      if (prevBtn) prevBtn.disabled = submittingBooking || currentStep === 1;
      $("#booking-contact-recap").hidden = !contactIsConfirmed();
      $("#recap-client-name").textContent = $("#client-name").value.trim();
      $("#recap-client-phone").textContent = $("#client-phone").value;
      $("#booking-review-hint").textContent = contactIsConfirmed()
        ? "Tudo certo? Confirme abaixo para registrar seu agendamento."
        : "Confira os detalhes e toque em Próximo para continuar.";

      if (duplicationAlert) {
        const hasDuplicateCut = services.some(isComboWithCut) && services.some(isStandaloneCut);
        duplicationAlert.hidden = !hasDuplicateCut;
      }
    }

    serviceRoot.addEventListener("change", (event) => {
      const input = event.target.closest("input[type=checkbox]");
      if (!input) return;
      if (input.checked) selected.add(input.value);
      else selected.delete(input.value);
      const label = input.closest(".booking-choice");
      if (label) label.classList.toggle("is-checked", input.checked);
      clearBookingAlert();
      updateSelectedCount();
      renderSelectedChips();
      renderQuickChoices();
      renderTimeButtons();
      persistBooking();
      updateSummary();
    });

    if (removeDuplicateCutBtn) {
      removeDuplicateCutBtn.addEventListener("click", () => {
        chosenServices().filter(isStandaloneCut).forEach((service) => {
          selected.delete(service.id);
        });
        updateSelectedCount();
        renderSelectedChips();
        renderServiceList();
        renderQuickChoices();
        renderTimeButtons();
        persistBooking();
        updateSummary();
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        renderServiceList();
      });
    }

    dayRoot.addEventListener("click", (event) => {
      const button = event.target.closest("[data-day]");
      if (!button) return;
      selectedDay = days.find((day) => day.iso === button.dataset.day) || null;
      $$("[data-day]", dayRoot).forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      const dateLabel = $("#selected-date-label");
      if (dateLabel && selectedDay) {
        dateLabel.textContent = "Horários em " + selectedDay.full + ":";
      }
      clearBookingAlert();
      persistBooking();
      updateSummary();
      refreshAvailability();
    });

    timeRoot.addEventListener("click", (event) => {
      const button = event.target.closest("[data-time]");
      if (!button || button.disabled) return;
      selectedTime = button.dataset.time;
      $$("[data-time]", timeRoot).forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      clearBookingAlert();
      persistBooking();
      updateSummary();
    });

    barberSelect.addEventListener("change", () => {
      clearBookingAlert();
      renderBarbersGrid();
      persistBooking();
      updateSummary();
      renderTimeButtons();
      refreshAvailability();
    });
    $("#client-name").addEventListener("input", () => {
      $("#client-name").setCustomValidity("");
      contactConfirmedUid = null;
      updateSummary();
    });
    $("#client-phone").addEventListener("input", () => {
      contactConfirmedUid = null;
      updateSummary();
    });

    const bookingGoogleBtn = $("#booking-google-login");
    async function signInForBooking(provider) {
      if (loginPending) return;
      const api = fb();
      if (!api) {
        showDialogError("Não foi possível carregar o login. Aguarde um momento e tente novamente.");
        return;
      }
      loginPending = true;
      $("#booking-dialog-error").hidden = true;
      const status = $("#booking-dialog-status");
      status.textContent = "Entrando…";
      status.hidden = false;
      const loginControls = $$("button, input", $("#booking-login-panel"));
      loginControls.forEach((control) => { control.disabled = true; });
      try {
        // Only the Firebase auth observer advances the dialog after a real sign-in.
        if (provider === "google") await api.signInWithGoogle();
        else if (provider === "register") await api.registerWithEmail({
          name: "",
          phone: "",
          email: $("#booking-register-email").value.trim(),
          password: $("#booking-register-password").value,
        });
        else await api.signInWithEmail($("#booking-email").value.trim(), $("#booking-password").value);
        $("#booking-password").value = "";
        $("#booking-register-password").value = "";
        $("#booking-register-confirm").value = "";
      } catch (err) {
        if (detailsDialog.open && !currentUser) showDialogError(api.formatFirebaseError(err));
      } finally {
        loginPending = false;
        status.hidden = true;
        loginControls.forEach((control) => { control.disabled = false; });
      }
    }
    bookingGoogleBtn.addEventListener("click", () => signInForBooking("google"));
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      signInForBooking("email");
    });
    registerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const confirm = $("#booking-register-confirm");
      confirm.setCustomValidity(confirm.value === $("#booking-register-password").value ? "" : "As senhas não coincidem.");
      if (!registerForm.reportValidity()) return;
      signInForBooking("register");
    });
    $("#booking-register-confirm").addEventListener("input", (event) => event.target.setCustomValidity(""));
    recoveryForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (loginPending) return;
      const api = fb();
      if (!api) {
        showDialogError("Não foi possível enviar o link agora. Aguarde um momento e tente novamente.");
        return;
      }
      loginPending = true;
      $("#booking-dialog-error").hidden = true;
      const status = $("#booking-dialog-status");
      status.textContent = "Enviando…";
      status.hidden = false;
      const controls = $$("button, input", $("#booking-login-panel"));
      controls.forEach((control) => { control.disabled = true; });
      let sent = false;
      try {
        await api.resetPassword($("#booking-recovery-email").value.trim());
        sent = true;
        status.textContent = "Se esse e-mail tiver uma conta, você receberá um link para redefinir a senha. Confira também o spam.";
      } catch (err) {
        if (detailsDialog.open) showDialogError(api.formatFirebaseError(err));
      } finally {
        loginPending = false;
        status.hidden = !sent;
        controls.forEach((control) => { control.disabled = false; });
      }
    });

    const prevButton = $("#booking-prev");
    if (prevButton) {
      prevButton.addEventListener("click", () => {
        if (currentStep > 1) goToStep(currentStep - 1);
      });
    }

    const continueButton = $("#booking-continue");
    if (continueButton) {
      continueButton.addEventListener("click", () => {
        if (currentStep === 1) {
          goToStep(2);
        } else if (currentStep === 2) {
          goToStep(3);
        } else if (currentStep === 3) {
          goToStep(4);
        } else if (currentStep === 4) {
          if (form.checkValidity()) form.requestSubmit();
          else form.reportValidity();
        }
      });
    }

    window.addEventListener("castellari:catalog-updated", () => {
      renderServiceTabs();
      renderServiceList();
      renderSelectedChips();
      renderQuickChoices();
      populateBarberSelect(barberSelect.value);
      renderBarbersGrid();
      renderTimeButtons();
      updateSummary();
    });

    // Inicializa sempre na etapa correspondente sem bloquear se faltou algo
    let initialStep = 1;
    if (selected.size > 0) {
      if (!barberSelect.value) initialStep = 2;
      else if (!selectedDay || !selectedTime) initialStep = 3;
      else initialStep = 4;
    }
    goToStep(initialStep, false);
    persistBooking();
    updateSummary();
    refreshAvailability();
    if (initialStep > 1) scrollToActiveStep();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submittingBooking) return;
      if (currentStep !== 4) {
        goToStep(currentStep + 1);
        return;
      }
      if (!selected.size) {
        $("#booking-error").hidden = false;
        $("#booking-error").textContent = "Escolha pelo menos um serviço para continuar.";
        serviceRoot.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (!selectedDay || !selectedTime) {
        $("#booking-error").hidden = false;
        $("#booking-error").textContent = "Escolha uma data e um horário para continuar.";
        $("#booking-days").scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      const phoneInput = $("#client-phone");
      if (!contactIsConfirmed() || !$("#client-name").value.trim() || !isValidPhone(phoneInput.value)) {
        openDetailsDialog();
        return;
      }

      if (!fb()) {
        $("#booking-error").hidden = false;
        $("#booking-error").textContent = "O agendamento está temporariamente indisponível. Tente novamente mais tarde ou fale com a barbearia.";
        return;
      }

      const barber = BARBERS.find((person) => person.id === barberSelect.value);
      const chosen = chosenServices();
      let totalPrice = chosen.reduce((sum, service) => sum + service.price, 0);
      const totalDuration = chosen.reduce((sum, service) => sum + service.duration, 0);
      let assignedBarber = barber;
      if (fb() && currentUser) {
        submittingBooking = true;
        updateSummary();
        try {
          const result = await fb().createBooking({
            user: currentUser,
            serviceIds: chosen.map((s) => s.id),
            barberId: barberSelect.value,
            dateIso: selectedDay.iso,
            dateFull: selectedDay.full,
            time: selectedTime,
            totalPrice,
            totalDuration,
            clientName: $("#client-name").value,
            clientPhone: phoneInput.value,
          });
          assignedBarber = BARBERS.find((person) => person.id === result.barberId) || {
            id: result.barberId,
            name: result.barberName || "Profissional",
          };
          const codeEl = $("#success-code");
          if (codeEl) codeEl.textContent = "Código da reserva: " + result.code + ". Acompanhe em Minha Conta.";
        } catch (err) {
          showBookingAlert(fb().formatFirebaseError(err));
          await refreshAvailability();
          submittingBooking = false;
          updateSummary();
          return;
        }
      }

      $("#success-name").textContent = $("#client-name").value.trim().split(/\s+/)[0];
      $("#success-services").textContent = chosen.map((service) => service.name).join(", ");
      $("#success-date").textContent = selectedDay.full + " às " + selectedTime;
      $("#success-professional").textContent = assignedBarber ? assignedBarber.name : "Sem preferência";
      $("#success-total").textContent = money(totalPrice);

      const whatsBtn = $("#success-whatsapp-btn");
      if (whatsBtn) {
        const clientFirstName = $("#client-name").value.trim();
        const barberText = assignedBarber ? assignedBarber.name : "Primeiro disponível";
        const servText = chosen.map((s) => s.name).join(", ");
        const whatsMsg = `Olá, Barbearia Castellari! Fiz um agendamento pelo site:\n\n👤 *Cliente:* ${clientFirstName}\n✂️ *Serviço(s):* ${servText}\n💈 *Profissional:* ${barberText}\n📅 *Data:* ${selectedDay.full} às ${selectedTime}\n💰 *Valor estimado:* ${money(totalPrice)}\n\nAguardo confirmação!`;
        whatsBtn.href = "https://wa.me/559285803578?text=" + encodeURIComponent(whatsMsg);
      }

      try {
        localStorage.removeItem(BOOKING_STORAGE_KEY);
      } catch (_) {}

      $("#booking-workflow").hidden = true;
      const stickyBar = $("#booking-sticky-bar");
      if (stickyBar) stickyBar.hidden = true;
      $("#booking-success").hidden = false;
      $("#booking-success").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function initPhoneMasks() {
    [$("#client-phone"), $("#plan-client-phone"), $("#reg-phone"), $("#profile-phone")].filter(Boolean).forEach((input) => {
      input.addEventListener("input", () => {
        input.setCustomValidity("");
        const digits = phoneDigits(input.value);
        if (digits.length <= 2) {
          input.value = digits ? "(" + digits : "";
        } else if (digits.length <= 6) {
          input.value = "(" + digits.slice(0, 2) + ") " + digits.slice(2);
        } else if (digits.length <= 10) {
          input.value = "(" + digits.slice(0, 2) + ") " + digits.slice(2, 6) + "-" + digits.slice(6);
        } else {
          input.value = "(" + digits.slice(0, 2) + ") " + digits.slice(2, 7) + "-" + digits.slice(7);
        }
      });
    });
  }

  function renderAllViews() {
    renderHomePlans();
    renderCatalog();
    renderPlans();
    renderTeam();
    // Dispara evento para que o initBooking (se ativo) re-renderize catálogo e barbeiros
    window.dispatchEvent(new CustomEvent("castellari:catalog-updated"));
  }

  async function syncWithFirebase(api) {
    if (!api) return;
    api.onAuthChange(async (user) => {
      currentUser = user;
      currentProfile = null;
      updateAccountLinks(user);
      refreshAuthUIInBooking();
      window.dispatchEvent(new CustomEvent("castellari:auth-updated"));
      if (user) {
        try {
          const profile = await api.getUserProfile(user.uid);
          if (currentUser?.uid !== user.uid) return;
          currentProfile = profile;
          refreshAuthUIInBooking();
        } catch (_) {
          // Contact details remain editable when the profile cannot be loaded.
        }
      }
    });

    const remote = await api.loadCatalogFromFirestore();
    let updated = false;
    if (remote.settings) {
      const openDays = Array.isArray(remote.settings.openDays)
        ? remote.settings.openDays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        : SHOP_SETTINGS.openDays;
      SHOP_SETTINGS = {
        openingTime: remote.settings.openingTime || SHOP_SETTINGS.openingTime,
        closingTime: remote.settings.closingTime || SHOP_SETTINGS.closingTime,
        openDays: openDays.length ? openDays : SHOP_SETTINGS.openDays,
        slotIntervalMinutes: Number(remote.settings.slotIntervalMinutes || SHOP_SETTINGS.slotIntervalMinutes),
      };
      document.querySelectorAll("[data-shop-name]").forEach((node) => {
        node.textContent = String(remote.settings.name || "Barbearia Castellari").toLocaleUpperCase("pt-BR");
      });
      document.querySelectorAll("[data-shop-unit]").forEach((node) => {
        node.textContent = remote.settings.unit || node.textContent;
      });
      document.querySelectorAll("[data-shop-days]").forEach((node) => {
        node.textContent = remote.settings.days || node.textContent;
      });
      document.querySelectorAll("[data-shop-hours]").forEach((node) => {
        node.textContent = remote.settings.hours || node.textContent;
      });
      window.dispatchEvent(new CustomEvent("castellari:schedule-updated"));
    }
    const remoteVersion = remote.settings && remote.settings.catalogVersion ? Number(remote.settings.catalogVersion) : 1;
    const localVersion = Number(data.CATALOG_VERSION || 1);
    if (remote.services && remoteVersion >= localVersion) {
      SERVICES = remote.services.filter((service) => service.active !== false);
      CATEGORIES = [...new Set(SERVICES.map((service) => service.category))];
      updated = true;
    }
    if (remote.plans && remoteVersion >= localVersion) {
      PLANS = remote.plans.filter((plan) => plan.active !== false);
      updated = true;
    }
    if (remote.barbers) {
      BARBERS = remote.barbers.filter((barber) => barber.active !== false).map((rb) => {
        const local = (data.BARBERS || []).find((lb) => lb.id === rb.id);
        return {
          ...rb,
          photo: rb.photo || (local ? local.photo : null),
        };
      });
      updated = true;
    }
    if (updated) {
      renderAllViews();
      window.dispatchEvent(new CustomEvent("castellari:catalog-updated"));
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initNavigation();
    renderAllViews();
    initBooking();
    initPhoneMasks();
    const year = $("#current-year");
    if (year) year.textContent = String(new Date().getFullYear());

    if (fb()) syncWithFirebase(fb());
    else window.addEventListener("castellari:firebase-ready", (e) => syncWithFirebase(e.detail), { once: true });
  });
})();
