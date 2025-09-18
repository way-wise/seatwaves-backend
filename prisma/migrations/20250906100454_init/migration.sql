/*
  Warnings:

  - You are about to drop the `_becomehostTocard` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."_becomehostTocard" DROP CONSTRAINT "_becomehostTocard_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_becomehostTocard" DROP CONSTRAINT "_becomehostTocard_B_fkey";

-- DropTable
DROP TABLE "public"."_becomehostTocard";

-- AddForeignKey
ALTER TABLE "public"."card" ADD CONSTRAINT "card_becomehostId_fkey" FOREIGN KEY ("becomehostId") REFERENCES "public"."becomehost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
