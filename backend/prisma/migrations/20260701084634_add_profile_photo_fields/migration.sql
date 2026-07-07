-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "rental_bookings" ALTER COLUMN "booking_period" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "profilePhoto" TEXT,
ADD COLUMN     "profilePhotoKey" TEXT;
