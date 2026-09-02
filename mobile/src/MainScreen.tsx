import { useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BottomNav, Field, OutlineButton, PageHeader, PrimaryButton, Screen, Sheet } from './components';
import { dayNames } from './constants';
import { colors, ui } from './theme';
import { Appointment, Business, PriceItem, Product, Schedule, Session, Tab } from './types';
import { dateKey, generateSlots, money, slotId } from './utils';

type Props = {
  session: Session;
  business: Business;
  prices: PriceItem[];
  products: Product[];
  gallery: string[];
  schedule: Schedule;
  appointments: Appointment[];
  occupiedIds: Set<string>;
  barberCode: string;
  onSaveContent: (value: Record<string, unknown>) => Promise<void>;
  onBook: (value: { service: string; date: string; time: string; clientName?: string; clientPhone?: string }) => Promise<boolean>;
  onCancel: (appointment: Appointment) => Promise<void>;
  onSignOut: () => void;
  notify: (text: string) => void;
};

export function MainScreen(props: Props) {
  const [tab, setTab] = useState<Tab>('home');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const { session, business } = props;

  const openExternal = async (url: string, fallback: string) => {
    try { await Linking.openURL(url); } catch { props.notify(fallback); }
  };

  return (
    <View style={ui.flex}>
      {tab === 'home' ? (
        <Screen>
          <View style={styles.topBar}>
            <Image source={require('../assets/barbers-logo.png')} style={styles.miniLogo} resizeMode="contain" />
            <Text numberOfLines={1} style={styles.shopName}>{business.name}</Text>
            <Pressable onPress={session.role === 'barber' ? () => setManageOpen(true) : props.onSignOut}><Text style={styles.manage}>{session.role === 'barber' ? 'ניהול' : 'יציאה'}</Text></Pressable>
          </View>
          <Hero image={props.gallery[0]} />
          <View style={styles.quickRow}>
            <Quick icon="⌖" label="איך מגיעים" onPress={() => openExternal(`https://waze.com/ul?q=${encodeURIComponent(business.mapQuery)}&navigate=yes`, 'לא הצלחנו לפתוח ניווט')} />
            <Quick icon="◷" label="שעות פעילות" onPress={() => props.notify(business.hours)} />
            <Quick icon="⌕" label="דברו איתנו" onPress={() => business.phone ? openExternal(`tel:${business.phone}`, 'לא הצלחנו לפתוח חיוג') : props.notify('מספר הטלפון יעודכן בקרוב')} />
          </View>
          <View style={styles.welcome}>
            <Text style={styles.welcomeTitle}>{session.role === 'barber' ? 'המספרה שלך מוכנה' : business.tagline}</Text>
            <Text style={styles.welcomeText}>{session.role === 'barber' ? `${props.appointments.filter((a) => a.status !== 'cancelled').length} תורים במערכת · אפשר לנהל הכול מכאן.` : 'בחרו שירות, יום ושעה פנויה — והתור נכנס מיד ליומן.'}</Text>
            <PrimaryButton title={session.role === 'barber' ? 'פתיחת מערכת התורים' : 'קביעת תור'} onPress={() => session.role === 'barber' ? setTab('appointments') : setBookingOpen(true)} />
          </View>
          {props.gallery[1] ? <Pressable style={styles.feature} onPress={() => setTab('gallery')}><Image source={{ uri: props.gallery[1] }} style={styles.featureImage} /><View style={styles.featureCopy}><Text style={ui.eyebrow}>העבודות שלנו</Text><Text style={styles.featureTitle}>קצת עלינו</Text><Text style={ui.subtitle}>הציצו בגלריה והכירו את הסגנון שלנו.</Text></View></Pressable> : null}
          <SectionTitle title="מה מתאים לך?" action="לכל המחירון" onAction={() => setTab('prices')} />
          {props.prices.slice(0, 3).map((item) => <ServiceRow key={item.id} item={item} />)}
          {props.gallery.length ? <><SectionTitle title="העבודות האחרונות" action="לכל הגלריה" onAction={() => setTab('gallery')} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stories}>{props.gallery.map((uri, index) => <Pressable key={`${uri.slice(0, 25)}-${index}`} onPress={() => setTab('gallery')}><Image source={{ uri }} style={styles.story} /></Pressable>)}</ScrollView></> : null}
        </Screen>
      ) : null}

      {tab === 'prices' ? <PricesScreen prices={props.prices} onBook={() => setBookingOpen(true)} /> : null}
      {tab === 'gallery' ? <GalleryScreen gallery={props.gallery} businessName={business.name} /> : null}
      {tab === 'products' ? <ProductsScreen products={props.products} /> : null}
      {tab === 'appointments' ? <AppointmentsScreen role={session.role} appointments={props.appointments} onCancel={props.onCancel} onBook={() => setBookingOpen(true)} /> : null}

      <BottomNav tab={tab} role={session.role} onTab={setTab} />
      <BookingSheet {...props} visible={bookingOpen} onClose={() => setBookingOpen(false)} />
      {session.role === 'barber' ? <ManageSheet {...props} visible={manageOpen} onClose={() => setManageOpen(false)} /> : null}
    </View>
  );
}

