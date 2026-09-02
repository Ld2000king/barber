import { ApprovalStatus, Role, WorkDay } from './types';

export const cleanShopId = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'ari-cohen';

export const cleanBarberCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
export const makeBarberCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};
export const money = (value: number) => `${value.toLocaleString('he-IL')} ₪`;
export const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const slotId = (shopId: string, date: string, time: string) => `${shopId}__${date}_${time.replace(':', '')}`;
export const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};
export const minutesToTime = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
export const generateSlots = (day?: WorkDay) => {
  if (!day?.enabled || day.slots < 1) return [];
  const start = timeToMinutes(day.start);
  const end = timeToMinutes(day.end);
  const duration = end - start;
  const count = Math.min(Math.max(1, day.slots), Math.max(0, Math.floor(duration / 30)));
  if (!count) return [];
  if (count === 1) return [minutesToTime(start)];
  const rawStep = (duration - 30) / (count - 1);
  const result: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const rounded = Math.round((start + index * rawStep) / 5) * 5;
    const time = minutesToTime(Math.min(rounded, end - 30));
    if (!result.includes(time)) result.push(time);
  }
  return result;
};
export const resolveApprovalStatus = (role: Role, data: Record<string, unknown>): ApprovalStatus => {
  if (role !== 'barber') return 'approved';
  const status = String(data.status || '');
  return status === 'pending' || status === 'rejected' || status === 'suspended' ? status : 'approved';
};
export const isIsraeliPhone = (value: string) => /^(05\d{8}|9725\d{8})$/.test(value.replace(/\D/g, ''));
export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const secondsOf = (value: unknown) => {
  const seconds = (value as { seconds?: number } | undefined)?.seconds;
  return typeof seconds === 'number' ? seconds : 0;
};
