import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './componentes/Layout'
import RotaProtegida from './componentes/RotaProtegida'
import ConversarVisitante from './paginas/ConversarVisitante'
import Conversas from './paginas/Conversas'
import Login from './paginas/Login'
import Traduzir from './paginas/Traduzir'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route index element={<Traduzir />} />
        <Route path="conversar" element={<ConversarVisitante />} />
        <Route path="conversas/:id?" element={<RotaProtegida><Conversas /></RotaProtegida>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
