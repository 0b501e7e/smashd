const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const menuItems = [
    { name: "Barbacoa", price: 9.00, category: "BURGER", imageUrl: "/images/barbacoa.jpg", description: "Delicious barbecue burger" },
    { name: "Andalu", price: 7.00, category: "BURGER", imageUrl: "/images/andalu.jpg", description: "Andalusian style burger" },
    { name: "Cheeseburger", price: 9.00, category: "BURGER", imageUrl: "/images/cheeseburger.jpg", description: "Classic cheeseburger" },
    { name: "Pimento", price: 8.50, category: "BURGER", imageUrl: "/images/pimento.jpg", description: "Pimento cheese burger" },
    { name: "Oklahoma 2.0", price: 10.00, category: "BURGER", imageUrl: "/images/oklahoma.jpg", description: "Oklahoma style burger" },
    { name: "El pollo", price: 8.00, category: "BURGER", imageUrl: "/images/el_pollo.jpg", description: "Chicken burger" },
    { name: "Pollo kimchi", price: 10.00, category: "BURGER", imageUrl: "/images/pollo_kimchi.jpg", description: "Chicken kimchi burger" },
    { name: "Pollo sucio", price: 12.50, category: "BURGER", imageUrl: "/images/pollo_sucio.jpg", description: "Dirty chicken burger" },

    // Fries
    { name: "Bacon jam fries", price: 5.00, category: "SIDE", imageUrl: "/images/bacon_jam_fries.jpg", description: "Fries with bacon jam" },
    { name: "Chilli cheese fries", price: 5.00, category: "SIDE", imageUrl: "/images/chilli_cheese_fries.jpg", description: "Fries with chili and cheese" },
    { name: "Shop string fries", price: 2.20, category: "SIDE", imageUrl: "/images/shop_string_fries.jpg", description: "Thin cut fries" },

    // Drinks
    { name: "Coca cola", price: 1.10, category: "DRINK", imageUrl: "/images/coca_cola.jpg", description: "Classic Coca-Cola" },
    { name: "Coke 00", price: 1.10, category: "DRINK", imageUrl: "/images/coke_00.jpg", description: "Sugar-free Coca-Cola" },
    { name: "Fanta orange", price: 1.10, category: "DRINK", imageUrl: "/images/fanta_orange.jpg", description: "Orange Fanta" },
    { name: "Fanta lemon", price: 1.10, category: "DRINK", imageUrl: "/images/fanta_lemon.jpg", description: "Lemon Fanta" },
    { name: "Sprite", price: 1.10, category: "DRINK", imageUrl: "/images/sprite.jpg", description: "Sprite" },
    { name: "Aquarius", price: 1.10, category: "DRINK", imageUrl: "/images/aquarius.jpg", description: "Aquarius sports drink" },
    { name: "Aquarius orange", price: 1.10, category: "DRINK", imageUrl: "/images/aquarius_orange.jpg", description: "Orange flavored Aquarius" },

    // Nestlé Drinks
    { name: "Nestlé ice tea normal", price: 1.10, category: "DRINK", imageUrl: "/images/nestle_ice_tea.jpg", description: "Nestlé Ice Tea" },
    { name: "Nestlé lemon", price: 1.10, category: "DRINK", imageUrl: "/images/nestle_lemon.jpg", description: "Nestlé Lemon Tea" },
    { name: "Fanta Nestlé passion fruit", price: 1.10, category: "DRINK", imageUrl: "/images/fanta_nestle_passion_fruit.jpg", description: "Nestlé Passion Fruit Fanta" },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.create({ data: item });
  }

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
