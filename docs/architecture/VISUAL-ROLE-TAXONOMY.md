# Visual Role Taxonomy

This taxonomy gives Pass 2 a stable vocabulary for semantic meaning and visual behavior.

## Semantic roles

These describe what an element means in product terms.

| Role | Meaning | Typical surfaces |
| --- | --- | --- |
| `primary_action` | highest-priority forward or commit action | submit button, log button, continue button |
| `secondary_action` | reversible or lower-priority action | cancel, back, continue in browser |
| `destructive_action` | action that deletes, removes, or breaks state | delete routine, remove exercise |
| `navigation` | changes route or contextual view | app nav tab, back button, history tabs |
| `view_switch` | switches mode or density without leaving route | compact/detailed segmented controls |
| `logging_control` | active workout data entry or commit control | set logger, quick add, save session |
| `workout_metric` | shows or edits exercise metrics | stat blocks, goal rows, measurement fields |
| `progress_signal` | communicates completion or PR status | success badges, completed cards |
| `warning_state` | highlights caution or setup gap | rest-day toggle inactive state, warning panel |
| `error_state` | communicates blocking failure | auth error message, failed load panel |
| `success_state` | communicates successful completion | completed row, success badge |
| `onboarding_prompt` | invites setup, install, or first-run flow | install call-to-action, empty setup card |
| `identity_summary` | communicates who/what the current screen belongs to | auth intro, settings identity header |
| `history_summary` | summarizes past workout or exercise history | history session card, history detail header |
| `context_header` | explains current route or section | shared screen header, section shell label |

## Visual roles

These describe how an element behaves visually.

| Role | Meaning | Typical surfaces |
| --- | --- | --- |
| `surface` | base panel or card that groups content | `AppPanel`, `SurfaceCard`, auth card |
| `elevated_surface` | stronger separation via shadow, blur, or overlay treatment | floating header, sheet, nav shell |
| `overlay` | modal or scrim layer above the main page | bottom sheet, destructive modal |
| `control` | interactive element that users tap, click, or type into | button, input, segmented option |
| `nav` | persistent or contextual navigation control | app nav, history tabs, back button |
| `text_primary` | primary headline or identity text | titles, prominent metric value |
| `text_secondary` | context, subtitle, helper, metadata | subtitles, hints, captions |
| `border` | silhouette or state outline | focus ring, card border, selection border |
| `status_indicator` | color or shape communicates state/meaning | badge, accent rail, pending dot |
| `data_display` | presents workout or history data | metric strips, summary rows |
| `container` | structural grouping without strong own meaning | scaffold, content rail |

## Meaning vs appearance rules

### Meaning-led surfaces

These should preserve product meaning even if colors or shape themes change:

- destructive actions
- warning states
- success/completion states
- selected/current states
- disabled states

### Appearance-led surfaces

These can mutate more freely as long as readability and spacing remain intact:

- generic cards
- shared section shells
- nav shell blur and border density
- panel shadows
- radius profile
- neutral secondary controls

## Required distinctions

Pass 2 should not collapse the following pairs:

- `primary_action` vs `view_switch`
- `selected/current` vs `success/completed`
- `warning_state` vs `destructive_action`
- `context_header` vs `identity_summary`
- `surface` vs `overlay`

## Recommended element-type mapping

| Element type | Common semantic roles | Common visual roles |
| --- | --- | --- |
| `button` | primary_action, secondary_action, destructive_action, navigation | control |
| `card` | history_summary, onboarding_prompt, success_state, warning_state | surface, elevated_surface |
| `input` | logging_control, view_switch, onboarding_prompt | control, border |
| `badge` | success_state, warning_state, progress_signal | status_indicator |
| `nav` | navigation, view_switch | nav, control |
| `stat` | workout_metric, progress_signal | data_display, status_indicator |
| `row` | history_summary, logging_control, workout_metric | surface, data_display, control |
| `modal` / `sheet` | destructive_action, onboarding_prompt, context_header | overlay, elevated_surface |
| `text` | context_header, identity_summary, error_state, success_state | text_primary, text_secondary |

## Canonical mutation rule

When a theme mutation changes a semantic token, update by meaning first.

Correct:

- change `color.action.primary`
- change `color.status.warning`
- change `shape.card.default`

Incorrect:

- make every blue thing purple
- make every green thing cyan
- make every rounded thing sharp without checking role ownership
