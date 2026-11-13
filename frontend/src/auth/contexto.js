import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

export function useAuth() {
  const valor = useContext(AuthContext)
  if (!valor) throw new Error('useAuth precisa estar dentro do AuthProvider')
  return valor
}
