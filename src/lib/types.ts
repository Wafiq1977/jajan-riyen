export type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "TUNAI" | "QRIS";

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
  createdAt: string;
  updatedAt?: string;
  store: Store;
  user?: { id: string; phone: string; name: string | null };
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
