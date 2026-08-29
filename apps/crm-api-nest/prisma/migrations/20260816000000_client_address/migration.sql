-- Bên A's registered address, for the contract party block. Nullable: existing
-- clients have none, and only individuals are required to supply one (the DTO
-- enforces that, as it already did for their default Location).
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "address" TEXT;
