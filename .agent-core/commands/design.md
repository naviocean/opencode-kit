# /design

Create UI Kit and UX flow for an approved spec. Use after PM spec exists, before Frontend implementation. Do NOT use for: full planning (`/plan` — Designer is part of it), implementation (`/build`), design tweaks after ship (just dispatch Designer with `quick`).

**HARD-GATE:** Requires approved PRD in `docs/prds/`. If missing, return: "Run `/plan` first to produce a PRD."

## Execution Mode: Single Subagent (Designer)

Designer works alone — full context, no coordination overhead.

## Agent Flow

```
Designer
```

## Steps

### 1. Designer — UX Flow Mapping

Map user journeys from the spec:
- Entry → Action → Feedback → Next Action → Outcome
- Identify required screens
- Define navigation structure
- Optional: Mermaid diagram for complex flows

**Why flow before screens?** Starting with screen design without flow = disconnected screens that don't match user mental model. Flow first = coherent UX.

### 2. Designer — UI Kit Creation

Create reusable components based on Shadcn + Tailwind:

- Layout: Header, Sidebar, Footer, Container
- Navigation: Navbar, Breadcrumb, Tabs, Pagination
- Forms: Input, Select, Checkbox, Radio, TextArea, DatePicker
- Feedback: Alert, Toast, Modal, Dialog, Tooltip
- Data: Table, Card, List, Badge, Avatar
- Actions: Button, Dropdown, Link

**Design Tokens:**
```css
:root {
  --color-primary: hsl(222.2 47.4% 11.2%);
  --color-secondary: hsl(210 40% 96.1%);
  /* ... (full token set in design-doc-template.md) */
}
```

**Why Shadcn + Tailwind?** Shadcn gives accessible primitives (Radix-based). Tailwind 4 maps tokens to utilities. Together = fast, consistent, accessible.

### 3. Designer — Prototyping (Optional)

For complex flows, use Stitch or Pencil:

- **Stitch (Google AI)**: text → UI, Figma export, DESIGN.md export
- **Pencil.dev**: IDE-native .pen files, bidirectional sync, code generation

### 4. Handoff to Frontend

Deliverables for Frontend agent (output to `docs/designs/{feature}-design.md`):
1. User flow diagrams
2. Screen inventory with component list
3. Design tokens (CSS variables or Tailwind config)
4. Component specs (props, states, variants)
5. Responsive breakpoints
6. Accessibility requirements (ARIA, keyboard nav)

**Why explicit accessibility section?** Accessibility added at the end is expensive. Documenting it in design = Frontend implements it from day 1.

## Output

After `/design`:
1. ✅ UX flows documented
2. ✅ UI Kit defined
3. ✅ Design tokens configured
4. ✅ `docs/designs/{feature}-design.md` produced

**Next:** Run `/build` to start implementation. Frontend reads from `docs/designs/`.

## Document Standards

| Output | Path | Template |
|---|---|---|
| Design doc | `docs/designs/{feature}-design.md` | `.opencode/standards/design-doc-template.md` |

## Anti-patterns (BLOCKING)

- ❌ Running without approved PRD (HARD-GATE)
- ❌ Starting with screen design before user flows
- ❌ Skipping accessibility requirements
- ❌ One-off colors/spacing not using design tokens
