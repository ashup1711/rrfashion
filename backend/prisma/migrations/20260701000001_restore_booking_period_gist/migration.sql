-- Restore booking_period tstzrange column that was unintentionally dropped
-- by migration 20260630110107_category_name_unique_removed
--
-- This column is critical for the rental subsystem (checkAvailability, book, extend)
-- and enables efficient overlap detection via GiST index + exclusion constraint.

-- Ensure btree_gist extension is available (idempotent — already created by
-- migration 20260630105955_rental_gist_constraint but kept for self-containment)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Re-add the tstzrange column
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS booking_period tstzrange;

-- Populate for existing rows (both bookedAt and dueReturnAt are NOT NULL,
-- so this will always produce a valid range)
UPDATE rental_bookings
SET booking_period = tstzrange("bookedAt", "dueReturnAt", '[)')
WHERE booking_period IS NULL;

-- Make NOT NULL — all future bookings must have a booking_period set
ALTER TABLE rental_bookings ALTER COLUMN booking_period SET NOT NULL;

-- Re-create GiST index for efficient overlap lookups on active bookings
-- (was automatically dropped when booking_period column was removed)
CREATE INDEX IF NOT EXISTS idx_rental_bookings_overlap
  ON rental_bookings USING GIST ("unitId", booking_period)
  WHERE status NOT IN ('CLOSED', 'CANCELLED');

-- Re-create exclusion constraint preventing double-booking of the same unit
-- during overlapping time periods (was automatically dropped when
-- booking_period column was removed)
ALTER TABLE rental_bookings
  ADD CONSTRAINT rental_bookings_no_overlap
  EXCLUDE USING GIST (
    "unitId" WITH =,
    booking_period WITH &&
  )
  WHERE (status NOT IN ('CLOSED', 'CANCELLED'));

-- Also ensure the partial index on status for active bookings exists
-- (this index only depends on "status", so it likely survived the column drop,
-- but CREATE INDEX IF NOT EXISTS is safe to re-run)
CREATE INDEX IF NOT EXISTS idx_rental_bookings_active_status
  ON rental_bookings (status)
  WHERE status NOT IN ('CLOSED', 'CANCELLED');
