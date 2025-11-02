-- Expand Pixel table with full Spiral Dynamics schema
ALTER TABLE "Pixel" ADD COLUMN "statement" text;
ALTER TABLE "Pixel" ADD COLUMN "context" text;
ALTER TABLE "Pixel" ADD COLUMN "explanation" text;
ALTER TABLE "Pixel" ADD COLUMN "colorStage" jsonb;
ALTER TABLE "Pixel" ADD COLUMN "confidenceScore" real;
ALTER TABLE "Pixel" ADD COLUMN "tooNuanced" boolean NOT NULL DEFAULT false;
ALTER TABLE "Pixel" ADD COLUMN "absoluteThinking" boolean NOT NULL DEFAULT false;
ALTER TABLE "Pixel" ADD COLUMN "archived" boolean NOT NULL DEFAULT false;
ALTER TABLE "Pixel" ADD COLUMN "updatedAt" timestamp;

-- Backfill from content field for existing pixels (if any exist)
UPDATE "Pixel" 
SET 
  "statement" = COALESCE(content->>'summary', 'Legacy pixel'),
  "context" = 'Migrated from previous schema',
  "explanation" = 'Requires re-analysis',
  "colorStage" = '{"beige":0,"purple":0,"red":0,"blue":0,"orange":0,"green":0,"yellow":0,"turquoise":0,"coral":0,"teal":0}'::jsonb,
  "confidenceScore" = 0.5,
  "updatedAt" = "createdAt"
WHERE "statement" IS NULL;

-- Make required fields NOT NULL after backfill
ALTER TABLE "Pixel" ALTER COLUMN "statement" SET NOT NULL;
ALTER TABLE "Pixel" ALTER COLUMN "context" SET NOT NULL;
ALTER TABLE "Pixel" ALTER COLUMN "explanation" SET NOT NULL;
ALTER TABLE "Pixel" ALTER COLUMN "colorStage" SET NOT NULL;
ALTER TABLE "Pixel" ALTER COLUMN "confidenceScore" SET NOT NULL;
ALTER TABLE "Pixel" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Make content nullable (legacy field)
ALTER TABLE "Pixel" ALTER COLUMN "content" DROP NOT NULL;

-- Create PixelHistory table
CREATE TABLE IF NOT EXISTS "PixelHistory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "pixelId" uuid NOT NULL,
  "statement" text NOT NULL,
  "colorStage" jsonb NOT NULL,
  "confidenceScore" real NOT NULL,
  "changeReason" text,
  "timestamp" timestamp NOT NULL
);

ALTER TABLE "PixelHistory" ADD CONSTRAINT "PixelHistory_pixelId_Pixel_id_fk" 
  FOREIGN KEY ("pixelId") REFERENCES "Pixel"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "PixelHistory_pixelId_idx" ON "PixelHistory"("pixelId");

-- Create PixelFamily table
CREATE TABLE IF NOT EXISTS "PixelFamily" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL,
  "name" text,
  "createdAt" timestamp NOT NULL
);

ALTER TABLE "PixelFamily" ADD CONSTRAINT "PixelFamily_userId_User_id_fk" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "PixelFamily_userId_idx" ON "PixelFamily"("userId");

-- Create PixelFamilyMember junction table
CREATE TABLE IF NOT EXISTS "PixelFamilyMember" (
  "familyId" uuid NOT NULL,
  "pixelId" uuid NOT NULL,
  PRIMARY KEY ("familyId", "pixelId")
);

ALTER TABLE "PixelFamilyMember" ADD CONSTRAINT "PixelFamilyMember_familyId_PixelFamily_id_fk" 
  FOREIGN KEY ("familyId") REFERENCES "PixelFamily"("id") ON DELETE CASCADE;

ALTER TABLE "PixelFamilyMember" ADD CONSTRAINT "PixelFamilyMember_pixelId_Pixel_id_fk" 
  FOREIGN KEY ("pixelId") REFERENCES "Pixel"("id") ON DELETE CASCADE;

-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS "Pixel_archived_idx" ON "Pixel"("archived");
CREATE INDEX IF NOT EXISTS "Pixel_confidenceScore_idx" ON "Pixel"("confidenceScore");
CREATE INDEX IF NOT EXISTS "Pixel_updatedAt_idx" ON "Pixel"("updatedAt");

