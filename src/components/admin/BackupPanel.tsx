import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { createBackup, downloadBackup, listBackups, type BackupInfo } from '@/services/backups'
import { DatabaseBackup, Download, RotateCcw } from 'lucide-react'

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

export default function BackupPanel() {
  const { toast } = useToast()
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [creating, setCreating] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  const loadBackups = async () => {
    setLoadingList(true)
    try {
      const items = await listBackups()
      setBackups(items)
    } catch (err) {
      console.error('Erro ao listar backups:', err)
      toast({
        title: 'Erro ao listar backups',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    loadBackups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreateBackup = async () => {
    setCreating(true)
    try {
      const created = await createBackup()
      toast({
        title: 'Backup criado com sucesso!',
        description: `Arquivo ${created.name} gerado.`,
      })
      await loadBackups()
    } catch (err) {
      console.error('Erro ao criar backup:', err)
      toast({
        title: 'Falha ao criar o backup',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
      setConfirmOpen(false)
    }
  }

  const handleDownload = (item: BackupInfo) => {
    try {
      setDownloading(item.name)
      downloadBackup(item.name)
    } catch (err) {
      console.error('Erro ao baixar backup:', err)
      toast({
        title: 'Erro ao baixar o backup',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      // O download é disparado pelo navegador; libera o botão em seguida.
      setTimeout(() => setDownloading(null), 1500)
    }
  }

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <DatabaseBackup className="h-4 w-4 text-primary" />
              Backup do banco de dados
            </CardTitle>
            <CardDescription className="text-xs">
              Crie cópias de segurança completas (banco + arquivos) quando quiser, independente da
              política de backups da hospedagem.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadBackups}
            disabled={loadingList}
            className="h-8 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={creating}
            className="text-xs font-semibold h-9 shadow-sm"
          >
            {creating ? (
              'Criando backup...'
            ) : (
              <>
                <DatabaseBackup className="h-4 w-4 mr-1.5" />
                Fazer backup agora
              </>
            )}
          </Button>
          {creating && (
            <p className="text-xs text-muted-foreground">
              Isso pode levar alguns segundos. Não feche esta página.
            </p>
          )}
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>Arquivo</TableHead>
                <TableHead>Data / hora</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {loadingList && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-4">
                    Carregando backups...
                  </TableCell>
                </TableRow>
              )}
              {!loadingList && backups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-4">
                    Nenhum backup criado ainda. Use o botão acima para criar o primeiro.
                  </TableCell>
                </TableRow>
              )}
              {backups.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="font-mono font-medium">{item.name}</TableCell>
                  <TableCell>{new Date(item.created).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {formatSize(item.size)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(item)}
                      disabled={downloading === item.name}
                      className="h-7 text-[11px]"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      {downloading === item.name ? 'Baixando...' : 'Baixar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar backup agora?</DialogTitle>
            <DialogDescription>
              Será gerada uma cópia completa do banco de dados e dos arquivos do app (formato .zip).
              O processo roda no servidor e pode levar alguns instantes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreateBackup} disabled={creating}>
              {creating ? 'Criando...' : 'Sim, criar backup'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
