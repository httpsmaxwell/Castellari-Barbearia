import {
  checkIsAdmin,
  deletePromotion,
  formatFirebaseError,
  getAllAppointments,
  getAllPlanRequests,
  getAllPromotions,
  loadCatalogFromFirestore,
  logout,
  migrateLegacyData,
  onAuthChange,
  saveCatalogItem,
  savePromotion,
  saveShopSettings,
  seedCatalogFromLocal,
  updateAppointmentStatus,
  updatePlanRequestStatus,
} from "./castellari-firebase.js?v=7";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function money(val) {
  return Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function showFeedback(el, message, isError = false) {
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("is-error", isError);
  el.hidden = !message;
}

const STATUS_LABELS = {
  pending: "Aguardando",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

function initAdminTabs() {
  $$("[data-admin-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.adminTab;
      $$("[data-admin-tab]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      $$("[data-admin-section]").forEach((sec) => {
        sec.hidden = sec.dataset.adminSection !== target;
      });
    });
  });
}

async function refreshAgenda() {
  const filter = $("#admin-status-filter")?.value || "";
  const [appointments, planRequests] = await Promise.all([getAllAppointments(), getAllPlanRequests()]);
  const filtered = filter ? appointments.filter((a) => a.status === filter) : appointments;

  const apptRoot = $("#admin-appointments-list");
  apptRoot.innerHTML = filtered.length
    ? filtered.map((a) => `
      <article class="record-card">
        <div class="record-head">
          <div>
            <span class="record-code">${escapeHTML(a.code || a.id.slice(0, 8))}</span>
            <h3>${escapeHTML(a.clientName)} · ${escapeHTML(a.clientPhone)}</h3>
          </div>
          <span class="status-pill status-${escapeHTML(a.status)}">${escapeHTML(STATUS_LABELS[a.status] || a.status)}</span>
        </div>
        <p class="record-meta">${escapeHTML(a.dateFull || a.dateIso)} às ${escapeHTML(a.time)} · ${escapeHTML(a.barberName)} · ${escapeHTML((a.serviceNames || []).join(", "))} · <strong>${money(a.totalPrice)}</strong></p>
        <div class="record-actions">
          ${a.status === "pending" ? `<button type="button" class="button button-small" data-appt-action="confirmed" data-appt-id="${escapeHTML(a.id)}">Confirmar</button>` : ""}
          ${(a.status === "pending" || a.status === "confirmed") ? `<button type="button" class="button button-small button-outline" data-appt-action="completed" data-appt-id="${escapeHTML(a.id)}">Concluir</button>` : ""}
          ${(a.status === "pending" || a.status === "confirmed") ? `<button type="button" class="button button-small button-outline" data-appt-action="cancelled" data-appt-id="${escapeHTML(a.id)}">Cancelar</button>` : ""}
        </div>
      </article>
    `).join("")
    : '<p class="empty-state">Nenhum agendamento encontrado.</p>';

  apptRoot.querySelectorAll("[data-appt-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const appt = appointments.find((item) => item.id === btn.dataset.apptId);
      if (!appt) return;
      btn.disabled = true;
      try {
        await updateAppointmentStatus(appt, btn.dataset.apptAction);
        await refreshAgenda();
      } catch (err) {
        alert(formatFirebaseError(err));
        btn.disabled = false;
      }
    });
  });

  const reqRoot = $("#admin-plan-requests-list");
  reqRoot.innerHTML = planRequests.length
    ? planRequests.map((r) => `
      <article class="record-card">
        <div class="record-head">
          <h3>${escapeHTML(r.clientName)} (${escapeHTML(r.clientPhone)}) — ${escapeHTML(r.planName)}</h3>
          <span class="status-pill status-${escapeHTML(r.status)}">${escapeHTML(r.waitlist ? "Lista de espera" : (STATUS_LABELS[r.status] || r.status))}</span>
        </div>
        <div class="record-actions">
          ${r.status === "pending" ? `<button type="button" class="button button-small" data-req-status="confirmed" data-req-id="${escapeHTML(r.id)}">Marcar atendido</button>` : ""}
          ${r.status !== "cancelled" ? `<button type="button" class="button button-small button-outline" data-req-status="cancelled" data-req-id="${escapeHTML(r.id)}">Arquivar</button>` : ""}
        </div>
      </article>
    `).join("")
    : '<p class="empty-state">Nenhuma solicitação de plano recebida.</p>';

  reqRoot.querySelectorAll("[data-req-status]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await updatePlanRequestStatus(btn.dataset.reqId, btn.dataset.reqStatus);
        await refreshAgenda();
      } catch (err) {
        alert(formatFirebaseError(err));
        btn.disabled = false;
      }
    });
  });
}

