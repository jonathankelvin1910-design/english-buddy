import BotaoOuvir from './BotaoOuvir'
import { usePrefsVoz } from '../utils/voz'

export default function Mensagem({ m, legenda }) {
  const [prefs] = usePrefsVoz()
  if (m.papel === 'user') {
    return (
      <div className="linha eu">
        <div className="bolha eu">{m.texto}</div>
        {m.correcao && (
          <div className="corr">
            <s>{m.correcao.original}</s> → <u>{m.correcao.corrigida}</u>
            <div>{m.correcao.explicacao}</div>
          </div>
        )}
      </div>
    )
  }

  const verPt = legenda !== 'en' && m.traducao
  const verEn = legenda !== 'pt' || !m.traducao
  return (
    <div className="linha ia">
      <div className="bolha ia">
        {verEn && <span className="en">{m.texto}</span>}
        {verPt && <span className="pt">{m.traducao}</span>}
      </div>
      <BotaoOuvir texto={prefs.idioma === 'pt' && m.traducao ? m.traducao : m.texto} />
    </div>
  )
}
