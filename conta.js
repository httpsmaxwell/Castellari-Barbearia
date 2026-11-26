import {
  cancelClientAppointment,
  checkIsAdmin,
  ensureUserProfile,
  formatFirebaseError,
  getEligiblePromotions,
  getUserAppointments,
  getUserPlanRequests,
  getUserProfile,
  logout,
  onAuthChange,
  registerWithEmail,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  updateOwnProfile,
} from "./castellari-firebase.js?v=8";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const STATUS_LABELS = {
  pending: "Aguardando confirmação",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

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

function initAuthTabs() {
  const loginForm = $("#login-form");
  const registerForm = $("#register-form");
  const feedback = $("#auth-feedback");
  $$("[data-auth-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.authTab;
      $$("[data-auth-tab]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      loginForm.hidden = mode !== "login";
      registerForm.hidden = mode !== "register";
      showFeedback(feedback, "");
    });
  });
}

function renderAppointments(items, currentUser) {
  const container = $("#client-appointments-list");
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<p class="empty-state">Você ainda não possui agendamentos registrados.</p>';
    return;
  }

  container.innerHTML = items.map((item) => {
    const canCancel = item.status === "pending" || item.status === "confirmed";
    const repeatUrl = "agendar.html?" + [
      item.serviceIds && item.serviceIds[0] ? "service=" + encodeURIComponent(item.serviceIds[0]) : "",
      item.barberId ? "barber=" + encodeURIComponent(item.barberId) : "",
    ].filter(Boolean).join("&");

    return `
      <article class="record-card">
        <div class="record-head">
          <div>
            <span class="record-code">${escapeHTML(item.code || item.id.slice(0, 8).toUpperCase())}</span>
            <h3>${escapeHTML((item.serviceNames || []).join(", ") || "Atendimento")}</h3>
          </div>
          <span class="status-pill status-${escapeHTML(item.status || "pending")}">${escapeHTML(STATUS_LABELS[item.status] || item.status)}</span>
        </div>
        <p class="record-meta">${escapeHTML(item.dateFull || item.dateIso)} às ${escapeHTML(item.time)} · Profissional: ${escapeHTML(item.barberName || "Sem preferência")} · <strong>${money(item.totalPrice)}</strong></p>
        <div class="record-actions">
          <a class="button button-small button-outline" href="${repeatUrl}">Repetir atendimento</a>
          ${canCancel ? `<button type="button" class="button button-small button-outline" data-cancel-appt="${escapeHTML(item.id)}" data-slot-id="${escapeHTML(item.slotId || "")}">Cancelar horário</button>` : ""}
        </div>
      </article>
    `;
  }).join("");

  container.querySelectorAll("[data-cancel-appt]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Cancelando...";
      try {
        await cancelClientAppointment(btn.dataset.cancelAppt, btn.dataset.slotId);
        const updated = await getUserAppointments(currentUser.uid);
        renderAppointments(updated, currentUser);
      } catch (err) {
        btn.disabled = false;
        btn.textContent = "Cancelar horário";
        alert(formatFirebaseError(err));
      }
    });
  });
}

function renderPromotions(promos) {
  const container = $("#client-promotions-list");
  if (!container) return;
  if (!promos.length) {
    container.innerHTML = '<p class="empty-state">Nenhuma promoção específica ativa para o seu perfil no momento.</p>';
    return;
  }
  container.innerHTML = promos.map((p) => `
    <article class="record-card">
      <div class="record-head">
        <h3>${escapeHTML(p.title)}</h3>
        ${p.code ? `<span class="record-code">${escapeHTML(p.code)}</span>` : ""}
      </div>
      <p class="record-meta">${escapeHTML(p.description || "")}</p>
    </article>
  `).join("");
}

