import { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, ui } from './theme';
import { Tab } from './types';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={ui.screen} edges={['top']}>
      {scroll ? <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">{children}</ScrollView> : children}
    </SafeAreaView>
  );
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View>
      <Text style={ui.label}>{label}</Text>
      <TextInput placeholderTextColor="#999" style={[ui.input, props.multiline && styles.multiline]} {...props} />
      {error ? <Text style={ui.error}>{error}</Text> : null}
    </View>
  );
}

export function PrimaryButton({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable style={({ pressed }) => [ui.button, styles.buttonGap, (pressed || disabled) && styles.pressed]} onPress={onPress} disabled={disabled}>
      <Text style={ui.buttonText}>{title}</Text>
    </Pressable>
  );
}

export function OutlineButton({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable style={({ pressed }) => [ui.outlineButton, styles.buttonGap, (pressed || disabled) && styles.pressed]} onPress={onPress} disabled={disabled}>
      <Text style={ui.outlineText}>{title}</Text>
    </Pressable>
  );
}

export function PageHeader({ title, subtitle, action, onAction }: { title: string; subtitle?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.headerCopy}>
        <Text style={ui.title}>{title}</Text>
        {subtitle ? <Text style={ui.subtitle}>{subtitle}</Text> : null}
      </View>
      {action && onAction ? (
        <Pressable onPress={onAction} style={styles.headerAction}><Text style={styles.headerActionText}>{action}</Text></Pressable>
      ) : null}
    </View>
  );
}

const navItems: Record<Tab, { icon: string; label: string }> = {
  home: { icon: '⌂', label: 'בית' },
  prices: { icon: '₪', label: 'מחירון' },
  gallery: { icon: '▦', label: 'גלריה' },
  products: { icon: '◈', label: 'מוצרים' },
  appointments: { icon: '◷', label: 'תורים' },
};

export function BottomNav({ tab, role, onTab }: { tab: Tab; role: 'barber' | 'client'; onTab: (tab: Tab) => void }) {
  const tabs: Tab[] = role === 'barber' ? ['home', 'appointments', 'gallery', 'products'] : ['home', 'prices', 'appointments', 'gallery'];
  return (
    <SafeAreaView edges={['bottom']} style={styles.navSafe}>
      <View style={styles.nav}>
        {tabs.map((key) => (
          <Pressable key={key} style={styles.navItem} onPress={() => onTab(key)}>
            <Text style={[styles.navIcon, tab === key && styles.navActive]}>{navItems[key].icon}</Text>
            <Text style={[styles.navLabel, tab === key && styles.navActive]}>{navItems[key].label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <Pressable style={styles.close} onPress={onClose}><Text style={styles.closeText}>×</Text></Pressable>
            <Text style={styles.sheetTitle}>{title}</Text>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function Toast({ text }: { text: string }) {
  if (!text) return null;
  return <View pointerEvents="none" style={styles.toast}><Text style={styles.toastText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  multiline: { minHeight: 100, paddingTop: 14, textAlignVertical: 'top' },
  buttonGap: { marginTop: 14 },
  pressed: { opacity: 0.55, transform: [{ scale: 0.985 }] },
  pageHeader: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingTop: 10, paddingBottom: 20 },
  headerCopy: { flex: 1 },
  headerAction: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.paper },
  headerActionText: { color: colors.steelDeep, fontWeight: '900', writingDirection: 'rtl' },
  navSafe: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line },
  nav: { height: 67, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-around' },
  navItem: { minWidth: 64, alignItems: 'center', justifyContent: 'center', gap: 3 },
  navIcon: { fontSize: 22, color: '#879095' },
  navLabel: { fontSize: 10, color: '#879095', fontWeight: '700' },
  navActive: { color: colors.steelDeep, fontWeight: '900' },
  backdrop: { flex: 1, backgroundColor: 'rgba(8,18,24,.52)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '91%', minHeight: '42%', backgroundColor: colors.canvas, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  handle: { width: 46, height: 5, borderRadius: 3, backgroundColor: '#c4c4c4', alignSelf: 'center', marginTop: 10 },
  sheetHeader: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  sheetTitle: { flex: 1, textAlign: 'right', writingDirection: 'rtl', color: colors.ink, fontSize: 22, fontWeight: '900' },
  close: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 30, color: colors.ink },
  sheetContent: { padding: 18, paddingBottom: 45 },
  toast: { position: 'absolute', left: 22, right: 22, bottom: 98, borderRadius: 15, paddingVertical: 13, paddingHorizontal: 18, backgroundColor: colors.navy, zIndex: 20 },
  toastText: { color: colors.white, textAlign: 'center', writingDirection: 'rtl', fontWeight: '800', lineHeight: 20 },
});
