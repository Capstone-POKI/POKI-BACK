WITH ranked AS (
    SELECT
        "id",
        CAST(
            ROW_NUMBER() OVER (
                PARTITION BY "pitchId"
                ORDER BY "createdAt" ASC, "id" ASC
            ) AS INTEGER
        ) AS normalized_version
    FROM "Notice"
)
UPDATE "Notice" n
SET "version" = ranked.normalized_version
FROM ranked
WHERE n."id" = ranked."id" AND n."version" <> ranked.normalized_version;

WITH ranked AS (
    SELECT
        "id",
        CAST(
            ROW_NUMBER() OVER (
                PARTITION BY "pitchId"
                ORDER BY "createdAt" ASC, "id" ASC
            ) AS INTEGER
        ) AS normalized_version
    FROM "IRDeck"
)
UPDATE "IRDeck" d
SET "version" = ranked.normalized_version
FROM ranked
WHERE d."id" = ranked."id" AND d."version" <> ranked.normalized_version;

WITH ranked AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "pitchId"
            ORDER BY "version" DESC, "createdAt" DESC, "id" DESC
        ) AS latest_rank
    FROM "Notice"
    WHERE "isLatest" = true
)
UPDATE "Notice" n
SET "isLatest" = false
FROM ranked
WHERE n."id" = ranked."id" AND ranked.latest_rank > 1;

WITH ranked AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "pitchId"
            ORDER BY "version" DESC, "createdAt" DESC, "id" DESC
        ) AS latest_rank
    FROM "IRDeck"
    WHERE "isLatest" = true
)
UPDATE "IRDeck" d
SET "isLatest" = false
FROM ranked
WHERE d."id" = ranked."id" AND ranked.latest_rank > 1;

WITH ranked AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "pitchId"
            ORDER BY "rehearsalNumber" DESC, "createdAt" DESC, "id" DESC
        ) AS latest_rank
    FROM "Rehearsal"
    WHERE "isLatest" = true
)
UPDATE "Rehearsal" r
SET "isLatest" = false
FROM ranked
WHERE r."id" = ranked."id" AND ranked.latest_rank > 1;

WITH ranked AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "pitchId"
            ORDER BY "version" DESC, "createdAt" DESC, "id" DESC
        ) AS latest_rank
    FROM "QATraining"
    WHERE "isLatest" = true
)
UPDATE "QATraining" q
SET "isLatest" = false
FROM ranked
WHERE q."id" = ranked."id" AND ranked.latest_rank > 1;

DROP INDEX IF EXISTS "Notice_pitchId_version_idx";
DROP INDEX IF EXISTS "IRDeck_pitchId_version_idx";

CREATE UNIQUE INDEX "Notice_pitchId_version_key"
ON "Notice"("pitchId", "version");

CREATE UNIQUE INDEX "IRDeck_pitchId_version_key"
ON "IRDeck"("pitchId", "version");

CREATE UNIQUE INDEX "Notice_one_latest_per_pitch"
ON "Notice"("pitchId")
WHERE "isLatest" = true;

CREATE UNIQUE INDEX "IRDeck_one_latest_per_pitch"
ON "IRDeck"("pitchId")
WHERE "isLatest" = true;

CREATE UNIQUE INDEX "Rehearsal_one_latest_per_pitch"
ON "Rehearsal"("pitchId")
WHERE "isLatest" = true;

CREATE UNIQUE INDEX "QATraining_one_latest_per_pitch"
ON "QATraining"("pitchId")
WHERE "isLatest" = true;
