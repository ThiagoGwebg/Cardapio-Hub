/* Ícones da home: traço fino, 24×24, herdando currentColor.
   Ficam aqui e não em components/icons.tsx porque só a landing usa — o bundle
   do dashboard não precisa carregar nenhum deles. */

type P = { size?: number }

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function IconPalette({ size = 22 }: P) {
  return (
    <svg {...base(size)}>
      <path d="M12 3a9 9 0 1 0 0 18c.8 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1-.3-.3-.4-.6-.4-1 0-.9.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8Z" />
      <circle cx="7.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="9" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconSearch({ size = 22 }: P) {
  return (
    <svg {...base(size)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  )
}

export function IconBoard({ size = 22 }: P) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="4" width="5.5" height="16" rx="1.5" />
      <rect x="9.25" y="4" width="5.5" height="10" rx="1.5" />
      <rect x="15.5" y="4" width="5.5" height="13" rx="1.5" />
    </svg>
  )
}

export function IconChart({ size = 22 }: P) {
  return (
    <svg {...base(size)}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="m7.5 15 3.5-4 3 2.5 4.5-6" />
    </svg>
  )
}

export function IconLink({ size = 22 }: P) {
  return (
    <svg {...base(size)}>
      <path d="M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.2 1.2" />
      <path d="M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.2-1.2" />
    </svg>
  )
}

export function IconPower({ size = 22 }: P) {
  return (
    <svg {...base(size)}>
      <path d="M12 3v8" />
      <path d="M18 6.5a8 8 0 1 1-12 0" />
    </svg>
  )
}

export function IconQr({ size = 22 }: P) {
  return (
    <svg {...base(size)}>
      <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="14.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="3.5" y="14.5" width="6" height="6" rx="1" />
      <path d="M14.5 14.5h3v3h-3zM20.5 14.5v3M17.5 20.5h3" />
    </svg>
  )
}

export function IconChat({ size = 22 }: P) {
  return (
    <svg {...base(size)}>
      <path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.4-4.8A7.5 7.5 0 1 1 20 12Z" />
    </svg>
  )
}

export function IconHeart({ size = 22 }: P) {
  return (
    <svg {...base(size)}>
      <path d="M12 19.5S4.5 15 4.5 9.8A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7.5 1.8c0 5.2-7.5 9.7-7.5 9.7Z" />
    </svg>
  )
}

export function IconStores({ size = 22 }: P) {
  return (
    <svg {...base(size)}>
      <path d="M4 9.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9.5" />
      <path d="M3 9.5 4.8 4.6A1 1 0 0 1 5.7 4h12.6a1 1 0 0 1 .9.6L21 9.5a2.8 2.8 0 0 1-4.5.7 2.8 2.8 0 0 1-4.5 0 2.8 2.8 0 0 1-4.5 0A2.8 2.8 0 0 1 3 9.5Z" />
    </svg>
  )
}

export function IconSheet({ size = 22 }: P) {
  return (
    <svg {...base(size)}>
      <path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8Z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 13h7M8.5 16.5h4.5" />
    </svg>
  )
}

export function IconBadgeOff({ size = 22 }: P) {
  return (
    <svg {...base(size)}>
      <path d="M12 3.5 14.3 6l3.4-.3.4 3.4 2.4 2.4-2.4 2.4-.4 3.4-3.4-.3L12 19.5 9.7 17l-3.4.3-.4-3.4L3.5 11.5l2.4-2.4.4-3.4L9.7 6Z" />
      <path d="m9.5 14.5 5-5" />
    </svg>
  )
}
