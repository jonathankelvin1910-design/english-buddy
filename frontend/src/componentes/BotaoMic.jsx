import { useEffect, useRef, useState } from 'react'
import { Reconhecimento, suportaMic } from '../utils/voz'

// Dita o que você fala (em inglês) para dentro do campo de texto
export default function BotaoMic({ aoTexto, desativado }) {
  const [ouvindo, setOuvindo] = useState(false)
  const [aviso, setAviso] = useState('')
  const recRef = useRef(null)

  useEffect(() => () => recRef.current?.abort(), [])

  if (!suportaMic) return null

  function alternar() {
    if (ouvindo) {
      recRef.current?.stop()
      return
    }
    setAviso('')
    const rec = new Reconhecimento()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e) => {
      const fala = Array.from(e.results).map((r) => r[0].transcript).join(' ')
      aoTexto(fala.trim())
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setAviso('Permita o uso do microfone no navegador.')
      } else if (e.error === 'no-speech') {
        setAviso('Não ouvi nada. Tente de novo.')
      }
    }
    rec.onend = () => setOuvindo(false)
    recRef.current = rec
    setOuvindo(true)
    try {
      rec.start()
    } catch {
      setOuvindo(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={`mic ${ouvindo ? 'on' : ''}`}
        onClick={alternar}
        disabled={desativado}
        aria-label={ouvindo ? 'Parar de ouvir' : 'Falar em inglês'}
        title={ouvindo ? 'Parar' : 'Falar em inglês'}
      >
        {ouvindo ? '⏹' : '🎤'}
      </button>
      {aviso && <span className="mic-aviso" role="status">{aviso}</span>}
    </>
  )
}
