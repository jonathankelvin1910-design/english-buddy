import { useEffect, useRef, useState } from 'react'
import CartaoFrases from './CartaoFrases'
import Mensagem from './Mensagem'
import BotaoMic from './BotaoMic'
import VozControles from './VozControles'

export default function Chat({ conversa, legenda, pendente, abrindo = false, aoEnviar }) {
  const [texto, setTexto] = useState('')
  const fimRef = useRef(null)
  const mensagens = conversa.mensagens
  const ultimaComFrases = [...mensagens].reverse().find((m) => m.papel === 'assistant' && m.frases.length > 0)

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens.length, pendente, abrindo])

  async function enviar(e) {
    e.preventDefault()
    const t = texto.trim()
    if (!t || pendente) return
    setTexto('')
    const ok = await aoEnviar(t)
    if (!ok) setTexto(t)
  }

  return (
    <div className="chat">
      {ultimaComFrases && <CartaoFrases key={ultimaComFrases.id} frases={ultimaComFrases.frases} />}

      <div className="mensagens">
        {mensagens.length === 0 && !pendente && !abrindo && (
          <p className="dica">
            Diga “Hello!” para começar. Pode escrever em inglês: o Buddy conversa com você e corrige com carinho.
          </p>
        )}
        {mensagens.map((m) => <Mensagem key={m.id} m={m} legenda={legenda} />)}
        {pendente && (
          <>
            <div className="linha eu"><div className="bolha eu">{pendente}</div></div>
            <div className="linha ia"><div className="bolha ia digitando">Buddy está pensando…</div></div>
          </>
        )}
        {abrindo && (
          <div className="linha ia"><div className="bolha ia digitando">Buddy está chegando…</div></div>
        )}
        <div ref={fimRef} />
      </div>

      <VozControles />
      <form className="entrada" onSubmit={enviar}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={500}
          placeholder="Escreva em inglês…"
          aria-label="Sua mensagem"
          disabled={Boolean(pendente) || abrindo}
        />
        <BotaoMic aoTexto={setTexto} desativado={Boolean(pendente) || abrindo} />
        <button className="botao" disabled={!texto.trim() || Boolean(pendente) || abrindo}>Enviar</button>
      </form>
    </div>
  )
}
