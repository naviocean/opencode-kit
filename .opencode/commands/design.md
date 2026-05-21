# /design

Create UI Kit and UX flow.

## Agent Flow

```
Designer
```

## Steps

### 1. Designer — UX Flow Mapping

Map user journeys from the spec:

```
Entry Point → Action → Feedback → Next Action → Outcome

Example:
Landing Page → Sign Up → Email Verification → Onboarding → Dashboard
```

**Deliverables:**
- User flow diagram (Mermaid or text)
- Screen inventory list
- Navigation structure

### 2. Designer — UI Kit Creation

Create reusable components based on Shadcn + Tailwind:

**Component Inventory:**
- Layout: Header, Sidebar, Footer, Container
- Navigation: Navbar, Breadcrumb, Tabs, Pagination
- Forms: Input, Select, Checkbox, Radio, TextArea, DatePicker
- Feedback: Alert, Toast, Modal, Dialog, Tooltip
- Data: Table, Card, List, Badge, Avatar
- Actions: Button, Dropdown, Link

**Design Tokens:**
```css
:root {
  /* Colors */
  --color-primary: hsl(222.2 47.4% 11.2%);
  --color-secondary: hsl(210 40% 96.1%);
  --color-accent: hsl(210 40% 96.1%);
  --color-destructive: hsl(0 84.2% 60.2%);

  /* Typography */
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-8: 2rem;

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-full: 9999px;
}
```

### 3. Designer — Prototyping (Optional)

For complex flows, use Stitch or Pencil:

**Stitch (Google AI):**
- Generate UI from text description
- Export DESIGN.md with tokens
- Export to Figma for team review

**Pencil.dev:**
- Create .pen files in IDE
- Bidirectional sync with code
- Generate React components

### 4. Handoff to Frontend

Deliverables for Frontend agent:

1. ✅ User flow diagrams
2. ✅ Screen inventory with component list
3. ✅ Design tokens (CSS variables or Tailwind config)
4. ✅ Component specs (props, states, variants)
5. ✅ Responsive breakpoints
6. ✅ Accessibility requirements (ARIA, keyboard nav)

## Output

After `/design`:

1. ✅ UX flows documented
2. ✅ UI Kit defined
3. ✅ Design tokens configured
4. ✅ Ready for Frontend implementation

## Document Standards

This command produces design documents using the specified template:

| Template | Output Path |
|---|---|
| `design-doc-template.md` | `docs/designs/` |

- **Design Doc**: Saves to `docs/designs/{feature-name}-design.md`

All design documents must follow the template in `.opencode/templates/`. Do not skip required sections.
