import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
      assert.match(field, /<input\s+\{\.\.\.control\}/, `${file}: the input must spread the control props`);
      assert.doesNotMatch(field, /<input[^>]*\saria-label=/, `${file}: the visible label names the field; no aria-label`);
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
