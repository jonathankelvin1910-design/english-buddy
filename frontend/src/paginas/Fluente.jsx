import { useEffect, useRef, useState } from 'react'
import { mensagemErro, postFluente } from '../api/api'
import buddy from '../assets/buddy.svg'
import { ler, salvar } from '../utils/armazenamento'
import {
  falar,
  liberarFala,
  pararFala,
  Reconhecimento,
  suportaFala,
  suportaMic,
  usePrefsVoz,
  VELOCIDADES,
} from '../utils/voz'

const LEGENDAS = [
  ['ambos', 'EN + PT'],
  ['en', 'EN'],
  ['pt', 'PT'],
  ['nenhuma', 'Sem legenda'],
]
const MAX_SILENCIOS = 3 // quantas vezes seguidas o microfone pode ouvir silêncio antes de pausar

const ROTULOS = {
  parado: 'Toque em Começar e fale em inglês',
  ouvindo: 'Ouvindo…',
  pensando: 'Buddy está pensando…',
  falando: 'Buddy está falando…',
  suavez: 'Sua vez',
}

export default function Fluente() {
  const [prefs, alterarPrefs] = usePrefsVoz()
  const [fase, setFase] = useState('parado')
  const [mensagens, setMensagens] = useState([])
  const [parcial, setParcial] = useState('')
  const [erro, setErro] = useState('')
  const [texto, setTexto] = useState('')
  const [verConversa, setVerConversa] = useState(false)
  const [legenda, setLegenda] = useState(() => ler('eb_fluente_legenda', 'ambos', LEGENDAS.map(([v]) => v)))

  const ativoRef = useRef(false) // a conversa está em andamento
  const vozRef = useRef(false) // o microfone volta a ouvir sozinho
  const geracaoRef = useRef(0) // muda a cada parar/recomeçar, para ignorar respostas antigas
  const recRef = useRef(null)
  const mensagensRef = useRef([])
  const silenciosRef = useRef(0)
  const velRef = useRef(prefs.vel)
  const fimRef = useRef(null)

  useEffect(() => {
    velRef.current = prefs.vel
  }, [prefs.vel])

  useEffect(
    () => () => {
      geracaoRef.current += 1
      recRef.current?.abort()
      pararFala()
    },
    [],
  )

  useEffect(() => {
    fimRef.current?.scrollIntoView?.({ block: 'end' })
  }, [mensagens.length, verConversa])

  function mudarLegenda(valor) {
    setLegenda(valor)
    salvar('eb_fluente_legenda', valor)
  }

  function parar() {
    ativoRef.current = false
    geracaoRef.current += 1
    recRef.current?.abort()
    recRef.current = null
    pararFala()
    setParcial('')
    setFase('parado')
  }

  function guardar(lista) {
    mensagensRef.current = lista
    setMensagens(lista)
  }

  async function turno(historico) {
    const minha = geracaoRef.current
    setFase('pensando')
    setErro('')
    try {
      const r = await postFluente(historico.slice(-12))
      if (minha !== geracaoRef.current) return
      guardar([...historico, { papel: 'assistant', texto: r.en, traducao: r.pt }])
      const depois = () => {
        if (minha !== geracaoRef.current) return
        if (vozRef.current && suportaMic) ouvir()
        else setFase('suavez')
      }
      if (suportaFala) {
        setFase('falando')
        falar(r.en, 'en', velRef.current, depois)
      } else {
        depois()
      }
    } catch (e) {
      if (minha !== geracaoRef.current) return
      setErro(mensagemErro(e))
      parar()
    }
  }

  function enviar(fala) {
    silenciosRef.current = 0
    const historico = [...mensagensRef.current, { papel: 'user', texto: fala }]
    guardar(historico)
    turno(historico)
  }

  function ouvir() {
    const minha = geracaoRef.current
    const rec = new Reconhecimento()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false
    let final = ''
    let falhou = ''
    rec.onresult = (e) => {
      final = Array.from(e.results).map((r) => r[0].transcript).join(' ').trim()
      setParcial(final)
    }
    rec.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') falhou = e.error
    }
    rec.onend = () => {
      if (minha !== geracaoRef.current || !ativoRef.current) return
      setParcial('')
      if (falhou) {
        setErro(
          falhou === 'not-allowed' || falhou === 'service-not-allowed'
            ? 'Permita o uso do microfone no navegador e tente de novo.'
            : 'O microfone parou de funcionar. Tente de novo ou use o campo de texto.',
        )
        parar()
      } else if (final) {
        enviar(final.slice(0, 500))
      } else if (silenciosRef.current + 1 >= MAX_SILENCIOS) {
        setErro('Não ouvi nada por um tempo, então pausei. Toque em Começar para continuar.')
        parar()
      } else {
        silenciosRef.current += 1
        setTimeout(() => {
          if (minha === geracaoRef.current && ativoRef.current) ouvir()
        }, 250)
      }
    }
    recRef.current = rec
    setFase('ouvindo')
    try {
      rec.start()
    } catch {
      setErro('Não consegui ligar o microfone. Use o campo de texto.')
      parar()
    }
  }

  function comecar() {
    liberarFala()
    geracaoRef.current += 1
    ativoRef.current = true
    vozRef.current = true
    silenciosRef.current = 0
    setErro('')
    const inicio = [{ papel: 'user', texto: 'Hello!', oculta: true }]
    guardar(inicio)
    turno(inicio)
  }

  // Já existe conversa (por texto, ou depois de Parar): volta a ouvir sem apagar nada
  function continuar() {
    liberarFala()
    geracaoRef.current += 1
    ativoRef.current = true
    vozRef.current = true
    silenciosRef.current = 0
    setErro('')
    ouvir()
  }

  function novaConversa() {
    parar()
    guardar([])
    setErro('')
  }

  function enviarTexto(e) {
    e.preventDefault()
    const t = texto.trim()
    if (!t || fase === 'pensando') return
    setTexto('')
    setErro('')
    recRef.current?.abort()
    recRef.current = null
    pararFala()
    liberarFala()
    geracaoRef.current += 1
    ativoRef.current = true
    vozRef.current = false // quem digita não precisa do microfone ligando sozinho
    enviar(t)
  }

  const visiveis = mensagens.filter((m) => !m.oculta)
  const ultimaIA = [...visiveis].reverse().find((m) => m.papel === 'assistant')
  const ultimaVoce = [...visiveis].reverse().find((m) => m.papel === 'user')
  const ocupado = fase === 'ouvindo' || fase === 'pensando' || fase === 'falando'
  const temConversa = visiveis.length > 0

  return (
    <main className="fluente">
      <section className="fluente-palco" aria-label="Conversa por voz">
        <div className={`avatar-fluente ${fase}`}>
          <img src={buddy} alt="Buddy" />
        </div>
        <p className="fluente-estado" role="status">{ROTULOS[fase]}</p>

        {ocupado ? (
          <button className="botao grande parar" onClick={parar}>Parar</button>
        ) : (
          suportaMic && (
            <button className="botao grande" onClick={temConversa ? continuar : comecar}>
              {temConversa ? '🎤 Continuar' : '🎤 Começar'}
            </button>
          )
        )}
        {!ocupado && temConversa && (
          <button type="button" className="link" onClick={novaConversa}>Nova conversa</button>
        )}
        {!suportaMic && (
          <p className="fluente-aviso">
            Seu navegador não liga o microfone. Escreva no campo abaixo e o Buddy responde falando.
          </p>
        )}
        {erro && <div className="erro" role="alert">{erro}</div>}

        {verConversa && (
          <div className="fluente-conversa">
            {visiveis.length === 0 && <p className="placeholder">A conversa aparece aqui.</p>}
            {visiveis.map((m, i) => (
              <p key={i} className={m.papel === 'user' ? 'voce' : 'buddy'}>
                <b>{m.papel === 'user' ? 'Você' : 'Buddy'}:</b> {m.texto}
                {m.papel === 'assistant' && m.traducao && <span className="pt"> ({m.traducao})</span>}
              </p>
            ))}
            <div ref={fimRef} />
          </div>
        )}
      </section>

      <section className="legenda-tela" aria-live="polite" aria-label="Legenda">
        {fase === 'ouvindo' && parcial ? (
          <p className="legenda-voce">{parcial}</p>
        ) : (
          ultimaVoce && <p className="legenda-voce">Você: {ultimaVoce.texto}</p>
        )}
        {ultimaIA && legenda !== 'nenhuma' && (
          <div className="legenda-buddy">
            {legenda !== 'pt' && <p className="legenda-en">{ultimaIA.texto}</p>}
            {legenda !== 'en' && ultimaIA.traducao && <p className="legenda-pt">{ultimaIA.traducao}</p>}
          </div>
        )}
        {!ultimaIA && !ultimaVoce && (
          <p className="legenda-vazia">As legendas aparecem aqui, como num filme.</p>
        )}
      </section>

      <form className="fluente-barra" onSubmit={enviarTexto}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={500}
          placeholder="Ou escreva em inglês…"
          aria-label="Sua mensagem"
          disabled={fase === 'pensando'}
        />
        <button className="botao" disabled={!texto.trim() || fase === 'pensando'}>Enviar</button>
      </form>

      <div className="fluente-opcoes">
        <span className="seg" role="group" aria-label="Idioma da legenda">
          {LEGENDAS.map(([v, r]) => (
            <button key={v} type="button" className={legenda === v ? 'on' : ''} onClick={() => mudarLegenda(v)}>
              {r}
            </button>
          ))}
        </span>
        {suportaFala && (
          <label>
            Velocidade{' '}
            <select value={prefs.vel} onChange={(e) => alterarPrefs('vel', e.target.value)}>
              {VELOCIDADES.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
            </select>
          </label>
        )}
        <button type="button" className="link" onClick={() => setVerConversa((v) => !v)}>
          {verConversa ? 'Esconder conversa' : 'Ver conversa'}
        </button>
      </div>
      <p className="fluente-nota">Esta conversa não é salva.</p>
    </main>
  )
}
