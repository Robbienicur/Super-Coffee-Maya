import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useSessionStore, isSessionStale } from '../store/sessionStore'
import OpenSessionForm from '../components/cash/OpenSessionForm'
import SessionDashboard from '../components/cash/SessionDashboard'
import CloseSessionForm from '../components/cash/CloseSessionForm'
import ZReport from '../components/cash/ZReport'

type View = 'auto' | 'closing' | 'report'

export default function CashSession() {
  const profile = useAuthStore((s) => s.profile)
  const session = useSessionStore((s) => s.session)
  const isLoading = useSessionStore((s) => s.isLoading)
  const loadForCashier = useSessionStore((s) => s.loadForCashier)

  const [view, setView] = useState<View>('auto')
  const [reportId, setReportId] = useState<string | null>(null)
  const stale = isSessionStale(session)

  useEffect(() => {
    if (profile) loadForCashier(profile.id)
  }, [profile?.id, loadForCashier])

  // Caja abierta de un día previo: forzar inmediatamente la pantalla de cierre.
  useEffect(() => {
    if (stale && view === 'auto') setView('closing')
  }, [stale, view])

  if (isLoading) {
    return <div className="p-8 text-coffee-600">Cargando caja...</div>
  }

  if (view === 'report' && reportId) {
    return <ZReport sessionId={reportId} onBack={() => { setView('auto'); setReportId(null) }} />
  }

  if (!session) {
    return <OpenSessionForm />
  }

  if (view === 'closing') {
    return (
      <CloseSessionForm
        onBack={() => setView('auto')}
        onClosed={(id) => {
          setReportId(id)
          setView('report')
        }}
      />
    )
  }

  return <SessionDashboard onStartClose={() => setView('closing')} />
}
