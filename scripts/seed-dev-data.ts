import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { chat, message, pixel, user } from "../lib/db/schema";
import { generateHashedPassword } from "../lib/db/utils";
import { generateUUID } from "../lib/utils";

config({ path: ".env.local" });

const DEV_USER_EMAIL = "dev@example.com";
const DEV_PASSWORD = "password";

const samplePixels = [
  {
    statement: "Hard work always leads to success",
    context: "Discussing career progression and achievement",
    explanation:
      "Strong Orange achievement orientation with Blue work ethic. Absolute thinking ('always') shows high confidence.",
    colorStage: {
      beige: 0,
      purple: 0,
      red: 0.1,
      blue: 0.4,
      orange: 0.9,
      green: 0,
      yellow: -0.2,
      turquoise: 0,
      coral: 0,
      teal: 0,
    },
    confidenceScore: 0.85,
    tooNuanced: false,
    absoluteThinking: true,
  },
  {
    statement: "Everyone deserves to be heard equally",
    context: "Conversation about team dynamics and decision making",
    explanation:
      "Pure Green egalitarian perspective. Strong fairness and equality focus.",
    colorStage: {
      beige: 0,
      purple: 0.1,
      red: -0.3,
      blue: 0,
      orange: -0.4,
      green: 0.95,
      yellow: 0.2,
      turquoise: 0,
      coral: 0,
      teal: 0,
    },
    confidenceScore: 0.75,
    tooNuanced: false,
    absoluteThinking: false,
  },
  {
    statement: "There's always a right way to do things",
    context: "Discussing project methodology and best practices",
    explanation:
      "Blue order and structure. Believes in absolute right/wrong, rules and procedures.",
    colorStage: {
      beige: 0,
      purple: 0.2,
      red: 0,
      blue: 0.9,
      orange: 0.3,
      green: -0.1,
      yellow: -0.4,
      turquoise: 0,
      coral: 0,
      teal: 0,
    },
    confidenceScore: 0.8,
    tooNuanced: false,
    absoluteThinking: true,
  },
  {
    statement: "Different approaches work in different contexts",
    context: "Reflecting on various problem-solving strategies",
    explanation:
      "Yellow systemic thinking. Recognizes context-dependence and multiple valid approaches.",
    colorStage: {
      beige: 0,
      purple: 0,
      red: 0,
      blue: -0.3,
      orange: 0.1,
      green: 0.2,
      yellow: 0.85,
      turquoise: 0.3,
      coral: 0,
      teal: 0,
    },
    confidenceScore: 0.65,
    tooNuanced: false,
    absoluteThinking: false,
  },
  {
    statement: "I need to prove myself to feel valuable",
    context: "Discussing feelings of self-worth tied to achievement",
    explanation:
      "Orange achievement drive with underlying insecurity. Shows tension between Orange ambition and need for validation.",
    colorStage: {
      beige: 0.1,
      purple: 0.2,
      red: 0.3,
      blue: 0,
      orange: 0.85,
      green: 0,
      yellow: 0,
      turquoise: 0,
      coral: -0.2,
      teal: 0,
    },
    confidenceScore: 0.7,
    tooNuanced: false,
    absoluteThinking: false,
  },
];

async function seed() {
  if (!process.env.POSTGRES_URL) {
    console.error("❌ POSTGRES_URL not set in .env.local");
    process.exit(1);
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  console.log("🌱 Seeding development data...");

  try {
    // Create dev user
    console.log("Creating dev user...");
    const hashedPassword = generateHashedPassword(DEV_PASSWORD);

    const [devUser] = await db
      .insert(user)
      .values({
        email: DEV_USER_EMAIL,
        password: hashedPassword,
      })
      .onConflictDoNothing()
      .returning();

    if (devUser) {
      console.log(`✅ Created dev user: ${DEV_USER_EMAIL}`);
    } else {
      console.log("Dev user already exists, fetching...");
      const [existingUser] = await db
        .select()
        .from(user)
        .where(eq(user.email, DEV_USER_EMAIL))
        .limit(1);

      if (!existingUser) {
        throw new Error("Failed to create or fetch dev user");
      }

      console.log(`✅ Using existing dev user: ${DEV_USER_EMAIL}`);
    }

    const userId = devUser?.id || "";

    // Create dev chat
    console.log("Creating dev chat...");
    const chatId = generateUUID();

    await db
      .insert(chat)
      .values({
        id: chatId,
        userId,
        title: "Development Test Chat - Pixel Examples",
        visibility: "private",
        createdAt: new Date(),
      })
      .onConflictDoNothing();

    console.log("✅ Created dev chat");

    // Create sample pixels
    console.log("Creating sample pixels...");
    let pixelCount = 0;

    for (const pixelData of samplePixels) {
      const messageId = generateUUID();
      const pixelId = generateUUID();
      const chromaId = generateUUID();

      // Create message
      await db.insert(message).values({
        id: messageId,
        chatId,
        role: "user",
        parts: [
          { type: "text", text: `Message containing: ${pixelData.statement}` },
        ],
        attachments: [],
        createdAt: new Date(),
      });

      // Create pixel
      await db.insert(pixel).values({
        id: pixelId,
        userId,
        chatId,
        messageId,
        chromaId,
        statement: pixelData.statement,
        context: pixelData.context,
        explanation: pixelData.explanation,
        colorStage: pixelData.colorStage,
        confidenceScore: pixelData.confidenceScore,
        tooNuanced: pixelData.tooNuanced,
        absoluteThinking: pixelData.absoluteThinking,
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      pixelCount++;
    }

    console.log(`✅ Created ${pixelCount} sample pixels`);

    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Seed complete!");
    console.log("");
    console.log("Dev credentials:");
    console.log(`  Email: ${DEV_USER_EMAIL}`);
    console.log(`  Password: ${DEV_PASSWORD}`);
    console.log("");
    console.log("You can now:");
    console.log("  - Login with these credentials");
    console.log("  - See sample pixels in the dev chat");
    console.log("  - Explore pixel extraction in action");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seed();
