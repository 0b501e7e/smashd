-- AlterTable
ALTER TABLE "LoyaltyPoints" ADD COLUMN     "birthdayRewardSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastPointsReset" TIMESTAMP(3),
ADD COLUMN     "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tier" TEXT NOT NULL DEFAULT 'BRONZE',
ADD COLUMN     "totalSpentThisYear" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PointsTransaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "loyaltyPointsId" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "orderId" INTEGER,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PointsTransaction" ADD CONSTRAINT "PointsTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsTransaction" ADD CONSTRAINT "PointsTransaction_loyaltyPointsId_fkey" FOREIGN KEY ("loyaltyPointsId") REFERENCES "LoyaltyPoints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsTransaction" ADD CONSTRAINT "PointsTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
