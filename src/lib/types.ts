export type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "TUNAI" | "QRIS";
export type PaymentStatus = "PENDING" | "PAID" | "EXPIRED" | "FAILED";

/** Data pembayaran QRIS manual yang aman tampil di frontend */
export interface PaymentInfo {
  id: string;
  orderId: string;
  gateway: string; // "manual" (kode referensi)
  reference?: string | null; // kode referensi transaksi dari pembeli
  amount: number;
  status: PaymentStatus;
  verifiedAt?: string | null; // waktu penjual verifikasi
  rejectNote?: string | null; // alasan penolakan penjual
  qrImageUrl?: string | null;
  payUrl?: string | null;
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  imageUrl: string | null;
  emoji: string;
  category: string;
  stock: number;
  sold: number;
  isFlashSale: boolean;
}

export interface Store {
  id: string;
  userId: string;
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  qrisEnabled: boolean;
  qrisImageUrl: string | null;
  qrisCode: string | null;
  rating: number;
  distanceKm: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  products: Product[];
}

export interface User {
  id: string;
  phone: string;
  name: string | null;
  nik: string | null;
  address: string | null;
  isSeller: boolean;
  store?: Store | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  emoji: string;
  imageUrl: string | null;
}

export interface Order {
  id: string;
  code: string;
  userId: string;
  storeId: string;
  items: OrderItem[];
  quantity: number;
  totalPrice: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  note?: string | null; // catatan pesanan dari pembeli (request khusus ke penjual)
  buyerDeletedAt?: string | null; // soft delete riwayat oleh pembeli
  createdAt: string;
  updatedAt?: string;
  store: Store;
  user?: { id: string; phone: string; name: string | null };
  payments?: PaymentInfo[];
}

/** Item inside the buyer cart (client-side only) */
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  originalPrice: number | null;
  emoji: string;
  imageUrl: string | null;
  quantity: number;
  stock: number;
}
