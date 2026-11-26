import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { auth, db, googleProvider } from "./firebase-config.js?v=7";

const AUTH_ERROR_MESSAGES = {
  "auth/email-already-in-use": "Este e-mail já está cadastrado. Tente entrar ou recuperar a senha.",
  "auth/invalid-email": "Informe um endereço de e-mail válido.",
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/wrong-password": "Senha incorreta.",
  "auth/user-not-found": "Nenhuma conta encontrada com este e-mail.",
  "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
  "auth/popup-closed-by-user": "O login com Google foi cancelado antes de concluir.",
  "auth/popup-blocked": "O navegador bloqueou a janela de login. Permita pop-ups e tente novamente.",
  "auth/unauthorized-domain": "Este domínio ainda não foi autorizado no Firebase Authentication.",
  "auth/too-many-requests": "Muitas tentativas seguidas. Aguarde alguns instantes.",
};

export function formatFirebaseError(error) {
  const code = error && error.code ? error.code : "";
  if (AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];
  if (error && error.message && error.message.includes("SLOT_TAKEN")) {
    return "Este horário acabou de ser reservado por outro cliente. Escolha outro horário.";
  }
  if (code === "permission-denied") {
    return "Sem permissão para esta operação no Firestore.";
  }
  return (error && error.message) || "Não foi possível concluir a operação agora.";
}

export async function ensureUserProfile(user, extra = {}) {
  if (!user) return null;
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    const payload = {
      name: extra.name || user.displayName || "Cliente",
      email: user.email || "",
      phone: extra.phone || "",
      photoURL: user.photoURL || "",
      visitsCount: 0,
      clubPlan: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(userRef, payload);
    return { id: user.uid, ...payload };
  }

  const updates = { updatedAt: serverTimestamp() };
  let changed = false;
  if (extra.name && extra.name !== snap.data().name) {
    updates.name = extra.name;
    changed = true;
  }
  if (extra.phone !== undefined && extra.phone !== snap.data().phone) {
    updates.phone = extra.phone;
    changed = true;
  }
  if (user.photoURL && user.photoURL !== snap.data().photoURL) {
    updates.photoURL = user.photoURL;
    changed = true;
  }
  if (changed) await updateDoc(userRef, updates);
  return { id: snap.id, ...snap.data(), ...(changed ? updates : {}) };
}

export async function getUserProfile(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateOwnProfile(uid, { name, phone }) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    name: String(name || "").trim(),
    phone: String(phone || "").trim(),
    updatedAt: serverTimestamp(),
  });
  if (auth.currentUser && name) {
    try {
      await updateProfile(auth.currentUser, { displayName: String(name).trim() });
    } catch (_) {}
  }
}

export async function checkIsAdmin(uid) {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, "admins", uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (_) {
    return null;
  }
}

export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function signInWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function registerWithEmail({ name, email, phone, password }) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name) {
    await updateProfile(cred.user, { displayName: name.trim() });
  }
  await ensureUserProfile(cred.user, { name: name.trim(), phone: (phone || "").trim() });
  return cred.user;
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logout() {
  await signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function loadCatalogFromFirestore() {
  try {
    const [servicesSnap, plansSnap, barbersSnap, settingsSnap] = await Promise.all([
      getDocs(collection(db, "services")),
      getDocs(collection(db, "plans")),
      getDocs(collection(db, "barbers")),
      getDoc(doc(db, "settings", "barbershop")),
    ]);

    const sortByOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999);
    const services = servicesSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(sortByOrder);
    const plans = plansSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(sortByOrder);
    const barbers = barbersSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(sortByOrder);
    const settings = settingsSnap.exists() ? settingsSnap.data() : null;

    return {
      services: services.length ? services : null,
      plans: plans.length ? plans : null,
      barbers: barbers.length ? barbers : null,
      settings,
    };
  } catch (_) {
    return { services: null, plans: null, barbers: null, settings: null };
  }
}

export function makeSlotId(dateIso, barberId, time) {
  return `${dateIso}__${barberId}__${time.replace(":", "-")}`;
}

