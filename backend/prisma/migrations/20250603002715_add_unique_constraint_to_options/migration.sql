/*
  Warnings:

  - A unique constraint covering the columns `[name,categoryId]` on the table `CustomizationOption` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CustomizationOption_name_categoryId_key" ON "CustomizationOption"("name", "categoryId");
