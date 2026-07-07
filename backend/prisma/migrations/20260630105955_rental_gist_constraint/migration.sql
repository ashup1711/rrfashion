-- Enable btree_gist extension (idempotent)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add tstzrange column for efficient overlap queries
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS booking_period tstzrange;

-- Populate booking_period for existing rows
UPDATE rental_bookings
SET booking_period = tstzrange("bookedAt", "dueReturnAt", '[)')
WHERE booking_period IS NULL;

-- Make booking_period NOT NULL for future rows
ALTER TABLE rental_bookings ALTER COLUMN booking_period SET NOT NULL;

-- Create GiST index for overlap queries on active/non-cancelled bookings
CREATE INDEX IF NOT EXISTS idx_rental_bookings_overlap
  ON rental_bookings USING GIST ("unitId", booking_period)
  WHERE status NOT IN ('CLOSED', 'CANCELLED');

-- Create exclusion constraint to prevent double-booking of the same unit
-- Uses btree_gist to allow = operator on unit_id inside GiST index
ALTER TABLE rental_bookings
  ADD CONSTRAINT rental_bookings_no_overlap
  EXCLUDE USING GIST (
    "unitId" WITH =,
    booking_period WITH &&
  )
  WHERE (status NOT IN ('CLOSED', 'CANCELLED'));

-- Also add a partial index on status for faster status-based queries
CREATE INDEX IF NOT EXISTS idx_rental_bookings_active_status
  ON rental_bookings (status)
  WHERE status NOT IN ('CLOSED', 'CANCELLED');
