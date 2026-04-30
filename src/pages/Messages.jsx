import { Mail } from 'lucide-react'

export default function Messages() {
  return (
    <div className="pb-16 md:pb-0">
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-dark-border px-4 py-3">
        <h1 className="text-xl font-bold text-[#e7e9ea]">Mensajes</h1>
      </div>
      <div className="flex flex-col items-center py-24 px-8 text-center gap-4">
        <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center">
          <Mail className="w-8 h-8 text-brand" />
        </div>
        <h2 className="text-2xl font-bold text-[#e7e9ea]">Próximamente</h2>
        <p className="text-[#71767b] max-w-xs">La mensajería directa estará disponible pronto.</p>
      </div>
    </div>
  )
}
