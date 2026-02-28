"use client";

type RestDayToggleCheckboxProps = {
  defaultChecked: boolean;
};

export function RestDayToggleCheckbox({ defaultChecked }: RestDayToggleCheckboxProps) {
  return (
    <input
      type="checkbox"
      name="isRest"
      defaultChecked={defaultChecked}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    />
  );
}