function Hero({ image }: { image?: string }) {
  return <View style={styles.hero}>{image ? <Image source={{ uri: image }} style={styles.heroImage} /> : <Image source={require('../assets/og.jpg')} style={styles.heroImage} />}<View style={styles.heroShade} /></View>;
}

function Quick({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return <Pressable style={styles.quick} onPress={onPress}><Text style={styles.quickIcon}>{icon}</Text><Text style={styles.quickLabel}>{label}</Text></Pressable>;
}

function SectionTitle({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return <View style={styles.sectionHeader}><View><Text style={ui.eyebrow}>BARBERS</Text><Text style={styles.sectionTitle}>{title}</Text></View><Pressable onPress={onAction}><Text style={styles.sectionAction}>{action}</Text></Pressable></View>;
}

function ServiceRow({ item }: { item: PriceItem }) {
  return <View style={styles.serviceRow}><View style={styles.serviceCopy}><Text style={styles.serviceTitle}>{item.name}</Text><Text style={styles.serviceNote}>{item.note}</Text></View><Text style={styles.servicePrice}>{money(item.price)}</Text></View>;
}

function PricesScreen({ prices, onBook }: { prices: PriceItem[]; onBook: () => void }) {
  return <Screen><PageHeader title="מחירון" subtitle="כל השירותים, בלי הפתעות" />{prices.map((item, index) => <View style={ui.card} key={item.id}><View style={styles.listRow}><Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text><View style={styles.serviceCopy}><Text style={styles.serviceTitle}>{item.name}</Text><Text style={styles.serviceNote}>{item.note}</Text></View><Text style={styles.servicePrice}>{money(item.price)}</Text></View></View>)}<PrimaryButton title="קביעת תור" onPress={onBook} /></Screen>;
}

function GalleryScreen({ gallery, businessName }: { gallery: string[]; businessName: string }) {
  return <Screen><PageHeader title="הגלריה" subtitle={`תיק העבודות של ${businessName}`} /><View style={styles.galleryGrid}>{gallery.map((uri, index) => <Image key={`${uri.slice(0, 25)}-${index}`} source={{ uri }} style={styles.galleryImage} />)}</View>{!gallery.length ? <Text style={styles.empty}>עוד אין כאן תמונות</Text> : null}</Screen>;
}

function ProductsScreen({ products }: { products: Product[] }) {
  return <Screen><PageHeader title="המוצרים שלנו" subtitle="להמשיך את הלוק גם בבית" />{products.map((item) => <View style={styles.productCard} key={item.id}>{item.image ? <Image source={{ uri: item.image }} style={styles.productImage} /> : <View style={styles.productPlaceholder}><Text style={styles.productLetter}>{item.name.slice(0, 1)}</Text></View>}<View style={styles.productCopy}><Text style={styles.serviceTitle}>{item.name}</Text><Text style={styles.serviceNote}>{item.description}</Text><Text style={styles.servicePrice}>{money(item.price)}</Text></View></View>)}</Screen>;
}

function AppointmentsScreen({ role, appointments, onCancel, onBook }: { role: 'barber' | 'client'; appointments: Appointment[]; onCancel: (a: Appointment) => void; onBook: () => void }) {
  return <Screen><PageHeader title={role === 'barber' ? 'יומן התורים' : 'התורים שלי'} subtitle={role === 'barber' ? 'ניהול כל התורים במספרה' : 'צפייה וביטול תורים'} /><PrimaryButton title={role === 'barber' ? '＋ קביעת תור עבור לקוח' : 'קביעת תור חדש'} onPress={onBook} />{appointments.map((item) => <View key={item.id} style={[ui.card, styles.appointment, item.status === 'cancelled' && styles.cancelled]}><View style={styles.appointmentDate}><Text style={styles.appointmentTime}>{item.time}</Text><Text style={styles.appointmentDay}>{item.date}</Text></View><View style={styles.appointmentCopy}><Text style={styles.serviceTitle}>{item.service}</Text><Text style={styles.serviceNote}>{role === 'barber' ? `${item.clientName || 'לקוח'} · ${item.clientPhone}` : item.status === 'cancelled' ? 'התור בוטל' : 'התור נקבע ביומן'}</Text></View><Pressable disabled={item.status === 'cancelled'} onPress={() => onCancel(item)}><Text style={styles.cancelText}>ביטול</Text></Pressable></View>)}{!appointments.length ? <Text style={styles.empty}>אין תורים כרגע</Text> : null}</Screen>;
}

function BookingSheet(props: Props & { visible: boolean; onClose: () => void }) {
  const days = useMemo(() => Array.from({ length: 14 }, (_, index) => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + index); return { key: dateKey(date), dayIndex: date.getDay(), dayName: dayNames[date.getDay()], label: `${date.getDate()}/${date.getMonth() + 1}` }; }).filter((d) => props.schedule.days[d.dayIndex]?.enabled), [props.schedule]);
  const [date, setDate] = useState(days[0]?.key || '');
  const [time, setTime] = useState('');
  const [service, setService] = useState(props.prices[0]?.name || '');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const selected = days.find((d) => d.key === date) || days[0];
  const slots = selected ? generateSlots(props.schedule.days[selected.dayIndex]) : [];

  const submit = async () => {
    if (!selected || !time) return props.notify('בחרו יום ושעה פנויה');
    const ok = await props.onBook({ service, date: selected.key, time, clientName, clientPhone });
    if (ok) { setTime(''); props.onClose(); }
  };

  return <Sheet visible={props.visible} title="קביעת תור" onClose={props.onClose}>
    {props.session.role === 'barber' ? <><Field label="שם הלקוח" value={clientName} onChangeText={setClientName} /><Field label="טלפון הלקוח" value={clientPhone} onChangeText={setClientPhone} keyboardType="phone-pad" /></> : null}
    <Text style={ui.label}>בחרו שירות</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>{props.prices.map((item) => <Pressable key={item.id} style={[styles.pill, service === item.name && styles.pillActive]} onPress={() => setService(item.name)}><Text style={[styles.pillText, service === item.name && styles.pillTextActive]}>{item.name} · {money(item.price)}</Text></Pressable>)}</ScrollView>
    <Text style={ui.label}>בחרו יום</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>{days.map((item) => <Pressable key={item.key} style={[styles.day, selected?.key === item.key && styles.dayActive]} onPress={() => { setDate(item.key); setTime(''); }}><Text style={[styles.daySmall, selected?.key === item.key && styles.dayTextActive]}>{item.dayName}</Text><Text style={[styles.dayStrong, selected?.key === item.key && styles.dayTextActive]}>{item.label}</Text></Pressable>)}</ScrollView>
    <Text style={ui.label}>בחרו שעה</Text>
    <View style={styles.timeGrid}>{slots.map((value) => { const busy = props.occupiedIds.has(slotId(props.session.shopId, selected?.key || '', value)); return <Pressable disabled={busy} key={value} style={[styles.time, busy && styles.timeBusy, time === value && styles.timeSelected]} onPress={() => setTime(value)}><Text style={[styles.timeText, busy && styles.timeBusyText]}>{value}</Text><Text style={[styles.timeStatus, busy && styles.timeBusyText]}>{busy ? 'תפוס' : 'פנוי'}</Text></Pressable>; })}</View>
    <PrimaryButton title="קביעת התור ביומן" disabled={!time} onPress={submit} />
  </Sheet>;
}

