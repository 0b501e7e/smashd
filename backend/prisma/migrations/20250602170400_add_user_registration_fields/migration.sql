-- AlterTable
ALTER TABLE "User" ADD COLUMN     "acceptedTerms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "name" TEXT,
ADD COLUMN     "phoneNumber" TEXT;
