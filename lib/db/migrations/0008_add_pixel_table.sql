CREATE TABLE IF NOT EXISTS "Pixel" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chatId" uuid NOT NULL,
  "messageId" uuid NOT NULL,
  "content" jsonb NOT NULL,
  "embedding" text,
  "chromaId" text NOT NULL,
  "userId" uuid NOT NULL,
  "createdAt" timestamp NOT NULL
);

ALTER TABLE "Pixel" ADD CONSTRAINT "Pixel_chatId_Chat_id_fk" 
  FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE;

ALTER TABLE "Pixel" ADD CONSTRAINT "Pixel_messageId_Message_v2_id_fk" 
  FOREIGN KEY ("messageId") REFERENCES "Message_v2"("id") ON DELETE CASCADE;

ALTER TABLE "Pixel" ADD CONSTRAINT "Pixel_userId_User_id_fk" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "Pixel_chatId_idx" ON "Pixel"("chatId");
CREATE INDEX IF NOT EXISTS "Pixel_userId_idx" ON "Pixel"("userId");
CREATE INDEX IF NOT EXISTS "Pixel_chromaId_idx" ON "Pixel"("chromaId");

