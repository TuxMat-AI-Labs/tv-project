-- Underscan compensation per display, as a percentage of the viewport.
--
-- A panel that magnifies what it is given crops its own edges, after the page
-- has finished drawing and therefore invisibly to both the browser and MDC.
-- Rendering into a smaller centred box cancels it: 1.25x magnification needs 80.
--
-- Defaults to 100 (fill the viewport), so every existing display is unchanged.
ALTER TABLE "Display" ADD COLUMN "contentScale" INTEGER NOT NULL DEFAULT 100;
