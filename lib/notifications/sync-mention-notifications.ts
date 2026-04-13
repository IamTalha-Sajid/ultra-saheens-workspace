import mongoose from "mongoose";
import User from "@/models/User";
import MentionNotification from "@/models/MentionNotification";
import {
  collectMentionIdSetFromJsonString,
  collectMentionIdsAndLabels,
} from "@/lib/tiptap/collect-mentions";
import { sendEmailNotification } from "./email-notifier";

export async function createNotificationsForNewMentions(params: {
  previousContentJson: string;
  newContent: unknown;
  pageId: mongoose.Types.ObjectId;
  pageTitle: string;
  actorId: mongoose.Types.ObjectId;
  actorName: string;
}): Promise<void> {
  const oldIds = collectMentionIdSetFromJsonString(params.previousContentJson);
  const newMap = collectMentionIdsAndLabels(params.newContent);
  const hasEveryone = newMap.has("everyone") && !oldIds.has("everyone");
  const actorStr = String(params.actorId);

  let added = [...newMap.keys()].filter(
    (id) => !oldIds.has(id) && id !== actorStr && id !== "everyone"
  );

  if (hasEveryone) {
    const allUsers = await User.find({ _id: { $ne: params.actorId } }).select("_id").lean();
    const allUserIds = allUsers.map(u => String(u._id));
    added = Array.from(new Set([...added, ...allUserIds]));
  }

  if (added.length === 0) return;

  const oids = added.map((id) => new mongoose.Types.ObjectId(id));
  const existing = await User.find({ _id: { $in: oids } })
    .select("_id")
    .lean();
  const valid = new Set(existing.map((u) => String(u._id)));

  const docs = added
    .filter((id) => valid.has(id))
    .map((recipientId) => ({
      recipientId: new mongoose.Types.ObjectId(recipientId),
      actorId: params.actorId,
      pageId: params.pageId,
      pageTitle: params.pageTitle,
      mentionLabel: hasEveryone ? "@everyone" : (newMap.get(recipientId) ?? ""),
      actorName: params.actorName,
      read: false,
    }));

  if (docs.length > 0) {
    await MentionNotification.insertMany(docs);

    // Send Email Alerts
    await Promise.all(
      added
        .filter((id) => valid.has(id))
        .map((recipientId) => 
          sendEmailNotification({
            recipientId: new mongoose.Types.ObjectId(recipientId),
            actorName: params.actorName,
            ticketTitle: params.pageTitle,
            pageId: params.pageId,
            type: "mention"
          })
        )
    );
  }
}
