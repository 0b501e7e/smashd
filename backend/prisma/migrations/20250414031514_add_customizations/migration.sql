-- CreateTable
CREATE TABLE "CustomizationCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CustomizationCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomizationOption" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDefaultSelected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CustomizationOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemCustomization" (
    "menuItemId" INTEGER NOT NULL,
    "customizationCategoryId" INTEGER NOT NULL,

    CONSTRAINT "MenuItemCustomization_pkey" PRIMARY KEY ("menuItemId","customizationCategoryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomizationCategory_name_key" ON "CustomizationCategory"("name");

-- AddForeignKey
ALTER TABLE "CustomizationOption" ADD CONSTRAINT "CustomizationOption_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CustomizationCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemCustomization" ADD CONSTRAINT "MenuItemCustomization_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemCustomization" ADD CONSTRAINT "MenuItemCustomization_customizationCategoryId_fkey" FOREIGN KEY ("customizationCategoryId") REFERENCES "CustomizationCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
