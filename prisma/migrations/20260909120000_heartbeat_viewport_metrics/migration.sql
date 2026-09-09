-- What the TV browser reports about its own viewport, every heartbeat.
--
-- A screen can be online and on the right content and still show it wrong: the
-- browser zoomed, or dropped out of kiosk mode into a windowed browser with a
-- toolbar. Nothing the hub already watched moved in either case.
--
-- All nullable, so a TV still running an older bundle keeps posting heartbeats
-- without them and simply reads as "not reporting" until it reloads.
ALTER TABLE "Heartbeat" ADD COLUMN "viewportWidth" INTEGER;
ALTER TABLE "Heartbeat" ADD COLUMN "viewportHeight" INTEGER;
ALTER TABLE "Heartbeat" ADD COLUMN "screenWidth" INTEGER;
ALTER TABLE "Heartbeat" ADD COLUMN "screenHeight" INTEGER;
ALTER TABLE "Heartbeat" ADD COLUMN "pixelRatio" DOUBLE PRECISION;
