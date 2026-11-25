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
import { auth, db, googleProvider } from "./firebase-config.js";

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

export async function getBookedTimesForDay(dateIso, barberId) {
  if (!dateIso || !barberId) return [];
  const q = query(
    collection(db, "availability"),
    where("dateIso", "==", dateIso),
    where("barberId", "==", barberId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data().time).filter(Boolean);
}

export async function createBooking({
  user,
  serviceIds,
  serviceNames,
  barberId,
  barberName,
  dateIso,
  dateFull,
  time,
  totalPrice,
  totalDuration,
  clientName,
  clientPhone,
}) {
  if (!user) throw new Error("Faça login para confirmar o agendamento.");
  const appointmentRef = doc(collection(db, "appointments"));
  const slotId = makeSlotId(dateIso, barberId, time);
  const slotRef = doc(db, "availability", slotId);
  const code = "CST-" + appointmentRef.id.slice(0, 5).toUpperCase();

  await runTransaction(db, async (tx) => {
    const existingSlot = await tx.get(slotRef);
    if (existingSlot.exists()) {
      throw new Error("SLOT_TAKEN");
    }
    tx.set(appointmentRef, {
      code,
      clientUid: user.uid,
      clientEmail: user.email || "",
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      serviceIds,
      serviceNames,
      barberId,
      barberName,
      dateIso,
      dateFull,
      time,
      totalPrice: Number(totalPrice),
      totalDuration: Math.round(Number(totalDuration)),
      status: "pending",
      slotId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.set(slotRef, {
      dateIso,
      barberId,
      time,
      appointmentId: appointmentRef.id,
      clientUid: user.uid,
      status: "booked",
      createdAt: serverTimestamp(),
    });
  });

  await ensureUserProfile(user, { name: clientName.trim(), phone: clientPhone.trim() });
  return { id: appointmentRef.id, code };
}

export async function cancelClientAppointment(appointmentId, slotId) {
  const batch = writeBatch(db);
  batch.update(doc(db, "appointments", appointmentId), {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });
  if (slotId) {
    batch.delete(doc(db, "availability", slotId));
  }
  await batch.commit();
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
  const ref = await addDoc(collection(db, "planRequests"), {
    clientUid: user.uid,
    clientEmail: user.email || "",
    clientName: clientName.trim(),
    clientPhone: clientPhone.trim(),
    planId: plan.id,
    planName: plan.name,
    planPrice: Number(plan.price),
    waitlist: plan.slots === 0 || plan.badge === "Esgotado",
    status: "pending",
    createdAt: serverTimestamp(),
  });
  await ensureUserProfile(user, { name: clientName.trim(), phone: clientPhone.trim() });
  return ref.id;
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
  const q = query(collection(db, "promotions"), where("active", "==", true));
  const snap = await getDocs(q);
  const email = (user && user.email ? user.email : "").toLowerCase();
  const visits = profile && typeof profile.visitsCount === "number" ? profile.visitsCount : 0;
  const hasClub = Boolean(profile && profile.clubPlan);

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((promo) => {
      const target = promo.target || "all";
      if (target === "all") return true;
      if (target === "first_visit") return visits === 0;
      if (target === "club") return hasClub;
      if (target === "email") return Boolean(email && String(promo.targetEmail || "").toLowerCase() === email);
      return false;
    });
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
  if (newStatus === "cancelled" && appointment.slotId) {
    batch.delete(doc(db, "availability", appointment.slotId));
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
      hours: "09h às 19h",
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
