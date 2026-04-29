# Mapping Schema

This file defines the stable documentation contract for Pass 2 artifacts.

The schema is optimized for meaningful user-facing surfaces, not for every wrapper `div`.

## Hierarchy

Pass 2 records UI ownership in this order:

1. parent screen template
2. child surface
3. surface variant
4. element

States, similarity edges, interaction edges, and screenshot evidence can attach at more than one level.

## Parent screen record

Every route-backed parent screen record should conform to this shape:

```yaml
screen_id: string
route: string
screen_name: string
route_owner_file: string
primary_surface_owner: string
child_surfaces: string[]
```

## Child surface record

Every meaningful child surface should conform to this shape:

```yaml
child_surface_id: string
parent_screen_id: string
label: string
owning_component: string
owning_file: string
purpose: string
visible_by_default: boolean
opened_by: string[]
closed_by: string[]
variants: string[]
elements: string[]
theme_sensitive_surfaces: string[]
similarity_refs: string[]
interaction_edges: string[]
curated_engine_relevance: none | read-only dependency | future contract surface
screenshot_evidence: string[]
notes: string[]
```

## Surface variant record

Count a surface variant only when it changes layout, available actions, visibility, data source, theme behavior, state meaning, curated-engine relevance, user decision path, or component ownership.

Do not create separate variants for copy-only changes.

```yaml
surface_variant_id: string
child_surface_id: string
label: string
trigger: string[]
layout_difference: string[]
action_difference: string[]
data_difference: string[]
visibility_difference: string[]
theme_difference: string[]
screenshot_required: boolean
notes: string[]
```

## Element record

Every meaningful element record should conform to this shape:

```yaml
id: string
parent_screen_id: string
child_surface_id: string
surface_variant_id: string[]
label: string
screen: string
component: string
file: string
element_type: button | card | input | badge | nav | stat | form | row | modal | sheet | chart | icon | text | container

semantic_role:
  primary: string
  secondary: string[]
  product_meaning: string[]

visual_role:
  primary: string
  secondary: string[]

token_usage:
  color: string[]
  background: string[]
  border: string[]
  radius: string[]
  spacing: string[]
  typography: string[]
  shadow: string[]
  motion: string[]
  source_layers: string[]

hardcoded_styles:
  present: boolean
  severity: none | low | medium | high
  notes: string

states:
  default: string[]
  hover: string[]
  active: string[]
  disabled: string[]
  loading: string[]
  selected: string[]
  empty: string[]
  error: string[]
  success: string[]

visibility:
  always_visible: boolean
  gated_by: string[]
  hidden_when: string[]
  feature_flag: string | null
  user_preference: string[]
  routine_setting: string[]

similarity_refs:
  similar_to: string[]
  reason: string[]
  should_share_token: string[]
  should_share_component: string[]
  should_stay_separate: string[]

theme_mutation_coverage:
  score: 0 | 1 | 2 | 3 | 4 | 5
  global_color_ready: boolean
  global_shape_ready: boolean
  state_complete: boolean
  requires_manual_fix: string[]
  risk_level: low | medium | high
```

## Interaction edge record

Interaction edges are not similarity edges. They describe how the user opens, closes, transitions, or mutates a surface.

```yaml
id: string
from: string
to: string
edge: opens-surface | closes-surface | navigates-route | launches-overlay | mutates-state | submits-flow | delegates-visual-ownership | returns-focus
trigger: string
notes: string
```

## Screenshot evidence record

Screenshot evidence can attach to parent screens, child surfaces, or variants.

Paths should be stack-relative when recorded in docs.

```yaml
id: string
subject: string
kind: desktop | mobile | modal | drawer | sheet | empty | loading | error | success | variant
path: string
notes: string
```

## Semantic token namespace

Docs normalize the current implementation into the following semantic token namespace.

### Color

- `color.background.app`
- `color.background.surface`
- `color.background.elevated`
- `color.background.overlay`
- `color.text.primary`
- `color.text.secondary`
- `color.text.muted`
- `color.text.onAction`
- `color.action.primary`
- `color.action.secondary`
- `color.action.destructive`
- `color.action.ghost`
- `color.status.success`
- `color.status.warning`
- `color.status.error`
- `color.border.default`
- `color.border.strong`
- `color.border.focus`

### Radius and shape

- `radius.none`
- `radius.sm`
- `radius.md`
- `radius.lg`
- `radius.xl`
- `radius.full`
- `shape.button.default`
- `shape.card.default`
- `shape.input.default`
- `shape.sheet.default`
- `shape.badge.default`
- `shape.nav.default`

### Spacing

- `spacing.xs`
- `spacing.sm`
- `spacing.md`
- `spacing.lg`
- `spacing.xl`
- `spacing.section.gap`
- `spacing.card.padding`
- `spacing.row.paddingX`
- `spacing.row.paddingY`

### Typography

- `typography.eyebrow`
- `typography.title`
- `typography.subtitle`
- `typography.body`
- `typography.label`
- `typography.badge`
- `typography.metric`

### Shadow

- `shadow.surface.base`
- `shadow.surface.raised`
- `shadow.surface.overlay`
- `shadow.action.rail`

### Motion

- `motion.press.scale`
- `motion.press.brightness`
- `motion.transition.fast`
- `motion.transition.standard`
- `motion.overlay.enter`
- `motion.overlay.exit`

## Similarity edge taxonomy

Similarity edges are design-oriented, not code-ownership oriented.

They may link:

- parent screen families
- child surface families
- element families

Allowed edge labels:

- `same-semantic-role`
- `same-visual-role`
- `same-state-language`
- `same-token-owner`
- `same-shape-owner`
- `shared-screen-family`
- `shared-bottom-dock-family`
- `shared-card-family`
- `shared-input-family`
- `local-exception`
- `must-not-coalesce`

Required edge fields:

```yaml
from: string
to: string
edge: same-semantic-role | same-visual-role | same-state-language | same-token-owner | same-shape-owner | shared-screen-family | shared-bottom-dock-family | shared-card-family | shared-input-family | local-exception | must-not-coalesce
reason: string
mutation_expectation: mutate-together | mutate-separately | inspect-manually
```

## Readiness rubric

### Score 0

- unknown
- not yet mapped

### Score 1

- major style ownership is hardcoded
- semantic token ownership is absent or too scattered

### Score 2

- some shared tokenization exists
- one or more critical layers are still route-local or literal-value driven

### Score 3

- base surface is tokenized
- state variants are incomplete, inconsistent, or undocumented

### Score 4

- color mutation is predictable across the whole surface family
- shape or state language still has known gaps

### Score 5

- color, shape, and state behavior are all predictable
- global theme mutation should work without family-specific hunting

## Source-layer classification

Each token usage entry should cite one or more current source layers:

- `globals-css-root`
- `truth-pack-token`
- `truth-pack-primitive`
- `app-designSystem-bridge`
- `appTokens-bridge`
- `styles-tokens-object`
- `shared-component-local`
- `route-local`

## Pass 2 recording rules

If an element cannot be globally mutated by semantic token change, the record must say one of two things:

- the map is incomplete
- the element is intentionally local

Silence is not allowed for that case.

If a route-backed parent screen contains meaningful overlays, drawers, inline editors, or empty/error states, those surfaces belong in the child-surface ledger even when they are not separate routes.
