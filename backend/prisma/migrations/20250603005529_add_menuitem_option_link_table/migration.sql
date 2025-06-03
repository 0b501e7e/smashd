-- CreateTable
CREATE TABLE "MenuItemCustomizationOption" (
    "menuItemId" INTEGER NOT NULL,
    "customizationOptionId" INTEGER NOT NULL,

    CONSTRAINT "MenuItemCustomizationOption_pkey" PRIMARY KEY ("menuItemId","customizationOptionId")
);

-- AddForeignKey
ALTER TABLE "MenuItemCustomizationOption" ADD CONSTRAINT "MenuItemCustomizationOption_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemCustomizationOption" ADD CONSTRAINT "MenuItemCustomizationOption_customizationOptionId_fkey" FOREIGN KEY ("customizationOptionId") REFERENCES "CustomizationOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
