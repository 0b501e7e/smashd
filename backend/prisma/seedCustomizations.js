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

  // --- Link Categories to Specific Menu Items ---
  console.log('Linking customization categories to menu items...');

  const menuItemIdsToLink = [1, 6]; // Barbacoa (ID 1), El Pollo (ID 6)
  const categoriesToLink = [extrasCategory, saucesCategory, toppingsCategory];

  for (const menuItemId of menuItemIdsToLink) {
    const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
    if (!menuItem) {
      console.warn(`Menu item with ID ${menuItemId} not found. Skipping linking for this item.`);
      continue;
    }

    for (const category of categoriesToLink) {
      await prisma.menuItemCustomizationCategory.upsert({
        where: { 
          menuItemId_categoryId: {
            menuItemId: menuItemId,
            categoryId: category.id
          }
        },
        update: {},
        create: {
          menuItemId: menuItemId,
          categoryId: category.id,
        },
      });
      console.log(`Linked category "${category.name}" to menu item "${menuItem.name}" (ID: ${menuItemId})`);
    }
  }
  console.log('Finished linking categories to menu items.');
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