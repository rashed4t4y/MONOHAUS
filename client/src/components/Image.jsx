export default function Image({ src, alt, ...props }) {
  return <img src={src || '/assets/fallback.svg'} alt={alt} {...props} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/assets/fallback.svg'; }} />;
}
