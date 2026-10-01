-- Popups opened by a button: a trigger that never fires on its own.
--
-- Additive only: one new enum value. Every existing popup keeps its trigger.

-- AlterEnum
ALTER TYPE "PopupTrigger" ADD VALUE 'CLICK';
