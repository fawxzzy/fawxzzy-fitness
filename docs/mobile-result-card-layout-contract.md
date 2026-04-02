# Mobile result-card layout contract

Applies to Add Exercise search result rows.

## Structure

1. **Fixed media column**
   - 44px icon container.
   - Never shrinks.
2. **Flexible text column**
   - Takes remaining width.
   - Title and metadata use wrapping text (`whitespace-normal`) and stay `min-w-0`.
3. **Reserved action slot**
   - Minimum width of 4.75rem.
   - Holds select/selected affordance without collapsing text.
4. **Metadata wrapping**
   - Subtitle wraps to multiple lines instead of clipping or pushing action controls off-screen.
5. **Selection representation**
   - Selection is represented inline on the chosen result row (`Selected` trailing affordance + selected card state).
   - Add Exercise must not render a duplicated standalone selected-summary card above the list.
   - If search/filter criteria exclude the selected row, the selected row is still included in the visible result list to preserve clarity.
6. **Surface ownership split**
   - Mobile (`< md`) and desktop (`md+`) use separate list rendering contracts.
   - Mobile renders a plain list surface in normal page flow (no inner faux-viewport shell, no local overflow owner).
   - Desktop keeps the constrained viewport treatment (`PickerListViewport`) with optional fade overlays to indicate scrollable depth.

## Bottom dock safety

- Add Exercise content reserves bottom space: `--app-bottom-action-bar-height + --app-safe-bottom + 1.5rem`.
- Selected result and goal config sections include scroll margin so required fields remain readable above the dock.

## Goal form parity

- Add Exercise and inline Edit must use the shared modality-aware goal form wrapper.
- Time-distance prescriptions expose explicit mode choices (`Time`, `Distance`, `Time + Distance`) and render only relevant fields.
- Configure Goal helper guidance renders as one modality-aware message block (single style) driven by the same modality/validation rules that control visible fields and save eligibility.

## Add Exercise header metadata

- Header metadata on Add Exercise must be authoritative and live with the same source of truth as the owning day/session store.
- If authoritative metadata cannot be guaranteed (for example, potentially stale exercise counts), omit it instead of rendering drift-prone values.
- Add Exercise uses a compact mobile hero contract: on `< md`, remove the eyebrow row, keep `Add Exercise` + routine subtitle, and tighten header top/bottom spacing while keeping the back-button hit area unchanged.
