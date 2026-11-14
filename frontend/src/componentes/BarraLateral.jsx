import { useState } from 'react'
import { NavLink } from 'react-router-dom'

export default function BarraLateral({ aberta, conversas, cenarios, aoNova, aoApagar, aoFechar }) {
  const [cenario, setCenario] = useState('')

  return (
    <aside className={'lateral' + (aberta ? ' aberta' : '')}>
      <div className="lateral-topo">
        <b>Suas conversas</b>
        <button className="fechar" onClick={aoFechar} aria-label="Fechar menu">×</button>
      </div>

      <div className="nova">
        <select value={cenario} onChange={(e) => setCenario(e.target.value)} aria-label="Tipo de conversa">
          <option value="">Conversa livre</option>
          {cenarios.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="botao" onClick={() => aoNova(cenario || null)}>＋ Nova conversa</button>
      </div>

      <nav className="lista">
        {conversas.length === 0 && <p className="vazio">Nenhuma conversa ainda.</p>}
        {conversas.map((c) => (
          <div key={c.id} className="item">
            <NavLink to={`/conversas/${c.id}`} onClick={aoFechar}>{c.titulo}</NavLink>
            <button onClick={() => aoApagar(c.id)} aria-label={`Apagar ${c.titulo}`}>🗑</button>
          </div>
        ))}
      </nav>
    </aside>
  )
}
