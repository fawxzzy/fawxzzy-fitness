import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FormField, type FormFieldControlProps } from "./FormField";

// DESIGN-CONTRACT C14 field recipe, accessibility half: the visible label is a real <label for> tied to the
// control (tapping it focuses the field), helper or error text is announced through aria-describedby, and an
// error or invalid state sets aria-invalid on the control itself, not just a red border.

const renderField = (props: { helper?: string; error?: string; invalid?: boolean; id?: string }) => {
  const fieldProps: ComponentProps<typeof FormField> = {
    label: "Routine name",
    ...props,
    children: (control: FormFieldControlProps) => createElement("input", { ...control, name: "name" }),
  };
  return renderToStaticMarkup(createElement(FormField, fieldProps));
};

const attr = (html: string, tag: string, name: string) => html.match(new RegExp(`<${tag}[^>]*\\s${name}="([^"]*)"`))?.[1];

test("the label is a real <label for> pointing at the control id", () => {
  const html = renderField({});
  const labelFor = attr(html, "label", "for");
  const inputId = attr(html, "input", "id");
  assert.ok(labelFor, "label has a for attribute");
  assert.equal(labelFor, inputId);
  assert.doesNotMatch(html, /<fieldset|<legend/);
  assert.doesNotMatch(html, /<input[^>]*aria-invalid/);
  assert.doesNotMatch(html, /<input[^>]*aria-describedby/);
});

test("helper text is tied to the control through aria-describedby", () => {
  const html = renderField({ helper: "Day 1 falls on this date; the cycle repeats from it." });
  const describedBy = attr(html, "input", "aria-describedby");
  assert.ok(describedBy);
  assert.match(html, new RegExp(`<p id="${describedBy}"[^>]*>Day 1 falls on this date`));
  assert.doesNotMatch(html, /<input[^>]*aria-invalid/);
});

test("an error replaces the helper, is announced, and marks the control aria-invalid", () => {
  const html = renderField({ helper: "Helper", error: "Name already used." });
  const describedBy = attr(html, "input", "aria-describedby");
  assert.equal(attr(html, "input", "aria-invalid"), "true");
  assert.match(html, new RegExp(`<p id="${describedBy}" role="alert"[^>]*>.*Name already used\\.`));
  assert.doesNotMatch(html, />Helper</);
});

test("invalid without a message still sets aria-invalid", () => {
  const html = renderField({ invalid: true });
  assert.equal(attr(html, "input", "aria-invalid"), "true");
});

test("an explicit id is used for both the label and the control", () => {
  const html = renderField({ id: "start-date" });
  assert.equal(attr(html, "label", "for"), "start-date");
  assert.equal(attr(html, "input", "id"), "start-date");
});

// Every FormField caller must hand the control props to its input; a caller that ignores them silently loses
// the label link and the error announcement.
const CALLERS = [
  "src/components/routines/RoutineEditorShared.tsx",
  "src/components/routines/RoutineEditorForm.tsx",
  "src/app/routines/CreateRoutineClient.tsx",
  "src/components/ExercisePicker.tsx",
  "src/app/history/[sessionId]/LogAuditClient.tsx",
  "src/app/routines/[id]/edit/day/[dayId]/EditDaySettingsAutosaveForm.tsx",
  "src/app/routines/[id]/edit/day/[dayId]/EditDayAddExerciseScreen.tsx",
  "src/app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList.tsx",
  "src/components/settings/AppThemeSettings.tsx",
  "src/components/settings/DataSettingsSection.tsx",
  "src/components/settings/DiscordAccessSettings.tsx",
  "src/components/session/SessionExerciseFeedbackPrompt.tsx",
];

