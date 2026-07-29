-- Per-display opt-out from a room's shared rotation. Defaults to true so every
-- existing screen keeps its current behaviour.
ALTER TABLE "Display" ADD COLUMN "joinsRotation" BOOLEAN NOT NULL DEFAULT true;
