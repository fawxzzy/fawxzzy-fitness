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

## Bottom dock safety

- Add Exercise content reserves bottom space: `--app-bottom-action-bar-height + --app-safe-bottom + 1.5rem`.
- Selected result and goal config sections include scroll margin so required fields remain readable above the dock.

## Goal form parity

- Add Exercise and inline Edit must use the shared modality-aware goal form wrapper.
- Time-distance prescriptions expose explicit mode choices (`Time`, `Distance`, `Time + Distance`) and render only relevant fields.
