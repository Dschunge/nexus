import { createRoot, type Root } from "react-dom/client";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import type { SlashCommandItem, SlashCommandMenuRef } from "./SlashCommandMenu";
import { SlashCommandMenu, SLASH_COMMANDS } from "./SlashCommandMenu";
import { createRef } from "react";

function filterItems(query: string): SlashCommandItem[] {
  const q = query.toLowerCase();
  return q
    ? SLASH_COMMANDS.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      )
    : SLASH_COMMANDS;
}

export const slashCommandSuggestion = {
  items: ({ query }: { query: string }) => filterItems(query),

  render: () => {
    let component: Root | null = null;
    let container: HTMLElement | null = null;
    let menuRef = createRef<SlashCommandMenuRef>();

    return {
      onStart: (props: SuggestionProps<SlashCommandItem>) => {
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
        menuRef = createRef<SlashCommandMenuRef>();
        component.render(
          <SlashCommandMenu
            ref={menuRef}
            items={props.items}
            command={(item) => props.command(item)}
          />
        );
      },

      onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
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
          <SlashCommandMenu
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
