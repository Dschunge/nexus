import { Node, ReactNodeViewRenderer } from "@tiptap/react";
import { WikiLinkNodeView } from "./WikiLinkNodeView";

export const WikiLinkNode = Node.create({
  name: "wikiLink",
  inline: true,
  atom: true,
  group: "inline",

  addAttributes() {
    return {
      noteId: {
        default: null,
        parseHTML: (element: Element) => element.getAttribute("data-wiki-link"),
        renderHTML: (attrs: Record<string, unknown>) => ({ "data-wiki-link": attrs.noteId }),
      },
      title: {
        default: null,
        parseHTML: (element: Element) => element.getAttribute("data-wiki-title"),
        renderHTML: (attrs: Record<string, unknown>) => ({ "data-wiki-title": attrs.title }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-wiki-link]" }];
  },

  renderHTML({ node }: { node: { attrs: Record<string, string> } }) {
    return [
      "span",
      {
        "data-wiki-link": node.attrs.noteId,
        "data-wiki-title": node.attrs.title,
      },
      `[[${node.attrs.title}]]`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WikiLinkNodeView);
  },
});
