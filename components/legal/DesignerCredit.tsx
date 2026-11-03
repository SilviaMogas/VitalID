/**
 * "Designed by famouspigeon.site" credit, rendered once beneath the legal links
 * in every public footer (bare pages, auth frame, welcome screen).
 *
 * LOGO: the official Famous Pigeon logo is not in this repository yet. Drop the
 * supplied file at `public/brand/famous-pigeon.svg` (or .png) and set
 * FAMOUS_PIGEON_LOGO_SRC to its path. Until then only the text credit renders.
 * Do not substitute a drawn or emoji pigeon.
 */
const FAMOUS_PIGEON_LOGO_SRC: string | null = null;

export function DesignerCredit({ className = "" }: { className?: string }) {
  return (
    <p className={`designer-credit ${className}`}>
      <a
        href="https://famouspigeon.site"
        target="_blank"
        rel="noopener noreferrer"
        dir="ltr"
        className="designer-credit__link"
      >
        {FAMOUS_PIGEON_LOGO_SRC && (
          // eslint-disable-next-line @next/next/no-img-element -- tiny static brand mark, no optimisation needed
          <img
            src={FAMOUS_PIGEON_LOGO_SRC}
            alt=""
            aria-hidden="true"
            height={24}
            className="designer-credit__logo"
          />
        )}
        <span>Designed by famouspigeon.site</span>
      </a>
    </p>
  );
}
