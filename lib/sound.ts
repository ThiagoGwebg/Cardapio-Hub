// Bipe curto de "novo pedido" via WebAudio (sem arquivo de áudio).
// Precisa de um gesto do usuário antes de funcionar (política de autoplay);
// o botão "Ativar alertas" serve como esse gesto.
export function playNewOrderBeep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const now = ctx.currentTime
    ;[0, 0.18].forEach((delay) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, now + delay)
      gain.gain.exponentialRampToValueAtTime(0.35, now + delay + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.16)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + delay)
      osc.stop(now + delay + 0.18)
    })
    setTimeout(() => ctx.close(), 500)
  } catch {
    // ambiente sem suporte a áudio — ignora
  }
}
