/*
  Warnings:

  - You are about to drop the column `isDefaultSelected` on the `CustomizationOption` table. All the data in the column will be lost.
  - You are about to drop the `MenuItemCustomization` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[sumupProductId]` on the table `MenuItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "MenuItemCustomization" DROP CONSTRAINT "MenuItemCustomization_customizationCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "MenuItemCustomization" DROP CONSTRAINT "MenuItemCustomization_menuItemId_fkey";

-- DropIndex
DROP INDEX "MenuItem_name_key";

-- AlterTable
ALTER TABLE "CustomizationCategory" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "CustomizationOption" DROP COLUMN "isDefaultSelected",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "price" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "imageUrl" DROP NOT NULL;

-- DropTable
DROP TABLE "MenuItemCustomization";

-- CreateTable
CREATE TABLE "MenuItemCustomizationCategory" (
    "menuItemId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "MenuItemCustomizationCategory_pkey" PRIMARY KEY ("menuItemId","categoryId")
);

-- CreateIndex
CREATE INDEX "CustomizationOption_categoryId_idx" ON "CustomizationOption"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_sumupProductId_key" ON "MenuItem"("sumupProductId");

-- AddForeignKey
ALTER TABLE "MenuItemCustomizationCategory" ADD CONSTRAINT "MenuItemCustomizationCategory_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemCustomizationCategory" ADD CONSTRAINT "MenuItemCustomizationCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CustomizationCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
