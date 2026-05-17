---
id: TASK-095
title: 'Feature Idea: Supplies Inventory (Lager)'
status: Ready
assignee: []
created_date: '2026-05-17 00:31'
updated_date: '2026-05-17 00:32'
labels:
  - feature
dependencies: []
ordinal: 93000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow users to define a supplies inventory — a list of garden products they own (fertilizers, pesticides, herbicides, etc.). The inventory is not about quantity management but about knowing what products are available and what their properties are (e.g. NPK values, active ingredients, use cases). Products can be added by photographing the packaging or scanning a barcode; AI extracts the relevant properties automatically from the image/web (tool?). The inventory is then passed as optional context to the AI assistant, enabling it to give qualified, product-specific advice. Example: the user asks about clover in the lawn, the assistant recommends nitrogen-rich fertilization, and can additionally check whether the user's specific lawn fertilizer is suitable for this purpose or not. Tasks remain fully functional without inventory — the inventory is purely an enrichment layer, similar to how the garden plan enriches the app without being required.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
