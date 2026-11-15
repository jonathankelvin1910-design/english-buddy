import { suportaFala, usePrefsVoz, VELOCIDADES } from '../utils/voz'

// Escolhe em que idioma a voz lê as respostas e a velocidade
export default function VozControles() {
  const [prefs, alterar] = usePrefsVoz()
  if (!suportaFala) return null
  return (
    <div className="voz-barra">
      <span>
        🔊 Voz{' '}
        <span className="seg" role="group" aria-label="Idioma da voz">
          {[['en', 'EN'], ['pt', 'PT']].map(([v, r]) => (
            <button key={v} type="button" className={prefs.idioma === v ? 'on' : ''} onClick={() => alterar('idioma', v)}>
              {r}
            </button>
          ))}
        </span>
      </span>
      <label>
        Velocidade{' '}
        <select value={prefs.vel} onChange={(e) => alterar('vel', e.target.value)}>
          {VELOCIDADES.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
      </label>
    </div>
  )
}
