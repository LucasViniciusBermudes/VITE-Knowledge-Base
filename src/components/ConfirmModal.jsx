import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'

export default function ConfirmModal() {
  const { confirmModal, setConfirmModal, deleteFaq, showToast } = useApp()
  const navigate = useNavigate()
  const params = useParams()

  const close = () => setConfirmModal({ open: false, targetId: null })

  const handleDelete = async () => {
    const id = confirmModal.targetId
    if (!id) return
    try {
      await deleteFaq(id)
      close()
      showToast('FAQ excluída', '#e0554a')
      if (Number(params.id) === id) navigate('/')
    } catch (err) {
      console.error(err)
      showToast('Erro ao excluir', '#e0554a')
    }
  }

  return (
    <div className={`overlay${confirmModal.open ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal confirm-modal">
        <div className="modal-hdr">
          <span className="modal-title">Excluir FAQ</span>
        </div>
        <p>
          Tem certeza que deseja excluir esta FAQ?
          <br />
          Esta ação não pode ser desfeita.
        </p>
        <div className="confirm-ftr">
          <button className="btn-sec" onClick={close}>
            Cancelar
          </button>
          <button className="btn-cre" style={{ background: '#e0554a', color: '#fff' }} onClick={handleDelete}>
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}
