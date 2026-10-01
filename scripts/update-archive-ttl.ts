import mongoose from "mongoose";
import dotenv from "dotenv";
import Ticket from "../models/Ticket";

dotenv.config();

// Mongoose can't change expireAfterSeconds on an existing index (IndexOptionsConflict),
// so apply the new TTL from models/Ticket.ts with collMod.
const TTL_SECONDS = 28 * 24 * 60 * 60;

async function main() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    await mongoose.connection.db!.command({
        collMod: Ticket.collection.collectionName,
        index: { keyPattern: { archivedAt: 1 }, expireAfterSeconds: TTL_SECONDS },
    });
    console.log(`Archive TTL set to ${TTL_SECONDS} seconds (28 days)`);
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
