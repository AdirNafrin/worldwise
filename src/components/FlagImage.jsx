// Thin wrapper around <img> used everywhere a country flag is shown.
// Centralizes lazy-loading (flags load only as they scroll/appear on
// screen) and disables the native browser drag-to-select-image gesture,
// which otherwise interferes with quickly tapping answer options.
export function FlagImage({ src, alt, className }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className || 'h-full w-full object-cover'}
      draggable={false}
    />
  );
}
