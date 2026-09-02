import { Business, PriceItem, Product, Schedule } from './types';

export const DEFAULT_SHOP_ID = 'ari-cohen';
export const ADMIN_EMAIL = 'liavdimri12@gmail.com';

export const defaultBusiness: Business = {
  name: 'ARI COHEN',
  tagline: 'אהלן, ארי כאן 👋🏻',
  phone: '',
  whatsapp: '',
  address: 'שדרות רוטשילד 74, תל אביב',
  mapQuery: 'שדרות רוטשילד 74 תל אביב',
  hours: 'א׳–ה׳ 09:00–20:00 · ו׳ 08:00–14:00',
};

export const defaultPrices: PriceItem[] = [
  { id: 'p1', name: 'תספורת גבר', price: 70, note: 'כולל עיצוב וגימור' },
  { id: 'p2', name: 'תספורת + זקן', price: 95, note: 'החבילה המלאה' },
  { id: 'p3', name: 'סידור זקן', price: 45, note: 'עיצוב, דירוג וגימור' },
  { id: 'p4', name: 'תספורת ילד', price: 60, note: 'עד גיל 12' },
];

export const defaultProducts: Product[] = [
  { id: 's1', name: 'ווקס מט', price: 55, description: 'אחיזה חזקה ללא ברק' },
  { id: 's2', name: 'שמן לזקן', price: 65, description: 'ריכוך, הזנה וריח נקי' },
  { id: 's3', name: 'ספריי מלח', price: 60, description: 'נפח ומרקם טבעי' },
];

export const defaultSchedule: Schedule = {
  minDuration: 30,
  days: {
    0: { enabled: true, start: '09:00', end: '20:00', slots: 12 },
    1: { enabled: true, start: '09:00', end: '20:00', slots: 12 },
    2: { enabled: true, start: '09:00', end: '20:00', slots: 12 },
    3: { enabled: true, start: '09:00', end: '20:00', slots: 12 },
    4: { enabled: true, start: '09:00', end: '20:00', slots: 12 },
    5: { enabled: true, start: '08:00', end: '14:00', slots: 8 },
    6: { enabled: false, start: '09:00', end: '20:00', slots: 0 },
  },
};

export const dayNames = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'שבת'];
