"use client";

import Mention from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance } from "tippy.js";
import type { SuggestionKeyDownProps } from "@tiptap/suggestion";
import {
  MentionList,
  type MentionListHandle,
  type MentionUser,
} from "./mention-list";

import "tippy.js/dist/tippy.css";

export function createUserMentionExtension() {
  return Mention.configure({
    HTMLAttributes: {
      class: "mention",
    },
    suggestion: {
      char: "@",
      shouldShow: ({ editor }) => editor.isEditable,
      items: async ({ query }) => {
        try {
          const res = await fetch(
            `/api/users/mention?q=${encodeURIComponent(query)}`
          );
          if (!res.ok) return [];
          const data = (await res.json()) as { users?: MentionUser[] };
          return data.users ?? [];
        } catch {
          return [];
        }
      },
      render: () => {
        let component: ReactRenderer<MentionListHandle>;
        let popup: Instance | undefined;

        return {
          onStart: (props) => {
            component = new ReactRenderer(MentionList, {
              props,
              editor: props.editor,
            });

            popup = tippy(document.body, {
              getReferenceClientRect: () =>
                props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: "manual",
              placement: "bottom-start",
              theme: "mention-dark",
              arrow: false,
              maxWidth: "none",
            });
          },

          onUpdate(props) {
            component.updateProps(props);
            popup?.setProps({
              getReferenceClientRect: () =>
                props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
            });
          },

          onExit() {
            popup?.destroy();
            component.destroy();
          },

          onKeyDown(props: SuggestionKeyDownProps) {
            return component.ref?.onKeyDown(props) ?? false;
          },
        };
      },
    },
  });
}
