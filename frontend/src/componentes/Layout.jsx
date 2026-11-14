import { Outlet } from 'react-router-dom'
import Cabecalho from './Cabecalho'

export default function Layout() {
  return (
    <div className="layout">
      <Cabecalho />
      <div className="conteudo">
        <Outlet />
      </div>
    </div>
  )
}
