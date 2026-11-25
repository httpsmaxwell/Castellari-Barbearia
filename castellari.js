    const SERVICES = [
      // Cortes & Combos
      { id: 'corte-novo', category: 'Cortes & Combos', name: 'Corte Premium (Clientes Novos)', price: 45, duration: 45, includesCut: true, badge: 'Primeira Visita', desc: 'Corte personalizado + lavagem e finalização para novos clientes.' },
      { id: 'corte-premium', category: 'Cortes & Combos', name: 'Corte Premium', price: 60, duration: 45, includesCut: true, desc: 'Corte clássico ou moderno com acabamento na navalha e lavagem.' },
      { id: 'combo-exp', category: 'Cortes & Combos', name: 'Combo Experiência Completa', price: 150, duration: 90, includesCut: true, badge: 'Mais Completo', desc: 'Corte Premium + Barboterapia completa + Hidratação e acabamento.' },
      { id: 'combo-total', category: 'Cortes & Combos', name: 'Combo Cuidado Total', price: 135, duration: 75, includesCut: true, desc: 'Corte + Barba + Sobrancelha e cuidados faciais essenciais.' },
      { id: 'combo-premium', category: 'Cortes & Combos', name: 'Combo Premium', price: 110, duration: 60, includesCut: true, desc: 'Corte Premium + Barboterapia com toalha quente.' },
      { id: 'combo-essencial', category: 'Cortes & Combos', name: 'Combo Essencial', price: 100, duration: 60, includesCut: true, desc: 'Corte + Barba Completa alinhada na navalha.' },
      { id: 'combo-visual', category: 'Cortes & Combos', name: 'Combo Visual Completo', price: 130, duration: 75, includesCut: true, desc: 'Corte + Barba + Sobrancelha + Limpeza facial.' },
      { id: 'combo-rapido', category: 'Cortes & Combos', name: 'Combo Rápido e Eficiente', price: 100, duration: 50, includesCut: true, desc: 'Agilidade sem abrir mão do padrão Castellari.' },
      { id: 'combo-pais', category: 'Cortes & Combos', name: 'Combo Pais em Dia', price: 100, duration: 60, includesCut: true, desc: 'Corte adulto + Corte infantil no mesmo atendimento.' },
      { id: 'corte-infantil', category: 'Cortes & Combos', name: 'Corte Infantil', price: 60, duration: 40, includesCut: true, desc: 'Atendimento cuidadoso e estilizado para crianças.' },
      { id: 'corte-feminino', category: 'Cortes & Combos', name: 'Corte Feminino', price: 70, duration: 60, includesCut: true, desc: 'Corte técnico e finalização personalizada.' },

      // Barba & Terapias
      { id: 'barboterapia', category: 'Barba & Terapias', name: 'Barboterapia', price: 60, duration: 45, includesCut: false, badge: 'Clássico Italiano', desc: 'Toalha quente, massagem facial, óleos essenciais e navalha.' },
      { id: 'barba-completa', category: 'Barba & Terapias', name: 'Barba Completa', price: 50, duration: 35, includesCut: false, desc: 'Modelagem, alinhamento e hidratação pós-barba.' },
      { id: 'terapia-capilar', category: 'Barba & Terapias', name: 'Terapia Capilar (Bálsamo + Shampoo Deep Ice)', price: 70, duration: 40, includesCut: false, desc: 'Refrescância profunda e revitalização do couro cabeludo.' },
      { id: 'terapia-facial', category: 'Barba & Terapias', name: 'Terapia Facial com Extração de Cravos', price: 120, duration: 50, includesCut: false, desc: 'Limpeza profunda de poros e revitalização da pele.' },
      { id: 'esfoliacao-facial', category: 'Barba & Terapias', name: 'Esfoliação Facial Anti Oleosidade', price: 50, duration: 30, includesCut: false, desc: 'Controle de oleosidade e renovação celular.' },
      { id: 'lavagem-acidificante', category: 'Barba & Terapias', name: 'Lavagem Hidratante com Acidificante', price: 60, duration: 30, includesCut: false, desc: 'Equilíbrio de pH e brilho intenso aos fios.' },
      { id: 'hidratacao-capilar', category: 'Barba & Terapias', name: 'Hidratação Capilar', price: 50, duration: 30, includesCut: false, desc: 'Nutrição e maciez imediata para cabelos ressecados.' },

      // Acabamento & Estética
      { id: 'sobrancelha', category: 'Acabamento & Estética', name: 'Sobrancelha (Simples)', price: 30, duration: 20, includesCut: false, desc: 'Limpeza e alinhamento natural na pinça ou navalha.' },
      { id: 'pezinho', category: 'Acabamento & Estética', name: 'Pezinho', price: 25, duration: 15, includesCut: false, desc: 'Acabamento preciso nos contornos e nuca.' },
      { id: 'cera-nariz', category: 'Acabamento & Estética', name: 'Depilação na Cera (Nariz)', price: 30, duration: 15, includesCut: false, desc: 'Remoção rápida, higiênica e confortável.' },
      { id: 'cera-ouvido', category: 'Acabamento & Estética', name: 'Depilação na Cera (Ouvido)', price: 30, duration: 15, includesCut: false, desc: 'Acabamento limpo e seguro.' },
      { id: 'combo-facial-cera', category: 'Acabamento & Estética', name: 'Combo Terapia Facial + Depilação na Cera (Nariz e Ouvido)', price: 150, duration: 60, includesCut: false, desc: 'Cuidado estético facial completo.' },
      { id: 'pigmentacao-barba', category: 'Acabamento & Estética', name: 'Pigmentação de Barba', price: 50, duration: 30, includesCut: false, desc: 'Preenchimento visual e definição de contorno.' },
      { id: 'alinhamento-capilar', category: 'Acabamento & Estética', name: 'Alinhamento Capilar', price: 100, duration: 60, includesCut: false, desc: 'Redução de volume e controle de frizz.' },
      { id: 'platinado', category: 'Acabamento & Estética', name: 'Platinado / Descoloração', price: 180, duration: 120, includesCut: false, desc: 'Descoloração global com proteção dos fios.' },
      { id: 'pintura-capilar', category: 'Acabamento & Estética', name: 'Pintura Capilar', price: 100, duration: 60, includesCut: false, pricePrefix: 'A partir de ', desc: 'Tonalização ou cobertura natural dos fios.' },
      { id: 'micropigmentacao', category: 'Acabamento & Estética', name: 'Preenchimento de Barba (Micropigmentação)', price: 400, duration: 90, includesCut: false, pricePrefix: 'A partir de ', desc: 'Técnica de longa duração para falhas na barba.' },
      { id: 'visagismo', category: 'Acabamento & Estética', name: 'Consultoria de Imagem (Visagismo)', price: 150, duration: 60, includesCut: false, desc: 'Estudo de formato de rosto e estilo ideal.' },
      { id: 'desenho', category: 'Acabamento & Estética', name: 'Desenho (Freestyle)', price: 25, duration: 20, includesCut: false, pricePrefix: 'A partir de ', desc: 'Riscos e arte personalizada no corte.' },

      // Adicionais (UP)
      { id: 'up-sobrancelha', category: 'Adicionais (UP)', name: 'UP - Sobrancelha', price: 20, duration: 15, includesCut: false, desc: 'Adicional promocional para incluir no seu atendimento.' },
      { id: 'up-hidratacao', category: 'Adicionais (UP)', name: 'UP - Hidratação', price: 40, duration: 20, includesCut: false, desc: 'Adicional de hidratação rápida no lavatório.' },
      { id: 'up-corte', category: 'Adicionais (UP)', name: 'UP - Corte', price: 50, duration: 40, includesCut: true, desc: 'Upgrade de corte adicionado ao pacote.' },
      { id: 'up-barboterapia', category: 'Adicionais (UP)', name: 'UP - Barboterapia', price: 50, duration: 35, includesCut: false, desc: 'Upgrade de barboterapia com toalha quente.' },
    ];

    const PLANS = [
      {
        name: 'VIP - Corte + Barboterapia',
        price: 250,
        badge: 'Mais vendido',
        badgeType: 'gold',
        slots: 7,
        days: 'Segunda a Sábado',
        benefits: ['Cortes ilimitados de Seg a Sáb', 'Barboterapia completa ilimitada', 'Prioridade na agenda Planalto', 'Vigência indeterminada sem fidelidade'],
      },
      {
        name: 'VIP - Corte',
        price: 150,
        badge: 'Mais vendido',
        badgeType: 'gold',
        slots: 3,
        days: 'Segunda a Sábado',
        benefits: ['Cortes ilimitados de Seg a Sáb', 'Acabamento e lavagem inclusos', 'Agendamento flexível', 'Vigência indeterminada'],
      },
      {
        name: 'ESSENCIAL - Corte + Barba',
        price: 180,
        badge: 'Esgotado',
        badgeType: 'soldout',
        slots: 0,
        days: 'Segunda a Sábado',
        benefits: ['Cortes e barba de Seg a Sáb', 'Alinhamento clássico na navalha', 'Vagas temporariamente preenchidas', 'Entre na lista de espera'],
      },
      {
        name: 'ESSENCIAL - Corte',
        price: 100,
        badge: null,
        slots: 10,
        days: 'Segunda a Sábado',
        benefits: ['Cortes mensais de Seg a Sáb', 'Atendimento com toda a equipe', 'Excelente custo-benefício', '10 vagas disponíveis'],
      },
      {
        name: 'PROMOCIONAL - Corte + Barba',
        price: 150,
        badge: null,
        slots: 6,
        days: 'Segunda a Quinta',
        benefits: ['Corte + Barba de Seg a Qui', 'Ideal para agenda no início da semana', 'Economia garantida no mês', '6 vagas disponíveis'],
      },
      {
        name: 'PROMOCIONAL - Corte',
        price: 70,
        badge: null,
        slots: 3,
        days: 'Segunda a Quinta',
        benefits: ['Cortes de Segunda a Quinta', 'O plano mais acessível do Clube', 'Sem taxa de adesão', '3 vagas disponíveis'],
      },
    ];

    const BARBERS = [
      { id: 'raquel', name: 'Raquel', initials: 'RQ', featured: true, role: 'Master Barber' },
      { id: 'lucas', name: 'Lucas', initials: 'LC', featured: false, role: 'Barbeiro Clássico' },
      { id: 'felipe', name: 'Felipe', initials: 'FL', featured: false, role: 'Especialista Barba' },
      { id: 'ana-clara', name: 'Ana Clara', initials: 'AC', featured: false, role: 'Visagismo & Corte' },
      { id: 'lucas-alfaia', name: 'Lucas Alfaia', initials: 'LA', featured: false, role: 'Degradê & Acabamento' },
      { id: 'gabriel', name: 'Gabriel', initials: 'GB', featured: false, role: 'Barbeiro' },
      { id: 'sem-preferencia', name: 'Sem preferência', initials: '★', featured: false, role: 'Primeiro disponível' },
    ];


    window.CastellariData = { SERVICES, PLANS, BARBERS };
