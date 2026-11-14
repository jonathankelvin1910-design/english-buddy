import { useEffect, useState } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import {
  deleteConversa, getCenarios, getConversa, getConversas, mensagemErro,
  patchPreferencias, postConversa, postMensagem,
} from '../api/api'
import buddy from '../assets/buddy.svg'
import { useAuth } from '../auth/contexto'
import BarraLateral from '../componentes/BarraLateral'
import Chat from '../componentes/Chat'
import Preferencias from '../componentes/Preferencias'

export default function Conversas() {
  const navigate = useNavigate()
  const { usuario, atualizarUsuario } = useAuth()
  const match = useMatch('/conversas/:id')
  const idAtual = match ? Number(match.params.id) || null : null

  const [conversas, setConversas] = useState([])
  const [cenarios, setCenarios] = useState([])
  const [detalhe, setDetalhe] = useState(null)
  const [pendente, setPendente] = useState(null)
  const [erro, setErro] = useState('')
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    let ativo = true
    Promise.all([getConversas(), getCenarios()])
      .then(([lista, opcoes]) => {
        if (!ativo) return
        setConversas(lista)
        setCenarios(opcoes)
      })
      .catch((e) => { if (ativo) setErro(mensagemErro(e)) })
    return () => { ativo = false }
  }, [])

  useEffect(() => {
    if (!idAtual) return
    let ativo = true
    getConversa(idAtual)
      .then((dados) => { if (ativo) setDetalhe({ id: idAtual, dados }) })
      .catch((e) => {
        if (!ativo) return
        setErro(mensagemErro(e))
        navigate('/conversas')
      })
    return () => { ativo = false }
  }, [idAtual, navigate])

  const conversa = detalhe && detalhe.id === idAtual ? detalhe.dados : null

  async function alterarPreferencia(campo, valor) {
    try {
      atualizarUsuario(await patchPreferencias({ [campo]: valor }))
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }

  async function novaConversa(cenario) {
    setErro('')
    try {
      const nova = await postConversa(cenario)
      setConversas((lista) => [nova, ...lista])
      setMenuAberto(false)
      navigate(`/conversas/${nova.id}`)
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }

  async function apagar(id) {
    if (!window.confirm('Apagar esta conversa e todas as mensagens?')) return
    setErro('')
    try {
      await deleteConversa(id)
      setConversas((lista) => lista.filter((c) => c.id !== id))
      if (id === idAtual) navigate('/conversas')
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }

  async function enviar(texto) {
    const alvo = idAtual
    setErro('')
    setPendente(texto)
    try {
      const troca = await postMensagem(alvo, texto)
      setDetalhe((d) =>
        d && d.id === alvo
          ? { ...d, dados: { ...d.dados, mensagens: [...d.dados.mensagens, troca.usuario, troca.assistente] } }
          : d,
      )
      setConversas(await getConversas())
      return true
    } catch (e) {
      setErro(mensagemErro(e))
      return false
    } finally {
      setPendente(null)
    }
  }

  return (
    <div className="app">
      <BarraLateral
        aberta={menuAberto}
        conversas={conversas}
        cenarios={cenarios}
        aoNova={novaConversa}
        aoApagar={apagar}
        aoFechar={() => setMenuAberto(false)}
      />
      {menuAberto && <div className="cortina" onClick={() => setMenuAberto(false)} />}

      <section className="principal">
        <div className="barra-chat">
          <button className="menu-botao" onClick={() => setMenuAberto(true)} aria-label="Abrir conversas">☰ Conversas</button>
          <Preferencias nivel={usuario.nivel} legenda={usuario.legenda_idioma} aoAlterar={alterarPreferencia} />
        </div>

        {erro && (
          <div className="erro faixa" role="alert">
            <span>{erro}</span>
            <button onClick={() => setErro('')} aria-label="Fechar aviso">×</button>
          </div>
        )}

        {conversa ? (
          <Chat conversa={conversa} legenda={usuario.legenda_idioma} pendente={pendente} aoEnviar={enviar} />
        ) : (
          <div className="vazio-principal">
            <img src={buddy} alt="" width={160} />
            <h2>{idAtual ? 'Carregando…' : 'Vamos conversar?'}</h2>
            <p>Escolha uma conversa ao lado ou comece uma nova.</p>
          </div>
        )}
      </section>
    </div>
  )
}
