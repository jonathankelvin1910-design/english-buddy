// Preferências de visitante ficam no navegador; todo acesso é protegido para não quebrar em janelas privadas
export function ler(chave, padrao, validos) {
  try {
    const valor = localStorage.getItem(chave)
    return validos.includes(valor) ? valor : padrao
  } catch {
    return padrao
  }
}

export function salvar(chave, valor) {
  try {
    localStorage.setItem(chave, valor)
  } catch {
    /* sem armazenamento */
  }
}
