/*
  Warnings:

  - You are about to drop the column `booking_period` on the `rental_bookings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "categories_name_key";

-- AlterTable
ALTER TABLE "rental_bookings" DROP COLUMN "booking_period";