function renderPlanRequests(items) {
  const container = $("#client-plan-requests");
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<p class="empty-state">Nenhuma solicitação de plano enviada.</p>';
    return;
  }
  container.innerHTML = items.map((r) => `
    <article class="record-card">
      <div class="record-head">
        <h3>${escapeHTML(r.planName)}</h3>
        <span class="status-pill status-${escapeHTML(r.status || "pending")}">${escapeHTML(r.waitlist ? "Lista de espera" : (STATUS_LABELS[r.status] || r.status))}</span>
      </div>
      <p class="record-meta">${money(r.planPrice)} / mês</p>
    </article>
  `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  initAuthTabs();
  const authFeedback = $("#auth-feedback");
  const profileFeedback = $("#profile-feedback");
  let activeUser = null;

  $("#google-login-btn")?.addEventListener("click", async () => {
    showFeedback(authFeedback, "");
    try {
      await signInWithGoogle();
    } catch (err) {
      showFeedback(authFeedback, formatFirebaseError(err), true);
    }
  });

  $("#login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showFeedback(authFeedback, "");
    try {
      await signInWithEmail($("#login-email").value, $("#login-password").value);
    } catch (err) {
      showFeedback(authFeedback, formatFirebaseError(err), true);
    }
  });

  $("#register-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showFeedback(authFeedback, "");
    try {
      await registerWithEmail({
        name: $("#reg-name").value,
        phone: $("#reg-phone").value,
        email: $("#reg-email").value,
        password: $("#reg-password").value,
      });
    } catch (err) {
      showFeedback(authFeedback, formatFirebaseError(err), true);
    }
  });

  $("#forgot-password-btn")?.addEventListener("click", async () => {
    const email = $("#login-email").value.trim();
    if (!email) {
      showFeedback(authFeedback, "Digite seu e-mail acima para receber o link de redefinição.", true);
      return;
    }
    try {
      await resetPassword(email);
      showFeedback(authFeedback, "E-mail de recuperação enviado para " + email + ".");
    } catch (err) {
      showFeedback(authFeedback, formatFirebaseError(err), true);
    }
  });

  $("#profile-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeUser) return;
    showFeedback(profileFeedback, "");
    try {
      await updateOwnProfile(activeUser.uid, {
        name: $("#profile-name").value,
        phone: $("#profile-phone").value,
      });
      showFeedback(profileFeedback, "Dados atualizados com sucesso.");
    } catch (err) {
      showFeedback(profileFeedback, formatFirebaseError(err), true);
    }
  });

  $("#logout-btn")?.addEventListener("click", () => logout());

  onAuthChange(async (user) => {
    activeUser = user;
    const authView = $("#account-auth-view");
    const dashboard = $("#account-dashboard");
    const adminBanner = $("#admin-shortcut-banner");

    if (!user) {
      authView.hidden = false;
      dashboard.hidden = true;
      adminBanner.hidden = true;
      $("#account-hero-title").textContent = "Sua conta Castellari";
      $("#account-hero-lead").textContent = "Entre com Google ou e-mail para acompanhar seus agendamentos, histórico e promoções.";
      return;
    }

    authView.hidden = true;
    dashboard.hidden = false;

    try {
      await ensureUserProfile(user);
      const [profile, adminDoc, appointments, planReqs] = await Promise.all([
        getUserProfile(user.uid),
        checkIsAdmin(user.uid),
        getUserAppointments(user.uid),
        getUserPlanRequests(user.uid),
      ]);

      const firstName = ((profile && profile.name) || user.displayName || "Cliente").split(/\s+/)[0];
      $("#account-hero-title").textContent = "Olá, " + firstName;
      $("#account-hero-lead").textContent = "Acompanhe seus atendimentos, dados e vantagens na unidade Planalto.";
      $("#profile-greeting").textContent = (profile && profile.name) || user.displayName || "Cliente";
      $("#profile-name").value = (profile && profile.name) || user.displayName || "";
      $("#profile-phone").value = (profile && profile.phone) || "";
      $("#profile-email").value = user.email || "";

      const visits = (profile && profile.visitsCount) || 0;
      const club = (profile && profile.clubPlan) ? " · Clube: " + profile.clubPlan : "";
      $("#profile-stats").textContent = `${visits} atendimento(s) concluído(s)${club}`;

      adminBanner.hidden = !adminDoc;

      const promos = await getEligiblePromotions(user, profile);
      renderPromotions(promos);
      renderAppointments(appointments, user);
      renderPlanRequests(planReqs);
    } catch (err) {
      showFeedback(profileFeedback, formatFirebaseError(err), true);
    }
  });
});
