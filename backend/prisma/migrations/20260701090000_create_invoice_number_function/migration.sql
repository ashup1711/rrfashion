-- Create next_invoice_number() function that safely generates sequential invoice numbers
-- using pg_advisory_xact_lock for concurrency safety within each transaction.
-- 
-- The function:
-- 1. Acquires a PostgreSQL advisory lock (scoped to the transaction) to prevent duplicates
-- 2. Upserts into invoice_sequences table to get/initialize the sequence
-- 3. Returns the next number in the sequence
--
-- Parameters:
--   store_id TEXT  - The store UUID
--   fin_year TEXT  - Financial year string (e.g. '2026-27')
--
-- Returns: INTEGER - The next sequential number

CREATE OR REPLACE FUNCTION next_invoice_number(
    store_id TEXT,
    fin_year TEXT
) RETURNS INTEGER
    LANGUAGE plpgsql
    STRICT
AS $$
DECLARE
    -- Use a deterministic lock key based on the store_id and fin_year hash
    lock_key INTEGER;
    next_num INTEGER;
BEGIN
    -- Generate a deterministic advisory lock key from store_id and fin_year
    -- This ensures all concurrent calls for the same store+year serialize,
    -- while different stores/years proceed independently.
    lock_key := ('x' || substr(md5(store_id || '_' || fin_year), 1, 8))::bit(32)::integer;

    -- Acquire transaction-scoped advisory lock
    -- The lock is automatically released when the transaction commits or rolls back
    PERFORM pg_advisory_xact_lock(lock_key);

    -- Upsert the sequence row: increment if exists, insert if not
    INSERT INTO invoice_sequences (store_id, financial_year, last_number)
    VALUES (store_id, fin_year, 1)
    ON CONFLICT (store_id, financial_year)
    DO UPDATE SET last_number = invoice_sequences.last_number + 1
    RETURNING last_number INTO next_num;

    RETURN next_num;
END;
$$;
