import { mountComplexInputs, replaceComplexValue } from "./form-complex.ts";

/** Bind once per form, including forms inserted by an editor preview replacement. */
export function mountForms(): void {
  document
    .querySelectorAll<HTMLFormElement>("form[data-caraer-form]")
    .forEach((form) => {
      if (form.dataset.caraerBound) return;
      form.dataset.caraerBound = "true";
      mountComplexInputs(form);
      const status = form.querySelector<HTMLElement>(".caraer-form__status");
      const submit = form.querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      );
      const steps = [...form.querySelectorAll<HTMLElement>("[data-step]")];
      const previous =
        form.querySelector<HTMLButtonElement>("[data-wizard-prev]");
      const next = form.querySelector<HTMLButtonElement>("[data-wizard-next]");
      let current = 0;
      let busy = false;
      const showStep = () => {
        steps.forEach((step, i) => {
          step.hidden = i !== current;
        });
        if (previous) previous.hidden = current === 0;
        if (next) next.hidden = current >= steps.length - 1;
        if (submit)
          submit.hidden = steps.length > 1 && current < steps.length - 1;
        form.dispatchEvent(
          new CustomEvent("caraer:form-step", {
            bubbles: true,
            detail: { formUuid: form.dataset.caraerForm, stepIndex: current },
          }),
        );
      };
      const validate = (root: ParentNode): boolean => {
        form.dispatchEvent(
          new CustomEvent("caraer:form-validate", { detail: { root } }),
        );
        root
          .querySelectorAll<HTMLElement>(
            '.caraer-input-choices[data-required="true"]',
          )
          .forEach((group) => {
            const first = group.querySelector<HTMLInputElement>(
              'input[type="checkbox"]',
            );
            first?.setCustomValidity(
              group.querySelector("input:checked")
                ? ""
                : "Choose at least one option.",
            );
          });
        const invalid = root.querySelector<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >("input:invalid, select:invalid, textarea:invalid");
        if (!invalid) return true;
        const index = steps.findIndex((step) => step.contains(invalid));
        if (index >= 0 && index !== current) {
          current = index;
          showStep();
        }
        invalid.focus();
        invalid.reportValidity();
        return false;
      };
      if (steps.length) showStep();
      next?.addEventListener("click", () => {
        if (!validate(steps[current])) return;
        current = Math.min(current + 1, steps.length - 1);
        showStep();
      });
      previous?.addEventListener("click", () => {
        current = Math.max(0, current - 1);
        showStep();
      });
      form.addEventListener("change", () => {
        form
          .querySelectorAll<HTMLInputElement>(".caraer-input-choices input")
          .forEach((input) => input.setCustomValidity(""));
        form
          .querySelectorAll<HTMLInputElement>('input[type="file"]')
          .forEach((input) => {
            const hint = input.parentElement?.querySelector<HTMLElement>(
              ".caraer-form__file-hint",
            );
            if (hint)
              hint.textContent =
                [...(input.files ?? [])].map((f) => f.name).join(", ") ||
                "Choose a file";
          });
      });
      form.addEventListener("keydown", (event) => {
        if (
          event.key === "Enter" &&
          steps.length > 1 &&
          current < steps.length - 1 &&
          event.target instanceof HTMLInputElement
        ) {
          event.preventDefault();
          next?.click();
        }
      });
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (busy || !validate(form)) return;
        if (form.dataset.preview === "true") {
          if (status) {
            status.hidden = false;
            status.textContent = "Preview only — no submission was saved.";
          }
          return;
        }
        busy = true;
        if (submit) submit.disabled = true;
        try {
          const response = await fetch(form.action, {
            method: "POST",
            body: new FormData(form),
            headers: { Accept: "application/json" },
          });
          if (!response.ok) throw new Error("Submission failed");
          form.dispatchEvent(
            new CustomEvent("caraer:form-submitted", { bubbles: true }),
          );
          if (form.dataset.redirect) {
            window.location.assign(form.dataset.redirect);
            return;
          }
          form.reset();
          form
            .querySelectorAll<HTMLElement>("[data-complex-input]")
            .forEach((root) =>
              replaceComplexValue(root, root.dataset.initial ?? ""),
            );
          current = 0;
          if (steps.length) showStep();
          form.dispatchEvent(new Event("change", { bubbles: true }));
          if (status) {
            status.hidden = false;
            status.textContent =
              form.dataset.thankYou ?? "Bedankt voor je inzending.";
          }
        } catch {
          if (status) {
            status.hidden = false;
            status.textContent = "Er ging iets mis. Probeer het opnieuw.";
          }
        } finally {
          busy = false;
          if (submit) submit.disabled = false;
        }
      });
    });
}
