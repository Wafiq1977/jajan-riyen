"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Home, ReceiptText, Store, UserRound, ShoppingBag } from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import SplashScreen from "./screens/splash-screen";
import LoginScreen from "./screens/login-screen";
import HomeScreen from "./screens/home-screen";
import OrdersScreen from "./screens/orders-screen";
import AccountScreen from "./screens/account-screen";
import StoreScreen from "./screens/store-screen";
import ProductScreen from "./screens/product-screen";
import CheckoutScreen from "./screens/checkout-screen";
import SuccessScreen from "./screens/success-screen";
import SellerFormScreen from "./screens/seller-form-screen";
import SellerDashboardScreen from "./screens/seller-dashboard-screen";

export type Screen =
  | { name: "home" }
  | { name: "orders" }
  | { name: "account" }
  | { name: "seller" }
  | { name: "store"; storeId: string }
  | { name: "product"; productId: string; storeId: string }
  | { name: "checkout"; productId: string; storeId: string }
  | { name: "success"; orderId: string }
  | { name: "seller-form" };

const TAB_SCREENS: Screen["name"][] = ["home", "orders", "seller", "account"];

export default function ToskaApp() {
  const { user, setUser } = useAppStore();
  const [hydrated, setHydrated] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [direction, setDirection] = useState(0); // 1 = push (slide left), -1 = pop, 0 = tab fade
  const historyRef = useRef<Screen[]>([]);

  // Re-render trigger for order refresh
  const [orderTick, setOrderTick] = useState(0);
  const bumpOrders = useCallback(() => setOrderTick((t) => t + 1), []);

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
  }, [hydrated]);

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

  const navItems = useMemo(() => {
    const items: { key: Screen["name"]; label: string; icon: typeof Home; screen: Screen }[] = [
      { key: "home", label: "Beranda", icon: Home, screen: { name: "home" } },
      { key: "orders", label: "Pesanan", icon: ReceiptText, screen: { name: "orders" } },
    ];
    if (user?.isSeller) {
      items.push({ key: "seller", label: "Toko", icon: Store, screen: { name: "seller" } });
    }
    items.push({ key: "account", label: "Akun", icon: UserRound, screen: { name: "account" } });
    return items;
  }, [user?.isSeller]);

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

  const renderScreen = () => {
    switch (screen.name) {
      case "home":
        return <HomeScreen user={user} onOpenStore={(id) => push({ name: "store", storeId: id })} />;
      case "orders":
        return (
          <OrdersScreen
            user={user}
            tick={orderTick}
            onOpenStore={(id) => push({ name: "store", storeId: id })}
          />
        );
      case "account":
        return (
          <AccountScreen
            user={user}
            ordersTick={orderTick}
            onGoTab={goTab}
            onSellerForm={() => push({ name: "seller-form" })}
            onSellerDashboard={() => goTab({ name: "seller" })}
            onOpenStore={(id) => push({ name: "store", storeId: id })}
            onLoggedOut={() => {
              setUser(null);
              goTab({ name: "home" });
            }}
          />
        );
      case "seller":
        return <SellerDashboardScreen user={user} onOpenStore={(id) => push({ name: "store", storeId: id })} />;
      case "store":
        return (
          <StoreScreen
            storeId={screen.storeId}
            onBack={back}
            onOpenProduct={(productId) =>
              push({ name: "product", productId, storeId: screen.storeId })
            }
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
            onDone={(orderId) => {
              historyRef.current = [];
              bumpOrders();
              setScreen({ name: "success", orderId });
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
      case "seller-form":
        return (
          <SellerFormScreen
            user={user}
            onBack={back}
            onDone={(updatedUser) => {
              setUser(updatedUser);
              historyRef.current = [];
              goTab({ name: "seller" });
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
            className={cn(isTab ? "pb-28" : "pb-6")}
          >
            {renderScreen()}
          </motion.main>
        </AnimatePresence>

        {/* Bottom navigation */}
        {user && isTab && (
          <motion.nav
            initial={{ y: 90 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40"
            aria-label="Navigasi utama"
          >
            <div className="bg-white/90 backdrop-blur-xl border-t border-teal-100/80 px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_-12px_rgba(13,148,136,0.25)]">
              <div className="grid grid-cols-3 gap-1" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0,1fr))` }}>
                {navItems.map((item) => {
                  const active = screen.name === item.key;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => goTab(item.screen)}
                      className={cn(
                        "press relative flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-semibold transition-colors",
                        active ? "text-primary" : "text-slate-400 hover:text-teal-600"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-pill"
                          className="absolute inset-x-3 inset-y-0 -z-10 rounded-2xl bg-teal-50"
                          transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        />
                      )}
                      <span
                        className={cn(
                          "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                          active ? "bg-primary text-white shadow-md shadow-teal-500/30" : ""
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 2} />
                      </span>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.nav>
        )}

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
              <div className="w-full max-w-[430px]">
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

export function BrandWordmark({ light = false, size = "md" }: { light?: boolean; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" };
  return (
    <div className="flex items-center gap-2">
      <span className={cn("flex items-center justify-center rounded-xl bg-brand-gradient text-white shadow-lg shadow-teal-500/30",
        size === "lg" ? "h-12 w-12" : size === "sm" ? "h-7 w-7" : "h-9 w-9")}>
        <ShoppingBag className={size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
      </span>
      <span className={cn("font-extrabold tracking-tight", sizes[size], light ? "text-white" : "text-foreground")}>
        TOSKA
        <span className="text-primary">.</span>
      </span>
    </div>
  );
}
