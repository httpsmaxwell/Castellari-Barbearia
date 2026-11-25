(function () {
  const data = window.CastellariData || {};
  let SERVICES = data.SERVICES || [];
  let PLANS = data.PLANS || [];
  let BARBERS = data.BARBERS || [];
  let CATEGORIES = [...new Set(SERVICES.map((service) => service.category))];
  const TIME_SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
  const BOOKING_STORAGE_KEY = "castellari-booking";
  const THEME_STORAGE_KEY = "castellari-theme";

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
    let saved = "light";
    try {
      saved = localStorage.getItem(THEME_STORAGE_KEY) || "light";
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
    return (
      '<a class="service-card" href="agendar.html?service=' + encodeURIComponent(service.id) + '" aria-label="Escolher ' + escapeHTML(service.name) + '">' +
      '<div class="service-topline"><span class="service-number">' + String(index + 1).padStart(2, "0") + "</span>" +
      (service.badge ? '<span class="service-badge">' + escapeHTML(service.badge) + "</span>" : "") +
      "</div>" +
      "<h3>" + escapeHTML(service.name) + "</h3><p>" + escapeHTML(service.desc) + "</p>" +
      '<div class="service-bottom"><div class="price"><small>' + service.duration + " min</small>" + escapeHTML(servicePrice(service)) + "</div>" +
      '<span class="text-link service-choose">Escolher <span aria-hidden="true">→</span></span></div></a>'
    );
  }

  function renderFeaturedServices() {
    const grid = $("#featured-services");
    if (!grid) return;
    const ids = ["corte-premium", "barboterapia", "combo-premium"];
    const items = ids.map((id) => SERVICES.find((service) => service.id === id)).filter(Boolean);
    grid.innerHTML = items.length
      ? items.map((service, index) => serviceCard(service, index)).join("")
      : '<p class="empty-state">Nenhum serviço em destaque disponível.</p>';
    grid.setAttribute("aria-busy", "false");
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
            : (plan.slots ? plan.slots + " vagas disponíveis" : "Consulte a equipe");
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

  function renderHomePreviews() {
    const plans = $("#home-plan-preview");
    if (plans) {
      plans.innerHTML =
        PLANS.slice(0, 2).map((plan) =>
          '<a class="home-plan-item" href="planos.html"><span>' + escapeHTML(plan.name) + "</span><strong>" + money(plan.price) + " / mês</strong></a>"
        ).join("") || '<p class="empty-state">Nenhum plano disponível.</p>';
      plans.setAttribute("aria-busy", "false");
    }

    const team = $("#home-team-preview");
    if (team) {
      const people = BARBERS.filter((person) => person.id !== "sem-preferencia").slice(0, 3);
      team.innerHTML =
        people.map((person) => {
          const photoHtml = person.photo
            ? '<img class="home-team-photo" src="' + escapeHTML(person.photo) + '" alt="' + escapeHTML(person.name) + '">'
            : '<span class="home-team-monogram" aria-hidden="true">' + escapeHTML(person.initials || initials(person.name)) + "</span>";
          return (
            '<a class="home-team-item" href="agendar.html?barber=' + encodeURIComponent(person.id) + '">' +
            photoHtml +
            "<span><strong>" + escapeHTML(person.name) + "</strong><br>" + escapeHTML(person.role) + "</span>" +
            '<span class="text-link">Agendar <span aria-hidden="true">→</span></span></a>'
          );
        }).join("") || '<p class="empty-state">Nenhum profissional disponível.</p>';
      team.setAttribute("aria-busy", "false");
    }
  }

  function localISO(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function upcomingDays() {
    const days = [];
    const today = new Date();
    for (let offset = 1; days.length < 7 && offset < 15; offset += 1) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
      if (date.getDay() === 0) continue;
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

  function findPlan(param) {
    if (!param) return null;
    const byId = PLANS.find((item) => item.id === param);
    if (byId) return byId;
    const index = Number(param);
    return Number.isInteger(index) ? PLANS[index] || null : null;
  }

  function refreshAuthUIInBooking() {
    const authBox = $("#booking-auth-box");
    const planAuthBox = $("#plan-auth-box");
    const signedInfo = $("#booking-signed-user");
    const nameInput = $("#client-name");
    const phoneInput = $("#client-phone");
    const planNameInput = $("#plan-client-name");
    const planPhoneInput = $("#plan-client-phone");

    if (currentUser) {
      if (authBox) authBox.hidden = true;
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
      if (authBox) authBox.hidden = false;
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

      if (fb() && currentUser) {
        try {
          await fb().createPlanRequest({
            user: currentUser,
            plan,
            clientName: $("#plan-client-name").value,
            clientPhone: phoneInput.value,
          });
          $("#plan-success-note").textContent =
            "Sua solicitação para o plano " + plan.name + " foi registrada. Acompanhe o status em Minha Conta.";
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
    const days = upcomingDays();

    const savedIds = Array.isArray(saved.selectedServiceIds)
      ? saved.selectedServiceIds.filter((id) => SERVICES.some((service) => service.id === id))
      : [];
    const selected = new Set(savedIds);
    if (SERVICES.some((service) => service.id === firstService)) selected.add(firstService);

    let selectedDay = days.find((day) => day.iso === saved.selectedDayIso) || null;
    let selectedTime = TIME_SLOTS.includes(saved.selectedTime) ? saved.selectedTime : null;

    const serviceRoot = $("#booking-services");
    const serviceTabsRoot = $("#booking-service-tabs");
    const selectedChipsRoot = $("#selected-services-chips");
    const searchInput = $("#booking-service-search");
    let activeServiceTab = "featured";

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
      selectedChipsRoot.hidden = false;
      selectedChipsRoot.innerHTML = chosen.map((s) =>
        '<button type="button" class="selected-chip" data-remove-service="' + escapeHTML(s.id) + '" aria-label="Remover ' + escapeHTML(s.name) + '">' +
        escapeHTML(s.name) + ' <span aria-hidden="true">×</span></button>'
      ).join("");
    }

    function renderServiceTabs() {
      if (!serviceTabsRoot) return;
      const tabs = [
        { key: "featured", label: "Em Alta" },
        ...CATEGORIES.map((c) => ({ key: c, label: c })),
        { key: "all", label: "Todos" },
      ];
      serviceTabsRoot.innerHTML = tabs.map((t) =>
        '<button type="button" role="tab" class="service-tab-pill' + (activeServiceTab === t.key ? " is-active" : "") + '" data-service-tab="' + escapeHTML(t.key) + '" aria-selected="' + String(activeServiceTab === t.key) + '">' + escapeHTML(t.label) + "</button>"
      ).join("");
    }

    function renderServiceList() {
      if (!serviceRoot) return;
      const query = searchInput ? normalize(searchInput.value) : "";
      let items = SERVICES;
      if (query) {
        items = SERVICES.filter((s) => normalize(s.name + " " + s.desc + " " + s.category).includes(query));
      } else if (activeServiceTab === "featured") {
        items = SERVICES.filter((s) => s.featured);
        if (!items.length) items = SERVICES.slice(0, 8);
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
    renderSelectedChips();

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
        persistBooking();
        updateSummary();
      });
    }

    const selectedCount = $("#selected-service-count");
    const updateSelectedCount = () => {
      if (selectedCount) {
        selectedCount.textContent = selected.size + (selected.size === 1 ? " serviço selecionado" : " serviços selecionados");
      }
    };
    updateSelectedCount();

    let currentStep = 1;

    function scrollToActiveStep(stepNum) {
      if (!stepNum || stepNum === 1) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setTimeout(() => {
        const targetEl = $(".booking-stepper") || $("#booking-form");
        if (!targetEl) return;
        const header = $(".site-header");
        const offset = (header ? header.offsetHeight : 56) + 12;
        const rect = targetEl.getBoundingClientRect();
        const top = rect.top + (window.pageYOffset || document.documentElement.scrollTop) - offset;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      }, 60);
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

      $$("[data-step-indicator]").forEach((item) => {
        const number = Number(item.dataset.stepIndicator);
        item.classList.toggle("is-complete", number < currentStep);
        if (number === currentStep) item.setAttribute("aria-current", "step");
        else item.removeAttribute("aria-current");
      });

      if (scroll) {
        scrollToActiveStep(currentStep);
      }

      updateSummary();
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
          persistBooking();
          updateSummary();
          refreshAvailability();
          // Auto-avanço para o passo 3 (horário)
          setTimeout(() => goToStep(3), 160);
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
    dayRoot.innerHTML = days.map((day) =>
      '<button type="button" class="choice-button" data-day="' + day.iso + '" aria-label="' + escapeHTML(day.full) + '" aria-pressed="' + String(Boolean(selectedDay && selectedDay.iso === day.iso)) + '">' + escapeHTML(day.label) + "</button>"
    ).join("");
    dayRoot.setAttribute("aria-busy", "false");

    const timeRoot = $("#booking-times");
    let bookedTimes = [];

    function renderTimeButtons() {
      timeRoot.innerHTML = TIME_SLOTS.map((time) => {
        const busy = bookedTimes.includes(time);
        const pressed = !busy && selectedTime === time;
        return '<button type="button" class="choice-button" data-time="' + time + '" aria-pressed="' + String(pressed) + '"' + (busy ? " disabled" : "") + ">" + time + "</button>";
      }).join("");
      timeRoot.setAttribute("aria-busy", "false");
    }
    renderTimeButtons();

    async function refreshAvailability() {
      if (!selectedDay || !fb()) {
        bookedTimes = [];
        renderTimeButtons();
        return;
      }
      try {
        bookedTimes = await fb().getBookedTimesForDay(selectedDay.iso, barberSelect.value);
        if (selectedTime && bookedTimes.includes(selectedTime)) {
          selectedTime = null;
          updateSummary();
        }
        renderTimeButtons();
      } catch (_) {}
    }

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
        if (currentStep === 4) {
          continueBtn.textContent = "Confirmar →";
        } else {
          continueBtn.textContent = "Próximo →";
        }
        continueBtn.disabled = false;
      }

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
      // Auto-avanço para o passo 4 (revisão e confirmação)
      setTimeout(() => goToStep(4), 180);
    });

    barberSelect.addEventListener("change", () => {
      clearBookingAlert();
      renderBarbersGrid();
      persistBooking();
      updateSummary();
      refreshAvailability();
    });
    $("#client-name").addEventListener("input", () => {
      updateSummary();
    });
    $("#client-phone").addEventListener("input", () => {
      updateSummary();
    });

    const bookingGoogleBtn = $("#booking-google-login");
    if (bookingGoogleBtn) {
      bookingGoogleBtn.addEventListener("click", async () => {
        if (!fb()) return;
        try {
          await fb().signInWithGoogle();
        } catch (err) {
          showBookingAlert(fb().formatFirebaseError(err));
        }
      });
    }

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
      populateBarberSelect(barberSelect.value);
      renderBarbersGrid();
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

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
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
      if (phoneInput && !isValidPhone(phoneInput.value)) {
        phoneInput.setCustomValidity("Informe um WhatsApp com DDD (10 ou 11 dígitos).");
        phoneInput.reportValidity();
        return;
      }

      if (fb() && !currentUser) {
        $("#booking-error").hidden = false;
        $("#booking-error").textContent = "Entre com sua conta Google ou e-mail para confirmar o agendamento e salvar no seu histórico.";
        $("#booking-auth-box")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const barber = BARBERS.find((person) => person.id === barberSelect.value);
      const chosen = chosenServices();
      const totalPrice = chosen.reduce((sum, service) => sum + service.price, 0);
      const totalDuration = chosen.reduce((sum, service) => sum + service.duration, 0);
      const submitBtn = $(".submit-booking", form);

      if (fb() && currentUser) {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Confirmando...";
        }
        try {
          const result = await fb().createBooking({
            user: currentUser,
            serviceIds: chosen.map((s) => s.id),
            serviceNames: chosen.map((s) => s.name),
            barberId: barberSelect.value,
            barberName: barber ? barber.name : "Sem preferência",
            dateIso: selectedDay.iso,
            dateFull: selectedDay.full,
            time: selectedTime,
            totalPrice,
            totalDuration,
            clientName: $("#client-name").value,
            clientPhone: phoneInput.value,
          });
          const codeEl = $("#success-code");
          if (codeEl) codeEl.textContent = "Código da reserva: " + result.code + ". Acompanhe em Minha Conta.";
        } catch (err) {
          $("#booking-error").hidden = false;
          $("#booking-error").textContent = fb().formatFirebaseError(err);
          await refreshAvailability();
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Confirmar agendamento →";
          }
          return;
        }
      }

      $("#success-name").textContent = $("#client-name").value.trim().split(/\s+/)[0];
      $("#success-services").textContent = chosen.map((service) => service.name).join(", ");
      $("#success-date").textContent = selectedDay.full + " às " + selectedTime;
      $("#success-professional").textContent = barber ? barber.name : "Sem preferência";
      $("#success-total").textContent = money(totalPrice);

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
    renderFeaturedServices();
    renderHomePreviews();
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
      updateAccountLinks(user);
      currentProfile = user ? await api.getUserProfile(user.uid) : null;
      refreshAuthUIInBooking();
    });

    const remote = await api.loadCatalogFromFirestore();
    let updated = false;
    const remoteVersion = remote.settings && remote.settings.catalogVersion ? Number(remote.settings.catalogVersion) : 1;
    const localVersion = Number(data.CATALOG_VERSION || 1);
    if (remote.services && remoteVersion >= localVersion) {
      SERVICES = remote.services;
      CATEGORIES = [...new Set(SERVICES.map((service) => service.category))];
      updated = true;
    }
    if (remote.plans && remoteVersion >= localVersion) {
      PLANS = remote.plans;
      updated = true;
    }
    if (remote.barbers) {
      BARBERS = remote.barbers.map((rb) => {
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
