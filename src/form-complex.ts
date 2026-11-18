import { mountStructureEditor } from "./form-structure.ts";

export function mountComplexInputs(form: HTMLFormElement): void {
  form.querySelectorAll<HTMLElement>("[data-complex-input]").forEach((root) => {
    if (root.dataset.complexBound) return;
    root.dataset.complexBound = "true";
    const hidden = root.querySelector<HTMLInputElement>(
      "[data-complex-value]",
    )!;
    const format = root.dataset.complexInput;
    if (format === "structure") {
      mountStructureEditor(
        root.querySelector<HTMLElement>("[data-structure-editor]")!,
        hidden,
        root.dataset.required === "true",
      );
      return;
    }
    if (format === "recurrence") {
      recurrence(root, hidden);
      return;
    }
    const parts = [...root.querySelectorAll<HTMLInputElement>("[data-part]")];
    const update = () => {
      const values = parts.map((input) => input.value);
      parts.forEach((input) => input.setCustomValidity(""));
      if (
        format?.endsWith("-range") &&
        values[0] &&
        values[1] &&
        (format === "date-range"
          ? values[0] > values[1]
          : Number(values[0]) > Number(values[1]))
      )
        parts[1].setCustomValidity("End must not be before start.");
      if (format === "date-range")
        values.forEach((v, i) => {
          values[i] = v ? String(Date.parse(`${v}T00:00:00Z`)) : "";
        });
      if (format === "location" || format === "map-point") {
        const lat = values[5],
          lng = values[6];
        if (
          !!lat !== !!lng ||
          (lat &&
            (!Number.isFinite(Number(lat)) || Math.abs(Number(lat)) > 90)) ||
          (lng &&
            (!Number.isFinite(Number(lng)) || Math.abs(Number(lng)) > 180))
        )
          parts[5].setCustomValidity(
            "Enter valid latitude and longitude together.",
          );
        if (values.some((v) => v.includes(";;")))
          parts[0].setCustomValidity("Address fields cannot contain ;;.");
      }
      hidden.value = values.some(Boolean)
        ? values.join(
            format === "location" || format === "map-point" ? ";;" : ";",
          )
        : "";
    };
    root.addEventListener("input", update);
    root.addEventListener("change", update);
  });
}

