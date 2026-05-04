import { FD_RATES } from "../src/lib/fd-data.ts";
import {
  closeMongoForScript,
  getMongoDbForScript,
  loadLocalEnv,
} from "./lib/runtime.ts";

loadLocalEnv();

try {
  const db = await getMongoDbForScript();
  const now = new Date();
  const collection = db.collection<{ _id: string } & Record<string, unknown>>(
    "fd_rates"
  );

  await collection.createIndex({
    bankType: 1,
    tenorMinMonths: 1,
    tenorMaxMonths: 1,
  });
  await collection.createIndex({ regularRate: -1 });
  await collection.createIndex({ seniorRate: -1 });

  const result = await collection.bulkWrite(
    FD_RATES.map((rate) => ({
      updateOne: {
        filter: { _id: rate.id },
        update: {
          $set: {
            ...rate,
            updatedAt: now,
          },
          $setOnInsert: {
            _id: rate.id,
            createdAt: now,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        collection: "fd_rates",
        sourceCount: FD_RATES.length,
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
      },
      null,
      2
    )
  );
} finally {
  await closeMongoForScript();
}
