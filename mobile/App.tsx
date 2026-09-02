import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, runTransaction, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore';
import { AdminScreen } from './src/AdminScreen';
import { AuthScreen, AuthValues } from './src/AuthScreen';
import { OutlineButton, Screen, Toast } from './src/components';
import { ADMIN_EMAIL, DEFAULT_SHOP_ID, defaultBusiness, defaultPrices, defaultProducts, defaultSchedule } from './src/constants';
import { auth, db } from './src/firebase';
import { MainScreen } from './src/MainScreen';
import { colors, ui } from './src/theme';
import { Appointment, Business, OccupiedSlot, PriceItem, Product, Schedule, Session, ShopRecord, UserRecord } from './src/types';
import { cleanBarberCode, cleanShopId, isEmail, isIsraeliPhone, makeBarberCode, resolveApprovalStatus, slotId } from './src/utils';

type CachedContent = { business: Business; prices: PriceItem[]; products: Product[]; gallery: string[]; schedule: Schedule };

async function notifyAdminOfShopRequest(shopName: string, email: string, phone: string) {
  const serviceId = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY;
  if (!serviceId || !templateId || !publicKey) return;
  await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service_id: serviceId, template_id: templateId, user_id: publicKey, template_params: { to_email: ADMIN_EMAIL, shop_name: shopName, barber_email: email, barber_phone: phone } }),
  }).catch(() => undefined);
}

