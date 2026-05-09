---
id: TASK-061
title: AI Assistant – Render markdown in chat responses
status: Done
assignee:
  - '@agent'
created_date: '2026-05-09 21:54'
updated_date: '2026-05-09 23:00'
labels:
  - ai
  - frontend
dependencies: []
ordinal: 56000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add markdown rendering to AI assistant chat responses.

## Problem

The assistant frequently returns markdown-formatted responses (bold, lists, code blocks, tables). Without a rendering engine these are displayed as raw markdown syntax, which is hard to read.

## Solution

Add react-markdown with the remark-gfm plugin. Wrap the BotMessage content with ReactMarkdown instead of rendering plain text. Style the generated HTML elements via the components prop using existing CSS design tokens — no external CSS framework needed.

## Dependencies

- react-markdown
- remark-gfm
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 react-markdown is added as a frontend dependency
- [x] #2 BotMessage component renders assistant responses as markdown instead of plain text
- [x] #3 remark-gfm plugin is included to support tables, strikethrough, and checkboxes
- [x] #4 Inline code is styled using existing design tokens (e.g. var(--green-mist) background)
- [x] #5 Code blocks are visually distinct from inline code (monospace font, background, border-radius)
- [x] #6 Rendered markdown inherits the existing chat bubble font size and color
- [x] #7 Plain text responses (no markdown) are visually unchanged
- [x] #8 Tests verify that markdown syntax in a bot message is rendered as HTML elements (e.g. strong, ul, code)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added react-markdown + remark-gfm. BotMessage now accepts content (string→Markdown) or children (ReactNode→plain). All markdown elements styled via CSS design tokens: inline code with var(--green-mist) background, code blocks with border-radius, tables with var(--border), blockquotes with var(--green-mid) left border. Static messages (welcome, loading, not-configured) use children path and are visually unchanged. 5 new tests covering bold/ul/code/plain/table. 357/357 pass.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
