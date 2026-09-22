import { useApp } from '../context/AppContext.jsx'

export default function Toast() {
  const { toast } = useApp()
  return (
    <div className={`toast${toast.visible ? ' show' : ''}`}>
      <span className="toast-dot" style={{ background: toast.color }} />
      <span>{toast.msg}</span>
    </div>
  )
}
