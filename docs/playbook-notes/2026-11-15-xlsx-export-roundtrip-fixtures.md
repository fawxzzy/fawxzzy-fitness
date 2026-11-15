## 2026-11-15 - Excel export round trip covers empty-string, boolean and date cells

- Type: Test coverage (FF-PLATFORM-001 follow-up, reviewer P2 on PR #257)
- WHAT changed: `src/lib/account-workout-export.test.ts` gains one round-trip test that writes the workbook with `write-excel-file` and reads it back with `read-excel-file`, with fixtures for empty and whitespace-only strings, true and false booleans, and ISO date and datetime text.
- WHY it changed: The library swap in #257 was only checked on string and number cells; the other cell types could have regressed unnoticed.
- Rule: When swapping a serialization library, the round-trip test must cover every cell type the export emits.
- Evidence: The new test passes with no export code change (empty strings read back as empty cells, booleans stay booleans, date text is unchanged).
- Status: Source only; test-only change, no runtime or deploy surface.
