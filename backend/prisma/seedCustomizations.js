const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EXTRAS = [
  { name: 'Extra Patty', price: 2.00 },
  { name: 'Cheese', price: 1.00 },
  { name: 'Bacon', price: 1.50 },
  { name: 'Avocado', price: 1.75 },
];

const SAUCES = [
  { name: 'Ketchup', price: 0 },
  { name: 'Mayo', price: 0 },
  { name: 'BBQ Sauce', price: 0 },
  { name: 'Special Sauce', price: 0.50 },
];

const TOPPINGS = [
  { name: 'Lettuce', price: 0 },
  { name: 'Tomato', price: 0 },
  { name: 'Onion', price: 0 },
  { name: 'Pickles', price: 0 },
  { name: 'Jalapenos', price: 0.75 },
];

async function main() {
  console.log(`Start seeding ...`);

  // Seed Extras
  const extrasCategory = await prisma.customizationCategory.upsert({
    where: { name: 'Extras' },
    update: {},
    create: { name: 'Extras' },
  });
  for (const extra of EXTRAS) {
    await prisma.customizationOption.upsert({
      where: { name_categoryId: { name: extra.name, categoryId: extrasCategory.id } },
      update: { price: extra.price },
      create: { ...extra, categoryId: extrasCategory.id },
    });
    console.log(`Created/Updated extra: ${extra.name}`);
  }

  // Seed Sauces
  const saucesCategory = await prisma.customizationCategory.upsert({
    where: { name: 'Sauces' },
    update: {},
    create: { name: 'Sauces' },
  });
  for (const sauce of SAUCES) {
    await prisma.customizationOption.upsert({
      where: { name_categoryId: { name: sauce.name, categoryId: saucesCategory.id } },
      update: { price: sauce.price },
      create: { ...sauce, categoryId: saucesCategory.id },
    });
    console.log(`Created/Updated sauce: ${sauce.name}`);
  }

  // Seed Toppings
  const toppingsCategory = await prisma.customizationCategory.upsert({
    where: { name: 'Toppings' },
    update: {},
    create: { name: 'Toppings' },
  });
  for (const topping of TOPPINGS) {
    await prisma.customizationOption.upsert({
      where: { name_categoryId: { name: topping.name, categoryId: toppingsCategory.id } },
      update: { price: topping.price },
      create: { name: topping.name, price: topping.price, categoryId: toppingsCategory.id },
    });
  }
  console.log('Finished seeding basic categories and options.');

  // --- Link Options Directly to Burger Menu Items (NEW SYSTEM) ---
  console.log('Linking customization options directly to burger menu items...');

  // Get all burger menu items (current IDs)
  const burgerItems = await prisma.menuItem.findMany({
    where: { category: 'BURGER' },
    select: { id: true, name: true }
  });

  if (burgerItems.length === 0) {
    console.warn('No burger menu items found. Skipping customization linking.');
    return;
  }

  console.log(`Found ${burgerItems.length} burger items:`, burgerItems.map(b => `${b.name} (ID: ${b.id})`));

  // Get all customization options
  const allOptions = await prisma.customizationOption.findMany();
  console.log(`Found ${allOptions.length} customization options to link`);

  // Link each burger to all customization options using the NEW direct system
  for (const burger of burgerItems) {
    // Clear existing links first
    await prisma.menuItemCustomizationOption.deleteMany({
      where: { menuItemId: burger.id }
    });

    // Create new links to all options
    for (const option of allOptions) {
      await prisma.menuItemCustomizationOption.create({
        data: {
          menuItemId: burger.id,
          customizationOptionId: option.id,
        },
      });
    }
    console.log(`✅ Linked ${allOptions.length} customization options to "${burger.name}" (ID: ${burger.id})`);
  }

  const totalLinks = await prisma.menuItemCustomizationOption.count();
  console.log(`🎉 Successfully created ${totalLinks} direct customization links!`);
  console.log('Finished linking options to menu items.');
  // --- End Linking ---

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 