function ManageSheet(props: Props & { visible: boolean; onClose: () => void }) {
  const [section, setSection] = useState<'details' | 'schedule' | 'prices' | 'products' | 'gallery'>('details');
  const [business, setBusiness] = useState(props.business);
  const [schedule, setSchedule] = useState(props.schedule);
  const [prices, setPrices] = useState(props.prices);
  const [products, setProducts] = useState(props.products);
  const [gallery, setGallery] = useState(props.gallery);
  const save = async (value: Record<string, unknown>, message: string) => { try { await props.onSaveContent(value); props.notify(message); } catch { props.notify('לא הצלחנו לשמור את השינויים'); } };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return props.notify('נדרשת הרשאה לגלריית התמונות');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: Math.max(1, 8 - gallery.length), quality: 0.65, base64: true });
    if (result.canceled) return;
    const images = result.assets.filter((asset) => asset.base64).map((asset) => `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`);
    const next = [...gallery, ...images].slice(0, 8); setGallery(next); await save({ gallery: next }, 'התמונות נשמרו בגלריה');
  };

  return <Sheet visible={props.visible} title="ניהול האפליקציה" onClose={props.onClose}>
    <View style={styles.manageTabs}>{([['details', 'פרטים'], ['schedule', 'שעות'], ['prices', 'מחירון'], ['products', 'מוצרים'], ['gallery', 'תמונות']] as const).map(([key, label]) => <Pressable key={key} style={[styles.manageTab, section === key && styles.manageTabActive]} onPress={() => setSection(key)}><Text style={[styles.manageTabText, section === key && styles.manageTabTextActive]}>{label}</Text></Pressable>)}</View>
    {section === 'details' ? <><View style={styles.codeCard}><Text style={styles.codeTitle}>קוד המספרה: {props.barberCode || 'יוצר קוד...'}</Text><Text style={ui.subtitle}>לקוחות מזינים אותו פעם אחת ונשארים משויכים רק למספרה שלך.</Text></View><Field label="שם העסק" value={business.name} onChangeText={(name) => setBusiness({ ...business, name })} /><Field label="משפט פתיחה" value={business.tagline} onChangeText={(tagline) => setBusiness({ ...business, tagline })} /><Field label="טלפון" value={business.phone} onChangeText={(phone) => setBusiness({ ...business, phone })} keyboardType="phone-pad" /><Field label="WhatsApp עם 972" value={business.whatsapp} onChangeText={(whatsapp) => setBusiness({ ...business, whatsapp })} keyboardType="phone-pad" /><Field label="כתובת" value={business.address} onChangeText={(address) => setBusiness({ ...business, address })} /><Field label="כתובת לניווט" value={business.mapQuery} onChangeText={(mapQuery) => setBusiness({ ...business, mapQuery })} /><Field label="שעות פעילות" value={business.hours} onChangeText={(hours) => setBusiness({ ...business, hours })} /><PrimaryButton title="שמירת פרטים" onPress={() => save({ business }, 'פרטי העסק נשמרו')} /></> : null}
    {section === 'schedule' ? <>{Object.entries(schedule.days).map(([key, day]) => <View key={key} style={styles.workday}><View style={styles.workdayHeader}><Text style={styles.workdayTitle}>{dayNames[Number(key)]}</Text><Pressable style={[styles.toggle, day.enabled && styles.toggleOn]} onPress={() => setSchedule({ ...schedule, days: { ...schedule.days, [key]: { ...day, enabled: !day.enabled } } })}><Text style={styles.toggleText}>{day.enabled ? 'פעיל' : 'סגור'}</Text></Pressable></View>{day.enabled ? <View style={styles.workFields}><View style={styles.workField}><Field label="פתיחה" value={day.start} onChangeText={(start) => setSchedule({ ...schedule, days: { ...schedule.days, [key]: { ...day, start } } })} /></View><View style={styles.workField}><Field label="סגירה" value={day.end} onChangeText={(end) => setSchedule({ ...schedule, days: { ...schedule.days, [key]: { ...day, end } } })} /></View><View style={styles.workField}><Field label="תורים" value={String(day.slots)} keyboardType="number-pad" onChangeText={(slots) => setSchedule({ ...schedule, days: { ...schedule.days, [key]: { ...day, slots: Number(slots) || 0 } } })} /></View></View> : null}</View>)}<PrimaryButton title="שמירת שעות" onPress={() => save({ schedule }, 'שעות הפעילות נשמרו')} /></> : null}
    {section === 'prices' ? <><EditablePrices values={prices} onChange={setPrices} /><PrimaryButton title="שמירת מחירון" onPress={() => save({ prices }, 'המחירון נשמר')} /></> : null}
    {section === 'products' ? <><EditableProducts values={products} onChange={setProducts} /><PrimaryButton title="שמירת מוצרים" onPress={() => save({ products }, 'המוצרים נשמרו')} /></> : null}
    {section === 'gallery' ? <><PrimaryButton title={gallery.length >= 8 ? 'הגלריה מלאה' : '＋ בחירת תמונות מהמכשיר'} disabled={gallery.length >= 8} onPress={pickImage} /><View style={styles.galleryEditor}>{gallery.map((uri, index) => <View key={`${uri.slice(0, 20)}-${index}`}><Image source={{ uri }} style={styles.editorImage} /><Pressable style={styles.removeImage} onPress={() => { const next = gallery.filter((_, i) => i !== index); setGallery(next); save({ gallery: next }, 'התמונה הוסרה'); }}><Text style={styles.removeImageText}>×</Text></Pressable></View>)}</View></> : null}
    <OutlineButton title="יציאה מחשבון הספר" onPress={props.onSignOut} />
  </Sheet>;
}

