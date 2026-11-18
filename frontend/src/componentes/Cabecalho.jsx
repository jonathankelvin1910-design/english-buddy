import { Link, useLocation } from 'react-router-dom'
import buddy from '../assets/buddy.svg'
import { useAuth } from '../auth/contexto'

export default function Cabecalho() {
  const { usuario, sair } = useAuth()
  const { pathname } = useLocation()

  const naConversa = pathname.startsWith('/conversa')
  const destinoConversa = usuario ? '/conversas' : '/conversar'

  return (
    <header className="cabecalho">
      <Link to="/" className="marca-link">
        <img src={buddy} alt="" />
        <b>English <span className="marca">Buddy</span></b>
      </Link>

      <nav className="abas" aria-label="Principal">
        <Link to="/" className={pathname === '/' ? 'on' : ''}>Traduzir</Link>
        <Link to={destinoConversa} className={naConversa ? 'on' : ''}>Conversar</Link>
        <Link to="/fluente" className={pathname === '/fluente' ? 'on' : ''}>Fluente</Link>
        <Link to="/vocabulario" className={pathname === '/vocabulario' ? 'on' : ''}>Vocabulário</Link>
      </nav>

      <div className="cabecalho-direita">
        {usuario ? (
          <>
            <span>Olá, {usuario.nome.split(' ')[0]}</span>
            <button className="link" onClick={sair}>Sair</button>
          </>
        ) : (
          <Link to="/login" className="botao pequeno">Entrar</Link>
        )}
      </div>
    </header>
  )
}
