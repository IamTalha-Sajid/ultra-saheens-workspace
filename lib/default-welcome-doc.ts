/**
 * Default “Welcome” page body (Tiptap JSON). Title is stored separately as "Welcome".
 */
export const WELCOME_PAGE_TITLE = "Welcome";

export const welcomePageTiptapDoc = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        {
          type: "text",
          text: "Welcome to the Ultra Shaheens Command Center",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "This Notion workspace serves as the " },
        {
          type: "text",
          text: "official central nervous system",
          marks: [{ type: "bold" }],
        },
        {
          type: "text",
          text: " for Ultra Shaheens. Our mission is to eliminate information silos by unifying all documentation, task management, and strategic data into a single, high-velocity environment.",
        },
      ],
    },
    { type: "horizontalRule" },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "🎯 Our Core Objective" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "To establish a " },
        {
          type: "text",
          text: "unified source of truth",
          marks: [{ type: "bold" }],
        },
        {
          type: "text",
          text: " that empowers every team member to execute with clarity and precision. By consolidating our workflows here, we ensure that every task is tracked, every document is accessible, and our collective intelligence is fully synchronized.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "🛠️ How We Use This Space" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Task Orchestration",
                  marks: [{ type: "bold" }],
                },
                {
                  type: "text",
                  text: ": Real-time management of project sprints, individual deliverables, and cross-functional milestones.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Knowledge Base",
                  marks: [{ type: "bold" }],
                },
                {
                  type: "text",
                  text: ": A living library of our standard operating procedures (SOPs), technical documentation, and brand assets.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Data Centralization",
                  marks: [{ type: "bold" }],
                },
                {
                  type: "text",
                  text: ": Aggregating critical project data to ensure seamless collaboration across all departments.",
                },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Strategic Alignment",
                  marks: [{ type: "bold" }],
                },
                {
                  type: "text",
                  text: ": Ensuring every action taken is directly mapped to the overarching goals of Ultra Shaheens.",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const;

export function welcomePageContentJson(): string {
  return JSON.stringify(welcomePageTiptapDoc);
}