export async function getBookedTimesForDay(dateIso, barberIds, slotTimes) {
  if (!dateIso || !Array.isArray(barberIds) || !Array.isArray(slotTimes)) return [];

  const uniqueBarbers = [...new Set(barberIds.filter(Boolean))];
  const uniqueTimes = [...new Set(slotTimes.filter((time) => /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time)))];
  if (!uniqueBarbers.length) throw new Error("Selecione um profissional para consultar a agenda.");
  const slots = uniqueBarbers.flatMap((barberId) => uniqueTimes.map((time) => ({ barberId, time })));
  if (!slots.length) return [];

  let deniedReads = 0;
  const results = await Promise.all(slots.map(async ({ barberId, time }) => {
    try {
      const snapshot = await getDoc(doc(db, "availability", makeSlotId(dateIso, barberId, time)));
      return snapshot.exists() ? { barberId, time } : null;
    } catch (error) {
      if (error?.code !== "permission-denied") throw error;
      // A locked or legacy slot that cannot be inspected must stay unavailable.
      deniedReads += 1;
      return { barberId, time };
    }
  }));

  if (deniedReads === slots.length) {
    throw new Error("As regras do Firestore não permitiram consultar os horários.");
  }
  return results.filter(Boolean);
}

export async function createBooking({
  user,
  serviceIds,
  barberId,
  dateIso,
  dateFull,
  time,
  clientName,
  clientPhone,
}) {
  if (!user) throw new Error("Faça login para confirmar o agendamento.");
  if (!Array.isArray(serviceIds) || !serviceIds.length || new Set(serviceIds).size !== serviceIds.length) {
    throw new Error("Selecione serviços válidos, sem repetição.");
  }

  const serviceSnapshots = await Promise.all(serviceIds.map((id) => getDoc(doc(db, "services", id))));
  const localServices = window.CastellariData?.SERVICES || [];
  const services = serviceSnapshots.map((snap, index) => {
    if (snap.exists()) {
      const service = snap.data();
      if (service.active === false) throw new Error("Um dos serviços não está mais disponível.");
      return service;
    }

    // The site can use its bundled catalog until the Firestore catalog is imported.
    const fallback = localServices.find((service) => service.id === serviceIds[index]);
    if (!fallback) throw new Error("Um dos serviços não está mais disponível.");
    return fallback;
  });
  const totalPrice = services.reduce((sum, service) => sum + Number(service.price), 0);
  const totalDuration = services.reduce((sum, service) => sum + Number(service.duration), 0);
  if (!Number.isFinite(totalPrice) || totalPrice < 0 || !Number.isInteger(totalDuration) || totalDuration < 1 || totalDuration > 480) {
    throw new Error("Os serviços selecionados têm dados inválidos.");
  }

  const settingsSnap = await getDoc(doc(db, "settings", "barbershop"));
  const settings = settingsSnap.exists() ? settingsSnap.data() : {};
  const interval = [15, 30, 60].includes(Number(settings.slotIntervalMinutes)) ? Number(settings.slotIntervalMinutes) : 60;
  const [startHour, startMinute] = time.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  const end = start + Math.ceil(totalDuration / interval) * interval;
  const [openHour, openMinute] = String(settings.openingTime || "09:00").split(":").map(Number);
  const [closeHour, closeMinute] = String(settings.closingTime || "20:00").split(":").map(Number);
  const opening = openHour * 60 + openMinute;
  const closing = closeHour * 60 + closeMinute;
  const openDays = Array.isArray(settings.openDays) ? settings.openDays : [1, 2, 3, 4, 5, 6];
  const bookingDate = new Date(`${dateIso}T12:00:00.000Z`);
  const todayParts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  const todayIso = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso) || Number.isNaN(bookingDate.getTime()) ||
      bookingDate.toISOString().slice(0, 10) !== dateIso || dateIso <= todayIso ||
      !openDays.includes(bookingDate.getUTCDay()) || start < opening || (start - opening) % interval !== 0 || end > closing) {
    throw new Error("Data ou horário fora da agenda da barbearia.");
  }

  let barberCandidates = [];
  if (barberId === "sem-preferencia") {
    const barbersSnap = await getDocs(collection(db, "barbers"));
    barberCandidates = barbersSnap.docs
      .filter((snap) => snap.id !== "sem-preferencia" && snap.data().active !== false)
      .sort((a, b) => (a.data().order || 999) - (b.data().order || 999))
      .map((snap) => ({ id: snap.id, ...snap.data() }));
  } else {
    const barberSnap = await getDoc(doc(db, "barbers", barberId));
    if (barberSnap.exists() && barberSnap.data().active !== false) {
      barberCandidates = [{ id: barberSnap.id, ...barberSnap.data() }];
    }
  }
  if (!barberCandidates.length) throw new Error("Não há profissional disponível para essa reserva.");

  const blocks = [];
  for (let minute = start; minute < end; minute += interval) {
    blocks.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
  }
  const appointmentRef = doc(collection(db, "appointments"));
  const code = `CST-${appointmentRef.id.slice(0, 5).toUpperCase()}`;
  const result = await runTransaction(db, async (transaction) => {
    let chosen = null;
    for (const barber of barberCandidates) {
      const refs = blocks.map((block) => doc(db, "availability", makeSlotId(dateIso, barber.id, block)));
      const snapshots = [];
      for (const ref of refs) snapshots.push(await transaction.get(ref));
      if (snapshots.every((snap) => !snap.exists())) {
        chosen = { barber, refs };
        break;
      }
    }
    if (!chosen) throw new Error("Este horário acabou de ser reservado. Escolha outro.");

    const slotIds = chosen.refs.map((ref) => ref.id);
    transaction.set(appointmentRef, {
      code,
      clientUid: user.uid,
      clientEmail: user.email || "",
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      serviceIds,
      serviceNames: services.map((service) => String(service.name || "Serviço")),
      requestedBarberId: barberId,
      barberId: chosen.barber.id,
      barberName: String(chosen.barber.name || "Profissional"),
      dateIso,
      dateFull,
      time,
      totalPrice,
      totalDuration,
      status: "pending",
      slotId: slotIds[0],
      slotIds,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    chosen.refs.forEach((ref, index) => transaction.set(ref, {
      dateIso,
      barberId: chosen.barber.id,
      time: blocks[index],
      appointmentId: appointmentRef.id,
      status: "booked",
      createdAt: serverTimestamp(),
    }));
    return { id: appointmentRef.id, code, barberId: chosen.barber.id, barberName: chosen.barber.name, totalPrice, totalDuration };
  });

  try {
    await ensureUserProfile(user, { name: clientName.trim(), phone: clientPhone.trim() });
  } catch (_) {}
  return result;
}

export async function cancelClientAppointment(appointmentId, slotId) {
  const appointmentRef = doc(db, "appointments", appointmentId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(appointmentRef);
    if (!snap.exists()) throw new Error("Agendamento não encontrado.");
    const appointment = snap.data();
    const slotIds = Array.isArray(appointment.slotIds)
      ? appointment.slotIds
      : slotId ? [slotId] : appointment.slotId ? [appointment.slotId] : [];
    transaction.update(appointmentRef, { status: "cancelled", updatedAt: serverTimestamp() });
    slotIds.forEach((id) => transaction.delete(doc(db, "availability", id)));
  });
}

