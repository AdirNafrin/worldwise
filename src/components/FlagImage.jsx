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
