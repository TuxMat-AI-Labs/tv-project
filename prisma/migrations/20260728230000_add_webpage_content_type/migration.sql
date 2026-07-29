-- Adds WEBPAGE to MediaType: a live page rendered in an iframe, whose
-- `fileUrl` holds the URL instead of an uploaded asset.
ALTER TYPE "MediaType" ADD VALUE 'WEBPAGE';
