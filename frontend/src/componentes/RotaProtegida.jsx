import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/contexto'

export default function RotaProtegida({ children }) {
  const { usuario, carregando } = useAuth()
  if (carregando) return <p style={{ textAlign: 'center', marginTop: 80 }}>Carregando…</p>
  if (!usuario) return <Navigate to="/login" replace />
  return children
}
