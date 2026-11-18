import { useState } from 'react'
import { Link } from 'react-router-dom'
import { mensagemErro, postVocabulario } from '../api/api'
import { useAuth } from '../auth/contexto'

// Guarda a frase no vocabulário (só para quem está logado). O pai usa "key" para reiniciar quando a frase muda.
export default function BotaoSalvar({ en, pt }) {
  const { usuario } = useAuth()
  const [estado, setEstado] = useState('ocioso') // ocioso | salvando | salvo
  const [erro, setErro] = useState('')

  if (!en || !pt || en.length > 200 || pt.length > 200) return null

  if (!usuario) {
    return (
      <Link to="/login" className="salvar" title="Entre para salvar no seu vocabulário" aria-label="Entre para salvar no vocabulário">
        ☆
      </Link>
    )
  }

  async function salvar() {
    if (estado !== 'ocioso') return
    setErro('')
    setEstado('salvando')
    try {
      await postVocabulario(en, pt)
      setEstado('salvo')
    } catch (e) {
      setErro(mensagemErro(e))
      setEstado('ocioso')
    }
  }

  return (
    <>
      <button
        type="button"
        className={`salvar ${estado === 'salvo' ? 'on' : ''}`}
        onClick={salvar}
        disabled={estado === 'salvando'}
        title={estado === 'salvo' ? 'Salva no seu vocabulário' : 'Salvar no vocabulário'}
        aria-label={estado === 'salvo' ? 'Frase salva' : 'Salvar no vocabulário'}
      >
        {estado === 'salvo' ? '★' : '☆'}
      </button>
      {erro && <span className="mic-aviso" role="alert">{erro}</span>}
    </>
  )
}
