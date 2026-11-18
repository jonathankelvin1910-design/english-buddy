import { useRef, useState } from 'react'
import { mensagemErro, postTraduzir } from '../api/api'
import BotaoOuvir from '../componentes/BotaoOuvir'
import BotaoSalvar from '../componentes/BotaoSalvar'
import { ler, salvar } from '../utils/armazenamento'

const NOMES = { pt: 'Português', en: 'Inglês' }
const EXEMPLOS = [
  'Onde fica o banheiro?',
  'How much does this cost?',
  'Eu gostaria de reservar uma mesa para duas pessoas.',
]
const MAXIMO = 1000
const ATRASO = 900 // ms sem digitar antes de traduzir sozinho
const MIN_AUTO = 2 // letras mínimas para a tradução automática

export default function Traduzir() {
  const [texto, setTexto] = useState('')
  const [de, setDe] = useState('auto')
  const [para, setPara] = useState('en')
  const [resultado, setResultado] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [automatico, setAutomatico] = useState(() => ler('eb_traduz_auto', 'sim', ['sim', 'nao']) === 'sim')
  const timerRef = useRef(null)
  const abortRef = useRef(null)
  const cacheRef = useRef(new Map())

  function alternarAutomatico(ligado) {
    setAutomatico(ligado)
    salvar('eb_traduz_auto', ligado ? 'sim' : 'nao')
    if (!ligado) cancelar()
  }

  // Cancela o que estiver esperando ou em andamento
  function cancelar() {
    clearTimeout(timerRef.current)
    abortRef.current?.abort()
    setCarregando(false)
  }

  // Chamado a cada mudança de texto ou idioma: espera você parar de digitar
  function agendar(t, d, p) {
    cancelar()
    const limpo = t.trim()
    if (!limpo) {
      setResultado(null)
      setErro('')
      return
    }
    if (!automatico || limpo.length < MIN_AUTO) return
    timerRef.current = setTimeout(() => executar(limpo, d, p), ATRASO)
  }

  async function executar(t, d, p) {
    const chave = `${d}|${p}|${t}`
    const guardado = cacheRef.current.get(chave)
    setErro('')
    setCopiado(false)
    if (guardado) {
      setResultado({ ...guardado, detectado: d === 'auto', destino: p, original: t })
      return
    }
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setCarregando(true)
    try {
      const r = await postTraduzir(t, d, p, ctrl.signal)
      cacheRef.current.set(chave, r)
      setResultado({ ...r, detectado: d === 'auto', destino: p, original: t })
    } catch (e) {
      if (ctrl.signal.aborted) return
      setErro(mensagemErro(e))
    } finally {
      if (abortRef.current === ctrl) setCarregando(false)
    }
  }

  function mudarIdiomas(novoDe, novoPara) {
    setDe(novoDe)
    setPara(novoPara)
    agendar(texto, novoDe, novoPara)
  }

  function mudarDe(valor) {
    mudarIdiomas(valor, valor !== 'auto' && valor === para ? (valor === 'en' ? 'pt' : 'en') : para)
  }

  function mudarPara(valor) {
    mudarIdiomas(valor === de ? 'auto' : de, valor)
  }

  function trocar() {
    if (de === 'auto') mudarIdiomas(de, para === 'en' ? 'pt' : 'en')
    else mudarIdiomas(para, de)
  }

  function mudarTexto(valor) {
    setTexto(valor)
    agendar(valor, de, para)
  }

  // Botão ou Cmd/Ctrl + Enter: traduz na hora
  function traduzir(t = texto) {
    const limpo = t.trim()
    if (!limpo) return
    cancelar()
    executar(limpo, de, para)
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(resultado.traducao)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch {
      setErro('Não consegui copiar. Selecione o texto e copie manualmente.')
    }
  }

  // O texto mudou depois da última tradução: o resultado na tela já está velho
  const desatualizado = Boolean(resultado) && texto.trim() !== resultado.original

  function aoTeclar(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') traduzir()
  }

  return (
    <main className="traduzir">
      <h1>Tradução</h1>
      <p className="sub">Português ⇄ inglês</p>

      <div className="idiomas">
        <select className="seletor" aria-label="Idioma de origem" value={de} onChange={(e) => mudarDe(e.target.value)}>
          <option value="auto">Detectar idioma</option>
          <option value="pt">Português</option>
          <option value="en">Inglês</option>
        </select>
        <button type="button" className="troca" onClick={trocar} aria-label="Trocar idiomas">⇄</button>
        <select className="seletor" aria-label="Idioma de destino" value={para} onChange={(e) => mudarPara(e.target.value)}>
          <option value="en">Inglês</option>
          <option value="pt">Português</option>
        </select>
      </div>

      <label className="auto-opcao">
        <input type="checkbox" checked={automatico} onChange={(e) => alternarAutomatico(e.target.checked)} />
        Traduzir enquanto digito
      </label>

      <div className="paineis">
        <div className="cartao painel">
          <textarea
            value={texto}
            onChange={(e) => mudarTexto(e.target.value)}
            onKeyDown={aoTeclar}
            maxLength={MAXIMO}
            placeholder="Digite ou cole um texto…"
            aria-label="Texto para traduzir"
          />
          <div className="painel-rodape">
            <span className="contador">{texto.length}/{MAXIMO}</span>
            <button className="botao" onClick={() => traduzir()} disabled={!texto.trim() || carregando}>
              {carregando ? 'Traduzindo…' : 'Traduzir'}
            </button>
          </div>
        </div>

        <div className={`cartao painel resultado${desatualizado ? ' desatualizado' : ''}`} aria-live="polite">
          {resultado ? (
            <>
              {resultado.detectado && (
                <span className="rotulo">
                  {resultado.idioma_origem === 'outro'
                    ? 'Idioma não reconhecido'
                    : `Detectado: ${NOMES[resultado.idioma_origem]}`}
                </span>
              )}
              {desatualizado && (
                <span className="atualizando">{automatico ? 'Atualizando…' : 'Texto alterado. Clique em Traduzir.'}</span>
              )}
              <p className="saida">{resultado.traducao}</p>
              {resultado.detectado && resultado.idioma_origem === resultado.destino && (
                <p className="nota">O texto já estava em {NOMES[resultado.destino].toLowerCase()}. Use ⇄ para trocar o destino.</p>
              )}
              <div className="painel-rodape">
                <span className="acoes">
                  <BotaoOuvir texto={resultado.traducao} idioma={resultado.destino} />
                  {resultado.idioma_origem !== resultado.destino && resultado.idioma_origem !== 'outro' && (
                    <BotaoSalvar
                      key={resultado.traducao}
                      en={resultado.destino === 'en' ? resultado.traducao : resultado.original}
                      pt={resultado.destino === 'en' ? resultado.original : resultado.traducao}
                    />
                  )}
                </span>
                <button className="nav-btn" onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar'}</button>
              </div>
            </>
          ) : (
            <p className="placeholder">A tradução aparece aqui.</p>
          )}
        </div>
      </div>

      {erro && <div className="erro" role="alert" style={{ marginTop: 14 }}>{erro}</div>}

      <div className="exemplos">
        <span>Experimente:</span>
        {EXEMPLOS.map((ex) => (
          <button key={ex} className="exemplo" onClick={() => { setTexto(ex); traduzir(ex) }}>{ex}</button>
        ))}
      </div>

      <p className="privacidade">
        Seu texto é enviado ao nosso servidor apenas para ser traduzido e não é guardado.
      </p>
    </main>
  )
}
