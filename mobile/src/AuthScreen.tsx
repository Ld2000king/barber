import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Field, PrimaryButton } from './components';
import { colors, ui } from './theme';
import { Role } from './types';
import { cleanBarberCode } from './utils';

export type AuthValues = { role: Role; mode: 'login' | 'register'; email: string; password: string; phone: string; shopName: string; barberCode: string };

export function AuthScreen({ busy, formError, onSubmit }: { busy: boolean; formError: string; onSubmit: (values: AuthValues) => void }) {
  const [role, setRole] = useState<Role | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [shopName, setShopName] = useState('');
  const [barberCode, setBarberCode] = useState('');

  if (!role) {
    return (
      <Screen>
        <View style={styles.brand}>
          <Image source={require('../assets/barbers-logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brandTitle}>BARBERS</Text>
          <Text style={styles.brandSub}>BARBER STUDIO</Text>
        </View>
        <View style={styles.roleCard}>
          <Text style={ui.eyebrow}>ברוכים הבאים</Text>
          <Text style={ui.title}>איך תרצו להיכנס?</Text>
          <Text style={ui.subtitle}>בחרו את סוג החשבון כדי שנציג לכם רק את הכלים המתאימים.</Text>
          <RoleButton icon="♙" title="כניסה כלקוח" subtitle="תורים, גלריה, מחירון ודרכי הגעה" onPress={() => { setRole('client'); setMode('register'); }} />
          <RoleButton icon="✂" title="כניסה כספר" subtitle="כניסה קיימת או פתיחת מספרה" onPress={() => { setRole('barber'); setMode('login'); }} />
        </View>
      </Screen>
    );
  }

  const registering = mode === 'register';
  return (
    <KeyboardAvoidingView style={ui.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Pressable onPress={() => setRole(null)} style={styles.back}><Text style={styles.backText}>→</Text></Pressable>
        <View style={styles.authCard}>
          <Text style={ui.eyebrow}>{role === 'barber' ? (registering ? 'הרשמת ספר חדש' : 'כניסת ספר') : (registering ? 'הרשמת לקוח' : 'כניסת לקוח')}</Text>
          <Text style={ui.title}>{registering ? (role === 'barber' ? 'פתיחת מספרה חדשה' : 'פתיחת חשבון') : 'כניסה לחשבון'}</Text>
          <Text style={ui.subtitle}>{registering && role === 'client' ? 'הזינו את קוד המספרה שקיבלתם. החשבון יישאר משויך אליה.' : 'הזינו את הפרטים שלכם כדי להמשיך.'}</Text>
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          {registering && role === 'barber' ? <Field label="שם המספרה" value={shopName} onChangeText={setShopName} placeholder="לדוגמה: Liav Barber" /> : null}
          {registering && role === 'client' ? <Field label="קוד מספרה" value={barberCode} onChangeText={(v) => setBarberCode(cleanBarberCode(v))} autoCapitalize="characters" placeholder="לדוגמה: A7K9Q2M4" /> : null}
          <Field label="אימייל" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="name@example.com" />
          <Field label="סיסמה" value={password} onChangeText={setPassword} secureTextEntry placeholder="לפחות 6 תווים" />
          <Field label="מספר טלפון" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="05X-XXXXXXX" />
          <PrimaryButton title={busy ? 'בודקים את הפרטים...' : registering ? 'פתיחת חשבון' : 'כניסה'} disabled={busy} onPress={() => onSubmit({ role, mode, email, password, phone, shopName, barberCode })} />
          <Pressable style={styles.switch} onPress={() => setMode(registering ? 'login' : 'register')}>
            <Text style={styles.switchText}>{registering ? 'כבר נרשמת? כניסה לחשבון' : role === 'barber' ? 'ספר חדש? פתיחת מספרה' : 'לקוח חדש? פתיחת חשבון'}</Text>
          </Pressable>
          <Text style={styles.note}>{role === 'barber' && registering ? 'פתיחת מספרה חדשה כפופה לאישור הנהלת האפליקציה' : 'השיוך למספרה נשמר בחשבון'}</Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function RoleButton({ icon, title, subtitle, onPress }: { icon: string; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.roleButton, pressed && styles.pressed]}>
      <Text style={styles.roleIcon}>{icon}</Text>
      <View style={styles.roleCopy}><Text style={styles.roleTitle}>{title}</Text><Text style={styles.roleSub}>{subtitle}</Text></View>
      <Text style={styles.chevron}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', paddingTop: 24, paddingBottom: 28 },
  logo: { width: 92, height: 92 },
  brandTitle: { color: colors.ink, fontSize: 23, fontWeight: '900', letterSpacing: 4, marginTop: 4 },
  brandSub: { color: colors.sand, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  roleCard: { ...ui.card, padding: 22 },
  roleButton: { minHeight: 82, marginTop: 12, borderRadius: 17, backgroundColor: colors.paper, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  roleIcon: { width: 46, height: 46, textAlign: 'center', textAlignVertical: 'center', borderRadius: 23, backgroundColor: colors.steelDeep, color: colors.white, fontSize: 24 },
  roleCopy: { flex: 1 },
  roleTitle: { textAlign: 'right', writingDirection: 'rtl', color: colors.ink, fontWeight: '900', fontSize: 16 },
  roleSub: { textAlign: 'right', writingDirection: 'rtl', color: colors.muted, fontSize: 11, marginTop: 3 },
  chevron: { fontSize: 30, color: colors.steel },
  pressed: { opacity: 0.6, transform: [{ scale: 0.98 }] },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  backText: { fontSize: 28, color: colors.ink },
  authCard: { ...ui.card, padding: 22 },
  formError: { backgroundColor: '#f7e4e2', color: colors.danger, borderRadius: 12, padding: 12, textAlign: 'right', writingDirection: 'rtl', marginTop: 14, fontWeight: '700' },
  switch: { paddingVertical: 17, alignItems: 'center' },
  switchText: { color: colors.steelDeep, fontWeight: '900', writingDirection: 'rtl' },
  note: { color: colors.muted, textAlign: 'center', writingDirection: 'rtl', fontSize: 11 },
});
