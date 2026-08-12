/*
  Warnings:

  - Added the required column `idempotencyKey` to the `BookingExtension` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BookingExtension" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bookingId" INTEGER NOT NULL,
    "extraNights" INTEGER NOT NULL,
    "previousCheckOutDate" DATETIME NOT NULL,
    "newCheckOutDate" DATETIME NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingExtension_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BookingExtension" ("bookingId", "createdAt", "extraNights", "id", "newCheckOutDate", "previousCheckOutDate") SELECT "bookingId", "createdAt", "extraNights", "id", "newCheckOutDate", "previousCheckOutDate" FROM "BookingExtension";
DROP TABLE "BookingExtension";
ALTER TABLE "new_BookingExtension" RENAME TO "BookingExtension";
CREATE UNIQUE INDEX "BookingExtension_idempotencyKey_key" ON "BookingExtension"("idempotencyKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
