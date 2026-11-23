import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User";

dotenv.config();

/**
 * One-off migration for the roles / email-less directors change. Idempotent.
 *
 *   npx tsx scripts/migrate-roles.ts                       # dry run (default): prints what it would do
 *   npx tsx scripts/migrate-roles.ts --apply               # swap email index + backfill roles
 *   npx tsx scripts/migrate-roles.ts --apply --promote talha.sajid@ultrashaheens.com
 *
 * Steps:
 *  1. Replace the old non-sparse unique `email_1` index with a partial unique
 *     index, so several users without an email can coexist.
 *  2. Set role "member" on users that have no role yet.
 *  3. Optionally promote the given email(s) to "admin".
 *
 * Back up the `users` collection before --apply, and check the database name
 * printed below is the one you intend to change.
 */

const apply = process.argv.includes("--apply");
const promote: string[] = [];
process.argv.forEach((arg, i) => {
    if (arg === "--promote" && process.argv[i + 1]) {
        promote.push(process.argv[i + 1].toLowerCase().trim());
    }
});

async function main() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    const db = mongoose.connection.db!;
    const users = User.collection;

    console.log(`Database: ${db.databaseName}`);
    console.log(apply ? "Mode: APPLY" : "Mode: dry run (pass --apply to write)");

    // 1. Email index
    const indexes = await users.indexes();
    const oldEmail = indexes.find(
        (ix) => ix.name === "email_1" && !ix.partialFilterExpression
    );
    const hasPartial = indexes.some((ix) => ix.name === "email_partial_unique");

    if (oldEmail) {
        console.log("Old non-sparse unique index email_1 found: will drop it.");
        if (apply) await users.dropIndex("email_1");
    } else {
        console.log("No old email_1 index to drop.");
    }
    if (hasPartial) {
        console.log("Partial unique email index already exists.");
    } else {
        console.log("Partial unique email index missing: will create it.");
        if (apply) {
            await users.createIndex(
                { email: 1 },
                {
                    name: "email_partial_unique",
                    unique: true,
                    partialFilterExpression: { email: { $type: "string" } },
                }
            );
        }
    }

    // 2. Role backfill
    const missingRole = await users.countDocuments({ role: { $exists: false } });
    console.log(`Users without a role: ${missingRole}`);
    if (apply && missingRole > 0) {
        const res = await users.updateMany(
            { role: { $exists: false } },
            { $set: { role: "member" } }
        );
        console.log(`Backfilled role=member on ${res.modifiedCount} users.`);
    }

    // 3. Promotions
    for (const email of promote) {
        const found = await users.findOne({ email }, { projection: { _id: 1, role: 1 } });
        if (!found) {
            console.log(`Promote: no user with email ${email} (skipped).`);
            continue;
        }
        console.log(`Promote: ${email} -> admin (currently ${found.role ?? "none"}).`);
        if (apply) await users.updateOne({ _id: found._id }, { $set: { role: "admin" } });
    }

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
