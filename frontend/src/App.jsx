import buddy from './assets/buddy.svg'

export default function App() {
  return (
    <main style={{ maxWidth: 420, margin: '60px auto', textAlign: 'center' }}>
      <img src={buddy} alt="Buddy, o pug mascote" width={180} />
      <h1>English <span style={{ color: 'var(--destaque)' }}>Buddy</span></h1>
      <p style={{ color: 'var(--texto-suave)' }}>Frontend funcionando.</p>
      <button className="botao">Começar a conversar</button>
    </main>
  )
}
