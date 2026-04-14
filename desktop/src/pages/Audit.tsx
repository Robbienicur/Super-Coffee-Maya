import { ClipboardList } from 'lucide-react'

export default function Audit() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="mb-4"><ClipboardList size={48} className="text-coffee-300 mx-auto" /></div>
        <h2 className="text-xl font-semibold text-coffee-900">Auditoría</h2>
        <p className="text-coffee-300 mt-2">Disponible en Fase 6</p>
      </div>
    </div>
  )
}
