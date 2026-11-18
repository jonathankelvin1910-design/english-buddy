import { useEffect, useState } from 'react'
import { deleteVocabulario, getRevisao, getVocabulario, mensagemErro, postRevisar } from '../api/api'
import BotaoOuvir from '../componentes/BotaoOuvir'

function dataCurta(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function Caixa({ n }) {
  return (
    <span className="caixa" title={`Caixa ${n} de 5`} aria-label={`Caixa ${n} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}
    </span>
  )
}

export default function Vocabulario() {
  const [itens, setItens] = useState(null)
  const [erro, setErro] = useState('')
  const [sessao, setSessao] = useState(null) // { fila, i, virado, acertos, enviando, fim }
  const [vazioHoje, setVazioHoje] = useState(false)

  useEffect(() => {
    let ativo = true
    getVocabulario()
      .then((lista) => { if (ativo) setItens(lista) })
      .catch((e) => { if (ativo) setErro(mensagemErro(e)) })
    return () => { ativo = false }
  }, [])

  async function recarregar() {
    try {
      setItens(await getVocabulario())
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }

  async function iniciar() {
    setErro('')
    setVazioHoje(false)
    try {
      const fila = await getRevisao()
      if (fila.length === 0) {
        setVazioHoje(true)
        return
      }
      setSessao({ fila, i: 0, virado: false, acertos: 0, enviando: false, fim: false })
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }

  async function responder(sabia) {
    if (!sessao || sessao.enviando) return
    setErro('')
    setSessao({ ...sessao, enviando: true })
    try {
      await postRevisar(sessao.fila[sessao.i].id, sabia)
      const acertos = sessao.acertos + (sabia ? 1 : 0)
      const proximo = sessao.i + 1
      if (proximo >= sessao.fila.length) {
        setSessao({ ...sessao, acertos, enviando: false, fim: true })
        recarregar()
      } else {
        setSessao({ ...sessao, i: proximo, virado: false, acertos, enviando: false })
      }
    } catch (e) {
      setErro(mensagemErro(e))
      setSessao((s) => ({ ...s, enviando: false }))
    }
  }

  async function apagar(id) {
    if (!window.confirm('Apagar esta frase do vocabulário?')) return
    setErro('')
    try {
      await deleteVocabulario(id)
      setItens((lista) => lista.filter((x) => x.id !== id))
    } catch (e) {
      setErro(mensagemErro(e))
    }
  }

  const aviso = erro && (
    <div className="erro faixa" role="alert">
      <span>{erro}</span>
      <button onClick={() => setErro('')} aria-label="Fechar aviso">×</button>
    </div>
  )

  if (sessao && !sessao.fim) {
    const item = sessao.fila[sessao.i]
    return (
      <main className="vocab">
        {aviso}
        <div className="vocab-topo">
          <button className="link" style={{ marginTop: 0 }} onClick={() => { setSessao(null); recarregar() }}>← Sair da revisão</button>
          <span>{sessao.i + 1} de {sessao.fila.length}</span>
        </div>
        <div className="cartao revisao">
          <Caixa n={item.caixa} />
          <div className="revisao-en">{item.en}</div>
          <BotaoOuvir texto={item.en} idioma="en" />
          {sessao.virado ? (
            <>
              <div className="revisao-pt">{item.pt}</div>
              <p className="revisao-dica">Você lembrava?</p>
              <div className="revisao-botoes">
                <button className="nav-btn" disabled={sessao.enviando} onClick={() => responder(false)}>Errei</button>
                <button className="nav-btn proximo" disabled={sessao.enviando} onClick={() => responder(true)}>Sabia</button>
              </div>
            </>
          ) : (
            <>
              <p className="revisao-dica">Tente lembrar o significado antes de virar.</p>
              <button className="botao" onClick={() => setSessao({ ...sessao, virado: true })}>Mostrar tradução</button>
            </>
          )}
        </div>
      </main>
    )
  }

  if (sessao && sessao.fim) {
    return (
      <main className="vocab">
        {aviso}
        <div className="cartao revisao">
          <h2>Revisão concluída! 🎉</h2>
          <p>Você acertou {sessao.acertos} de {sessao.fila.length}.</p>
          <p className="revisao-dica">As que você errou voltam amanhã. As que acertou voltam mais para frente.</p>
          <button className="botao" onClick={() => setSessao(null)}>Voltar ao vocabulário</button>
        </div>
      </main>
    )
  }

  if (!itens) return <main className="vocab">{aviso}<p className="sub">Carregando…</p></main>

  const vencidas = itens.filter((x) => x.vencida).length

  return (
    <main className="vocab">
      <h1>Seu vocabulário</h1>
      <p className="sub">Salve frases com ☆ no tradutor e na conversa. Revise nos dias certos para não esquecer.</p>
      {aviso}

      {itens.length === 0 ? (
        <div className="cartao vocab-vazio">
          <p>Você ainda não salvou nenhuma frase.</p>
          <p className="sub">Toque na ☆ ao lado de uma frase para guardá-la aqui.</p>
        </div>
      ) : (
        <>
          <div className="cartao vocab-resumo">
            <div><b>{itens.length}</b><span>frases</span></div>
            <div><b>{vencidas}</b><span>para revisar hoje</span></div>
            <button className="botao" onClick={iniciar} disabled={vencidas === 0}>
              {vencidas === 0 ? 'Nada para hoje' : `Revisar agora (${Math.min(vencidas, 30)})`}
            </button>
          </div>
          {vazioHoje && <p className="sub">Nada vencido por enquanto. Volte amanhã!</p>}

          <ul className="vocab-lista">
            {itens.map((x) => (
              <li key={x.id}>
                <div className="vocab-texto">
                  <b>{x.en}</b>
                  <span>{x.pt}</span>
                </div>
                <div className="vocab-meta">
                  <Caixa n={x.caixa} />
                  <small>{x.vencida ? 'revisar hoje' : `volta em ${dataCurta(x.proxima_revisao)}`}</small>
                </div>
                <BotaoOuvir texto={x.en} idioma="en" />
                <button className="lixo" onClick={() => apagar(x.id)} aria-label={`Apagar ${x.en}`} title="Apagar">🗑</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
