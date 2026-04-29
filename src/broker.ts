import { connect } from "amqplib";
import { z } from "zod";
import { generate } from "@/generate";

const PromptSchema = z.object({
  prompt: z.string(),
  userId: z.number(),
});

const queue = "tasks";
const connection = await connect("amqp://localhost");

const channelSender = await connection.createChannel();
await channelSender.assertQueue(queue, { durable: true });
const channelConsumer = await connection.createChannel();
await channelConsumer.assertQueue(queue, { durable: true });

await channelConsumer.consume(queue, async (msg) => {
  if (msg === null) return;

  try {
    const rawContent = msg.content.toString();
    const parsedJson = JSON.parse(rawContent);
    const { prompt, userId } = PromptSchema.parse(parsedJson);

    console.log(`[broker] task received userId=${userId} prompt="${prompt}"`);
    await generate(prompt, userId);
    channelConsumer.ack(msg);
    console.log(`[broker] task completed userId=${userId}`);
  } catch (error) {
    console.error("[broker] task failed:", error);
    channelConsumer.nack(msg, false, false);
  }
});

export const generateRecipe = (data: z.infer<typeof PromptSchema>) => {
  try {
    const parsedData = PromptSchema.parse(data);
    const payload = Buffer.from(JSON.stringify(parsedData));

    channelSender.sendToQueue(queue, payload, { persistent: true });
    console.log(
      `[broker] task queued userId=${parsedData.userId} prompt="${parsedData.prompt}"`,
    );
  } catch (error) {
    console.error("[broker] failed to enqueue task:", error);
    throw error;
  }
};
