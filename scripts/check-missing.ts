import fs from "fs";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

import Ticket from "../models/Ticket";

const NOTION_DIR = "./Notion-Data/Executive Committee";

async function main() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    
    // Get all files from directory
    const files = fs.readdirSync(NOTION_DIR);
    const mdFiles = files.filter(f => f.endsWith(".md"));
    
    console.log(`Total Markdown files found: ${mdFiles.length}`);
    
    let missingCount = 0;
    for (const file of mdFiles) {
        if (file.toLowerCase().includes("untitled")) continue;
        
        // Extract title part from "Title 32digitID.md"
        // Most Notion filenames are "Title UUID.md" where UUID is 32 chars
        const titlePart = file.replace(/ [0-9a-f]{32}\.md$/, "").trim();
        
        const exists = await Ticket.findOne({ title: titlePart });
        if (!exists) {
            // Some titles might be slightly truncated in the filename
            const partialMatch = await Ticket.findOne({ title: new RegExp("^" + titlePart.substring(0, 10).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") });
            if (!partialMatch) {
                console.log(`Missing from DB: ${titlePart} (File: ${file})`);
                missingCount++;
            }
        }
    }
    
    console.log(`Missing tasks: ${missingCount}`);
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
