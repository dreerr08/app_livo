-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "calories" INTEGER,
ADD COLUMN     "ingredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weightGrams" INTEGER;
