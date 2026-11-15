import { useEffect, useRef, useState } from 'react'
import { falar, pararFala, suportaFala, usePrefsVoz } from '../utils/voz'

// Lê um texto em voz alta. Se "idioma" não for informado, usa o idioma de voz escolhido.
export default function BotaoOuvir({ texto, idioma }) {
  const [prefs] = usePrefsVoz()
  const [falando, setFalando] = useState(false)
  const falandoRef = useRef(false)

  useEffect(() => () => {
    if (falandoRef.current) pararFala()
  }, [])

  if (!suportaFala || !texto) return null

  function alternar() {
    if (falando) {
      pararFala()
      return
    }
    falandoRef.current = true
    setFalando(true)
    falar(texto, idioma || prefs.idioma, prefs.vel, () => {
      falandoRef.current = false
      setFalando(false)
    })
  }

  return (
    <button
      type="button"
      className={`ouvir ${falando ? 'on' : ''}`}
      onClick={alternar}
      aria-label={falando ? 'Parar áudio' : 'Ouvir'}
      title={falando ? 'Parar' : 'Ouvir'}
    >
      {falando ? '⏹' : '🔊'}
    </button>
  )
}
