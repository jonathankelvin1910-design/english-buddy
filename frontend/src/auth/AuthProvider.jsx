import { useCallback, useEffect, useMemo, useState } from 'react'
import { aoSessaoExpirar, getEu, postCadastro, postLogin, tokenArmazenado } from '../api/api'
import { AuthContext } from './contexto'

export default function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(() => Boolean(tokenArmazenado.ler()))

  useEffect(() => {
    aoSessaoExpirar(() => setUsuario(null))
    return () => aoSessaoExpirar(null)
  }, [])

  // Ao abrir o site já logado, recupera o usuário a partir do token guardado
  useEffect(() => {
    if (!tokenArmazenado.ler()) return
    let ativo = true
    getEu()
      .then((u) => { if (ativo) setUsuario(u) })
      .catch(() => {})
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [])

  const entrar = useCallback(async (email, senha) => {
    const r = await postLogin(email, senha)
    tokenArmazenado.salvar(r.token)
    setUsuario(r.usuario)
  }, [])

  const cadastrar = useCallback(async (nome, email, senha) => {
    const r = await postCadastro(nome, email, senha)
    tokenArmazenado.salvar(r.token)
    setUsuario(r.usuario)
  }, [])

  // Recarrega a página inicial: encerra a sessão e limpa da memória os dados do usuário
  const sair = useCallback(() => {
    tokenArmazenado.limpar()
    window.location.assign('/')
  }, [])

  const valor = useMemo(
    () => ({ usuario, carregando, entrar, cadastrar, sair, atualizarUsuario: setUsuario }),
    [usuario, carregando, entrar, cadastrar, sair],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
