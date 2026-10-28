import { render } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { useRef } from "react";
import { useHeaderFit } from "@/components/navigation/useHeaderFit";

// jsdom has no layout: drive overflow from the data-nav mode being measured.
function Fixture({ fitsIn }: { fitsIn: string[] }) {
  const header = useRef<HTMLElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  useHeaderFit(header, bar, "k");
  return (
    <header ref={header} data-fits={fitsIn.join(",")}>
      <div ref={bar} />
    </header>
  );
}

function mockLayout(wide: boolean, fitsIn: string[]) {
  window.matchMedia = ((q: string) => ({ matches: wide && q.includes("640"), media: q })) as unknown as typeof window.matchMedia;
  const scroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollWidth");
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get(this: HTMLElement) {
      const mode = this.closest("header")?.getAttribute("data-nav") ?? "";
      return fitsIn.includes(mode) ? 100 : 500;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 200 });
  return () => { if (scroll) Object.defineProperty(HTMLElement.prototype, "scrollWidth", scroll); };
}

describe("useHeaderFit", () => {
  let restore = () => {};
  afterEach(() => restore());

  it("uses inline when everything fits", () => {
    restore = mockLayout(true, ["inline", "medium"]);
    const { container } = render(<Fixture fitsIn={[]} />);
    expect(container.querySelector("header")).toHaveAttribute("data-nav", "inline");
  });

  it("falls back to medium on wide-enough viewports", () => {
    restore = mockLayout(true, ["medium"]);
    const { container } = render(<Fixture fitsIn={[]} />);
    expect(container.querySelector("header")).toHaveAttribute("data-nav", "medium");
  });

  it("goes straight to compact below the small breakpoint", () => {
    restore = mockLayout(false, ["medium"]);
    const { container } = render(<Fixture fitsIn={[]} />);
    expect(container.querySelector("header")).toHaveAttribute("data-nav", "compact");
  });

  it("uses compact when even the medium shortcuts overflow", () => {
    restore = mockLayout(true, []);
    const { container } = render(<Fixture fitsIn={[]} />);
    expect(container.querySelector("header")).toHaveAttribute("data-nav", "compact");
  });
});