async function refreshCatalog() {
  const catalog = await loadCatalogFromFirestore();
  const plans = catalog.plans || [];
  const services = catalog.services || [];

  const plansRoot = $("#admin-plans-list");
  plansRoot.innerHTML = plans.length
    ? plans.map((p) => `
      <article class="record-card">
        <div class="record-head">
          <h3>${escapeHTML(p.name)}</h3>
          <strong>${money(p.price)} / mês</strong>
        </div>
        <div class="form-grid">
          <div class="field"><label>Vagas disponíveis</label><input type="number" min="0" value="${Number(p.slots ?? 0)}" data-plan-slots="${escapeHTML(p.id)}"></div>
          <div class="field"><label>Valor (R$)</label><input type="number" min="0" value="${Number(p.price ?? 0)}" data-plan-price="${escapeHTML(p.id)}"></div>
        </div>
        <div class="record-actions">
          <button type="button" class="button button-small" data-save-plan="${escapeHTML(p.id)}">Salvar plano</button>
        </div>
      </article>
    `).join("")
    : '<p class="empty-state">Catálogo ainda não importado no Firestore. Clique em "Importar catálogo inicial".</p>';

  plansRoot.querySelectorAll("[data-save-plan]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.savePlan;
      const slots = Number($(`[data-plan-slots="${id}"]`).value);
      const price = Number($(`[data-plan-price="${id}"]`).value);
      const originalPlan = (window.CastellariData?.PLANS || []).find((plan) => plan.id === id);
      btn.disabled = true;
      try {
        await saveCatalogItem("plans", id, {
          slots,
          price,
          badge: slots === 0 ? "Esgotado" : (originalPlan?.badge || null),
        });
        showFeedback($("#catalog-admin-feedback"), "Plano atualizado no Firestore.");
      } catch (err) {
        showFeedback($("#catalog-admin-feedback"), formatFirebaseError(err), true);
      } finally {
        btn.disabled = false;
      }
    });
  });

  const srvRoot = $("#admin-services-list");
  srvRoot.innerHTML = services.length
    ? services.map((s) => `
      <article class="record-card">
        <div class="record-head">
          <h3>${escapeHTML(s.name)}</h3>
          <span>${escapeHTML(s.category)} · ${s.duration} min</span>
        </div>
        <div class="form-grid">
          <div class="field"><label>Preço (R$)</label><input type="number" min="0" value="${Number(s.price ?? 0)}" data-srv-price="${escapeHTML(s.id)}"></div>
          <div class="field"><label>Duração (min)</label><input type="number" min="5" value="${Number(s.duration ?? 30)}" data-srv-dur="${escapeHTML(s.id)}"></div>
        </div>
        <div class="record-actions">
          <button type="button" class="button button-small" data-save-srv="${escapeHTML(s.id)}">Salvar serviço</button>
        </div>
      </article>
    `).join("")
    : "";

  srvRoot.querySelectorAll("[data-save-srv]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.saveSrv;
      const price = Number($(`[data-srv-price="${id}"]`).value);
      const duration = Number($(`[data-srv-dur="${id}"]`).value);
      btn.disabled = true;
      try {
        await saveCatalogItem("services", id, { price, duration });
        showFeedback($("#catalog-admin-feedback"), "Serviço atualizado no Firestore.");
      } catch (err) {
        showFeedback($("#catalog-admin-feedback"), formatFirebaseError(err), true);
      } finally {
        btn.disabled = false;
      }
    });
  });

  if (catalog.settings) {
    $("#shop-name").value = catalog.settings.name || "Barbearia Castellari";
    $("#shop-unit").value = catalog.settings.unit || "Planalto · Manaus, AM";
    $("#shop-opening-time").value = catalog.settings.openingTime || "09:00";
    $("#shop-closing-time").value = catalog.settings.closingTime || "20:00";
    $("#shop-open-days").value = (catalog.settings.openDays || [1, 2, 3, 4, 5, 6]).join(",");
  }
}

