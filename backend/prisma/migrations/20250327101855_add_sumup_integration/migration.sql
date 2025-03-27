-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'CONFIRMED';

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "sumupProductId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "estimatedReadyTime" TIMESTAMP(3),
ADD COLUMN     "readyAt" TIMESTAMP(3),
ADD COLUMN     "sumupOrderId" TEXT;
