const { initializeApp } = require("firebase-admin/app");
const { FieldValue, Timestamp, getFirestore } = require("firebase-admin/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");

initializeApp();

const db = getFirestore();
const REGION = "southamerica-east1";
const DEFAULT_OPEN_DAYS = [1, 2, 3, 4, 5, 6];
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

async function enforceRateLimit(uid, action, maxCalls) {
  const ref = db.doc(`callRateLimits/${uid}_${action}`);
  const now = Date.now();

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const data = snap.exists ? snap.data() : {};
    const windowStartedAt = data.windowStartedAt && data.windowStartedAt.toMillis();
    const count = Number(data.count) || 0;

    if (!windowStartedAt || now - windowStartedAt >= RATE_LIMIT_WINDOW_MS) {
      transaction.set(ref, {
        windowStartedAt: Timestamp.fromMillis(now),
        count: 1,
      });
      return;
    }

    if (count >= maxCalls) {
      throw new HttpsError("resource-exhausted", "Muitas tentativas. Aguarde alguns minutos e tente novamente.");
    }

    transaction.update(ref, { count: count + 1 });
  });
}

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Entre na sua conta para continuar.");
  }
  return request.auth.uid;
}

function requiredText(value, field, maxLength) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new HttpsError("invalid-argument", `O campo ${field} é inválido.`);
  }
  return value.trim();
}

