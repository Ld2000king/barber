export type Role = 'barber' | 'client';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type Tab = 'home' | 'prices' | 'gallery' | 'products' | 'appointments';

export type PriceItem = { id: string; name: string; price: number; note: string };
export type Product = { id: string; name: string; price: number; description: string; image?: string };
export type Business = {
  name: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  address: string;
  mapQuery: string;
  hours: string;
};
export type WorkDay = { enabled: boolean; start: string; end: string; slots: number };
export type Schedule = { days: Record<number, WorkDay>; minDuration: number };
export type Session = {
  uid: string;
  role: Role;
  phone: string;
  email: string;
  shopId: string;
  approvalStatus: ApprovalStatus;
  shopName?: string;
};
export type Appointment = {
  id: string;
  shopId: string;
  clientId?: string;
  clientName?: string;
  clientPhone: string;
  clientEmail?: string;
  service: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdBy?: Role;
};
export type OccupiedSlot = { id: string; shopId: string; date: string; time: string; status: 'booked' };

export type ShopRecord = {
  shopId: string;
  barberCode?: string;
  business?: Business;
  prices?: PriceItem[];
  products?: Product[];
  gallery?: string[];
  schedule?: Schedule;
  createdAt?: { seconds?: number };
  updatedAt?: { seconds?: number };
};

export type UserRecord = {
  uid: string;
  email: string;
  phone: string;
  role: Role;
  shopId: string;
  shopName?: string;
  status?: ApprovalStatus;
  barberCode?: string;
  createdAt?: { seconds?: number };
};