export async function getUserAppointments(uid) {
  const q = query(
    collection(db, "appointments"),
    where("clientUid", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createPlanRequest({ user, plan, clientName, clientPhone }) {
  if (!user) throw new Error("Faça login para registrar seu interesse no plano.");
  const planRef = doc(db, "plans", plan.id);
  const requestRef = doc(collection(db, "planRequests"));
  const planSnap = await getDoc(planRef);
  if (!planSnap.exists() || planSnap.data().active === false) throw new Error("Este plano não está mais disponível.");
  const canonicalPlan = planSnap.data();
  await runTransaction(db, async (transaction) => {
    transaction.set(requestRef, {
      clientUid: user.uid,
      clientEmail: user.email || "",
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      planId: plan.id,
      planName: canonicalPlan.name,
      planPrice: Number(canonicalPlan.price),
      waitlist: Number(canonicalPlan.slots) <= 0 || canonicalPlan.badge === "Esgotado",
      status: "pending",
      createdAt: serverTimestamp(),
    });
  });
  try {
    await ensureUserProfile(user, { name: clientName.trim(), phone: clientPhone.trim() });
  } catch (_) {}
  return requestRef.id;
}

export async function getUserPlanRequests(uid) {
  const q = query(
    collection(db, "planRequests"),
    where("clientUid", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getEligiblePromotions(user, profile) {
  const email = (user && user.email ? user.email : "").toLowerCase();
  const visits = profile && typeof profile.visitsCount === "number" ? profile.visitsCount : 0;
  const hasClub = Boolean(profile && profile.clubPlan);
  const promos = collection(db, "promotions");
  const queries = [query(promos, where("active", "==", true), where("target", "==", "all"))];
  if (email) queries.push(query(
    promos,
    where("active", "==", true),
    where("target", "==", "email"),
    where("targetEmail", "==", email)
  ));
  if (visits === 0) queries.push(query(promos, where("active", "==", true), where("target", "==", "first_visit")));
  if (hasClub) queries.push(query(promos, where("active", "==", true), where("target", "==", "club")));

  const snapshots = await Promise.all(queries.map((item) => getDocs(item)));
  const unique = new Map();
  snapshots.forEach((snapshot) => snapshot.docs.forEach((docSnap) => {
    unique.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
  }));
  return [...unique.values()];
}

// ==========================================================================
// Operações de Administração
// ==========================================================================
export async function getAllAppointments() {
  const q = query(collection(db, "appointments"), orderBy("dateIso", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateAppointmentStatus(appointment, newStatus) {
  const batch = writeBatch(db);
  batch.update(doc(db, "appointments", appointment.id), {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
  if (newStatus === "cancelled") {
    const slotIds = Array.isArray(appointment.slotIds)
      ? appointment.slotIds
      : appointment.slotId ? [appointment.slotId] : [];
    slotIds.forEach((id) => batch.delete(doc(db, "availability", id)));
  }
  if (newStatus === "completed" && appointment.status !== "completed" && appointment.clientUid) {
    batch.update(doc(db, "users", appointment.clientUid), {
      visitsCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function getAllPlanRequests() {
  const q = query(collection(db, "planRequests"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updatePlanRequestStatus(requestId, status) {
  await updateDoc(doc(db, "planRequests", requestId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function getAllPromotions() {
  const snap = await getDocs(collection(db, "promotions"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function savePromotion(promo) {
  if (promo.id) {
    const { id, ...rest } = promo;
    await updateDoc(doc(db, "promotions", id), { ...rest, updatedAt: serverTimestamp() });
    return id;
  }
  const ref = await addDoc(collection(db, "promotions"), { ...promo, createdAt: serverTimestamp() });
  return ref.id;
}

export async function deletePromotion(id) {
  await deleteDoc(doc(db, "promotions", id));
}

export async function saveCatalogItem(colName, id, payload) {
  await setDoc(doc(db, colName, id), { ...payload, updatedAt: serverTimestamp() }, { merge: true });
}

export async function saveShopSettings(settings) {
  await setDoc(doc(db, "settings", "barbershop"), { ...settings, updatedAt: serverTimestamp() }, { merge: true });
}

export async function seedCatalogFromLocal(localData) {
  const batch = writeBatch(db);
  (localData.SERVICES || []).forEach((s, idx) => {
    batch.set(doc(db, "services", s.id), { ...s, order: idx + 1, active: true });
  });
  (localData.PLANS || []).forEach((p, idx) => {
    batch.set(doc(db, "plans", p.id), { ...p, order: idx + 1, active: true });
  });
  (localData.BARBERS || []).forEach((b, idx) => {
    batch.set(doc(db, "barbers", b.id), { ...b, order: idx + 1, active: true });
  });
  batch.set(
    doc(db, "settings", "barbershop"),
    {
      name: "Barbearia Castellari",
      unit: "Planalto · Manaus, AM",
      days: "Segunda a sábado",
      hours: "09h às 20h",
      openingTime: "09:00",
      closingTime: "20:00",
      openDays: [1, 2, 3, 4, 5, 6],
      slotIntervalMinutes: 60,
      catalogVersion: localData.CATALOG_VERSION || 2,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await batch.commit();
}

const api = {
  auth,
  db,
  formatFirebaseError,
  onAuthChange,
  signInWithGoogle,
  signInWithEmail,
  registerWithEmail,
  resetPassword,
  logout,
  ensureUserProfile,
  getUserProfile,
  updateOwnProfile,
  checkIsAdmin,
  loadCatalogFromFirestore,
  getBookedTimesForDay,
  createBooking,
  cancelClientAppointment,
  getUserAppointments,
  createPlanRequest,
  getUserPlanRequests,
  getEligiblePromotions,
  getAllAppointments,
  updateAppointmentStatus,
  getAllPlanRequests,
  updatePlanRequestStatus,
  getAllPromotions,
  savePromotion,
  deletePromotion,
  saveCatalogItem,
  saveShopSettings,
  seedCatalogFromLocal,
};

window.CastellariFirebase = api;
window.dispatchEvent(new CustomEvent("castellari:firebase-ready", { detail: api }));