function recurrence(root: HTMLElement, hidden: HTMLInputElement): void {
  const controls = Object.fromEntries(
    [
      ...root.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "[data-recurrence]",
      ),
    ].map((el) => [el.dataset.recurrence!, el]),
  );
  const weekdays = [
    ...root.querySelectorAll<HTMLInputElement>("[data-weekday]"),
  ];
  const end = root.querySelector<HTMLSelectElement>("[data-recurrence-end]")!;
  const exceptions = root.querySelector<HTMLInputElement>("[data-exdates]")!;
  const lines = hidden.value.trim().split(/\r?\n/).filter(Boolean);
  const rule =
    lines.find((line) => line.startsWith("RRULE:")) ??
    (lines.length === 1 && !lines[0].includes(":") ? `RRULE:${lines[0]}` : "");
  const pairs = rule
    .replace(/^RRULE:/, "")
    .split(";")
    .filter(Boolean)
    .map((p) => p.split("="));
  const values = Object.fromEntries(pairs);
  let preserved =
    lines.filter((line) => line.startsWith("RRULE:")).length > 1 ||
    new Set(pairs.map(([key]) => key)).size !== pairs.length ||
    lines.some(
      (l) =>
        !l.startsWith("RRULE:") &&
        !/^EXDATE:\d{8}(,\d{8})*$/.test(l) &&
        l !== rule.slice(6),
    ) ||
    pairs.some(
      ([key]) => !["FREQ", "INTERVAL", "BYDAY", "COUNT", "UNTIL"].includes(key),
    ) ||
    (values.FREQ &&
      !["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(values.FREQ)) ||
    (values.BYDAY &&
      values.BYDAY.split(",").some(
        (d: string) => !["MO", "TU", "WE", "TH", "FR", "SA", "SU"].includes(d),
      )) ||
    (values.UNTIL && !/^\d{8}$/.test(values.UNTIL));
  for (const [key, el] of Object.entries(controls)) {
    if (values[key])
      el.value =
        key === "UNTIL"
          ? values[key].replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3")
          : values[key];
  }
  weekdays.forEach((el) => {
    el.checked = (values.BYDAY ?? "").split(",").includes(el.value);
  });
  end.value = values.COUNT ? "count" : values.UNTIL ? "until" : "never";
  exceptions.value = lines
    .filter((l) => l.startsWith("EXDATE:"))
    .flatMap((l) => l.slice(7).split(","))
    .map((d) => d.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3"))
    .join(", ");
  const notice = root.querySelector<HTMLElement>(
    "[data-recurrence-preserved]",
  )!;
  const replace = root.querySelector<HTMLButtonElement>(
    "[data-recurrence-replace]",
  )!;
  notice.hidden = replace.hidden = !preserved;
  const visibility = () => {
    root.querySelector<HTMLElement>("[data-count-label]")!.hidden =
      end.value !== "count";
    root.querySelector<HTMLElement>("[data-until-label]")!.hidden =
      end.value !== "until";
    controls.COUNT.disabled = end.value !== "count";
    controls.UNTIL.disabled = end.value !== "until";
    controls.COUNT.required = end.value === "count";
    controls.UNTIL.required = end.value === "until";
    controls.FREQ.required = !preserved && root.dataset.required === "true";
  };
  const update = () => {
    visibility();
    if (preserved) return;
    const freq = controls.FREQ.value;
    if (!freq) {
      hidden.value = "";
      return;
    }
    const rule = [`FREQ=${freq}`, `INTERVAL=${controls.INTERVAL.value || "1"}`];
    const days = weekdays.filter((d) => d.checked).map((d) => d.value);
    if (days.length) rule.push(`BYDAY=${days.join(",")}`);
    if (end.value === "count" && controls.COUNT.value)
      rule.push(`COUNT=${controls.COUNT.value}`);
    if (end.value === "until" && controls.UNTIL.value)
      rule.push(`UNTIL=${controls.UNTIL.value.replaceAll("-", "")}`);
    const dates = exceptions.value
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    exceptions.setCustomValidity(
      dates.some(
        (d) => !/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d)),
      )
        ? "Use comma-separated dates, YYYY-MM-DD."
        : "",
    );
    hidden.value = `RRULE:${rule.join(";")}${dates.length ? `\nEXDATE:${dates.map((d) => d.replaceAll("-", "")).join(",")}` : ""}`;
  };
  root.addEventListener("input", update);
  root.addEventListener("change", update);
  replace.addEventListener("click", () => {
    preserved = false;
    notice.hidden = replace.hidden = true;
    update();
  });
  visibility();
}

/** Rehydrate a generated answer without disturbing other inputs or selected files. */
export function replaceComplexValue(root: HTMLElement, value: string): void {
  const next = root.cloneNode(true) as HTMLElement;
  delete next.dataset.complexBound;
  next.dataset.initial = value;
  next.querySelector<HTMLInputElement>("[data-complex-value]")!.value = value;
  const format = next.dataset.complexInput;
  const parts = value.split(
    format === "location" || format === "map-point" ? ";;" : ";",
  );
  next
    .querySelectorAll<HTMLInputElement>("[data-part]")
    .forEach((input, index) => {
      const part = parts[index] ?? "";
      input.value =
        format === "date-range" && part
          ? new Date(Number(part)).toISOString().slice(0, 10)
          : part;
    });
  root.replaceWith(next);
  const form = next.closest("form");
  if (form) mountComplexInputs(form);
}

/** Custom controls can participate in current-step and final validation. */
export function registerFormInputValidator(
  control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  validate: () => string,
): () => void {
  const form = control.form;
  const listener = (event: Event) => {
    const root = (event as CustomEvent<{ root: Node }>).detail.root;
    if (root.contains(control)) control.setCustomValidity(validate());
  };
  form?.addEventListener("caraer:form-validate", listener);
  return () => form?.removeEventListener("caraer:form-validate", listener);
}
