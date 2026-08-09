import React, { useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';

const TabKeymap = Extension.create({
  name: 'tabKeymap',
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.can().sinkListItem('listItem')) {
          return this.editor.chain().focus().sinkListItem('listItem').run();
        }
        return false;
      },
      'Shift-Tab': () => {
        if (this.editor.can().liftListItem('listItem')) {
          return this.editor.chain().focus().liftListItem('listItem').run();
        }
        return false;
      },
    };
  },
});

export const TiptapEditor = ({
  content,
  onChange,
  placeholder = 'Isi uraian komponen di sini...',
  onFocus,
  onBackspaceAtStart,
  onArrowUpAtStart,
}) => {
  const customKeymap = useMemo(() => {
    return Extension.create({
      name: 'pageNavKeymap',
      addKeyboardShortcuts() {
        return {
          Backspace: ({ editor }) => {
            const { selection } = editor.state;
            if (selection.empty && selection.from <= 1) {
              if (onBackspaceAtStart) {
                onBackspaceAtStart();
                return true;
              }
            }
            return false;
          },
          ArrowUp: ({ editor }) => {
            const { selection } = editor.state;
            if (selection.empty && selection.from <= 1) {
              if (onArrowUpAtStart) {
                onArrowUpAtStart();
                return true;
              }
            }
            return false;
          },
        };
      },
    });
  }, [onBackspaceAtStart, onArrowUpAtStart]);

  const extensions = useMemo(() => {
    return [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
      TabKeymap,
      customKeymap,
    ];
  }, [placeholder, customKeymap]);

  const editor = useEditor({
    extensions,
    content: content || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    onFocus: ({ editor }) => {
      if (onFocus) onFocus(editor);
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      const currentHtml = editor.getHTML() || '';
      const targetContent = content || '';
      const isSplitUpdate = Math.abs(targetContent.length - currentHtml.length) > 2;
      const isExternalUpdate = !editor.isFocused;

      if (isSplitUpdate || isExternalUpdate) {
        let selFrom = 0;
        try {
          selFrom = editor.state.selection.from;
        } catch {}

        editor.commands.setContent(targetContent);

        if (isSplitUpdate && editor.isFocused) {
          try {
            const maxPos = editor.state.doc.content.size;
            editor.commands.setTextSelection(Math.min(selFrom, maxPos));
          } catch {}
        }
      }
    }
  }, [content, editor]);

  return <EditorContent editor={editor} />;
};
