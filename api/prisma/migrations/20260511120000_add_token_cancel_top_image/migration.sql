-- Adds a second cancellation snapshot column so we can store both the
-- front (ANPR) and top (load bay) camera images captured at cancel time.
ALTER TABLE "Token" ADD COLUMN "cancelledTopImageRef" TEXT;
