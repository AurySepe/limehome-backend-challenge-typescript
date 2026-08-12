-- Step 1: Add checkOutDate column as NULLABLE (optional)
ALTER TABLE "Booking" ADD COLUMN "checkOutDate" DATETIME;

-- Step 2: Backfill checkOutDate for existing rows using checkInDate + numberOfNights
UPDATE "Booking"
SET "checkOutDate" = datetime("checkInDate", '+' || "numberOfNights" || ' days')
WHERE "checkOutDate" IS NULL;

-- Step 3: SQLite does not support ALTER COLUMN NOT NULL directly.
-- In SQLite standard migration practice, we recreate the table with NOT NULL constraint if required,
-- or ensure backfilled state. In SQLite Prisma migrations, creating a new table with NOT NULL
-- and copying backfilled data is the safe migration pattern.
CREATE TABLE "new_Booking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guestName" TEXT NOT NULL,
    "unitID" TEXT NOT NULL,
    "checkInDate" DATETIME NOT NULL,
    "numberOfNights" INTEGER NOT NULL,
    "checkOutDate" DATETIME NOT NULL
);

INSERT INTO "new_Booking" ("id", "guestName", "unitID", "checkInDate", "numberOfNights", "checkOutDate")
SELECT "id", "guestName", "unitID", "checkInDate", "numberOfNights", "checkOutDate" FROM "Booking";

DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
