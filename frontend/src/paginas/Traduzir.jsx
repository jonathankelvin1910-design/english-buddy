import { useState } from 'react'
import { mensagemErro, postTraduzir } from '../api/api'

const NOMES = { pt: 'Português', en: 'Inglês' }
const EXEMPLOS = [
  'Onde fica o banheiro?',
  'How much does this cost?',
  'Eu gostaria de reservar uma mesa para duas pessoas.',
]
const MAXIMO = 1000

export default function Traduzir() {
  const [texto, setTexto] = useState('')
  const [de, setDe] = useState('auto')
  const [para, setPara] = useState('en')
  const [resultado, setResultado] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)

  function mudarDe(valor) {
    setDe(valor)
    if (valor !== 'auto' && valor === para) setPara(valor === 'en' ? 'pt' : 'en')
  }

  function mudarPara(valor) {
    setPara(valor)
    if (valor === de) setDe('auto')
  }

  function trocar() {
    if (de === 'auto') {
      setPara(para === 'en' ? 'pt' : 'en')
    } else {
      setDe(para)
      setPara(de)
    }
  }

  async function traduzir() {
    const t = texto.trim()
    if (!t || carregando) return
    setErro('')
    setCopiado(false)
    setCarregando(true)
    try {
      const r = await postTraduzir(t, de, para)
      setResultado({ ...r, detectado: de === 'auto', destino: para })
    } catch (e) {
      setErro(mensagemErro(e))
    } finally {
      setCarregando(false)
    }
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

  function aoTeclar(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') traduzir()
  }

  return (
    <main className="traduzir">
      <h1>Traduza qualquer frase</h1>
      <p className="sub">Português ⇄ inglês, sem precisar de conta.</p>

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

      <div className="paineis">
        <div className="cartao painel">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={aoTeclar}
            maxLength={MAXIMO}
            placeholder="Digite ou cole um texto…"
            aria-label="Texto para traduzir"
          />
          <div className="painel-rodape">
            <span className="contador">{texto.length}/{MAXIMO}</span>
            <button className="botao" onClick={traduzir} disabled={!texto.trim() || carregando}>
              {carregando ? 'Traduzindo…' : 'Traduzir'}
            </button>
          </div>
        </div>

        <div className="cartao painel resultado" aria-live="polite">
          {resultado ? (
            <>
              {resultado.detectado && (
                <span className="rotulo">
                  {resultado.idioma_origem === 'outro'
                    ? 'Idioma não reconhecido'
                    : `Detectado: ${NOMES[resultado.idioma_origem]}`}
                </span>
              )}
              <p className="saida">{resultado.traducao}</p>
              {resultado.detectado && resultado.idioma_origem === resultado.destino && (
                <p className="nota">O texto já estava em {NOMES[resultado.destino].toLowerCase()}. Use ⇄ para trocar o destino.</p>
              )}
              <div className="painel-rodape">
                <span />
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
          <button key={ex} className="exemplo" onClick={() => setTexto(ex)}>{ex}</button>
        ))}
      </div>

      <p className="privacidade">
        Seu texto é enviado ao nosso servidor apenas para ser traduzido e não é guardado.
      </p>
    </main>
  )
}
