import { app } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";

async function start(): Promise<void> {
  const databaseConnected = await connectDatabase(env.mongoUri);
  app.locals.databaseConnected = databaseConnected;
  app.listen(env.port, "0.0.0.0", () => {
    console.log(`MineOS backend listening on http://0.0.0.0:${env.port}`);
    if (!databaseConnected) {
      console.warn("Database-backed endpoints will return errors until MongoDB becomes available.");
    }
  });
}

start().catch((error: unknown) => {
  console.error("Unable to start backend listener", error);
});
