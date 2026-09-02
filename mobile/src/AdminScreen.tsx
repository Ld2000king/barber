import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OutlineButton, PageHeader, Screen } from './components';
import { colors, ui } from './theme';
import { Appointment, ShopRecord, UserRecord } from './types';
import { secondsOf } from './utils';

type ShopView = {
  id: string;
  name: string;
  code: string;
  owner?: UserRecord;
  appointments: Appointment[];
  clients: number;
  lastActivity: number;
};

export function AdminScreen({ users, businesses, appointments, busyUid, onStatus, onSignOut }: {
  users: UserRecord[];
  businesses: ShopRecord[];
  appointments: Appointment[];
  busyUid: string;
  onStatus: (user: UserRecord, status: 'approved' | 'suspended' | 'rejected') => void;
  onSignOut: () => void;
}) {
  const shops = useMemo<ShopView[]>(() => {
    const owners = new Map(users.filter((u) => u.role === 'barber').map((u) => [u.shopId, u]));
    const businessMap = new Map(businesses.map((b) => [b.shopId, b]));
    const ids = new Set([...owners.keys(), ...businessMap.keys(), ...appointments.map((a) => a.shopId).filter(Boolean)]);
    return [...ids].map((id) => {
      const owner = owners.get(id);
      const business = businessMap.get(id);
      const rows = appointments.filter((a) => a.shopId === id);
      const clients = new Set(rows.map((a) => a.clientPhone).filter(Boolean)).size;
      const lastActivity = Math.max(secondsOf(business?.updatedAt), ...rows.map(() => 0));
      return { id, name: business?.business?.name || owner?.shopName || id, code: business?.barberCode || owner?.barberCode || '—', owner, appointments: rows, clients, lastActivity };
    }).sort((a, b) => b.lastActivity - a.lastActivity || a.name.localeCompare(b.name));
  }, [users, businesses, appointments]);

  const pending = shops.filter((s) => s.owner?.status === 'pending');
  const active = shops.filter((s) => !s.owner?.status || s.owner.status === 'approved');
  const suspended = shops.filter((s) => s.owner?.status === 'suspended');
  const clientCount = new Set(appointments.map((a) => a.clientPhone).filter(Boolean)).size;

  return (
    <Screen>
      <PageHeader title="ניהול מערכת" subtitle={`${shops.length} מספרות · ${clientCount} לקוחות · ${appointments.length} תורים`} />
      <View style={styles.kpis}>
        <Kpi value={active.length} label="מספרות פעילות" />
        <Kpi value={pending.length} label="ממתינות לאישור" />
        <Kpi value={suspended.length} label="מושבתות" />
        <Kpi value={appointments.filter((a) => a.status !== 'cancelled').length} label="תורים פעילים" />
      </View>
      {pending.length ? <Text style={styles.sectionTitle}>בקשות שממתינות לאישור</Text> : null}
      {pending.map((shop) => <ShopCard key={shop.id} shop={shop} busy={busyUid === shop.owner?.uid} onStatus={onStatus} />)}
      <Text style={styles.sectionTitle}>כל המספרות</Text>
      {shops.map((shop) => <ShopCard key={shop.id} shop={shop} busy={busyUid === shop.owner?.uid} onStatus={onStatus} />)}
      <OutlineButton title="יציאה מפאנל הניהול" onPress={onSignOut} />
    </Screen>
  );
}

function Kpi({ value, label }: { value: number; label: string }) {
  return <View style={styles.kpi}><Text style={styles.kpiValue}>{value}</Text><Text style={styles.kpiLabel}>{label}</Text></View>;
}

function ShopCard({ shop, busy, onStatus }: { shop: ShopView; busy: boolean; onStatus: (user: UserRecord, status: 'approved' | 'suspended' | 'rejected') => void }) {
  const status = shop.owner?.status || 'approved';
  return <View style={ui.card}><View style={styles.shopHead}><View style={styles.shopCopy}><Text style={styles.shopTitle}>{shop.name}</Text><Text style={ui.subtitle}>קוד {shop.code} · {shop.owner?.email || 'ללא בעלים'}</Text><Text style={ui.subtitle}>{shop.clients} לקוחות · {shop.appointments.length} תורים</Text></View><Text style={[styles.badge, status === 'approved' ? styles.ok : status === 'pending' ? styles.pending : status === 'suspended' ? styles.warn : styles.bad]}>{status === 'approved' ? 'פעילה' : status === 'pending' ? 'ממתינה' : status === 'suspended' ? 'מושבתת' : 'נדחתה'}</Text></View>{shop.owner ? <View style={styles.actions}>{status === 'pending' ? <><Action title="אישור" dark disabled={busy} onPress={() => onStatus(shop.owner!, 'approved')} /><Action title="דחייה" disabled={busy} onPress={() => onStatus(shop.owner!, 'rejected')} /></> : status === 'approved' ? <Action title="השבתת מספרה" disabled={busy} onPress={() => onStatus(shop.owner!, 'suspended')} /> : <Action title="הפעלת מספרה" dark disabled={busy} onPress={() => onStatus(shop.owner!, 'approved')} />}</View> : null}</View>;
}

function Action({ title, onPress, disabled, dark = false }: { title: string; onPress: () => void; disabled: boolean; dark?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.action, dark && styles.actionDark, disabled && styles.disabled]}><Text style={[styles.actionText, dark && styles.actionTextDark]}>{title}</Text></Pressable>;
}

const styles = StyleSheet.create({
  kpis: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 9 },
  kpi: { width: '48.5%', minHeight: 92, borderRadius: 18, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { color: colors.steelDeep, fontSize: 27, fontWeight: '900' },
  kpiLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', writingDirection: 'rtl', marginTop: 4 },
  sectionTitle: { ...ui.rtl, fontSize: 18, fontWeight: '900', marginTop: 24, marginBottom: 10 },
  shopHead: { flexDirection: 'row-reverse', gap: 10, alignItems: 'flex-start' },
  shopCopy: { flex: 1 }, shopTitle: { ...ui.rtl, fontSize: 17, fontWeight: '900', marginBottom: 3 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 10, fontWeight: '900', overflow: 'hidden', writingDirection: 'rtl' },
  ok: { color: '#1c6b43', backgroundColor: '#e3f3ea' }, pending: { color: '#33506a', backgroundColor: '#e7eef5' }, warn: { color: '#8a5a12', backgroundColor: '#fcefdc' }, bad: { color: colors.danger, backgroundColor: '#f7e4e2' },
  actions: { flexDirection: 'row-reverse', gap: 8, marginTop: 13 }, action: { minHeight: 40, borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }, actionDark: { backgroundColor: colors.navy, borderColor: colors.navy }, actionText: { color: colors.ink, fontWeight: '900', writingDirection: 'rtl' }, actionTextDark: { color: colors.white }, disabled: { opacity: 0.45 },
});
