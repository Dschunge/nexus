import { Extension, type Editor, type Range } from "@tiptap/react";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import type { WikiLinkItem } from "./WikiLinkMenu";

const wikiLinkPluginKey = new PluginKey("wikiLinkSuggestion");

export type WikiLinkSuggestionOptions = {
  suggestion: Omit<SuggestionOptions<WikiLinkItem>, "editor">;
};

export const WikiLinkSuggestion = Extension.create<WikiLinkSuggestionOptions>({
  name: "wikiLinkSuggestion",

  addOptions() {
    return {
      suggestion: {
        char: "[[",
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: WikiLinkItem }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: "wikiLink",
              attrs: { noteId: props.id, title: props.title },
            })
            .insertContent(" ")
            .run();
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        pluginKey: wikiLinkPluginKey,
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
