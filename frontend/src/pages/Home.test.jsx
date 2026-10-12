import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "./Home";

/**
 * Smoke test for the landing page.
 *
 * Exists because of a real crash: when the fake stats/reviews/team
 * sections were removed, SECTIONS shrank from 9 entries to 8 and two
 * blocks were left reading stale array positions. One resolved to a
 * neighbouring section and silently rendered the wrong label; the other
 * resolved to undefined and threw inside SpecimenLabel, taking the whole
 * page down behind the ErrorBoundary.
 *
 * The build was green throughout — nothing here is a type error. Only
 * rendering the component catches it.
 */

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

describe("Home (landing page)", () => {
  let errorSpy;

  beforeEach(() => {
    // React logs render errors through console.error before rethrowing.
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("renders without throwing", () => {
    expect(() => renderHome()).not.toThrow();
  });

  it("logs no React errors while rendering", () => {
    renderHome();
    const messages = errorSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(messages).not.toMatch(/Cannot read properties of undefined/i);
    expect(messages).not.toMatch(/Each child in a list should have a unique "key"/i);
  });

  it("renders every section heading, so none silently disappears", () => {
    renderHome();
    for (const heading of [
      /what you get/i,         // features
      /four steps\. one report/i,   // process
      /four roles, one system/i,    // roles block, replaced the fake team
      /how a booking moves/i,       // lifecycle block, replaced fake reviews
      /common questions/i,          // faq
    ]) {
      expect(screen.getByText(heading)).toBeInTheDocument();
    }
  });

  /*
   * The regression that caused the crash. Every section label must
   * render its OWN name — the bug made the FAQ block display "Contact",
   * which threw no error and would have shipped unnoticed.
   */
  it("labels each section with its own name and code", () => {
    const { container } = renderHome();

    const codes = [...container.querySelectorAll(".label-code")].map((n) => n.textContent);
    const names = [...container.querySelectorAll(".label-name")].map((n) => n.textContent);

    expect(codes.length).toBeGreaterThan(0);

    // No label may be blank — a missing section renders an empty one.
    expect(codes.every(Boolean)).toBe(true);
    expect(names.every(Boolean)).toBe(true);

    // Codes are unique: a duplicate means two blocks share a section.
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(names).size).toBe(names.length);

    // The specific pairing that was wrong.
    const faqIndex = names.indexOf("FAQ");
    expect(faqIndex).toBeGreaterThan(-1);
    expect(codes[faqIndex]).toBe("HV-07");

    const contactIndex = names.indexOf("Contact");
    expect(contactIndex).toBeGreaterThan(-1);
    expect(codes[contactIndex]).toBe("HV-08");
  });

  it("makes no unverifiable claims in the rendered copy", () => {
    const { container } = renderHome();
    const text = container.textContent;

    // These were removed deliberately; a regression must fail loudly.
    expect(text).not.toMatch(/15K\+/);
    expect(text).not.toMatch(/guaranteed within four hours/i);
    expect(text).not.toMatch(/the test is on us/i);
    expect(text).not.toMatch(/NABL/);
    expect(text).not.toMatch(/HIPAA/);
  });
});
