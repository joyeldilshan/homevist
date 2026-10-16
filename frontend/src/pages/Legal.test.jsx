import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Privacy from "./Privacy";
import Terms from "./Terms";

/*
 * The legal drafts used to print "[PLACEHOLDER - legal review needed]"
 * inline. The gaps now live in docs/LEGAL_TODO.md; the public pages must
 * never show a placeholder again, and must keep the "draft" warning.
 */
const renderAt = (Page) =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Page />
    </MemoryRouter>
  ).container.textContent;

describe("legal pages", () => {
  for (const [name, Page] of [["Privacy", Privacy], ["Terms", Terms]]) {
    it(`${name} shows no placeholder text`, () => {
      expect(renderAt(Page)).not.toMatch(/PLACEHOLDER/i);
    });
    it(`${name} still says it is an unreviewed draft`, () => {
      expect(renderAt(Page)).toMatch(/has not been reviewed by a lawyer/);
    });
  }
});
