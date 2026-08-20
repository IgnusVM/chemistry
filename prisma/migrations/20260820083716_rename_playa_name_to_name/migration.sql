-- "Playa name" is generalized to an optional secondary "name" field.
-- displayName remains the required, always-shown "user name". A plain
-- rename preserves existing values (e.g. real playa names already set).
ALTER TABLE "User" RENAME COLUMN "playaName" TO "name";
