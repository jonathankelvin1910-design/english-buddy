import { useState } from 'react'
import BotaoOuvir from './BotaoOuvir'
import BotaoSalvar from './BotaoSalvar'

export default function CartaoFrases({ frases }) {
  const [i, setI] = useState(0)
  const total = frases.length
  const frase = frases[i]

  return (
    <div className="cartao frases" aria-label="Frases para praticar">
      <div className="frases-titulo">Frases para praticar</div>
      <div className="frase">
        <div className="en">{frase.en}</div>
        <div className="pt">{frase.pt}</div>
        <div className="frase-acoes">
          <BotaoOuvir texto={frase.en} idioma="en" />
          <BotaoSalvar key={frase.en} en={frase.en} pt={frase.pt} />
        </div>
      </div>
      <div className="frases-nav">
        <button className="nav-btn" disabled={i === 0} onClick={() => setI(i - 1)}>← Anterior</button>
        <span>{i + 1} de {total}</span>
        <button className="nav-btn proximo" disabled={i === total - 1} onClick={() => setI(i + 1)}>Próxima →</button>
      </div>
    </div>
  )
}
