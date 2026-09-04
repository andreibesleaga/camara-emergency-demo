import React from 'react';

type CardProps = {
  /** Used to build the id that labels the section. */
  id: string;
  title: string;
  /** Small right-aligned detail shown next to the title. */
  meta?: React.ReactNode;
  children: React.ReactNode;
};

/** A floating deck card: translucent panel with a heading and an optional meta slot. */
export default function Card({ id, title, meta, children }: CardProps) {
  const headingId = `${id}-title`;
  return (
    <section className="card" aria-labelledby={headingId}>
      <h2 className="card__head" id={headingId}>
        <span className="card__title">{title}</span>
        {meta ? <span className="card__meta">{meta}</span> : null}
      </h2>
      {children}
    </section>
  );
}
