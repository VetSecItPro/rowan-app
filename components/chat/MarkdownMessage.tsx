/**
 * MarkdownMessage — Renders assistant messages as formatted Markdown
 *
 * Wraps react-markdown with dark-mode component overrides for
 * code blocks, links, lists, and tables. Shows a blinking cursor
 * when streaming.
 */

'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownMessageProps {
  content: string;
  isStreaming?: boolean;
}

const markdownComponents: Components = {
  // Code blocks and inline code
  code({ className, children, ...props }) {
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return (
        <pre className="my-2 rounded-lg bg-gray-800 p-3 overflow-x-auto text-xs leading-relaxed">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    }
    return (
      <code
        className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-blue-300"
        {...props}
      >
        {children}
      </code>
    );
  },
  // Links
  a({ children, href, ...props }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors"
        {...props}
      >
        {children}
      </a>
    );
  },
  // Lists
  ul({ children, ...props }) {
    return (
      <ul className="my-1.5 ml-4 list-disc space-y-0.5" {...props}>
        {children}
      </ul>
    );
  },
  ol({ children, ...props }) {
    return (
      <ol className="my-1.5 ml-4 list-decimal space-y-0.5" {...props}>
        {children}
      </ol>
    );
  },
  li({ children, ...props }) {
    return (
      <li className="text-sm leading-relaxed" {...props}>
        {children}
      </li>
    );
  },
  // Paragraphs
  p({ children, ...props }) {
    return (
      <p className="my-1 first:mt-0 last:mb-0" {...props}>
        {children}
      </p>
    );
  },
  // Headings
  h1({ children, ...props }) {
    return (
      <h1 className="text-base font-semibold mt-3 mb-1" {...props}>
        {children}
      </h1>
    );
  },
  h2({ children, ...props }) {
    return (
      <h2 className="text-sm font-semibold mt-2.5 mb-1" {...props}>
        {children}
      </h2>
    );
  },
  h3({ children, ...props }) {
    return (
      <h3 className="text-sm font-medium mt-2 mb-0.5" {...props}>
        {children}
      </h3>
    );
  },
  // Blockquotes
  blockquote({ children, ...props }) {
    return (
      <blockquote
        className="my-2 border-l-2 border-gray-600 pl-3 text-gray-300 italic"
        {...props}
      >
        {children}
      </blockquote>
    );
  },
  // Tables
  table({ children, ...props }) {
    return (
      <div className="my-2 overflow-x-auto">
        <table className="w-full text-xs" {...props}>
          {children}
        </table>
      </div>
    );
  },
  th({ children, ...props }) {
    return (
      <th
        className="border-b border-gray-700 px-2 py-1.5 text-left font-medium text-gray-300"
        {...props}
      >
        {children}
      </th>
    );
  },
  td({ children, ...props }) {
    return (
      <td className="border-b border-gray-800 px-2 py-1.5" {...props}>
        {children}
      </td>
    );
  },
  // Horizontal rule
  hr(props) {
    return <hr className="my-3 border-gray-700" {...props} />;
  },
  // Strong / emphasis
  strong({ children, ...props }) {
    return (
      <strong className="font-semibold text-white" {...props}>
        {children}
      </strong>
    );
  },
};

export default function MarkdownMessage({
  content,
  isStreaming,
}: MarkdownMessageProps) {
  return (
    <div className="prose-sm text-sm leading-relaxed text-gray-100">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 ml-0.5 bg-white/60 animate-pulse rounded-sm align-text-bottom" />
      )}
    </div>
  );
}
