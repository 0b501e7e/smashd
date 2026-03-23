-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('SUMUP', 'CASH', 'CARD_READER');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'SUMUP';
