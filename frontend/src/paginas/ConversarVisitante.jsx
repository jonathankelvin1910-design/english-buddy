import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCenarios, mensagemErro, postConversarPublico } from '../api/api'
import Chat from '../componentes/Chat'
import Preferencias from '../componentes/Preferencias'
import { ler, salvar } from '../utils/armazenamento'
import { NIVEIS, VALORES_LEGENDA } from '../utils/opcoes'

export default function ConversarVisitante() {
  const [mensagens, setMensagens] = useState([])
  const [pendente, setPendente] = useState(null)
  const [erro, setErro] = useState('')
  const [cenario, setCenario] = useState('')
  const [cenarios, setCenarios] = useState([])
  const [nivel, setNivel] = useState(() => ler('eb_nivel', 'A2', NIVEIS))
  const [legenda, setLegenda] = useState(() => ler('eb_legenda', 'ambos', VALORES_LEGENDA))
  const proximoId = useRef(1)

  useEffect(() => {
    let ativo = true
    getCenarios()
      .then((lista) => { if (ativo) setCenarios(lista) })
      .catch(() => {})
    return () => { ativo = false }
  }, [])

  function alterarPreferencia(campo, valor) {
    if (campo === 'nivel') {
      setNivel(valor)
      salvar('eb_nivel', valor)
    } else {
      setLegenda(valor)
      salvar('eb_legenda', valor)
    }
  }

  function mudarCenario(valor) {
    setCenario(valor)
    setMensagens([])
    setErro('')
  }

  async function enviar(texto) {
    setErro('')
    setPendente(texto)
    const historico = [...mensagens, { papel: 'user', texto }]
      .slice(-12)
      .map((m) => ({ papel: m.papel, texto: m.texto, traducao: m.traducao ?? null }))
    try {
      const r = await postConversarPublico(historico, nivel, cenario || null)
      const idUsuario = proximoId.current++
      const idBuddy = proximoId.current++
      setMensagens((lista) => [
        ...lista,
        { id: idUsuario, papel: 'user', texto, traducao: null, correcao: r.correcao, frases: [] },
        { id: idBuddy, papel: 'assistant', texto: r.en, traducao: r.pt, correcao: null, frases: r.frases },
      ])
      return true
    } catch (e) {
      setErro(mensagemErro(e))
      return false
    } finally {
      setPendente(null)
    }
  }

  return (
    <div className="visitante">
      <div className="aviso">
        Você está conversando como visitante: nada fica salvo. <Link to="/login">Entre</Link> para guardar
        seu histórico e acompanhar sua evolução.
      </div>

      <div className="barra-chat">
        <select className="seletor" value={cenario} onChange={(e) => mudarCenario(e.target.value)} aria-label="Tipo de conversa">
          <option value="">Conversa livre</option>
          {cenarios.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="link" style={{ marginTop: 0 }} onClick={() => mudarCenario(cenario)}>Recomeçar</button>
        <Preferencias nivel={nivel} legenda={legenda} aoAlterar={alterarPreferencia} />
      </div>

      {erro && (
        <div className="erro faixa" role="alert">
          <span>{erro}</span>
          <button onClick={() => setErro('')} aria-label="Fechar aviso">×</button>
        </div>
      )}

      <Chat conversa={{ mensagens }} legenda={legenda} pendente={pendente} aoEnviar={enviar} />
    </div>
  )
}
