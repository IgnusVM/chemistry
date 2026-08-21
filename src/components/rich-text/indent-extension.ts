import { Extension, type CommandProps } from "@tiptap/core";

// No stable published Tiptap indent extension exists (checked npm directly —
// the one community candidate isn't published, README says copy the source
// in yourself). This is that: a small node-attribute + margin-left
// extension for paragraph/heading block indent. Deliberately separate from
// list nesting, which StarterKit's list extensions already handle via their
// own Tab keymap — this only ever changes a block's left margin.

export interface IndentOptions {
  types: string[];
  minIndent: number;
  maxIndent: number;
  indentSize: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

export const Indent = Extension.create<IndentOptions>({
  name: "indent",

  addOptions() {
    return {
      types: ["paragraph", "heading"],
      minIndent: 0,
      maxIndent: 8,
      indentSize: 24,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            renderHTML: (attributes) => {
              const level = (attributes.indent as number) || 0;
              if (!level) return {};
              return { style: `margin-left: ${level * this.options.indentSize}px` };
            },
            parseHTML: (element) => {
              const margin = element.style.marginLeft;
              if (!margin) return 0;
              return Math.round(parseInt(margin, 10) / this.options.indentSize) || 0;
            },
          },
        },
      },
    ];
  },

  addCommands() {
    const step =
      (delta: number) =>
      () =>
      ({ tr, state, dispatch }: CommandProps) => {
        const { from, to } = state.selection;
        let changed = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            const current = (node.attrs.indent as number) || 0;
            const next = Math.min(this.options.maxIndent, Math.max(this.options.minIndent, current + delta));
            if (next !== current) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
              changed = true;
            }
          }
        });
        if (changed && dispatch) dispatch(tr);
        return changed;
      };

    return {
      indent: step(1),
      outdent: step(-1),
    };
  },
});
