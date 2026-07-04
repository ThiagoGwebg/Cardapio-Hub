export function fmtCents(cents: number) {
  return 'R$ ' + (cents / 100).toFixed(2).replace('.', ',')
}
