import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();

  // Seed demo sellers + stores + products
  const demoStores = [
    {
      phone: "6281234500001",
      sellerName: "Rina Wijaya",
      store: {
        name: "Geprek Mercon Bu Rina",
        category: "Makanan",
        description:
          "Ayam geprek level meterai dengan sambal bawang super pedas, dimasak fresh setiap hari.",
        address: "Jl. Merdeka No. 12, dekat Alun-Alun",
        latitude: -6.9932,
        longitude: 110.4203,
        logoUrl: "/products/ayam-geprek.png",
        bannerUrl: "/banners/banner-geprek.png",
        qrisEnabled: true,
        qrisImageUrl: "/qris-demo/qris-bu-rina.png",
        qrisCode: "ID10203340056781",
        rating: 4.9,
        distanceKm: 0.3,
        openTime: "08:00",
        closeTime: "21:00",
      },
      products: [
        {
          name: "Paket Geprek Mercon Level 5",
          description:
            "Ayam geprek crispy + sambal bawang level 5 + nasi putih + es teh. Cocok buat pecinta pedas!",
          price: 18000,
          originalPrice: 25000,
          imageUrl: "/products/ayam-geprek.png",
          emoji: "🌶️",
          category: "Makanan",
          stock: 40,
          sold: 320,
          isFlashSale: true,
        },
        {
          name: "Geprek Original Level 1",
          description: "Ayam geprek crispy sambal original, level pedas ramah untuk pemula.",
          price: 15000,
          originalPrice: 20000,
          imageUrl: "/products/ayam-geprek.png",
          emoji: "🍗",
          category: "Makanan",
          stock: 50,
          sold: 210,
        },
      ],
    },
    {
      phone: "6281234500002",
      sellerName: "Dimas Prasetyo",
      store: {
        name: "Kopi Senja Pagi",
        category: "Minuman",
        description:
          "Kopi lokal pilihan dengan biji robusta arabika Nusantara, diseduh oleh barister berpengalaman.",
        address: "Jl. Diponegoro No. 45, samping kampus",
        latitude: -6.9985,
        longitude: 110.4585,
        logoUrl: "/products/kopi.png",
        bannerUrl: "/banners/banner-kopi.png",
        rating: 4.8,
        distanceKm: 0.6,
        openTime: "07:00",
        closeTime: "22:00",
      },
      products: [
        {
          name: "Es Kopi Susu Gula Aren",
          description: "Kopi susu gula aren asli, manis legit dengan espresso double shot.",
          price: 16000,
          originalPrice: 22000,
          imageUrl: "/products/kopi.png",
          emoji: "☕",
          category: "Minuman",
          stock: 60,
          sold: 540,
          isFlashSale: true,
        },
        {
          name: "Americano Dingin",
          description: "Espresso murni dengan air es, segar dan bold untuk teman begadang.",
          price: 12000,
          originalPrice: null,
          imageUrl: "/products/kopi.png",
          emoji: "🧊",
          category: "Minuman",
          stock: 45,
          sold: 180,
        },
        {
          name: "Matcha Green Tea Latte",
          description: "Matcha premium dengan susu segar, creamy dan menenangkan.",
          price: 20000,
          originalPrice: 26000,
          imageUrl: "/products/es-teh.png",
          emoji: "🍵",
          category: "Minuman",
          stock: 30,
          sold: 95,
        },
      ],
    },
    {
      phone: "6281234500003",
      sellerName: "Sari Melati",
      store: {
        name: "Dapur Bu Sari",
        category: "Makanan",
        description: "Masakan rumahan hangat seperti buatan ibu, nasi goreng dan mie legendaris.",
        address: "Gang Melati III No. 8, perumahan Griya Asri",
        latitude: -7.0595,
        longitude: 110.4483,
        logoUrl: "/products/nasi-goreng.png",
        bannerUrl: "/banners/banner-dapur.png",
        rating: 4.7,
        distanceKm: 1.1,
        openTime: "09:00",
        closeTime: "20:00",
      },
      products: [
        {
          name: "Nasi Goreng Spesial",
          description: "Nasi goreng dengan telur mata sapi, ayam, dan kerupuk. Porsi jumbo!",
          price: 17000,
          originalPrice: 23000,
          imageUrl: "/products/nasi-goreng.png",
          emoji: "🍚",
          category: "Makanan",
          stock: 35,
          sold: 410,
          isFlashSale: true,
        },
        {
          name: "Mie Ayam Bakso",
          description: "Mie ayam kenyal dengan bakso sapi urus dan kuah kaldu gurih.",
          price: 15000,
          originalPrice: 18000,
          imageUrl: "/products/mie-ayam.png",
          emoji: "🍜",
          category: "Makanan",
          stock: 40,
          sold: 260,
        },
        {
          name: "Sate Ayam Madura (10 tusuk)",
          description: "Sate ayam dengan bumbu kacang khas Madura, ditumang lontong hangat.",
          price: 25000,
          originalPrice: 30000,
          imageUrl: "/products/sate.png",
          emoji: "🍢",
          category: "Makanan",
          stock: 25,
          sold: 150,
        },
      ],
    },
    {
      phone: "6281234500004",
      sellerName: "Budi Santoso",
      store: {
        name: "Burger Juara",
        category: "Makanan",
        description: "Burger homemade daging tebal 100% sapi, fresh setiap hari tanpa pengawet.",
        address: "Jl. Kartini No. 3, depan masjid raya",
        latitude: -7.029,
        longitude: 110.443,
        logoUrl: "/products/burger.png",
        bannerUrl: "/banners/banner-burger.png",
        rating: 4.8,
        distanceKm: 1.8,
        openTime: "10:00",
        closeTime: "22:00",
      },
      products: [
        {
          name: "Double Cheese Burger",
          description: "Daging sapi tebal dua lapis, keju meleleh, sayur segar, saus rahasia.",
          price: 28000,
          originalPrice: 35000,
          imageUrl: "/products/burger.png",
          emoji: "🍔",
          category: "Makanan",
          stock: 30,
          sold: 380,
          isFlashSale: true,
        },
        {
          name: "Crispy Chicken Burger",
          description: "Ayam crispy renyah dengan mayo pedas dan selada segar.",
          price: 22000,
          originalPrice: null,
          imageUrl: "/products/burger.png",
          emoji: "🍗",
          category: "Makanan",
          stock: 35,
          sold: 190,
        },
      ],
    },
    {
      phone: "6281234500005",
      sellerName: "Ayu Lestari",
      store: {
        name: "Manis Paraiso",
        category: "Dessert",
        description: "Surga camilan manis: martabak, dimsum, dan es krim premium harga bersahabat.",
        address: "Jl. Cendana No. 21, area kuliner Citra Garden",
        latitude: -7.0513,
        longitude: 110.457,
        logoUrl: "/products/martabak.png",
        bannerUrl: "/banners/banner-dessert.png",
        rating: 4.9,
        distanceKm: 2.4,
        openTime: "11:00",
        closeTime: "23:00",
      },
      products: [
        {
          name: "Martabak Manis Coklat Keju",
          description: "Martabak tebal lembut dengan lelehan coklat dan keju parut melimpah.",
          price: 32000,
          originalPrice: 40000,
          imageUrl: "/products/martabak.png",
          emoji: "🥞",
          category: "Dessert",
          stock: 20,
          sold: 270,
          isFlashSale: true,
        },
        {
          name: "Dimsum Mentai (5 pcs)",
          description: "Dimsum ayam udang dengan saus mentai creamy, dikukus fresh.",
          price: 24000,
          originalPrice: 30000,
          imageUrl: "/products/dimsum.png",
          emoji: "🥟",
          category: "Dessert",
          stock: 28,
          sold: 165,
        },
        {
          name: "Soft Serve Chocolate Vanilla",
          description: "Es krim lembut dua rasa dengan taburan coklat renyah.",
          price: 12000,
          originalPrice: 18000,
          imageUrl: "/products/es-krim.png",
          emoji: "🍦",
          category: "Dessert",
          stock: 50,
          sold: 300,
        },
        {
          name: "Jasmine Green Milk Tea",
          description: "Teh hijau jasmine dengan susu creamy dan boba kenyal.",
          price: 18000,
          originalPrice: 25000,
          imageUrl: "/products/es-teh.png",
          emoji: "🧋",
          category: "Minuman",
          stock: 45,
          sold: 520,
        },
      ],
    },
  ];

  for (const demo of demoStores) {
    const user = await prisma.user.create({
      data: {
        phone: demo.phone,
        name: demo.sellerName,
        isSeller: true,
        store: {
          create: demo.store,
        },
      },
      include: { store: true },
    });

    await prisma.product.createMany({
      data: demo.products.map((p) => ({ ...p, storeId: user.store!.id })),
    });
  }

  const storeCount = await prisma.store.count();
  const productCount = await prisma.product.count();
  console.log(`✅ Seeded ${storeCount} stores, ${productCount} products`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