function EditablePrices({ values, onChange }: { values: PriceItem[]; onChange: (values: PriceItem[]) => void }) {
  const update = (index: number, patch: Partial<PriceItem>) => onChange(values.map((item, i) => i === index ? { ...item, ...patch } : item));
  return <>{values.map((item, index) => <View style={ui.card} key={item.id}><Field label="שירות" value={item.name} onChangeText={(name) => update(index, { name })} /><Field label="הערה" value={item.note} onChangeText={(note) => update(index, { note })} /><Field label="מחיר" value={String(item.price)} keyboardType="number-pad" onChangeText={(price) => update(index, { price: Number(price) || 0 })} /><Pressable onPress={() => onChange(values.filter((_, i) => i !== index))}><Text style={styles.deleteText}>מחיקת שירות</Text></Pressable></View>)}<OutlineButton title="＋ הוספת שירות" onPress={() => onChange([...values, { id: `p-${Date.now()}`, name: 'שירות חדש', note: '', price: 0 }])} /></>;
}

function EditableProducts({ values, onChange }: { values: Product[]; onChange: (values: Product[]) => void }) {
  const update = (index: number, patch: Partial<Product>) => onChange(values.map((item, i) => i === index ? { ...item, ...patch } : item));
  return <>{values.map((item, index) => <View style={ui.card} key={item.id}><Field label="מוצר" value={item.name} onChangeText={(name) => update(index, { name })} /><Field label="תיאור" value={item.description} onChangeText={(description) => update(index, { description })} /><Field label="מחיר" value={String(item.price)} keyboardType="number-pad" onChangeText={(price) => update(index, { price: Number(price) || 0 })} /><Pressable onPress={() => onChange(values.filter((_, i) => i !== index))}><Text style={styles.deleteText}>מחיקת מוצר</Text></Pressable></View>)}<OutlineButton title="＋ הוספת מוצר" onPress={() => onChange([...values, { id: `s-${Date.now()}`, name: 'מוצר חדש', description: '', price: 0 }])} /></>;
}

