import { StyleSheet } from 'react-native';

export const colors = {
  ink: '#17272f',
  navy: '#17272f',
  steel: '#40677a',
  steelDeep: '#294957',
  sand: '#c7a97d',
  sandSoft: '#eadcc7',
  paper: '#f2efe9',
  canvas: '#fbfaf7',
  white: '#ffffff',
  muted: '#6f7475',
  line: '#dedbd5',
  success: '#2f8f62',
  danger: '#b54840',
  warning: '#b27a28',
};

export const ui = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 18, paddingBottom: 120 },
  rtl: { textAlign: 'right', writingDirection: 'rtl', color: colors.ink },
  eyebrow: { textAlign: 'right', writingDirection: 'rtl', color: colors.steel, fontSize: 12, fontWeight: '800' },
  title: { textAlign: 'right', writingDirection: 'rtl', color: colors.ink, fontSize: 30, lineHeight: 38, fontWeight: '900' },
  subtitle: { textAlign: 'right', writingDirection: 'rtl', color: colors.muted, fontSize: 14, lineHeight: 22 },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.line, marginBottom: 12 },
  button: { minHeight: 50, borderRadius: 14, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  buttonText: { color: colors.white, fontWeight: '900', fontSize: 15, writingDirection: 'rtl' },
  outlineButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  outlineText: { color: colors.ink, fontWeight: '800', fontSize: 14, writingDirection: 'rtl' },
  input: { minHeight: 51, borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingHorizontal: 14, backgroundColor: colors.white, textAlign: 'right', writingDirection: 'rtl', fontSize: 16, color: colors.ink },
  label: { textAlign: 'right', writingDirection: 'rtl', color: colors.ink, fontSize: 13, fontWeight: '800', marginBottom: 6, marginTop: 12 },
  error: { textAlign: 'right', writingDirection: 'rtl', color: colors.danger, fontSize: 12, marginTop: 5, fontWeight: '700' },
  row: { flexDirection: 'row-reverse', alignItems: 'center' },
});
