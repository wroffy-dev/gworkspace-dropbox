'use client';

import type * as React from 'react';
import type { FieldDescriptor } from '@/lib/cms/fields';
import type { FieldValues } from './field-renderer';
import { ImageWidgetEditor } from './image-widget-editor';

/** What a block's own Content tab receives — the same as the generic field list. */
export type ContentEditorProps = {
  fields: FieldDescriptor[];
  values: FieldValues;
  onChange: (name: string, value: unknown) => void;
  onChangeMany: (patch: Record<string, unknown>) => void;
  idPrefix: string;
};

/**
 * Blocks whose Content tab is more than a list of fields.
 *
 * The default — every block not listed — is the shared field list. A block
 * here still edits the registry's fields through that same list; its editor
 * only adds something around them, such as a live preview. Keeping the map
 * here keeps the section editor itself free of block names.
 */
export const CONTENT_EDITORS: Partial<Record<string, React.ComponentType<ContentEditorProps>>> = {
  imageWidget: ImageWidgetEditor,
};
