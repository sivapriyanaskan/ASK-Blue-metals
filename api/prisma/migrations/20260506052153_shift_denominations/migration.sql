-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "closingDenominations" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "openingDenominations" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "transferDenominations" JSONB NOT NULL DEFAULT '[]';
