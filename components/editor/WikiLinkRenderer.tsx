import { createRoot, type Root } from "react-dom/client";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import type { WikiLinkItem, WikiLinkMenuRef } from "./WikiLinkMenu";
import { WikiLinkMenu } from "./WikiLinkMenu";
import { createRef } from "react";

async function fetchNotes(query: string): Promise<WikiLinkItem[]> {
  try {
    if (!query) {
      const input = encodeURIComponent(JSON.stringify({ "0": { json: null } }));
      const res = await fetch(`/api/trpc/notes.recents?batch=1&input=${input}`, {
        credentials: "include",
      });
      const json = await res.json();
      const data = json[0]?.result?.data?.json;
      return Array.isArray(data)
        ? data.map((n: { id: string; title: string }) => ({ id: n.id, title: n.title }))
        : [];
    } else {
      const input = encodeURIComponent(
        JSON.stringify({ "0": { json: { query } } })
      );
      const res = await fetch(`/api/trpc/notes.search?batch=1&input=${input}`, {
        credentials: "include",
      });
      const json = await res.json();
      const data = json[0]?.result?.data?.json;
      return Array.isArray(data)
        ? data.slice(0, 10).map((n: { id: string; title: string }) => ({ id: n.id, title: n.title }))
        : [];
    }
  } catch {
    return [];
  }
}

export const wikiLinkSuggestion = {
  items: ({ query }: { query: string }) => fetchNotes(query),

  render: () => {
    let component: Root | null = null;
    let container: HTMLElement | null = null;
    let menuRef = createRef<WikiLinkMenuRef>();

    return {
      onStart: (props: SuggestionProps<WikiLinkItem>) => {
        container = document.createElement("div");
        container.style.position = "absolute";
        container.style.zIndex = "9999";
        document.body.appendChild(container);

        const { clientRect } = props;
        if (clientRect) {
          const rect = clientRect();
          if (rect) {
            container.style.top = `${rect.bottom + window.scrollY + 4}px`;
            container.style.left = `${rect.left + window.scrollX}px`;
          }
        }

        component = createRoot(container);
        menuRef = createRef<WikiLinkMenuRef>();
        component.render(
          <WikiLinkMenu
            ref={menuRef}
            items={props.items}
            command={(item) => props.command(item)}
          />
        );
      },

      onUpdate: (props: SuggestionProps<WikiLinkItem>) => {
        if (!container || !component) return;

        const { clientRect } = props;
        if (clientRect) {
          const rect = clientRect();
          if (rect) {
            container.style.top = `${rect.bottom + window.scrollY + 4}px`;
            container.style.left = `${rect.left + window.scrollX}px`;
          }
        }

        component.render(
          <WikiLinkMenu
            ref={menuRef}
            items={props.items}
            command={(item) => props.command(item)}
          />
        );
      },

      onKeyDown: (props: SuggestionKeyDownProps) => {
        if (props.event.key === "Escape") {
          cleanup();
          return true;
        }
        return menuRef.current?.onKeyDown(props) ?? false;
      },

      onExit: () => {
        cleanup();
      },
    };

    function cleanup() {
      if (component) {
        setTimeout(() => {
          component?.unmount();
          component = null;
        }, 0);
      }
      if (container) {
        container.remove();
        container = null;
      }
    }
  },
};
