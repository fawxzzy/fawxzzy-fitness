# Action Chrome Contract

Action Chrome 2.0 uses one shared control pattern across standalone CTAs, segmented rails, and bottom docks:

- Shell: one padded outer rail with the shared capsule radius, border, and surface shadow.
- Segment: each action sits on the same inner capsule surface instead of a transparent rectangle inside the rail.
- Intent overlay: semantic color lives in the segment overlay, so green, blue, yellow, and red fills inherit the pill shape cleanly.
- Motion: hover, focus, and press transitions stay soft and color-led with no hard scale jumps or mismatched edge seams.

Pattern order: shared shell -> shared segment -> semantic intent overlay -> shared motion.
