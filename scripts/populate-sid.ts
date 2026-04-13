import mongoose from "mongoose";
import dotenv from "dotenv";
import Ticket from "../models/Ticket";
import Counter from "../models/Counter";

dotenv.config();

async function main() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("Connected to MongoDB");

    const tickets = await Ticket.find({ sid: { $exists: false } }).sort({ createdAt: 1 });
    console.log(`Found ${tickets.length} tickets without SID`);

    let count = 0;
    // Get current counter or initialize
    let counter = await Counter.findOne({ name: "ticket" });
    let currentSeq = counter ? counter.seq : 0;

    for (const ticket of tickets) {
        currentSeq++;
        ticket.sid = currentSeq;
        await ticket.save();
        count++;
    }

    // Update counter in DB
    await Counter.findOneAndUpdate(
        { name: "ticket" },
        { seq: currentSeq },
        { upsert: true }
    );

    console.log(`Updated ${count} tickets with sequential SIDs. Final sequence: ${currentSeq}`);
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
