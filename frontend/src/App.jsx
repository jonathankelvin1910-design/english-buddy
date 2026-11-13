import { Navigate, Route, Routes } from 'react-router-dom'
import RotaProtegida from './componentes/RotaProtegida'
import Conversas from './paginas/Conversas'
import Login from './paginas/Login'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RotaProtegida><Conversas /></RotaProtegida>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
