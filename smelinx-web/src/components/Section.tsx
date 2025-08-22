import * as React from "react";

/**
 * Section wrapper that accepts all standard <section> attributes,
 * so you can pass id, className, aria-* etc.
 * It also applies the global `container-pad` class for layout.
 */

type SectionProps = {
  id?: string
  className?: string
  children: React.ReactNode
}
export default function Section(
  { children, className, ...rest }: React.HTMLAttributes<HTMLElement>
) {
  const classes = ["container-pad", className].filter(Boolean).join(" ");
  return (
    <section className={classes} {...rest}>
      {children}
    </section>
  );
}