(function () {
  const data = window.CastellariData || {};
  const SERVICES = data.SERVICES || [];
  const PLANS = data.PLANS || [];
  const BARBERS = data.BARBERS || [];
  const CATEGORIES = [...new Set(SERVICES.map((service) => service.category))];
  const TIME_SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
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
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    $$("[data-theme-toggle]").forEach((button) => {
      button.textContent = theme === "dark" ? "☼" : "☾";
      button.setAttribute("aria-label", theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro");
      button.setAttribute("aria-pressed", String(theme === "dark"));
    });
    try { localStorage.setItem("castellari-theme", theme); } catch (_) {}
  }
  function initTheme() {
    let saved = "light";
    try { saved = localStorage.getItem("castellari-theme") || "light"; } catch (_) {}
    setTheme(saved === "dark" ? "dark" : "light");
    $$("[data-theme-toggle]").forEach((button) => button.addEventListener("click", () => {
      setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    }));
  }
  function initNavigation() {
    const page = document.body.dataset.page;
    $$("[data-nav]").forEach((link) => {
      if (link.dataset.nav === page) link.setAttribute("aria-current", "page");
    });
    const button = $("[data-menu-toggle]");
    const panel = $("#mobile-panel");
    if (!button || !panel) return;
    button.addEventListener("click", () => {
      const opening = !panel.classList.contains("is-open");
      panel.classList.toggle("is-open", opening);
      button.setAttribute("aria-expanded", String(opening));
      button.setAttribute("aria-label", opening ? "Fechar menu" : "Abrir menu");
    });
    $$("a", panel).forEach((link) => link.addEventListener("click", () => {
      panel.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Abrir menu");
    }));
  }

  function serviceCard(service, index) {
    return '<a class="service-card" href="agendar.html?service=' + encodeURIComponent(service.id) + '" aria-label="Escolher ' + escapeHTML(service.name) + '">' +
      '<div class="service-topline"><span class="service-number">' + String(index + 1).padStart(2, "0") + '</span>' +
      (service.badge ? '<span class="service-badge">' + escapeHTML(service.badge) + '</span>' : "") + '</div>' +
      '<h3>' + escapeHTML(service.name) + '</h3><p>' + escapeHTML(service.desc) + '</p>' +
      '<div class="service-bottom"><div class="price"><small>' + service.duration + ' min</small>' + escapeHTML(servicePrice(service)) + '</div>' +
      '<span class="text-link service-choose">Escolher <span aria-hidden="true">→</span></span></div></a>';
  }
  function renderFeaturedServices() {
    const grid = $("#featured-services");
    if (!grid) return;
    const ids = ["corte-premium", "barboterapia", "combo-premium"];
    grid.innerHTML = ids.map((id) => SERVICES.find((service) => service.id === id)).filter(Boolean)
      .map((service, index) => serviceCard(service, index)).join("");
    grid.setAttribute("aria-busy", "false");
  }
  function renderCatalog() {
    const grid = $("#services-grid");
    const categories = $("#category-list");
    const search = $("#service-search");
    const count = $("#service-count");
    if (!grid || !categories) return;
    let active = CATEGORIES[0];
    const draw = () => {
      const query = normalize(search ? search.value.trim() : "");
      const results = SERVICES.filter((service) =>
        (!active || service.category === active) &&
        (!query || normalize(service.name + " " + service.desc).includes(query))
      );
      grid.innerHTML = results.length
        ? results.map((service, index) => serviceCard(service, index)).join("")
        : '<p class="empty-state">Nenhum serviço encontrado. Tente outro termo ou categoria.</p>';
      if (count) count.textContent = results.length + (results.length === 1 ? " serviço" : " serviços");
    };
    categories.innerHTML = CATEGORIES.map((category, index) =>
      '<button type="button" class="category-button" data-category="' + escapeHTML(category) + '" aria-pressed="' + String(index === 0) + '">' + escapeHTML(category) + '</button>'
    ).join("") + '<button type="button" class="category-button" data-category="" aria-pressed="false">Todos</button>';
    $$("[data-category]", categories).forEach((button) => button.addEventListener("click", () => {
      active = button.dataset.category;
      $$("[data-category]", categories).forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      draw();
    }));
    if (search) search.addEventListener("input", draw);
    draw();
    grid.setAttribute("aria-busy", "false");
  }
  function renderPlans() {
    const grid = $("#plans-grid");
    if (!grid) return;
    grid.innerHTML = PLANS.length ? PLANS.map((plan, index) => {
      const soldOut = plan.slots === 0 || plan.badge === "Esgotado";
      const badge = soldOut ? "Lista de espera" : (plan.badge || "Clube Castellari");
      const availability = soldOut ? "Vagas temporariamente preenchidas" : (plan.slots ? plan.slots + " vagas no protótipo" : "Consulte a equipe");
      return '<article class="plan-card ' + (plan.badgeType === "gold" ? "is-featured" : "") + '">' +
        '<span class="plan-status">' + escapeHTML(badge) + '</span><h3>' + escapeHTML(plan.name) + '</h3>' +
        '<p>' + escapeHTML(plan.days) + '</p><div class="plan-price">' + money(plan.price) + '<span> / mês</span></div>' +
        '<ul>' + plan.benefits.map((benefit) => '<li>' + escapeHTML(benefit) + '</li>').join("") + '</ul>' +
        '<p class="plan-availability">' + escapeHTML(availability) + '</p>' +
        '<a class="button ' + (plan.badgeType === "gold" ? "" : "button-outline") + '" href="agendar.html?plano=' + index + '">Tenho interesse <span aria-hidden="true">→</span></a></article>';
    }).join("") : '<p class="empty-state">Nenhum plano disponível.</p>';
    grid.setAttribute("aria-busy", "false");
  }
  function renderTeam() {
    const grid = $("#team-grid");
    if (!grid) return;
    const people = BARBERS.filter((person) => person.id !== "sem-preferencia");
    grid.innerHTML = people.length ? people.map((person) =>
      '<a class="team-card" href="agendar.html?barber=' + encodeURIComponent(person.id) + '">' +
      '<span class="team-monogram" aria-hidden="true">' + escapeHTML(person.initials || initials(person.name)) + '</span>' +
      '<h3>' + escapeHTML(person.name) + '</h3><p>' + escapeHTML(person.role) + '</p>' +
      '<span class="text-link">Agendar com ' + escapeHTML(person.name.split(" ")[0]) + ' <span aria-hidden="true">→</span></span></a>'
    ).join("") : '<p class="empty-state">Nenhum profissional disponível.</p>';
    grid.setAttribute("aria-busy", "false");
  }

  function renderHomePreviews() {
    const plans = $("#home-plan-preview");
    if (plans) {
      plans.innerHTML = PLANS.slice(0, 2).map((plan) =>
        '<a class="home-plan-item" href="planos.html"><span>' + escapeHTML(plan.name) + '</span><strong>' + money(plan.price) + ' / mês</strong></a>'
      ).join("") || '<p class="empty-state">Nenhum plano disponível.</p>';
      plans.setAttribute("aria-busy", "false");
    }
    const team = $("#home-team-preview");
    if (team) {
      const people = BARBERS.filter((person) => person.id !== "sem-preferencia").slice(0, 3);
      team.innerHTML = people.map((person) =>
        '<a class="home-team-item" href="agendar.html?barber=' + encodeURIComponent(person.id) + '"><span class="home-team-monogram" aria-hidden="true">' + escapeHTML(person.initials || initials(person.name)) + '</span><span><strong>' + escapeHTML(person.name) + '</strong><br>' + escapeHTML(person.role) + '</span><span class="text-link">Agendar <span aria-hidden="true">→</span></span></a>'
      ).join("") || '<p class="empty-state">Nenhum profissional disponível.</p>';
      team.setAttribute("aria-busy", "false");
    }
  }

  function localISO(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
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
        full: new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(date)
      });
    }
    return days;
  }
  function initPlanInterest(form) {
    const planParam = new URLSearchParams(location.search).get("plano");
    const index = planParam === null ? NaN : Number(planParam);
    const plan = Number.isInteger(index) ? PLANS[index] : null;
    if (!plan) return;
    $("#booking-workflow").hidden = true;
    const stickyBar = $("#booking-sticky-bar");
    if (stickyBar) stickyBar.hidden = true;
    $("#plan-interest").hidden = false;
    $("#booking-page-title").textContent = "Consulte o Clube Castellari.";
    $("#booking-page-lead").textContent = "Veja os detalhes do plano selecionado e envie uma solicitação demonstrativa.";
    $("#plan-interest-name").textContent = plan.name;
    $("#plan-interest-price").textContent = money(plan.price) + " / mês";
    $("#plan-interest-details").textContent = "A equipe poderá confirmar condições e disponibilidade. Este formulário é apenas demonstrativo.";
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      $("#plan-interest").hidden = true;
      $("#plan-interest-success").hidden = false;
      $("#plan-success-name").textContent = $("#plan-client-name").value.trim().split(/\s+/)[0];
      $("#plan-success-title").textContent = plan.name;
    });
  }
  function initBooking() {
    const form = $("#booking-form");
    const planForm = $("#plan-interest-form");
    if (planForm) initPlanInterest(planForm);
    if (!form || !$("#booking-workflow") || $("#booking-workflow").hidden) return;

    const params = new URLSearchParams(location.search);
    const firstService = params.get("service");
    const firstBarber = params.get("barber");
    const selected = new Set(SERVICES.some((service) => service.id === firstService) ? [firstService] : []);
    let selectedDay = null;
    let selectedTime = null;

    const serviceRoot = $("#booking-services");
    CATEGORIES.forEach((category, index) => {
      const items = SERVICES.filter((service) => service.category === category);
      const section = document.createElement("details");
      section.className = "booking-category";
      section.open = items.some((service) => selected.has(service.id));
      section.innerHTML = '<summary>' + escapeHTML(category) + ' <span>' + items.length + '</span></summary>' +
        '<div class="booking-service-list">' + items.map((service) =>
          '<label class="booking-choice" data-service-option="' + escapeHTML(service.id) + '">' +
          '<input type="checkbox" value="' + escapeHTML(service.id) + '"' + (selected.has(service.id) ? " checked" : "") + '>' +
          '<span><strong>' + escapeHTML(service.name) + '</strong><small class="booking-service-meta"><span class="booking-service-price">' + escapeHTML(servicePrice(service)) + '</span><span class="booking-service-duration">' + service.duration + ' min</span></small></span></label>'
        ).join("") + '</div>';
      serviceRoot.appendChild(section);
    });
    serviceRoot.setAttribute("aria-busy", "false");
    const selectedCount = $("#selected-service-count");
    if (selectedCount) selectedCount.textContent = selected.size + (selected.size === 1 ? " serviço selecionado" : " serviços selecionados");
    function setStepper(activeStep) {
      $$("[data-step-indicator]").forEach((item) => {
        const number = Number(item.dataset.stepIndicator);
        item.classList.toggle("is-complete", number < activeStep);
        if (number === activeStep) item.setAttribute("aria-current", "step");
        else item.removeAttribute("aria-current");
      });
    }
    setStepper(selected.size ? 2 : 1);
    serviceRoot.addEventListener("change", (event) => {
      const input = event.target.closest("input[type=checkbox]");
      if (!input) return;
      if (input.checked) selected.add(input.value); else selected.delete(input.value);
      if (selectedCount) selectedCount.textContent = selected.size + (selected.size === 1 ? " serviço selecionado" : " serviços selecionados");
      updateSummary();
      setStepper(selected.size ? 2 : 1);
    });
    const search = $("#booking-service-search");
    if (search) search.addEventListener("input", () => {
      const query = normalize(search.value);
      $$(".booking-category", serviceRoot).forEach((section) => {
        let visible = 0;
        $$("[data-service-option]", section).forEach((option) => {
          const service = SERVICES.find((item) => item.id === option.dataset.serviceOption);
          const show = !query || normalize(service.name + " " + service.desc).includes(query);
          option.hidden = !show;
          if (show) visible += 1;
        });
        section.hidden = visible === 0;
        if (query && visible) section.open = true;
      });
    });

    const barberSelect = $("#booking-barber");
    barberSelect.innerHTML = BARBERS.map((person) =>
      '<option value="' + escapeHTML(person.id) + '">' + escapeHTML(person.name === "Sem preferência" ? person.name : person.name + " · " + person.role) + '</option>'
    ).join("");
    if (BARBERS.some((person) => person.id === firstBarber)) barberSelect.value = firstBarber;
    else barberSelect.value = "sem-preferencia";

    const dayRoot = $("#booking-days");
    const days = upcomingDays();
    dayRoot.innerHTML = days.map((day) =>
      '<button type="button" class="choice-button" data-day="' + day.iso + '" aria-label="' + escapeHTML(day.full) + '" aria-pressed="false">' + escapeHTML(day.label) + '</button>'
    ).join("");
    dayRoot.setAttribute("aria-busy", "false");
    dayRoot.addEventListener("click", (event) => {
      const button = event.target.closest("[data-day]");
      if (!button) return;
      selectedDay = days.find((day) => day.iso === button.dataset.day);
      $$("[data-day]", dayRoot).forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      updateSummary();
      setStepper(3);
    });

    const timeRoot = $("#booking-times");
    timeRoot.innerHTML = TIME_SLOTS.map((time) =>
      '<button type="button" class="choice-button" data-time="' + time + '" aria-pressed="false">' + time + '</button>'
    ).join("");
    timeRoot.setAttribute("aria-busy", "false");
    timeRoot.addEventListener("click", (event) => {
      const button = event.target.closest("[data-time]");
      if (!button) return;
      selectedTime = button.dataset.time;
      $$("[data-time]", timeRoot).forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      updateSummary();
      setStepper(4);
    });

    const barberSelectUpdate = () => { updateSummary(); setStepper(3); };
    barberSelect.addEventListener("change", barberSelectUpdate);
    $("#client-name").addEventListener("input", () => { updateSummary(); setStepper(4); });
    $("#client-phone").addEventListener("input", () => { updateSummary(); setStepper(4); });

    const continueButton = $("#booking-continue");
    if (continueButton) continueButton.addEventListener("click", () => {
      if (!selected.size) {
        setStepper(1);
        serviceRoot.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (!selectedDay || !selectedTime) {
        setStepper(3);
        (!selectedDay ? dayRoot : timeRoot).scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      setStepper(4);
      $("[data-booking-step=\"4\"]").scrollIntoView({ behavior: "smooth", block: "center" });
      if (form.checkValidity()) form.requestSubmit();
      else form.reportValidity();
    });

    function chosenServices() { return SERVICES.filter((service) => selected.has(service.id)); }
    function updateSummary() {
      const services = chosenServices();
      const total = services.reduce((sum, service) => sum + service.price, 0);
      const duration = services.reduce((sum, service) => sum + service.duration, 0);
      const barber = BARBERS.find((person) => person.id === barberSelect.value);
      $("#summary-services").textContent = services.length ? services.map((service) => service.name).join(", ") : "Selecione um serviço";
      $("#summary-professional").textContent = barber ? barber.name : "Sem preferência";
      $("#summary-date").textContent = selectedDay && selectedTime ? selectedDay.full + " · " + selectedTime : "Escolha data e horário";
      $("#summary-duration").textContent = duration ? duration + " min" : "—";
      $("#summary-total").textContent = money(total);
      const stickyTotal = $("#booking-sticky-total");
      if (stickyTotal) stickyTotal.textContent = money(total);
      $("#booking-error").hidden = true;
    }
    updateSummary();

    form.addEventListener("submit", (event) => {
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
      const barber = BARBERS.find((person) => person.id === barberSelect.value);
      $("#success-name").textContent = $("#client-name").value.trim().split(/\s+/)[0];
      $("#success-services").textContent = chosenServices().map((service) => service.name).join(", ");
      $("#success-date").textContent = selectedDay.full + " às " + selectedTime;
      $("#success-professional").textContent = barber ? barber.name : "Sem preferência";
      $("#success-total").textContent = money(chosenServices().reduce((sum, service) => sum + service.price, 0));
      $("#booking-workflow").hidden = true;
      const stickyBar = $("#booking-sticky-bar");
      if (stickyBar) stickyBar.hidden = true;
      $("#booking-success").hidden = false;
      $("#booking-success").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  function initPhoneMasks() {
    [$("#client-phone"), $("#plan-client-phone")].filter(Boolean).forEach((input) => {
      input.addEventListener("input", () => {
        let digits = input.value.replace(/\D/g, "");
        if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
        digits = digits.slice(0, 11);
        if (digits.length <= 2) input.value = digits ? "(" + digits : "";
        else input.value = "(" + digits.slice(0, 2) + ") " + digits.slice(2, 7) + (digits.length > 7 ? "-" + digits.slice(7) : "");
      });
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initNavigation();
    renderFeaturedServices();
    renderHomePreviews();
    renderCatalog();
    renderPlans();
    renderTeam();
    initBooking();
    initPhoneMasks();
    const year = $("#current-year");
    if (year) year.textContent = String(new Date().getFullYear());
  });
})();
