-- AlterEnum
ALTER TYPE "FieldType" ADD VALUE 'dropdown';

-- AlterTable
ALTER TABLE "FieldDefinition" ADD COLUMN     "isUnique" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "options" JSONB;