test("every FormField caller spreads the control props onto its input and sets no competing aria-label", () => {
  for (const file of CALLERS) {
    const source = readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8");
    const fields = source.split(/<FormField\b/).slice(1).map((chunk) => chunk.split("</FormField>")[0]);
    assert.ok(fields.length > 0, `${file} has no FormField`);
    for (const field of fields) {
      // A thin wrapper that forwards a typed render function (`{children}`) is checked at its own call sites.
      if (/^[^>]*>\s*\{children\}\s*$/.test(field)) continue;
      assert.match(field, /\{\(control\) => \(/, `${file}: FormField children must be a render function`);
      assert.match(field, /<(input|textarea)\s+\{\.\.\.control\}/, `${file}: the input must spread the control props`);
      assert.doesNotMatch(field, /<(input|textarea)[^>]*\saria-label=/, `${file}: the visible label names the field; no aria-label`);
    }
  }
  const editorForm = readFileSync(new URL("../../../src/components/routines/RoutineEditorForm.tsx", import.meta.url), "utf8");
  const textFieldUses = editorForm.split(/<RoutineEditorTextField\b/).slice(1).map((chunk) => chunk.split("</RoutineEditorTextField>")[0]);
  for (const use of textFieldUses) {
    assert.match(use, /\{\(control\) => \(\s*<input\s+\{\.\.\.control\}/, "RoutineEditorTextField uses must spread the control props");
  }
});

test("the copy-routine name and the custom exercise name carry an invalid state", () => {
  const read = (file: string) => readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8");
  assert.match(read("src/app/routines/CreateRoutineClient.tsx"), /<FormField\s+label="New routine name"\s+invalid=\{Boolean\(duplicateNameConflict\)\}\s+error=\{duplicateNameError\}/);
  assert.match(read("src/components/ExercisePicker.tsx"), /<FormField label=\{fieldLabel\} className="w-full" invalid=\{isDraftNameInvalid\}>/);
});

// Guard: a visible-labelled text/number/date/select/textarea control belongs in FormField. This scans src/ for a
// raw <label> that wraps one, and for the legacy legend-on-border LabeledEditorField around one. Auth screens are owned
// by Auth Surface v2 and dev fixtures are not product UI. Checkbox/radio/hidden/range/color controls are not text fields.
const SRC_ROOT = new URL("../../", import.meta.url);

function listSourceFiles(dir: URL, out: URL[] = []): URL[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
    if (entry.isDirectory()) listSourceFiles(child, out);
    else if (/\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name)) out.push(child);
  }
  return out;
}

const RAW_LABEL_EXEMPT_PATHS = [
  "src/components/ui/FormField.tsx",
  "src/components/ui/LabeledEditorField.tsx",
  "src/components/auth/",
  "src/app/login/",
  "src/app/signup/",
  "src/app/forgot-password/",
  "src/app/reset-password/",
  "src/app/dev/",
];

// Known legacy fields still on the old recipe; shrink this list, never grow it.
const RAW_LABEL_KNOWN = new Set<string>([
  "src/components/settings/AppThemeSettings.tsx",
  "src/components/ui/measurements/MeasurementPanelV2.tsx",
]);

test("no raw <label> wrapping a text control and no LabeledEditorField around one outside FormField", () => {
  const offenders: string[] = [];
  for (const url of listSourceFiles(SRC_ROOT)) {
    const rel = "src/" + url.pathname.split("/src/")[1];
    if (RAW_LABEL_EXEMPT_PATHS.some((prefix) => rel.startsWith(prefix)) || RAW_LABEL_KNOWN.has(rel)) continue;
    const source = readFileSync(url, "utf8");
    for (const chunk of source.split(/<label\b/).slice(1)) {
      const body = chunk.split("</label>")[0];
      const control = body.match(/<(input|select|textarea)\b([^>]*)/);
      if (!control) continue;
      if (control[1] === "input" && /type="(checkbox|radio|hidden|range|color|file)"/.test(control[2])) continue;
      offenders.push(`${rel}: raw <label> wraps <${control[1]}>`);
    }
    if (/<LabeledEditorField\b/.test(source)) offenders.push(`${rel}: uses LabeledEditorField`);
  }
  assert.deepEqual(offenders, [], "move these onto FormField (render function, spread control)");
});
