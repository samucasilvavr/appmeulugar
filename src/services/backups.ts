import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'

// ---------- Backup manual (somente admin) ----------
// Passa pelas rotas /backend/v1/appmeulugar/admin/backup
// (pb_hooks/backup.pb.js), que exigem profile='admin'.

export interface BackupInfo {
  name: string
  created: string
  size: number
}

export async function createBackup(): Promise<BackupInfo> {
  try {
    return await pb.send<BackupInfo>('/backend/v1/appmeulugar/admin/backup', {
      method: 'POST',
    })
  } catch (err) {
    console.error('createBackup error:', err)
    throw new Error(getErrorMessage(err))
  }
}

export async function listBackups(): Promise<BackupInfo[]> {
  try {
    const res = await pb.send<{ items: BackupInfo[] }>('/backend/v1/appmeulugar/admin/backup', {
      method: 'GET',
    })
    return res.items || []
  } catch (err) {
    console.error('listBackups error:', err)
    throw new Error(getErrorMessage(err))
  }
}

// Baixa o .zip do backup com o token de autenticação do admin logado
// (?token=...) e força o download no navegador.
export function downloadBackup(name: string): void {
  const token = pb.authStore.token
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }
  const base = pb.baseUrl.replace(/\/$/, '') + '/backend/v1/appmeulugar/admin/backup/download'
  const url = `${base}?name=${encodeURIComponent(name)}&token=${encodeURIComponent(token)}`
  const a = document.createElement('a')
  a.href = url
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