export default function App() {
  const [authBusy, setAuthBusy] = useState(true);
  const [authError, setAuthError] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [shopId, setShopId] = useState(DEFAULT_SHOP_ID);
  const [barberCode, setBarberCode] = useState('');
  const [business, setBusiness] = useState(defaultBusiness);
  const [prices, setPrices] = useState(defaultPrices);
  const [products, setProducts] = useState(defaultProducts);
  const [gallery, setGallery] = useState<string[]>([]);
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<OccupiedSlot[]>([]);
  const [toast, setToast] = useState('');
  const [adminUsers, setAdminUsers] = useState<UserRecord[]>([]);
  const [adminBusinesses, setAdminBusinesses] = useState<ShopRecord[]>([]);
  const [adminAppointments, setAdminAppointments] = useState<Appointment[]>([]);
  const [busyUid, setBusyUid] = useState('');

  const notify = (text: string) => setToast(text);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2600); return () => clearTimeout(timer); }, [toast]);

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) { setSession(null); setIsAdmin(false); setAuthBusy(false); return; }
    if (user.email?.toLowerCase() === ADMIN_EMAIL) { setIsAdmin(true); setSession(null); setAuthBusy(false); return; }
    try {
      const profile = await getDoc(doc(db, 'users', user.uid));
      if (!profile.exists()) { setAuthBusy(false); return; }
      const data = profile.data();
      const role = data.role === 'barber' ? 'barber' : 'client';
      const activeShop = cleanShopId(String(data.shopId || DEFAULT_SHOP_ID));
      setShopId(activeShop);
      if (data.barberCode) setBarberCode(cleanBarberCode(String(data.barberCode)));
      setSession({ uid: user.uid, email: user.email || '', phone: String(data.phone || ''), role, shopId: activeShop, approvalStatus: resolveApprovalStatus(role, data), shopName: role === 'barber' ? String(data.shopName || '') : undefined });
    } catch { notify('לא הצלחנו לטעון את החשבון'); } finally { setAuthBusy(false); }
  }), []);

  useEffect(() => {
    if (!session || session.role !== 'barber') return;
    return onSnapshot(doc(db, 'users', session.uid), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      setSession((current) => current?.uid === session.uid ? { ...current, approvalStatus: resolveApprovalStatus('barber', data), shopName: String(data.shopName || current.shopName || '') } : current);
    });
  }, [session?.uid, session?.role]);

  useEffect(() => {
    if (!session) return;
    const cacheKey = `barbers-content:${shopId}`;
    AsyncStorage.getItem(cacheKey).then((raw) => { if (!raw) return; try { applyContent(JSON.parse(raw)); } catch { /* Ignore an invalid cache. */ } });
    return onSnapshot(doc(db, 'businesses', shopId), async (snapshot) => {
      if (!snapshot.exists()) {
        if (session.role === 'barber' && session.approvalStatus === 'approved') await createShopForApprovedBarber(session, shopId);
        return;
      }
      const data = snapshot.data() as ShopRecord;
      const next: CachedContent = { business: data.business || defaultBusiness, prices: data.prices || defaultPrices, products: data.products || defaultProducts, gallery: data.gallery || [], schedule: data.schedule || defaultSchedule };
      applyContent(next);
      if (data.barberCode) setBarberCode(cleanBarberCode(data.barberCode));
      await AsyncStorage.setItem(cacheKey, JSON.stringify(next)).catch(() => undefined);
    }, () => notify('לא הצלחנו לטעון את פרטי המספרה'));
  }, [session?.uid, session?.role, session?.approvalStatus, shopId]);

  useEffect(() => {
    if (!session) return;
    const ref = collection(db, 'appointments');
    const source = session.role === 'barber' ? query(ref, where('shopId', '==', shopId)) : query(ref, where('clientId', '==', session.uid), where('shopId', '==', shopId));
    return onSnapshot(source, (snapshot) => {
      const list = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Appointment));
      list.sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
      setAppointments(list);
    }, () => notify('לא הצלחנו לטעון את התורים'));
  }, [session?.uid, session?.role, shopId]);

  useEffect(() => {
    if (!session) return;
    return onSnapshot(query(collection(db, 'availability'), where('shopId', '==', shopId)), (snapshot) => setOccupiedSlots(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as OccupiedSlot))));
  }, [session?.uid, shopId]);

  useEffect(() => {
    if (!isAdmin) return;
    const offUsers = onSnapshot(collection(db, 'users'), (s) => setAdminUsers(s.docs.map((d) => ({ uid: d.id, ...d.data() } as UserRecord))));
    const offBusinesses = onSnapshot(collection(db, 'businesses'), (s) => setAdminBusinesses(s.docs.map((d) => ({ shopId: d.id, ...d.data() } as ShopRecord))));
    const offAppointments = onSnapshot(collection(db, 'appointments'), (s) => setAdminAppointments(s.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment))));
    return () => { offUsers(); offBusinesses(); offAppointments(); };
  }, [isAdmin]);

  const occupiedIds = useMemo(() => new Set([...occupiedSlots.map((slot) => slot.id), ...appointments.filter((item) => item.status !== 'cancelled').map((item) => slotId(shopId, item.date, item.time))]), [occupiedSlots, appointments, shopId]);

  function applyContent(value: Partial<CachedContent>) {
    if (value.business) setBusiness(value.business);
    if (value.prices) setPrices(value.prices);
    if (value.products) setProducts(value.products);
    if (value.gallery) setGallery(value.gallery);
    if (value.schedule) setSchedule(value.schedule);
  }

  async function reserveBarberCode(activeShopId: string) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const code = makeBarberCode();
      try {
        await runTransaction(db, async (transaction) => {
          const codeRef = doc(db, 'barberCodes', code);
          if ((await transaction.get(codeRef)).exists()) throw new Error('shop-code-taken');
          transaction.set(codeRef, { shopId: activeShopId, createdAt: serverTimestamp() });
        });
        return code;
      } catch (error) { if (String((error as Error).message).includes('shop-code-taken')) continue; throw error; }
    }
    throw new Error('shop-code-generation-failed');
  }

  async function createShopForApprovedBarber(activeSession: Session, activeShopId: string) {
    try {
      const code = await reserveBarberCode(activeShopId);
      const initialBusiness = { ...defaultBusiness, name: activeSession.shopName || defaultBusiness.name, tagline: 'ברוכים הבאים למספרה 👋🏻' };
      await setDoc(doc(db, 'businesses', activeShopId), { shopId: activeShopId, barberCode: code, business: initialBusiness, prices: defaultPrices, products: defaultProducts, gallery: [], schedule: defaultSchedule, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await setDoc(doc(db, 'users', activeSession.uid), { barberCode: code, updatedAt: serverTimestamp() }, { merge: true });
      setBarberCode(code);
    } catch { notify('לא הצלחנו ליצור את המספרה'); }
  }

  async function identify(values: AuthValues) {
    const email = values.email.trim().toLowerCase();
    const phone = values.phone.replace(/\D/g, '');
    setAuthError('');
    if (!isEmail(email)) return setAuthError('יש להזין כתובת אימייל תקינה');
    if (values.password.length < 6) return setAuthError('הסיסמה חייבת להכיל לפחות 6 תווים');
    if (email !== ADMIN_EMAIL && !isIsraeliPhone(phone)) return setAuthError('יש להזין מספר טלפון ישראלי תקין');
    if (values.role === 'barber' && values.mode === 'register' && values.shopName.trim().length < 2) return setAuthError('יש להזין שם למספרה');
    if (values.role === 'client' && values.mode === 'register' && cleanBarberCode(values.barberCode).length < 4) return setAuthError('יש להזין את קוד המספרה');
    setAuthBusy(true);
    try {
      if (email === ADMIN_EMAIL) {
        if (values.mode === 'register') await createUserWithEmailAndPassword(auth, email, values.password); else await signInWithEmailAndPassword(auth, email, values.password);
        setIsAdmin(true); return;
      }
      if (values.mode === 'register' && values.role === 'client') {
        const code = cleanBarberCode(values.barberCode);
        const codeSnapshot = await getDoc(doc(db, 'barberCodes', code));
        if (!codeSnapshot.exists()) return setAuthError('קוד המספרה לא נמצא');
        const clientShopId = cleanShopId(String(codeSnapshot.data().shopId || ''));
        const credential = await createUserWithEmailAndPassword(auth, email, values.password);
        await setDoc(doc(db, 'users', credential.user.uid), { email, phone, role: 'client', shopId: clientShopId, barberCode: code, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        setShopId(clientShopId); setSession({ uid: credential.user.uid, email, phone, role: 'client', shopId: clientShopId, approvalStatus: 'approved' });
      } else if (values.mode === 'register') {
        const credential = await createUserWithEmailAndPassword(auth, email, values.password);
        const newShopId = cleanShopId(`${values.shopName}-${credential.user.uid.slice(0, 6)}`);
        await setDoc(doc(db, 'users', credential.user.uid), { email, phone, role: 'barber', shopId: newShopId, shopName: values.shopName.trim(), status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        await setDoc(doc(db, 'shopApprovals', credential.user.uid), { uid: credential.user.uid, email, phone, shopId: newShopId, shopName: values.shopName.trim(), status: 'pending', createdAt: serverTimestamp() });
        await notifyAdminOfShopRequest(values.shopName.trim(), email, phone);
        setShopId(newShopId); setSession({ uid: credential.user.uid, email, phone, role: 'barber', shopId: newShopId, approvalStatus: 'pending', shopName: values.shopName.trim() });
        notify('הבקשה נשלחה לאישור');
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, values.password);
        const profile = await getDoc(doc(db, 'users', credential.user.uid));
        if (!profile.exists()) throw new Error('missing-profile');
        const data = profile.data();
        const actualRole = data.role === 'barber' ? 'barber' : 'client';
        if (actualRole !== values.role) { await firebaseSignOut(auth); throw new Error('wrong-role'); }
        const savedPhone = String(data.phone || '').replace(/\D/g, '');
        if (savedPhone && savedPhone !== phone) { await firebaseSignOut(auth); throw new Error('wrong-phone'); }
        const activeShop = cleanShopId(String(data.shopId || DEFAULT_SHOP_ID));
        setShopId(activeShop); setSession({ uid: credential.user.uid, email, phone: savedPhone || phone, role: actualRole, shopId: activeShop, approvalStatus: resolveApprovalStatus(actualRole, data), shopName: actualRole === 'barber' ? String(data.shopName || '') : undefined });
      }
    } catch (error) {
      const code = String((error as { code?: string; message?: string }).code || (error as Error).message || '');
      setAuthError(code.includes('email-already-in-use') ? 'האימייל כבר רשום' : code.includes('invalid-credential') ? 'האימייל או הסיסמה אינם נכונים' : code.includes('wrong-role') ? 'סוג החשבון שבחרתם אינו מתאים לחשבון' : code.includes('wrong-phone') ? 'מספר הטלפון אינו תואם לחשבון' : code.includes('network-request-failed') ? 'אין חיבור לרשת' : 'לא הצלחנו להשלים את ההתחברות');
    } finally { setAuthBusy(false); }
  }

  async function saveContent(value: Record<string, unknown>) {
    if (!session || session.role !== 'barber') return;
    await setDoc(doc(db, 'businesses', shopId), { ...value, shopId, updatedAt: serverTimestamp() }, { merge: true });
    applyContent(value as Partial<CachedContent>);
  }

  async function book(value: { service: string; date: string; time: string; clientName?: string; clientPhone?: string }) {
    if (!session) return false;
    const phone = session.role === 'barber' ? String(value.clientPhone || '').replace(/\D/g, '') : session.phone;
    if (session.role === 'barber' && (!value.clientName?.trim() || !isIsraeliPhone(phone))) { notify('יש להזין שם ומספר טלפון תקין'); return false; }
    const appointmentRef = doc(collection(db, 'appointments'));
    const currentSlotId = slotId(shopId, value.date, value.time);
    try {
      const batch = writeBatch(db);
      batch.set(appointmentRef, { shopId, clientId: session.role === 'client' ? session.uid : '', clientName: session.role === 'barber' ? value.clientName?.trim() : '', clientPhone: phone, clientEmail: session.role === 'client' ? session.email : '', createdBy: session.role, service: value.service, date: value.date, time: value.time, slotId: currentSlotId, status: 'confirmed', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      batch.set(doc(db, 'availability', currentSlotId), { shopId, date: value.date, time: value.time, status: 'booked', appointmentId: appointmentRef.id, updatedAt: serverTimestamp() });
      await batch.commit(); notify('התור נקבע ונשמר ביומן'); return true;
    } catch { notify('השעה נתפסה — בחרו שעה אחרת'); return false; }
  }

  async function cancelAppointment(item: Appointment) {
    if (!session || item.status === 'cancelled') return;
    try {
      await runTransaction(db, async (transaction) => {
        const appointmentRef = doc(db, 'appointments', item.id);
        const availabilityRef = doc(db, 'availability', slotId(shopId, item.date, item.time));
        transaction.update(appointmentRef, { status: 'cancelled', updatedAt: serverTimestamp() });
        if ((await transaction.get(availabilityRef)).exists()) transaction.delete(availabilityRef);
      });
      notify('התור בוטל והשעה חזרה להיות פנויה');
    } catch { notify('לא הצלחנו לבטל את התור'); }
  }

  async function signOut() { await firebaseSignOut(auth); setSession(null); setIsAdmin(false); setBarberCode(''); }

  async function setShopStatus(user: UserRecord, status: 'approved' | 'suspended' | 'rejected') {
    setBusyUid(user.uid);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', user.uid), { status, updatedAt: serverTimestamp() });
      if (user.status === 'pending') batch.set(doc(db, 'shopApprovals', user.uid), { status, reviewedAt: serverTimestamp() }, { merge: true });
      await batch.commit(); notify(status === 'approved' ? 'המספרה פעילה' : status === 'suspended' ? 'המספרה הושבתה' : 'הבקשה נדחתה');
    } catch { notify('הפעולה נכשלה — בדקו את כללי Firestore'); } finally { setBusyUid(''); }
  }

  let content;
  if (authBusy && !session && !isAdmin) content = <Loading />;
  else if (isAdmin) content = <AdminScreen users={adminUsers} businesses={adminBusinesses} appointments={adminAppointments} busyUid={busyUid} onStatus={setShopStatus} onSignOut={signOut} />;
  else if (!session) content = <AuthScreen busy={authBusy} formError={authError} onSubmit={identify} />;
  else if (session.role === 'barber' && session.approvalStatus !== 'approved') content = <ApprovalScreen session={session} onSignOut={signOut} />;
  else content = <MainScreen session={session} business={business} prices={prices} products={products} gallery={gallery} schedule={schedule} appointments={appointments} occupiedIds={occupiedIds} barberCode={barberCode} onSaveContent={saveContent} onBook={book} onCancel={cancelAppointment} onSignOut={signOut} notify={notify} />;

  return <SafeAreaProvider><StatusBar style="dark" />{content}<Toast text={toast} /></SafeAreaProvider>;
}

function Loading() { return <View style={styles.loading}><Image source={require('./assets/barbers-logo.png')} style={styles.logo} resizeMode="contain" /><ActivityIndicator color={colors.steelDeep} size="large" /><Text style={styles.loadingText}>מתחברים למספרה...</Text></View>; }

function ApprovalScreen({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const copy = session.approvalStatus === 'rejected' ? ['הבקשה נדחתה', 'הבקשה להצטרפות כספר לא אושרה. אפשר לפנות להנהלת האפליקציה לפרטים.'] : session.approvalStatus === 'suspended' ? ['המספרה הושבתה זמנית', 'כל הנתונים שמורים ויחזרו במלואם לאחר הפעלה מחדש.'] : ['הבקשה ממתינה לאישור', 'קיבלנו את הבקשה לפתיחת מספרה. לאחר האישור תיפתח הגישה המלאה.'];
  return <Screen><View style={styles.approval}><Image source={require('./assets/barbers-logo.png')} style={styles.logo} resizeMode="contain" /><Text style={ui.eyebrow}>סטטוס מספרה</Text><Text style={ui.title}>{copy[0]}</Text><Text style={ui.subtitle}>{copy[1]}</Text><OutlineButton title="יציאה" onPress={onSignOut} /></View></Screen>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', gap: 18 },
  logo: { width: 100, height: 100 },
  loadingText: { color: colors.muted, fontWeight: '800', writingDirection: 'rtl' },
  approval: { ...ui.card, marginTop: 70, alignItems: 'stretch', padding: 24, gap: 10 },
});
