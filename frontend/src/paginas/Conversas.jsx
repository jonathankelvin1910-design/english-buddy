import buddy from '../assets/buddy.svg'
import { useAuth } from '../auth/contexto'

export default function Conversas() {
  const { usuario, sair } = useAuth()
  return (
    <main className="pagina-centro">
      <div className="login">
        <img src={buddy} alt="Buddy" style={{ width: 140 }} />
        <h1>Olá, {usuario.nome}!</h1>
        <p className="sub">Nível {usuario.nivel}. O chat chega no próximo passo.</p>
        <button className="botao" onClick={sair}>Sair</button>
      </div>
    </main>
  )
}
