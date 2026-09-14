"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Home, ReceiptText, UserRound, Compass } from "lucide-react";
import { useAppStore, useCartStore, cartTotalQty } from "@/lib/app-store";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import SplashScreen from "./screens/splash-screen";
import LoginScreen from "./screens/login-screen";
import HomeScreen from "./screens/home-screen";
import ExploreScreen from "./screens/explore-screen";
import CartScreen from "./screens/cart-screen";
import OrdersScreen from "./screens/orders-screen";
import AccountScreen from "./screens/account-screen";
import StoreScreen from "./screens/store-screen";
import ProductScreen from "./screens/product-screen";
import CheckoutScreen from "./screens/checkout-screen";
import SuccessScreen from "./screens/success-screen";
import QrisPaymentScreen from "./screens/qris-payment-screen";
import FlashSaleScreen from "./screens/flash-sale-screen";
import SellerFormScreen from "./screens/seller-form-screen";
import SellerDashboardScreen from "./screens/seller-dashboard-screen";
import { LocationSheet, FlashSalePopup } from "./widgets";
import { TrackSheet } from "./order-widgets";

export type Screen =
  | { name: "home" }
  | { name: "explore" }
  | { name: "cart" }
  | { name: "orders" }
  | { name: "account" }
  | { name: "seller" }
  | { name: "flash-sale" }
  | { name: "store"; storeId: string }
  | { name: "product"; productId: string; storeId: string }
  | { name: "checkout"; productId: string; storeId: string }
  | { name: "success"; orderId: string }
  | { name: "qris-payment"; orderId: string }
  | { name: "seller-form" };

const TAB_SCREENS: Screen["name"][] = ["home", "explore", "cart", "orders", "account"];

