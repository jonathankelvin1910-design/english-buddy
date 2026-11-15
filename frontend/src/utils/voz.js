import { useSyncExternalStore } from 'react'
import { ler, salvar } from './armazenamento'

// Voz usa as APIs do próprio navegador (sem custo e sem enviar áudio ao nosso servidor)
export const suportaFala =
  typeof window !== 'undefined' && Boolean(window.speechSynthesis) && typeof SpeechSynthesisUtterance !== 'undefined'
export const Reconhecimento =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined
export const suportaMic = Boolean(Reconhecimento)

export const VELOCIDADES = [
  ['0.8', 'Lenta'],
  ['1', 'Normal'],
  ['1.2', 'Rápida'],
]
const CODIGOS = { en: 'en-US', pt: 'pt-BR' }

let prefs = {
  idioma: ler('eb_voz_idioma', 'en', ['en', 'pt']),
  vel: ler('eb_voz_vel', '1', VELOCIDADES.map(([v]) => v)),
}
const ouvintes = new Set()

function assinar(fn) {
  ouvintes.add(fn)
  return () => ouvintes.delete(fn)
}

export function usePrefsVoz() {
  const atual = useSyncExternalStore(assinar, () => prefs)
  function alterar(campo, valor) {
    prefs = { ...prefs, [campo]: valor }
    salvar(campo === 'idioma' ? 'eb_voz_idioma' : 'eb_voz_vel', valor)
    ouvintes.forEach((fn) => fn())
  }
  return [atual, alterar]
}

export function pararFala() {
  if (suportaFala) window.speechSynthesis.cancel()
}

export function falar(texto, idioma, vel, aoFim) {
  if (!suportaFala) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(texto)
  const codigo = CODIGOS[idioma] || 'en-US'
  u.lang = codigo
  u.rate = Number(vel) || 1
  const voz = window.speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith(codigo))
  if (voz) u.voice = voz
  u.onend = aoFim
  u.onerror = aoFim
  window.speechSynthesis.speak(u)
}
