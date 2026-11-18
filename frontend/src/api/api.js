import axios from 'axios'

const CHAVE_TOKEN = 'eb_token'

// O token fica no navegador; todo acesso é protegido para não quebrar em janelas privadas
export const tokenArmazenado = {
  ler() {
    try { return localStorage.getItem(CHAVE_TOKEN) } catch { return null }
  },
  salvar(token) {
    try { localStorage.setItem(CHAVE_TOKEN, token) } catch { /* sem armazenamento */ }
  },
  limpar() {
    try { localStorage.removeItem(CHAVE_TOKEN) } catch { /* sem armazenamento */ }
  },
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
})

let aoExpirar = null
export const aoSessaoExpirar = (callback) => { aoExpirar = callback }

api.interceptors.request.use((config) => {
  const token = tokenArmazenado.ler()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const url = erro.config?.url ?? ''
    const ehLogin = url.startsWith('/auth/login') || url.startsWith('/auth/cadastro')
    if (erro.response?.status === 401 && !ehLogin) {
      tokenArmazenado.limpar()
      aoExpirar?.()
    }
    return Promise.reject(erro)
  },
)

export function mensagemErro(erro) {
  if (!erro.response) {
    return 'Não consegui falar com o servidor. Verifique se o backend está rodando.'
  }
  const detalhe = erro.response.data?.detail
  if (typeof detalhe === 'string') return detalhe
  if (Array.isArray(detalhe)) return 'Confira os dados informados.'
  return 'Algo deu errado. Tente novamente.'
}

export const postCadastro = (nome, email, senha) =>
  api.post('/auth/cadastro', { nome, email, senha }).then((r) => r.data)
export const postLogin = (email, senha) =>
  api.post('/auth/login', { email, senha }).then((r) => r.data)
export const getEu = () => api.get('/auth/eu').then((r) => r.data)
export const patchPreferencias = (dados) =>
  api.patch('/auth/preferencias', dados).then((r) => r.data)

export const getCenarios = () => api.get('/cenarios').then((r) => r.data)
export const getConversas = () => api.get('/conversas').then((r) => r.data)
export const postConversa = (cenario = null) =>
  api.post('/conversas', { cenario }).then((r) => r.data)
export const getConversa = (id) => api.get(`/conversas/${id}`).then((r) => r.data)
export const deleteConversa = (id) => api.delete(`/conversas/${id}`)
export const postMensagem = (id, texto) =>
  api.post(`/conversas/${id}/mensagens`, { texto }, { timeout: 120000 }).then((r) => r.data)

export const postAbertura = (id) =>
  api.post(`/conversas/${id}/abertura`, null, { timeout: 120000 }).then((r) => r.data)
export const postAberturaPublica = (nivel, cenario) =>
  api.post('/publico/abertura', { nivel, cenario }, { timeout: 120000 }).then((r) => r.data)

export const getVocabulario = () => api.get('/vocabulario').then((r) => r.data)
export const getRevisao = () => api.get('/vocabulario/revisao').then((r) => r.data)
export const postVocabulario = (en, pt) => api.post('/vocabulario', { en, pt }).then((r) => r.data)
export const deleteVocabulario = (id) => api.delete(`/vocabulario/${id}`)
export const postRevisar = (id, sabia) => api.post(`/vocabulario/${id}/revisar`, { sabia }).then((r) => r.data)

export const postFluente = (mensagens) =>
  api
    .post('/publico/fluente', { mensagens: mensagens.map(({ papel, texto, traducao }) => ({ papel, texto, traducao })) }, { timeout: 120000 })
    .then((r) => r.data)

export const postTraduzir = (texto, de, para, signal) =>
  api.post('/publico/traduzir', { texto, de, para }, { timeout: 60000, signal }).then((r) => r.data)
export const postConversarPublico = (mensagens, nivel, cenario = null) =>
  api.post('/publico/conversar', { mensagens, nivel, cenario }, { timeout: 120000 }).then((r) => r.data)