export default function JrApp() {
  const { user, setUser } = useAppStore();
  const clearCart = useCartStore((s) => s.clear);
  const [hydrated, setHydrated] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [direction, setDirection] = useState(0); // 1 = push (slide left), -1 = pop, 0 = tab fade
  const historyRef = useRef<Screen[]>([]);

  // Flash sale popup — once per session, right after login lands on beranda
  const [showPopup, setShowPopup] = useState(false);
  const popupShownRef = useRef(false);

  // Re-render trigger for order refresh
  const [orderTick, setOrderTick] = useState(0);
  const bumpOrders = useCallback(() => setOrderTick((t) => t + 1), []);

  // Sheets & dialogs
  const [locationOpen, setLocationOpen] = useState(false);
  const [trackOrder, setTrackOrder] = useState<import("@/lib/types").Order | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setHydrated(true), 0);
    const t2 = setTimeout(() => setSplashDone(true), 1700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Keep session fresh in background
  useEffect(() => {
    if (!hydrated || !user) return;
    fetch(`/api/user/${user.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user as User);
      })
      .catch(() => {});
  }, [hydrated, setUser, user?.id]);

  // Trigger popup once per session when user is on beranda after login
  useEffect(() => {
    if (!hydrated || !splashDone || !user || popupShownRef.current) return;
    if (screen.name !== "home") return;
    popupShownRef.current = true;
    // No cleanup on purpose: the popup must survive quick dependency changes right after login
    setTimeout(() => setShowPopup(true), 650);
  }, [hydrated, splashDone, user, screen.name]);

  const push = useCallback((next: Screen) => {
    setScreen((cur) => {
      historyRef.current = [...historyRef.current, cur];
      return next;
    });
    setDirection(1);
    window.scrollTo({ top: 0 });
  }, []);

  const goTab = useCallback((next: Screen) => {
    historyRef.current = [];
    setScreen(next);
    setDirection(0);
    window.scrollTo({ top: 0 });
  }, []);

  const back = useCallback(() => {
    setScreen((cur) => {
      const prev = historyRef.current.pop();
      return prev ?? { name: "home" };
    });
    setDirection(-1);
    window.scrollTo({ top: 0 });
  }, []);

  const isTab = useMemo(() => TAB_SCREENS.includes(screen.name), [screen]);

  // Keranjang pindah ke pojok kanan atas → nav hanya 4 tab
  const navItems = useMemo(
    () => [
      { key: "home", label: "Beranda", icon: Home, screen: { name: "home" } as Screen },
      { key: "explore", label: "Jelajahi", icon: Compass, screen: { name: "explore" } as Screen },
      { key: "orders", label: "Pesanan", icon: ReceiptText, screen: { name: "orders" } as Screen },
      { key: "account", label: "Akun", icon: UserRound, screen: { name: "account" } as Screen },
    ],
    []
  );

  const screenKey = useMemo(() => {
    switch (screen.name) {
      case "store":
        return `store-${screen.storeId}`;
      case "product":
        return `product-${screen.productId}`;
      case "checkout":
        return `checkout-${screen.productId}`;
      case "success":
        return `success-${screen.orderId}`;
      default:
        return screen.name;
    }
  }, [screen]);

  const openCart = useCallback(() => goTab({ name: "cart" }), [goTab]);

  const renderScreen = () => {
    switch (screen.name) {
      case "home":
        return (
          <HomeScreen
            user={user}
            onOpenStore={(id) => push({ name: "store", storeId: id })}
            onOpenFlashSale={() => push({ name: "flash-sale" })}
            onOpenLocation={() => setLocationOpen(true)}
            onOpenCart={openCart}
          />
        );
      case "explore":
        return (
          <ExploreScreen
            onOpenStore={(id) => push({ name: "store", storeId: id })}
            onOpenFlashSale={() => push({ name: "flash-sale" })}
            onOpenLocation={() => setLocationOpen(true)}
            onOpenCart={openCart}
          />
        );
      case "cart":
        return (
          <CartScreen
            user={user}
            onExplore={() => goTab({ name: "explore" })}
            onDone={(orderId, method) => {
              historyRef.current = [];
              clearCart();
              bumpOrders();
              setScreen(
                method === "QRIS" ? { name: "qris-payment", orderId } : { name: "success", orderId }
              );
              setDirection(1);
              window.scrollTo({ top: 0 });
            }}
          />
        );
      case "orders":
        return (
          <OrdersScreen
            user={user}
            tick={orderTick}
            onOpenStore={(id) => push({ name: "store", storeId: id })}
            onTrack={(order) => setTrackOrder(order)}
            onPayQris={(orderId) => push({ name: "qris-payment", orderId })}
          />
        );
      case "account":
        return (
          <AccountScreen
            user={user}
            ordersTick={orderTick}
            onGoTab={(name) => goTab({ name } as Screen)}
            onSellerForm={() => push({ name: "seller-form" })}
            onSellerDashboard={() => push({ name: "seller" })}
            onOpenStore={(id) => push({ name: "store", storeId: id })}
            onLoggedOut={() => {
              setUser(null);
              clearCart();
              goTab({ name: "home" });
            }}
          />
        );
      case "seller":
        return (
          <SellerDashboardScreen
            user={user}
            onBack={back}
            onOpenStore={(id) => push({ name: "store", storeId: id })}
            onUserRefreshed={(u) => setUser(u)}
          />
        );
      case "flash-sale":
        return (
          <FlashSaleScreen
            onBack={back}
            onOpenProduct={(productId, storeId) => push({ name: "product", productId, storeId })}
          />
        );
      case "store":
        return (
          <StoreScreen
            storeId={screen.storeId}
            onBack={back}
            onOpenProduct={(productId) =>
              push({ name: "product", productId, storeId: screen.storeId })
            }
            onOpenCart={openCart}
          />
        );
      case "product":
        return (
          <ProductScreen
            productId={screen.productId}
            storeId={screen.storeId}
            onBack={back}
            onBuy={() => push({ name: "checkout", productId: screen.productId, storeId: screen.storeId })}
          />
        );
      case "checkout":
        return (
          <CheckoutScreen
            user={user}
            productId={screen.productId}
            storeId={screen.storeId}
            onBack={back}
            onDone={(orderId, method) => {
              historyRef.current = [];
              bumpOrders();
              setScreen(
                method === "QRIS" ? { name: "qris-payment", orderId } : { name: "success", orderId }
              );
              setDirection(1);
              window.scrollTo({ top: 0 });
            }}
          />
        );
      case "success":
        return (
          <SuccessScreen
            orderId={screen.orderId}
            onDone={() => {
              goTab({ name: "orders" });
              bumpOrders();
            }}
          />
        );
      case "qris-payment":
        return (
          <QrisPaymentScreen
            orderId={screen.orderId}
            onBack={back}
            onDone={() => {
              historyRef.current = [];
              goTab({ name: "orders" });
              bumpOrders();
            }}
          />
        );
      case "seller-form":
        return (
          <SellerFormScreen
            user={user}
            onBack={back}
            onDone={(updatedUser) => {
              setUser(updatedUser);
              historyRef.current = [];
              goTab({ name: "account" });
            }}
          />
        );
      default:
        return null;
    }
  };

  const variants = {
    enter: (dir: number) => ({ x: dir === 0 ? 0 : dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir === 0 ? 0 : dir > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <div className="min-h-screen bg-brand-radial flex justify-center">
      <div className="w-full max-w-[430px] bg-background min-h-screen relative shadow-[0_0_60px_-15px_rgba(13,148,136,0.25)]">
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.main
            key={screenKey}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 380, damping: 34, opacity: { duration: 0.18 } }}
            className={cn(isTab ? "pb-32" : "pb-10")}
          >
            {renderScreen()}
          </motion.main>
        </AnimatePresence>

        {/* Bottom navigation — buyer only; keranjang kini ikon pojok kanan atas */}
        {user && isTab && (
          <motion.nav
            initial={{ y: 90 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40"
            aria-label="Navigasi utama"
          >
            <div className="px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2">
              <div className="bottom-glass rounded-[26px] border border-white/60 shadow-[0_12px_40px_-14px_rgba(13,148,136,0.45)]">
                <div
                  className="grid gap-0.5 p-1.5"
                  style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0,1fr))` }}
                >
                  {navItems.map((item) => {
                    const active = screen.name === item.key;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        onClick={() => goTab(item.screen)}
                        className={cn(
                          "press relative flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-bold transition-colors",
                          active ? "text-primary" : "text-slate-400 hover:text-teal-600"
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        {active && (
                          <motion.span
                            layoutId="nav-pill"
                            className="absolute inset-0 -z-10 rounded-2xl bg-teal-50/90"
                            transition={{ type: "spring", stiffness: 400, damping: 32 }}
                          />
                        )}
                        <span className="relative">
                          <span
                            className={cn(
                              "flex h-7 w-11 items-center justify-center rounded-full transition-colors",
                              active ? "bg-primary text-white shadow-md shadow-teal-500/30" : ""
                            )}
                          >
                            <Icon className="h-[16px] w-[16px]" strokeWidth={active ? 2.4 : 2} />
                          </span>
                        </span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.nav>
        )}

        {/* Location picker sheet (GPS real + area manual) */}
        <LocationSheet open={locationOpen} onOpenChange={setLocationOpen} />

        {/* Track order + barcode bottom sheet */}
        <TrackSheet order={trackOrder} onClose={() => setTrackOrder(null)} />

        {/* Flash sale popup after login */}
        <AnimatePresence>
          {showPopup && (
            <FlashSalePopup
              open
              onClose={() => setShowPopup(false)}
              onOpenSale={() => {
                setShowPopup(false);
                push({ name: "flash-sale" });
              }}
            />
          )}
        </AnimatePresence>

        {/* Splash & login overlay */}
        <AnimatePresence>
          {(!hydrated || !splashDone) && (
            <motion.div
              key="splash"
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.4 }}
              className="fixed inset-0 z-50 flex justify-center"
            >
              <div className="w-full max-w-[430px] bg-brand-gradient relative overflow-hidden">
                <SplashScreen />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {hydrated && splashDone && !user && (
            <motion.div
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-40 flex justify-center bg-white"
            >
              <div className="w-full max-w-[430px] overflow-y-auto">
                <LoginScreen
                  onLogin={(u) => {
                    setUser(u);
                    goTab({ name: "home" });
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
