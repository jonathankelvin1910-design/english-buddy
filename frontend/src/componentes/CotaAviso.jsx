import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCota } from '../api/api'

// Mostra quantas mensagens de conversa ainda restam hoje. "gatilho" muda quando vale buscar de novo.
export default function CotaAviso({ gatilho }) {
  const [cota, setCota] = useState(null)

  useEffect(() => {
    let vivo = true
    getCota()
      .then((c) => vivo && setCota(c))
      .catch(() => vivo && setCota(null))
    return () => {
      vivo = false
    }
  }, [gatilho])

  if (!cota) return null
  const acabou = cota.restante === 0
  const pouco = cota.restante <= Math.ceil(cota.limite * 0.2)

  return (
    <p className={`cota-aviso ${acabou ? 'fim' : pouco ? 'pouco' : ''}`} role="status">
      {acabou
        ? 'Você usou todas as mensagens de hoje. Volte amanhã para continuar.'
        : `Restam ${cota.restante} de ${cota.limite} mensagens hoje.`}
      {!cota.logado && (acabou || pouco) && (
        <>
          {' '}
          <Link to="/login">Crie uma conta grátis</Link> para ter mais.
        </>
      )}
    </p>
  )
}
