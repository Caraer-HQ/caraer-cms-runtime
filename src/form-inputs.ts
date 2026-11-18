import type { FormModuleInput } from "./contract.ts";
import type { CaraerFormField } from "./locals.ts";

export function compatibleFormInput(
  input: FormModuleInput,
  property: { type?: string | null; format?: string | null },
): boolean {
  const type = property.type?.toLowerCase().replaceAll("_", "-");
  const format = property.format?.toLowerCase().replaceAll("_", "-");
  // Public form normalization uses these aliases for legacy rendering.
  const canonical =
    type === "text-area"
      ? "string"
      : type === "multi-file"
        ? "file"
        : type === "boolean"
          ? "checkbox"
          : type;
  return (
    !!canonical &&
    input.allowedPropertyTypes.includes(canonical) &&
    (!input.allowedPropertyFormats?.length ||
      (!!format && input.allowedPropertyFormats.includes(format)))
  );
}

export function inputValues(value: unknown): string[] {
  if (Array.isArray(value))
    return value.map((v) =>
      typeof v === "object" && v && "name" in v ? String(v.name) : String(v),
    );
  return value == null || value === "" ? [] : String(value).split(";");
}

export function formInputName(field: CaraerFormField): string {
  return field.input && field.id ? `__input_${field.id}` : field.name;
}
