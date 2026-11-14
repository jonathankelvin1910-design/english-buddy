import { LEGENDAS, NIVEIS } from '../utils/opcoes'

// Mostra e altera nível e legenda. Quem decide onde guardar (conta ou navegador) é quem usa.
export default function Preferencias({ nivel, legenda, aoAlterar }) {
  return (
    <div className="prefs">
      <label>
        Nível{' '}
        <select value={nivel} onChange={(e) => aoAlterar('nivel', e.target.value)}>
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
              className={legenda === valor ? 'on' : ''}
              onClick={() => aoAlterar('legenda_idioma', valor)}
            >
              {rotulo}
            </button>
          ))}
        </span>
      </span>
    </div>
  )
}