async function refreshPromos() {
  const promos = await getAllPromotions();
  const root = $("#admin-promos-list");
  root.innerHTML = promos.length
    ? promos.map((p) => `
      <article class="record-card">
        <div class="record-head">
          <div>
            <span class="record-code">${escapeHTML(p.target || "all")}${p.code ? " · " + escapeHTML(p.code) : ""}</span>
            <h3>${escapeHTML(p.title)}</h3>
          </div>
          <span class="status-pill ${p.active ? "status-confirmed" : "status-cancelled"}">${p.active ? "Ativa" : "Inativa"}</span>
        </div>
        <p class="record-meta">${escapeHTML(p.description)}</p>
        <div class="record-actions">
          <button type="button" class="button button-small button-outline" data-toggle-promo="${escapeHTML(p.id)}" data-active="${String(!p.active)}">${p.active ? "Desativar" : "Ativar"}</button>
          <button type="button" class="button button-small button-outline" data-del-promo="${escapeHTML(p.id)}">Excluir</button>
        </div>
      </article>
    `).join("")
    : '<p class="empty-state">Nenhuma promoção cadastrada.</p>';

  root.querySelectorAll("[data-toggle-promo]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await savePromotion({ id: btn.dataset.togglePromo, active: btn.dataset.active === "true" });
      await refreshPromos();
    });
  });

  root.querySelectorAll("[data-del-promo]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await deletePromotion(btn.dataset.delPromo);
      await refreshPromos();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initAdminTabs();
  $("#admin-status-filter")?.addEventListener("change", refreshAgenda);
  $("#admin-logout-btn")?.addEventListener("click", () => logout());
  $("#admin-logout-gate")?.addEventListener("click", () => logout());

  $("#seed-catalog-btn")?.addEventListener("click", async () => {
    const btn = $("#seed-catalog-btn");
    btn.disabled = true;
    try {
      await seedCatalogFromLocal(window.CastellariData || {});
      showFeedback($("#catalog-admin-feedback"), "Catálogo inicial importado para o Firestore!");
      await refreshCatalog();
    } catch (err) {
      showFeedback($("#catalog-admin-feedback"), formatFirebaseError(err), true);
    } finally {
      btn.disabled = false;
    }
  });

  $("#promo-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await savePromotion({
        title: $("#promo-title").value.trim(),
        code: $("#promo-code").value.trim().toUpperCase(),
        target: $("#promo-target").value,
        targetEmail: $("#promo-target").value === "email" ? $("#promo-email").value.trim().toLowerCase() : "",
        description: $("#promo-desc").value.trim(),
        active: true,
      });
      e.target.reset();
      showFeedback($("#promo-feedback"), "Promoção salva com sucesso.");
      await refreshPromos();
    } catch (err) {
      showFeedback($("#promo-feedback"), formatFirebaseError(err), true);
    }
  });

  $("#shop-settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const openDays = $("#shop-open-days").value.split(",").map((value) => Number(value.trim()));
    if (!openDays.length || openDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) || new Set(openDays).size !== openDays.length) {
      showFeedback($("#settings-feedback"), "Informe os dias como números de 0 a 6, sem repetição.", true);
      return;
    }
    const weekdayNames = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
    const daysLabel = openDays.length === 6 && !openDays.includes(0)
      ? "Segunda a sábado"
      : openDays.map((day) => weekdayNames[day]).join(", ");
    const formatHour = (value) => value.replace(":", "h");
    const hoursLabel = `${formatHour($("#shop-opening-time").value)} às ${formatHour($("#shop-closing-time").value)}`;
    try {
      await saveShopSettings({
        name: $("#shop-name").value.trim(),
        unit: $("#shop-unit").value.trim(),
        days: daysLabel,
        hours: hoursLabel,
        openingTime: $("#shop-opening-time").value,
        closingTime: $("#shop-closing-time").value,
        openDays,
        slotIntervalMinutes: 60,
      });
      showFeedback($("#settings-feedback"), "Configurações salvas. A agenda atualiza nas próximas visitas.");
    } catch (err) {
      showFeedback($("#settings-feedback"), formatFirebaseError(err), true);
    }
  });

  $("#migrate-legacy-data-btn")?.addEventListener("click", async (event) => {
    const btn = event.currentTarget;
    btn.disabled = true;
    showFeedback($("#legacy-data-migration-feedback"), "Protegendo os dados antigos...");
    try {
      const result = await migrateLegacyData();
      showFeedback($("#legacy-data-migration-feedback"), `${result.migratedSlots} registro(s) da agenda e ${result.sanitizedPromos} promoções protegidos.`);
    } catch (err) {
      showFeedback($("#legacy-data-migration-feedback"), formatFirebaseError(err), true);
    } finally {
      btn.disabled = false;
    }
  });

  onAuthChange(async (user) => {
    const gate = $("#admin-gate");
    const panel = $("#admin-panel");
    const gateMsg = $("#admin-gate-msg");
    const gateActions = $("#admin-gate-actions");
    const uidBox = $("#admin-uid-box");

    if (!user) {
      gate.hidden = false;
      panel.hidden = true;
      gateActions.hidden = false;
      uidBox.hidden = true;
      gateMsg.textContent = "Faça login com uma conta de administrador autorizada para acessar o painel.";
      return;
    }

    const adminDoc = await checkIsAdmin(user.uid);
    if (!adminDoc) {
      gate.hidden = false;
      panel.hidden = true;
      gateActions.hidden = true;
      uidBox.hidden = false;
      gateMsg.textContent = "Sua conta não está cadastrada como administradora no Firestore.";
      $("#admin-uid-value").textContent = user.uid;
      return;
    }

    gate.hidden = true;
    panel.hidden = false;
    $("#admin-identity").textContent = `Conectado como ${adminDoc.name || user.displayName || user.email} (${user.email}) · Papel: ${adminDoc.role || "Administrador"}`;
    await Promise.all([refreshAgenda(), refreshCatalog(), refreshPromos()]);
  });
});
