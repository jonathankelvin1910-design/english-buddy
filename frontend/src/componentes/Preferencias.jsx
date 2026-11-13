import { mensagemErro, patchPreferencias } from '../api/api'
import { useAuth } from '../auth/contexto'

const NIVEIS = ['A1', 'A2', 'B1', 'B2', 'C1']
const LEGENDAS = [['en', 'EN'], ['pt', 'PT'], ['ambos', 'EN + PT']]

export default function Preferencias({ aoErro }) {
  const { usuario, atualizarUsuario } = useAuth()

  async function alterar(campo, valor) {
    try {
      atualizarUsuario(await patchPreferencias({ [campo]: valor }))
    } catch (e) {
      aoErro(mensagemErro(e))
    }
  }

  return (
    <div className="prefs">
      <label>
        Nível{' '}
        <select value={usuario.nivel} onChange={(e) => alterar('nivel', e.target.value)}>
          {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <span>
        Legenda{' '}
        <span className="seg" role="group" aria-label="Idioma da legenda">
          {LEGENDAS.map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              className={usuario.legenda_idioma === valor ? 'on' : ''}
              onClick={() => alterar('legenda_idioma', valor)}
            >
              {rotulo}
            </button>
          ))}
        </span>
      </span>
    </div>
  )
}