function dateInManaus(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function parseDate(dateIso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null;
  const date = new Date(`${dateIso}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateIso) return null;
  return date;
}

function parseClock(value, field) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new HttpsError("failed-precondition", `Configure ${field} no painel antes de receber reservas.`);
  }
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function slotId(dateIso, barberId, time) {
  return `${dateIso}__${barberId}__${time.replace(":", "-")}`;
}

function formatClock(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

async function getSchedule() {
  const snap = await db.doc("settings/barbershop").get();
  const settings = snap.exists ? snap.data() : {};
  const openingTime = settings.openingTime || "09:00";
  const closingTime = settings.closingTime || "20:00";
  const interval = Number(settings.slotIntervalMinutes || 60);
  const openDays = Array.isArray(settings.openDays) ? settings.openDays : DEFAULT_OPEN_DAYS;
  const openMinute = parseClock(openingTime, "o horário de abertura");
  const closeMinute = parseClock(closingTime, "o horário de fechamento");

  if (![15, 30, 60].includes(interval) || closeMinute <= openMinute ||
      !openDays.length || openDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new HttpsError("failed-precondition", "A agenda da barbearia está configurada incorretamente.");
  }

  return { openMinute, closeMinute, interval, openDays };
}

exports.createBooking = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimit(uid, "booking", 5);
  const data = request.data || {};
  const dateIso = requiredText(data.dateIso, "data", 10);
  const time = requiredText(data.time, "horário", 5);
  const clientName = requiredText(data.clientName, "nome", 120);
  const clientPhone = requiredText(data.clientPhone, "WhatsApp", 25);
  const serviceIds = Array.isArray(data.serviceIds) ? data.serviceIds : [];
  const requestedBarberId = requiredText(data.barberId, "profissional", 80);

  if (serviceIds.length < 1 || serviceIds.length > 15 ||
      serviceIds.some((id) => typeof id !== "string" || !id || id.length > 80) ||
      new Set(serviceIds).size !== serviceIds.length) {
    throw new HttpsError("invalid-argument", "Selecione serviços válidos, sem repetição.");
  }

  const date = parseDate(dateIso);
  if (!date || dateIso <= dateInManaus()) {
    throw new HttpsError("invalid-argument", "Escolha uma data futura válida.");
  }
  const horizon = new Date(`${dateInManaus()}T12:00:00.000Z`);
  horizon.setUTCDate(horizon.getUTCDate() + 30);
  if (dateIso > horizon.toISOString().slice(0, 10)) {
    throw new HttpsError("invalid-argument", "Escolha uma data dentro dos próximos 30 dias.");
  }
  const phoneDigits = clientPhone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (![10, 11].includes(phoneDigits.length)) {
    throw new HttpsError("invalid-argument", "Informe um WhatsApp com DDD válido.");
  }
  const schedule = await getSchedule();
  if (!schedule.openDays.includes(date.getUTCDay())) {
    throw new HttpsError("failed-precondition", "A barbearia não abre nessa data.");
  }

  const startMinute = parseClock(time, "o horário de atendimento");
  if (startMinute < schedule.openMinute ||
      (startMinute - schedule.openMinute) % schedule.interval !== 0) {
    throw new HttpsError("invalid-argument", "Esse horário não está disponível.");
  }

  const serviceRefs = serviceIds.map((id) => db.doc(`services/${id}`));
  const serviceDocs = await db.getAll(...serviceRefs);
  if (serviceDocs.some((snap) => !snap.exists || snap.data().active === false)) {
    throw new HttpsError("failed-precondition", "Um dos serviços não está mais disponível.");
  }
  const services = serviceDocs.map((snap) => snap.data());
  if (services.some((service) => !Number.isFinite(Number(service.price)) || Number(service.price) < 0 ||
      !Number.isInteger(Number(service.duration)) || Number(service.duration) < 1)) {
    throw new HttpsError("failed-precondition", "Um dos serviços está com preço ou duração inválidos.");
  }
  const totalPrice = services.reduce((sum, service) => sum + Number(service.price), 0);
  const totalDuration = services.reduce((sum, service) => sum + Number(service.duration), 0);
  if (!Number.isFinite(totalPrice) || totalPrice < 0 ||
      !Number.isFinite(totalDuration) || totalDuration < 1 || totalDuration > 480) {
    throw new HttpsError("failed-precondition", "Os serviços selecionados têm dados inválidos.");
  }

  const endMinute = startMinute + Math.ceil(totalDuration / schedule.interval) * schedule.interval;
  if (endMinute > schedule.closeMinute) {
    throw new HttpsError("failed-precondition", "O atendimento ultrapassaria o horário de fechamento.");
  }

  let barberDocs;
  if (requestedBarberId === "sem-preferencia") {
    const snap = await db.collection("barbers").get();
    barberDocs = snap.docs
      .filter((doc) => doc.id !== "sem-preferencia" && doc.data().active !== false)
      .sort((a, b) => (a.data().order || 999) - (b.data().order || 999));
  } else {
    const barberSnap = await db.doc(`barbers/${requestedBarberId}`).get();
    barberDocs = barberSnap.exists && barberSnap.data().active !== false ? [barberSnap] : [];
  }
  if (!barberDocs.length) {
    throw new HttpsError("failed-precondition", "Não há profissional disponível para essa reserva.");
  }

  const blocks = [];
  for (let minute = startMinute; minute < endMinute; minute += schedule.interval) {
    blocks.push(formatClock(minute));
  }

  const appointmentRef = db.collection("appointments").doc();
  const profileRef = db.doc(`users/${uid}`);
  const code = `CST-${appointmentRef.id.slice(0, 5).toUpperCase()}`;
  const result = await db.runTransaction(async (transaction) => {
    const profileSnap = await transaction.get(profileRef);
    let chosen = null;
    for (const barberDoc of barberDocs) {
      const barberId = barberDoc.id;
      const refs = blocks.map((blockTime) => db.doc(`availability/${slotId(dateIso, barberId, blockTime)}`));
      const snapshots = [];
      for (const ref of refs) snapshots.push(await transaction.get(ref));
      if (snapshots.every((snap) => !snap.exists)) {
        chosen = { barberId, barber: barberDoc.data(), refs };
        break;
      }
    }
    if (!chosen) {
      throw new HttpsError("already-exists", "Este horário acabou de ser reservado. Escolha outro.");
    }

    const serviceNames = services.map((service) => String(service.name || "Serviço"));
    const barberName = String(chosen.barber.name || "Profissional");
    const slotIds = chosen.refs.map((ref) => ref.id);
    transaction.create(appointmentRef, {
      code,
      clientUid: uid,
      clientEmail: request.auth.token.email || "",
      clientName,
      clientPhone,
      serviceIds,
      serviceNames,
      requestedBarberId,
      barberId: chosen.barberId,
      barberName,
      dateIso,
      dateFull: date.toLocaleDateString("pt-BR", { timeZone: "UTC", dateStyle: "full" }),
      time,
      totalPrice,
      totalDuration,
      status: "pending",
      slotId: slotIds[0],
      slotIds,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (profileSnap.exists) {
      transaction.set(profileRef, {
        name: clientName,
        phone: clientPhone,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      transaction.create(profileRef, {
        name: clientName,
        email: request.auth.token.email || "",
        phone: clientPhone,
        photoURL: request.auth.token.picture || "",
        visitsCount: 0,
        clubPlan: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    chosen.refs.forEach((ref, index) => {
      transaction.create(ref, {
        dateIso,
        barberId: chosen.barberId,
        time: blocks[index],
        status: "booked",
      });
    });

    return { id: appointmentRef.id, code, barberId: chosen.barberId, barberName, totalPrice, totalDuration };
  });

  return result;
});

exports.createPlanRequest = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request);
  await enforceRateLimit(uid, "planRequest", 5);
  const data = request.data || {};
  const planId = requiredText(data.planId, "plano", 80);
  const clientName = requiredText(data.clientName, "nome", 120);
  const clientPhone = requiredText(data.clientPhone, "WhatsApp", 25);
  const phoneDigits = clientPhone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (![10, 11].includes(phoneDigits.length)) {
    throw new HttpsError("invalid-argument", "Informe um WhatsApp com DDD válido.");
  }

  const planRef = db.doc(`plans/${planId}`);
  const profileRef = db.doc(`users/${uid}`);
  const requestRef = db.collection("planRequests").doc();
  const result = await db.runTransaction(async (transaction) => {
    const planSnap = await transaction.get(planRef);
    const profileSnap = await transaction.get(profileRef);
    if (!planSnap.exists || planSnap.data().active === false) {
      throw new HttpsError("failed-precondition", "Este plano não está mais disponível.");
    }
    const plan = planSnap.data();
    if (!Number.isFinite(Number(plan.price)) || Number(plan.price) < 0) {
      throw new HttpsError("failed-precondition", "Este plano está com um valor inválido.");
    }
    const slots = Number(plan.slots);
    if (!Number.isInteger(slots) || slots < 0) {
      throw new HttpsError("failed-precondition", "Este plano está com a quantidade de vagas inválida.");
    }
    const planName = String(plan.name || "Plano");
    const waitlist = slots === 0 || plan.badge === "Esgotado";
    if (!waitlist) {
      transaction.update(planRef, {
        slots: slots - 1,
        ...(slots === 1 ? { badge: "Esgotado" } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    transaction.create(requestRef, {
      clientUid: uid,
      clientEmail: request.auth.token.email || "",
      clientName,
      clientPhone,
      planId,
      planName,
      planPrice: Number(plan.price),
      waitlist,
      capacityReserved: !waitlist,
      previousBadge: plan.badge || null,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });
    if (profileSnap.exists) {
      transaction.set(profileRef, { name: clientName, phone: clientPhone, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    } else {
      transaction.create(profileRef, {
        name: clientName,
        email: request.auth.token.email || "",
        phone: clientPhone,
        photoURL: request.auth.token.picture || "",
        visitsCount: 0,
        clubPlan: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return { id: requestRef.id, planName };
  });
  return result;
});

exports.updatePlanRequestStatus = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request);
  const adminSnap = await db.doc(`admins/${uid}`).get();
  if (!adminSnap.exists) throw new HttpsError("permission-denied", "Somente administradores podem atualizar solicitações de plano.");

  const requestId = requiredText(request.data && request.data.requestId, "solicitação", 120);
  const status = requiredText(request.data && request.data.status, "status", 20);
  if (!["confirmed", "cancelled"].includes(status)) {
    throw new HttpsError("invalid-argument", "Status de solicitação inválido.");
  }

  const requestRef = db.doc(`planRequests/${requestId}`);
  await db.runTransaction(async (transaction) => {
    const requestSnap = await transaction.get(requestRef);
    if (!requestSnap.exists) throw new HttpsError("not-found", "Solicitação não encontrada.");
    const planRequest = requestSnap.data();
    if (planRequest.status === "cancelled" ||
        (status === "confirmed" && planRequest.status !== "pending")) {
      throw new HttpsError("failed-precondition", "Essa solicitação não pode receber esse status.");
    }

    let planSnap = null;
    let planRef = null;
    if (status === "confirmed" && (planRequest.waitlist || !planRequest.capacityReserved)) {
      planRef = db.doc(`plans/${planRequest.planId}`);
      planSnap = await transaction.get(planRef);
      if (!planSnap.exists) throw new HttpsError("not-found", "Plano não encontrado.");
      const plan = planSnap.data();
      const slots = Number(plan.slots);
      if (!Number.isInteger(slots) || slots < 1 || plan.badge === "Esgotado") {
        throw new HttpsError("resource-exhausted", "Não há vaga disponível para confirmar esta solicitação.");
      }
      transaction.update(planRef, {
        slots: slots - 1,
        ...(slots === 1 ? { badge: "Esgotado" } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(requestRef, {
        status,
        waitlist: false,
        capacityReserved: true,
        previousBadge: plan.badge || null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    if (status === "cancelled" && planRequest.capacityReserved) {
      planRef = db.doc(`plans/${planRequest.planId}`);
      planSnap = await transaction.get(planRef);
      if (planSnap.exists) {
        const plan = planSnap.data();
        const slots = Number(plan.slots);
        if (!Number.isInteger(slots) || slots < 0) {
          throw new HttpsError("failed-precondition", "Este plano está com a quantidade de vagas inválida.");
        }
        const nextSlots = slots + 1;
        transaction.update(planRef, {
          slots: nextSlots,
          ...(plan.badge === "Esgotado" ? { badge: planRequest.previousBadge || null } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    transaction.update(requestRef, { status, updatedAt: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});

exports.cancelClientAppointment = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request);
  const appointmentId = requiredText(request.data && request.data.appointmentId, "agendamento", 120);
  const appointmentRef = db.doc(`appointments/${appointmentId}`);

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(appointmentRef);
    if (!snap.exists || snap.data().clientUid !== uid) {
      throw new HttpsError("not-found", "Agendamento não encontrado.");
    }
    const appointment = snap.data();
    if (!["pending", "confirmed"].includes(appointment.status)) {
      throw new HttpsError("failed-precondition", "Este agendamento não pode mais ser cancelado.");
    }
    const slotIds = Array.isArray(appointment.slotIds)
      ? appointment.slotIds
      : appointment.slotId ? [appointment.slotId] : [];
    transaction.update(appointmentRef, { status: "cancelled", updatedAt: FieldValue.serverTimestamp() });
    slotIds.forEach((id) => {
      const slotRef = db.doc(`availability/${id}`);
      transaction.delete(slotRef);
    });
  });
  return { ok: true };
});

exports.updateAppointmentStatus = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request);
  const adminSnap = await db.doc(`admins/${uid}`).get();
  if (!adminSnap.exists) throw new HttpsError("permission-denied", "Somente administradores podem atualizar a agenda.");
  const appointmentId = requiredText(request.data && request.data.appointmentId, "agendamento", 120);
  const status = requiredText(request.data && request.data.status, "status", 20);
  if (!["confirmed", "completed", "cancelled"].includes(status)) {
    throw new HttpsError("invalid-argument", "Status de agendamento inválido.");
  }

  const appointmentRef = db.doc(`appointments/${appointmentId}`);
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(appointmentRef);
    if (!snap.exists) throw new HttpsError("not-found", "Agendamento não encontrado.");
    const appointment = snap.data();
    if (["cancelled", "completed"].includes(appointment.status) ||
        (status === "confirmed" && appointment.status !== "pending")) {
      throw new HttpsError("failed-precondition", "Esse agendamento não pode receber esse status.");
    }

    transaction.update(appointmentRef, { status, updatedAt: FieldValue.serverTimestamp() });
    if (status === "completed" && appointment.clientUid) {
      transaction.set(db.doc(`users/${appointment.clientUid}`), {
        visitsCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    if (status === "cancelled") {
      const slotIds = Array.isArray(appointment.slotIds)
        ? appointment.slotIds
        : appointment.slotId ? [appointment.slotId] : [];
      slotIds.forEach((id) => {
        const slotRef = db.doc(`availability/${id}`);
        transaction.delete(slotRef);
      });
    }
  });
  return { ok: true };
});

exports.migrateLegacyData = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request);
  const adminSnap = await db.doc(`admins/${uid}`).get();
  if (!adminSnap.exists) throw new HttpsError("permission-denied", "Somente administradores podem migrar a agenda.");

  const snapshot = await db.collection("availability").get();
  const legacy = snapshot.docs.filter((doc) => doc.data().clientUid || doc.data().appointmentId);
  let migratedSlots = 0;
  for (let offset = 0; offset < legacy.length; offset += 200) {
    const batch = db.batch();
    legacy.slice(offset, offset + 200).forEach((doc) => {
      batch.update(doc.ref, {
        clientUid: FieldValue.delete(),
        appointmentId: FieldValue.delete(),
      });
      migratedSlots += 1;
    });
    await batch.commit();
  }

  const promoSnapshot = await db.collection("promotions").get();
  const legacyPromos = promoSnapshot.docs.filter((doc) =>
    doc.data().target !== "email" && typeof doc.data().targetEmail === "string" && doc.data().targetEmail.trim()
  );
  let sanitizedPromos = 0;
  for (let offset = 0; offset < legacyPromos.length; offset += 400) {
    const batch = db.batch();
    legacyPromos.slice(offset, offset + 400).forEach((doc) => {
      batch.update(doc.ref, { targetEmail: FieldValue.delete() });
      sanitizedPromos += 1;
    });
    await batch.commit();
  }

  return { migratedSlots, sanitizedPromos };
});
