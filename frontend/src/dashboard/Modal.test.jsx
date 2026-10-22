import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Modal, Field } from "./kit";

/*
 * Regression: the Modal's focus effect depended on onClose, which every
 * caller passes as an inline arrow. Each keystroke re-rendered the parent,
 * gave Modal a new onClose and re-ran the effect, which put focus back on
 * the first field (in jsdom: on the dialog itself) after one character.
 *
 * This harness behaves like the dashboards: form state lives in the
 * parent, and onClose is a new arrow on every render.
 */
function Harness({ onClosed = () => {} }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open form</button>
      <Modal open={open} onClose={() => { onClosed(); setOpen(false); }} title="Add a phlebotomist">
        <Field label="Full name"><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
        <Field label="Email"><input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
      </Modal>
    </>
  );
}

// One character at a time, each as its own change, with the field focused
// first as a user's click would. Returns where focus was after each one.
function typeInto(input, text) {
  input.focus();
  const after = [];
  for (const ch of text) {
    act(() => { fireEvent.change(document.activeElement, { target: { value: document.activeElement.value + ch } }); });
    after.push(document.activeElement);
  }
  return after;
}

describe("Modal focus", () => {
  it("keeps focus in the field being typed in, for every character, in every field", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open form" }));
    const name = screen.getByLabelText("Full name");
    const email = screen.getByLabelText("Email");

    for (const el of typeInto(name, "Jo Lee")) expect(el).toBe(name);
    for (const el of typeInto(email, "jo@example.com")) expect(el).toBe(email);

    expect(name.value).toBe("Jo Lee");
    expect(email.value).toBe("jo@example.com");
  });

  it("Escape uses the latest onClose and returns focus to the button that opened it", () => {
    const onClosed = vi.fn();
    render(<Harness onClosed={onClosed} />);
    const opener = screen.getByRole("button", { name: "Open form" });
    opener.focus();
    fireEvent.click(opener);
    typeInto(screen.getByLabelText("Email"), "a");   // re-render: onClose is now a different function
    act(() => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(opener);
  });
});