const styles = StyleSheet.create({
  topBar: { height: 58, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }, miniLogo: { width: 40, height: 40 }, shopName: { flex: 1, textAlign: 'center', fontWeight: '900', color: colors.ink }, manage: { color: colors.steelDeep, fontWeight: '900', writingDirection: 'rtl' },
  hero: { height: 255, marginHorizontal: -18, position: 'relative', backgroundColor: colors.steel }, heroImage: { width: '100%', height: '100%', resizeMode: 'cover' }, heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(9,18,22,.18)' },
  quickRow: { flexDirection: 'row-reverse', gap: 9, marginTop: -28, marginBottom: 14 }, quick: { flex: 1, minHeight: 75, borderRadius: 17, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line }, quickIcon: { color: colors.steelDeep, fontSize: 23 }, quickLabel: { color: colors.ink, fontSize: 11, fontWeight: '800', marginTop: 4, writingDirection: 'rtl' },
  welcome: { backgroundColor: colors.paper, borderRadius: 24, padding: 20, marginBottom: 16 }, welcomeTitle: { ...ui.title, fontSize: 26, lineHeight: 33 }, welcomeText: { ...ui.subtitle, marginTop: 6 },
  feature: { ...ui.card, flexDirection: 'row-reverse', padding: 0, overflow: 'hidden', minHeight: 150 }, featureImage: { width: '43%', minHeight: 150, resizeMode: 'cover' }, featureCopy: { flex: 1, padding: 16, justifyContent: 'center' }, featureTitle: { ...ui.rtl, fontSize: 21, fontWeight: '900', marginVertical: 4 },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 }, sectionTitle: { ...ui.rtl, fontSize: 22, fontWeight: '900' }, sectionAction: { color: colors.steelDeep, fontWeight: '900', writingDirection: 'rtl', fontSize: 12 },
  serviceRow: { minHeight: 70, flexDirection: 'row-reverse', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line, gap: 10 }, serviceCopy: { flex: 1 }, serviceTitle: { ...ui.rtl, fontSize: 16, fontWeight: '900' }, serviceNote: { ...ui.subtitle, fontSize: 12 }, servicePrice: { color: colors.steelDeep, fontWeight: '900', fontSize: 15, writingDirection: 'rtl' },
  stories: { gap: 10, paddingBottom: 10 }, story: { width: 126, height: 190, borderRadius: 20, resizeMode: 'cover', borderWidth: 2, borderColor: colors.sand },
  listRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }, number: { width: 38, color: colors.sand, fontSize: 18, fontWeight: '900' },
  galleryGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 9 }, galleryImage: { width: '48.5%', aspectRatio: 0.78, borderRadius: 17, resizeMode: 'cover' }, empty: { ...ui.subtitle, textAlign: 'center', paddingVertical: 70, fontSize: 17 },
  productCard: { ...ui.card, padding: 0, overflow: 'hidden', flexDirection: 'row-reverse' }, productImage: { width: 125, minHeight: 135, resizeMode: 'cover' }, productPlaceholder: { width: 125, minHeight: 135, backgroundColor: colors.steelDeep, alignItems: 'center', justifyContent: 'center' }, productLetter: { color: colors.white, fontWeight: '900', fontSize: 40 }, productCopy: { flex: 1, padding: 16, justifyContent: 'center' },
  appointment: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 0, borderRightWidth: 4, borderRightColor: colors.success }, cancelled: { opacity: 0.55, borderRightColor: colors.danger }, appointmentDate: { width: 76, alignItems: 'center' }, appointmentTime: { fontSize: 20, color: colors.ink, fontWeight: '900' }, appointmentDay: { fontSize: 10, color: colors.muted }, appointmentCopy: { flex: 1 }, cancelText: { color: colors.danger, fontWeight: '900', writingDirection: 'rtl' },
  pills: { gap: 8 }, pill: { borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingVertical: 10, paddingHorizontal: 14 }, pillActive: { backgroundColor: colors.navy, borderColor: colors.navy }, pillText: { color: colors.ink, fontWeight: '700', writingDirection: 'rtl' }, pillTextActive: { color: colors.white },
  days: { gap: 8 }, day: { width: 66, height: 65, borderRadius: 16, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }, dayActive: { backgroundColor: colors.navy }, daySmall: { color: colors.muted, fontSize: 11 }, dayStrong: { color: colors.ink, fontWeight: '900', marginTop: 4 }, dayTextActive: { color: colors.white },
  timeGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 9 }, time: { width: '31%', minHeight: 70, borderRadius: 16, backgroundColor: '#e7f4ed', alignItems: 'center', justifyContent: 'center' }, timeBusy: { backgroundColor: '#f5e5e2', opacity: 0.75 }, timeSelected: { borderWidth: 3, borderColor: colors.sand }, timeText: { color: '#155f40', fontWeight: '900', fontSize: 16 }, timeStatus: { color: '#155f40', fontSize: 10, marginTop: 3 }, timeBusyText: { color: colors.danger },
  manageTabs: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 7, marginBottom: 8 }, manageTab: { minHeight: 40, paddingHorizontal: 13, borderRadius: 12, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }, manageTabActive: { backgroundColor: colors.navy }, manageTabText: { color: colors.ink, fontWeight: '800', writingDirection: 'rtl' }, manageTabTextActive: { color: colors.white }, codeCard: { backgroundColor: colors.paper, borderRadius: 17, padding: 16, marginVertical: 10 }, codeTitle: { ...ui.rtl, fontSize: 17, fontWeight: '900', color: colors.steelDeep },
  workday: { ...ui.card, backgroundColor: colors.paper }, workdayHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }, workdayTitle: { ...ui.rtl, fontWeight: '900', fontSize: 17 }, toggle: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 15, backgroundColor: '#ddd' }, toggleOn: { backgroundColor: '#dcefe4' }, toggleText: { color: colors.ink, fontWeight: '800', writingDirection: 'rtl' }, workFields: { flexDirection: 'row-reverse', gap: 7 }, workField: { flex: 1 },
  deleteText: { color: colors.danger, fontWeight: '800', writingDirection: 'rtl', textAlign: 'right', marginTop: 12 }, galleryEditor: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 9, marginTop: 16 }, editorImage: { width: 100, height: 115, borderRadius: 14 }, removeImage: { position: 'absolute', top: 5, left: 5, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }, removeImageText: { color: colors.white, fontSize: 20, lineHeight: 22 },
});
