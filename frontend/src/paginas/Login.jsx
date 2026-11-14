import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import buddy from '../assets/buddy.svg'
import { mensagemErro } from '../api/api'
import { useAuth } from '../auth/contexto'

export default function Login() {
  const { usuario, entrar, cadastrar } = useAuth()
  const [modo, setModo] = useState('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to="/conversas" replace />

  const criando = modo === 'cadastrar'

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    if (criando && senha.length < 8) {
      setErro('A senha precisa ter pelo menos 8 caracteres.')
      return
    }
    setEnviando(true)
    try {
      if (criando) {
        await cadastrar(nome.trim(), email.trim(), senha)
      } else {
        await entrar(email.trim(), senha)
      }
    } catch (err) {
      setErro(mensagemErro(err))
    } finally {
      setEnviando(false)
    }
  }

  function trocarModo() {
    setModo(criando ? 'entrar' : 'cadastrar')
    setErro('')
  }

  return (
    <main className="pagina-centro">
      <div className="cartao login">
        <img src={buddy} alt="Buddy, o pug mascote" />
        <h1>English <span>Buddy</span></h1>
        <p className="sub">
          {criando ? 'Crie sua conta e comece a conversar.' : 'Que bom te ver! Entre para continuar.'}
        </p>

        <form onSubmit={enviar}>
          {criando && (
            <label className="campo">
              Seu nome
              <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={100} required autoComplete="name" />
            </label>
          )}
          <label className="campo">
            E-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label className="campo">
            Senha
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              maxLength={72}
              autoComplete={criando ? 'new-password' : 'current-password'}
            />
          </label>

          {erro && <div className="erro" role="alert">{erro}</div>}

          <button className="botao" disabled={enviando}>
            {enviando ? 'Aguarde…' : criando ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <button type="button" className="link" onClick={trocarModo}>
          {criando ? 'Já tenho conta' : 'Criar uma conta'}
        </button>
        <div><Link to="/" className="link">Continuar sem entrar</Link></div>
      </div>
    </main>
  )
}
