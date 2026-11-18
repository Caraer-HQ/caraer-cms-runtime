/** A DOM editor for JSON values. No HTML or code is evaluated from the stored value. */
export function mountStructureEditor(
  root: HTMLElement,
  hidden: HTMLInputElement,
  required: boolean,
): void {
  let value: unknown;
  try {
    value = hidden.value ? JSON.parse(hidden.value) : {};
  } catch {
    const warning = document.createElement("p");
    warning.textContent =
      "This saved structure cannot be edited. Its original value has been preserved.";
    root.append(warning);
    return;
  }
  const validate = () =>
    root
      .querySelector("select")
      ?.setCustomValidity(
        required && !hidden.value ? "Enter a structured value." : "",
      );
  const save = () => {
    hidden.value = JSON.stringify(value);
    validate();
  };
  function node(
    current: unknown,
    change: (value: unknown) => void,
    label: string,
  ): HTMLElement {
    const box = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = label;
    box.append(legend);
    const type =
      current === null
        ? "null"
        : Array.isArray(current)
          ? "array"
          : typeof current;
    const select = document.createElement("select");
    select.setAttribute("aria-label", `${label} type`);
    for (const kind of [
      "string",
      "number",
      "boolean",
      "object",
      "array",
      "null",
    ]) {
      const option = new Option(kind, kind, false, kind === type);
      select.add(option);
    }
    select.addEventListener("change", () => {
      change(
        (
          {
            string: "",
            number: 0,
            boolean: false,
            object: {},
            array: [],
            null: null,
          } as Record<string, unknown>
        )[select.value],
      );
      render();
    });
    box.append(select);
    if (type === "object" || type === "array") {
      const entries = Object.entries(current as object);
      for (const [key, item] of entries) {
        const row = document.createElement("div");
        row.append(
          node(
            item,
            (next) => {
              (current as Record<string, unknown>)[key] = next;
              save();
            },
            key,
          ),
        );
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", `Remove ${key}`);
        remove.onclick = () => {
          if (Array.isArray(current)) current.splice(Number(key), 1);
          else delete (current as Record<string, unknown>)[key];
          save();
          render();
        };
        row.append(remove);
        if (Array.isArray(current) && Number(key) > 0) {
          const up = document.createElement("button");
          up.type = "button";
          up.textContent = "Move up";
          up.onclick = () => {
            const i = Number(key);
            [current[i - 1], current[i]] = [current[i], current[i - 1]];
            save();
            render();
          };
          row.append(up);
        }
        box.append(row);
      }
      const keyInput = document.createElement("input");
      keyInput.placeholder = "Property name";
      keyInput.setAttribute("aria-label", `${label} new property name`);
      if (!Array.isArray(current)) box.append(keyInput);
      const add = document.createElement("button");
      add.type = "button";
      add.textContent = "Add item";
      add.onclick = () => {
        if (Array.isArray(current)) current.push("");
        else {
          const key = keyInput.value.trim();
          if (
            !key ||
            Object.hasOwn(current as object, key) ||
            ["__proto__", "constructor", "prototype"].includes(key)
          ) {
            keyInput.setCustomValidity("Choose a unique property name.");
            keyInput.reportValidity();
            return;
          }
          Object.defineProperty(current, key, {
            value: "",
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
        save();
        render();
      };
      box.append(add);
    } else if (type !== "null") {
      const input = document.createElement("input");
      input.setAttribute("aria-label", label);
      input.type =
        type === "boolean" ? "checkbox" : type === "number" ? "number" : "text";
      input.step = "any";
      input.value = String(current ?? "");
      input.checked = current === true;
      input.required = required && label === "Value";
      input.oninput = () => {
        change(
          type === "boolean"
            ? input.checked
            : type === "number"
              ? Number(input.value)
              : input.value,
        );
        save();
      };
      box.append(input);
    }
    return box;
  }
  function render() {
    root.replaceChildren(
      node(
        value,
        (next) => {
          value = next;
          save();
        },
        "Value",
      ),
    );
    validate();
  }
  render();
}
