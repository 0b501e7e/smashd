const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// --- Customization Data Definitions (copied from TS example) ---
const EXTRAS = [
  { name: 'Extra Patty', price: 2.00 },
  { name: 'Cheese', price: 1.00 },
  { name: 'Bacon', price: 1.50 },
  { name: 'Avocado', price: 1.75 },
];

const SAUCES = [
  { name: 'Ketchup', isDefaultSelected: true },
  { name: 'Mayo', isDefaultSelected: true },
  { name: 'BBQ Sauce' },
  { name: 'Special Sauce', price: 0.50 },
];

const TOPPINGS = [
  { name: 'Lettuce', isDefaultSelected: true },
  { name: 'Tomato', isDefaultSelected: true },
  { name: 'Onion', isDefaultSelected: true },
  { name: 'Pickles' },
  { name: 'Jalapenos', price: 0.75 },
];

async function main() {
  console.log('Start seeding ...');

  // Seed Test Users
  console.log('Seeding test users...');
  
  // Create admin user
  const hashedPassword = await bcrypt.hash('test123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'test@gmail.com' },
    update: {},
    create: {
      email: 'test@gmail.com',
      name: 'Test Admin',
      password: hashedPassword,
      role: 'ADMIN',
      dateOfBirth: new Date('1990-01-01'),
      address: '123 Test Street, Test City',
      phoneNumber: '+1234567890',
      acceptedTerms: true,
    },
  });
  console.log('Admin user created:', adminUser.email);

  // Create a few test customers
  const testCustomers = [];
  for (let i = 1; i <= 3; i++) {
    const customer = await prisma.user.upsert({
      where: { email: `customer${i}@test.com` },
      update: {},
      create: {
        email: `customer${i}@test.com`,
        name: `Test Customer ${i}`,
        password: hashedPassword,
        role: 'CUSTOMER',
        dateOfBirth: new Date(`199${i}-01-01`),
        address: `${i}23 Customer Street, Test City`,
        phoneNumber: `+123456789${i}`,
        acceptedTerms: true,
      },
    });
    testCustomers.push(customer);
  }
  console.log('Test customers created');

  // Seed Menu Items (Keep existing logic)
  console.log('Seeding Menu Items...');
  
  // Clear existing menu items
  console.log('Clearing existing menu items...');
  await prisma.orderItem.deleteMany({});
  await prisma.menuItemCustomizationCategory.deleteMany({});
  await prisma.menuItemCustomizationOption.deleteMany({});
  await prisma.menuItem.deleteMany({});
  console.log('Existing menu items cleared.');
  
  const menuItemsData = [
    { name: "Barbacoa", price: 9.00, category: "BURGER", imageUrl: "/images/barbacoa.jpeg", description: "Delicious barbecue burger" },
    { name: "Andalu", price: 7.00, category: "BURGER", imageUrl: "/images/andalu.jpeg", description: "Andalusian style burger" },
    { name: "Cheeseburger", price: 9.00, category: "BURGER", imageUrl: "/images/cheeseburger.jpeg", description: "Classic cheeseburger" },
    { name: "Pimento", price: 8.50, category: "BURGER", imageUrl: "/images/pimento.jpeg", description: "Pimento cheese burger" },
    { name: "Oklahoma 2.0", price: 10.00, category: "BURGER", imageUrl: "/images/oklahoma.jpeg", description: "Oklahoma style burger" },
    { name: "El pollo", price: 8.00, category: "BURGER", imageUrl: "/images/elpollo.jpeg", description: "Chicken burger" },
    { name: "Pollo kimchi", price: 10.00, category: "BURGER", imageUrl: "/images/pollokimchi.jpeg", description: "Chicken kimchi burger" },
    { name: "Pollo sucio", price: 12.50, category: "BURGER", imageUrl: "/images/pollosucio.jpeg", description: "Dirty chicken burger" },
    { name: "Bacon jam fries", price: 5.00, category: "SIDE", imageUrl: "/images/bacon_jam_fries.jpeg", description: "Fries with bacon jam" },
    { name: "Chilli cheese fries", price: 5.00, category: "SIDE", imageUrl: "/images/chilli_cheese_fries.jpeg", description: "Fries with chili and cheese" },
    { name: "Shop string fries", price: 2.20, category: "SIDE", imageUrl: "/images/shoestring-fries.jpeg", description: "Thin cut fries" },
    { name: "Coca cola", price: 1.10, category: "DRINK", imageUrl: "/images/coke.jpg", description: "Classic Coca-Cola" },
    { name: "Coke 00", price: 1.10, category: "DRINK", imageUrl: "/images/coke00.jpg", description: "Sugar-free Coca-Cola" },
    { name: "Fanta orange", price: 1.10, category: "DRINK", imageUrl: "/images/fanta.jpg", description: "Orange Fanta" },
    { name: "Fanta lemon", price: 1.10, category: "DRINK", imageUrl: "/images/fantalemon.jpeg", description: "Lemon Fanta" },
    { name: "Sprite", price: 1.10, category: "DRINK", imageUrl: "/images/sprite.jpg", description: "Sprite" },
    { name: "Aquarius", price: 1.10, category: "DRINK", imageUrl: "/images/aquarius.png", description: "Aquarius sports drink" },
    { name: "Aquarius orange", price: 1.10, category: "DRINK", imageUrl: "/images/aquariuso.jpeg", description: "Orange flavored Aquarius" },
    { name: "Nestlé ice tea normal", price: 1.10, category: "DRINK", imageUrl: "/images/nestleicetea.jpeg", description: "Nestlé Ice Tea" },
    { name: "Nestlé lemon", price: 1.10, category: "DRINK", imageUrl: "/images/nestealemon.jpeg", description: "Nestlé Lemon Tea" },
    { name: "Fanta Nestlé passion fruit", price: 1.10, category: "DRINK", imageUrl: "/images/nestea-passionfruit.jpg", description: "Nestlé Passion Fruit Fanta" },
  ];
  
  const createdMenuItems = [];
  for (const item of menuItemsData) {
    const menuItem = await prisma.menuItem.create({
      data: {
        name: item.name,
        price: item.price,
        category: item.category,
        imageUrl: item.imageUrl,
        description: item.description,
        isAvailable: true
      },
    });
    createdMenuItems.push(menuItem);
  }
  console.log('Menu items seeded/updated.');

  // --- Seed Customizations --- 

  // 1. Clear existing customization data
  console.log('Deleting existing customization relations...');
  await prisma.menuItemCustomizationCategory.deleteMany({});
  console.log('Deleting existing customization options...');
  await prisma.customizationOption.deleteMany({});
  console.log('Deleting existing customization categories...');
  await prisma.customizationCategory.deleteMany({});
  console.log('Existing customization data deleted.');

  // 2. Create Customization Categories
  console.log('Creating customization categories...');
  const extrasCategory = await prisma.customizationCategory.create({
    data: { name: 'Extras' },
  });
  const saucesCategory = await prisma.customizationCategory.create({
    data: { name: 'Sauces' },
  });
  const toppingsCategory = await prisma.customizationCategory.create({
    data: { name: 'Toppings' },
  });
  console.log('Customization categories created.');

  // 3. Create Customization Options
  console.log('Creating customization options...');
  for (const option of EXTRAS) {
    await prisma.customizationOption.create({
      data: {
        categoryId: extrasCategory.id,
        name: option.name,
        price: option.price || 0,
      },
    });
  }
  for (const option of SAUCES) {
    await prisma.customizationOption.create({
      data: {
        categoryId: saucesCategory.id,
        name: option.name,
        price: option.price || 0,
      },
    });
  }
  for (const option of TOPPINGS) {
    await prisma.customizationOption.create({
      data: {
        categoryId: toppingsCategory.id,
        name: option.name,
        price: option.price || 0,
      },
    });
  }
  console.log('Customization options created.');

  // 4. Link Categories to BURGER Menu Items
  console.log('Linking categories to BURGER menu items...');
  const burgerItems = await prisma.menuItem.findMany({
    where: { category: 'BURGER' },
  });

  if (burgerItems.length === 0) {
    console.warn('No BURGER menu items found to link customizations to.');
  } else {
    for (const burger of burgerItems) {
      console.log(`Linking customizations for: ${burger.name}`);
      await prisma.menuItemCustomizationCategory.createMany({
        data: [
          { menuItemId: burger.id, categoryId: extrasCategory.id },
          { menuItemId: burger.id, categoryId: saucesCategory.id },
          { menuItemId: burger.id, categoryId: toppingsCategory.id },
        ],
        skipDuplicates: true, // Avoid errors if relation already exists
      });
    }
     console.log(`Linked ${burgerItems.length} BURGER items to customization categories.`);
  }

  // 5. Create some test orders for analytics
  console.log('Creating test orders...');
  
  // Make sure we have menu items to work with
  const availableMenuItems = await prisma.menuItem.findMany({
    where: { isAvailable: true }
  });
  
  if (availableMenuItems.length === 0) {
    console.warn('No menu items available for creating test orders.');
    console.log('Seeding finished.');
    return;
  }
  
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  // Create orders across different weeks for analytics
  const testOrders = [
    { customer: testCustomers[0], date: twoWeeksAgo, items: [availableMenuItems[0], availableMenuItems[8]] },
    { customer: testCustomers[1], date: twoWeeksAgo, items: [availableMenuItems[1], availableMenuItems[11]] },
    { customer: testCustomers[2], date: oneWeekAgo, items: [availableMenuItems[2], availableMenuItems[9], availableMenuItems[12]] },
    { customer: testCustomers[0], date: oneWeekAgo, items: [availableMenuItems[4]] },
    { customer: testCustomers[1], date: now, items: [availableMenuItems[3], availableMenuItems[10]] },
  ];

  for (let i = 0; i < testOrders.length; i++) {
    const orderData = testOrders[i];
    const orderTotal = orderData.items.reduce((sum, item) => sum + item.price, 0);
    
    const order = await prisma.order.create({
      data: {
        userId: orderData.customer.id,
        total: orderTotal,
        status: 'DELIVERED',
        createdAt: orderData.date,
        updatedAt: orderData.date,
      },
    });

    // Add order items
    for (const item of orderData.items) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: item.id,
          quantity: 1,
          price: item.price,
          customizations: '{}',
        },
      });
    }
  }
  console.log('Test orders created for analytics.');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
