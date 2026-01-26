import React from 'react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import {
  RichText as PayloadRichText,
  type JSXConvertersFunction,
} from '@payloadcms/richtext-lexical/react'

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
})

interface RichTextProps {
  data: SerializedEditorState | null | undefined
  className?: string
}

export function RichText({ data, className }: RichTextProps) {
  if (!data) return null

  return (
    <div className={`prose prose-invert prose-lg max-w-none ${className || ''}`}>
      <PayloadRichText data={data} converters={converters} />
    </div>
  )
}
