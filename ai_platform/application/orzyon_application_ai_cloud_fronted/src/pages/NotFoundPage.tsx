import { Link } from 'react-router'
import { EmptyState } from '../components/ui'

export default function NotFoundPage({ message }: { message?: string }) {
  return (
    <div className="card">
      <EmptyState
        title={message ?? 'Página não encontrada'}
        description="O item pode ter sido removido ou pertencer a outra organização."
        action={
          <Link to="/" className="btn-secondary">
            Voltar à visão geral
          </Link>
        }
      />
    </div>
  )
}
