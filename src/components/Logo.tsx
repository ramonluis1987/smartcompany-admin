/** The firm's logo (shield + name). "dark" text for light backgrounds, "light" for dark ones. */
export function Logo({
  tone = 'dark',
  className = '',
}: {
  tone?: 'dark' | 'light'
  className?: string
}) {
  return (
    <img
      src={tone === 'dark' ? '/logo-dark.webp' : '/logo-light.webp'}
      alt="Smart Company Abogados & Auditores"
      width={960}
      height={247}
      className={`w-auto ${className}`}
    />
  )
}
