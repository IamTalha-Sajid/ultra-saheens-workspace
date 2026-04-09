import fs from "fs";
import { parse } from "csv-parse/sync";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

import Ticket from "../models/Ticket";
import User from "../models/User";

const CSV_PATH = "./Notion-Data/Executive Committee 32515fa1564d806aaa63c6d4bbcd1917_all.csv";

async function main() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("Connected to MongoDB.");

    const initialCount = await Ticket.countDocuments({});
    console.log(`Current ticket count in DB: ${initialCount}`);

    const fileContent = fs.readFileSync(CSV_PATH, "utf-8").replace(/^\uFEFF/, "");
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    }) as any[];

    console.log(`Parsed ${records.length} records from CSV.`);

    const users = await User.find({});
    if (users.length === 0) {
        throw new Error("No users found in DB. Please log in to the app first to create a user.");
    }

    const userMap = new Map();
    for (const u of users) {
        if (u.name) {
            userMap.set(u.name.toLowerCase(), u._id);
            const words = u.name.toLowerCase().split(/\s+/);
            for (const word of words) {
                if (word.length > 2 && !userMap.has(word)) userMap.set(word, u._id);
            }
        }
        if (u.email) userMap.set(u.email.toLowerCase(), u._id);
        if (u.username) userMap.set(u.username.toLowerCase(), u._id);
    }

    function findUser(csvName: string): mongoose.Types.ObjectId | undefined {
        const key = csvName.trim().toLowerCase();
        if (userMap.has(key)) return userMap.get(key);
        const csvWords = key.split(/\s+/);
        for (const word of csvWords) {
            if (word.length > 2 && userMap.has(word)) return userMap.get(word);
        }
        for (const u of users) {
            if (u.name && u.name.toLowerCase().includes(key)) return u._id as mongoose.Types.ObjectId;
        }
        return undefined;
    }

    const defaultCreatorId = users[0]._id;
    console.log(`Using default creator: ${users[0].name || users[0].email}`);


    let createdCount = 0;
    for (const record of records) {
        const title = record["Task name"]?.trim();
        if (!title) continue;

        const exists = await Ticket.findOne({ title });
        if (exists) {
            console.log(`Skip (duplicate): ${title}`);
            continue;
        }

        let assigneeId: any = undefined;
        const propertyStr = record["Property"]?.trim();
        if (propertyStr) {
            for (const a of propertyStr.split(",")) {
                const match = findUser(a.trim());
                if (match) { assigneeId = match; break; }
            }
        }

        let status = "Todo";
        const notionStatus = record["Status"]?.trim();
        if (notionStatus === "In progress") status = "In progress";
        if (notionStatus === "Done") status = "Done";

        const estimateStr = record["Due date"]?.trim();
        let estimate: string | undefined = undefined;
        if (estimateStr) {
            const parts = estimateStr.split("/");
            if (parts.length === 3) {
                const [mm, dd, yyyy] = parts;
                estimate = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T12:00:00`;
            }
        }

        let priority = "Medium";
        const p = record["Priority"]?.trim();
        if (["Highest", "High", "Medium", "Low", "Lowest"].includes(p)) priority = p;

        let createdAt = new Date();
        if (record["Updated at"]) {
            const d = new Date(record["Updated at"]);
            if (!isNaN(d.getTime())) createdAt = d;
        }

        await Ticket.create({
            title,
            description: "",
            status,
            assigneeId,
            creatorId: defaultCreatorId,
            priority,
            type: "Task",
            estimate,
            createdAt,
        });
        createdCount++;
        console.log(`Created: ${title}`);
    }

    const finalCount = await Ticket.countDocuments({});
    console.log(`\nDone! Created ${createdCount} new tickets. Total in DB: ${finalCount}`);
    process.exit(0);
}

main().catch(error => {
    console.error("Migration failed:", error);
    process.exit(1);
});
