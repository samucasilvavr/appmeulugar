// Rotas de BACKUP manual (somente administradores do app — profile='admin').
//
// Rotas:
//   POST /backend/v1/appmeulugar/admin/backup              — cria um backup novo
//         (nome sugerido: appmeulugar-YYYYMMDD-HHMMSS.zip) e retorna {name, created, size}
//   GET  /backend/v1/appmeulugar/admin/backup              — lista os backups existentes
//         (nome, data/hora e tamanho, do mais recente ao mais antigo)
//   GET  /backend/v1/appmeulugar/admin/backup/download?name=<nome> — baixa o .zip
//         (só nomes simples "algo.zip", sem path traversal)
//
// Como o backup é criado: usa o mecanismo nativo do PocketBase
// ($app.createBackup(ctx, name)) — o mesmo do painel Settings > Backups. No
// armazenamento local (padrão no Skip Cloud) o arquivo fica em
// <pb_data>/backups/<nome>. Para LISTAR e SERVIR o arquivo usamos o filesystem
// de backups nativo ($app.newBackupsFilesystem()), que funciona igual com
// armazenamento local ou S3.
//
// Nota de runtime: o JSVM do PocketBase executa callbacks em VMs separadas —
// TODA a lógica vive DENTRO de cada callback, sem referenciar declarações de
// topo de arquivo (mesmo padrão de admin_users.pb.js).

function requireAppAdmin(e) {
  if (!e.auth) {
    throw new UnauthorizedError('Faça login para acessar os backups.')
  }
  if (!e.hasSuperuserAuth() && e.auth.getString('profile') !== 'admin') {
    throw new ForbiddenError('Acesso restrito a administradores.')
  }
  return e.next()
}

// ---- CRIAR backup ----
routerAdd(
  'POST',
  '/backend/v1/appmeulugar/admin/backup',
  (e) => {
    function pad(n) {
      return (n < 10 ? '0' : '') + n
    }
    function backupName() {
      const now = new Date()
      return (
        'appmeulugar-' +
        now.getFullYear() +
        pad(now.getMonth() + 1) +
        pad(now.getDate()) +
        '-' +
        pad(now.getHours()) +
        pad(now.getMinutes()) +
        pad(now.getSeconds()) +
        '.zip'
      )
    }

    // Só um backup por vez.
    if (e.app.store().has('__appmeulugar_backup_running')) {
      throw new BadRequestError('Já existe um backup em andamento. Tente novamente em instantes.')
    }
    e.app.store().set('__appmeulugar_backup_running', true)

    const name = backupName()
    let startedAt = Date.now()
    try {
      $app.createBackup(null, name)
    } catch (err) {
      throw new BadRequestError(
        'Não foi possível criar o backup: ' + String((err && err.message) || err || ''),
      )
    } finally {
      e.app.store().remove('__appmeulugar_backup_running')
    }

    const created = new Date().toISOString()

    // Tamanho do arquivo gerado, quando acessível (armazenamento local).
    let size = 0
    try {
      const info = $os.stat(e.app.dataDir() + '/backups/' + name)
      size = info.size()
    } catch (_) {
      size = 0
    }

    return e.json(200, {
      name: name,
      created: created,
      size: size,
    })
  },
  requireAppAdmin,
)

// ---- LISTAR backups ----
routerAdd(
  'GET',
  '/backend/v1/appmeulugar/admin/backup',
  (e) => {
    let fsys
    try {
      fsys = e.app.newBackupsFilesystem()
      fsys.setContext(null)
    } catch (err) {
      throw new BadRequestError(
        'Não foi possível acessar o armazenamento de backups: ' +
          String((err && err.message) || err || ''),
      )
    }

    let items = []
    try {
      items = fsys.list('')
    } catch (err) {
      fsys.close()
      throw new BadRequestError(
        'Não foi possível listar os backups: ' + String((err && err.message) || err || ''),
      )
    }
    fsys.close()

    const backups = []
    for (let i = 0; i < items.length; i++) {
      const key = String(items[i].key || '')
      if (key.indexOf('.zip') !== key.length - 4) continue
      backups.push({
        name: key,
        created: new Date(items[i].modTime).toISOString(),
        size: items[i].size || 0,
      })
    }

    // Mais recente primeiro.
    backups.sort(function (a, b) {
      return a.created < b.created ? 1 : a.created > b.created ? -1 : 0
    })

    return e.json(200, { items: backups })
  },
  requireAppAdmin,
)

// ---- BAIXAR backup ----
routerAdd(
  'GET',
  '/backend/v1/appmeulugar/admin/backup/download',
  (e) => {
    const name = String(e.request.url().query().get('name') || '')

    // Só nomes simples "algo.zip": sem diretórios, sem path traversal.
    if (!/^[A-Za-z0-9._-]+\.zip$/.test(name) || name.indexOf('..') !== -1) {
      throw new BadRequestError('Nome de backup inválido.')
    }

    let fsys
    try {
      fsys = e.app.newBackupsFilesystem()
      fsys.setContext(null)
    } catch (err) {
      throw new BadRequestError(
        'Não foi possível acessar o armazenamento de backups: ' +
          String((err && err.message) || err || ''),
      )
    }

    let exists = false
    try {
      exists = fsys.exists(name)
    } catch (err) {
      fsys.close()
      throw new BadRequestError(
        'Não foi possível localizar o backup: ' + String((err && err.message) || err || ''),
      )
    }
    if (!exists) {
      fsys.close()
      throw new NotFoundError('Backup não encontrado.')
    }

    // Content-Disposition: attachment + content-type application/zip
    // (o método serve() do filesystem cuida dos headers de download).
    e.response.header().set('Content-Type', 'application/zip')
    e.response.header().set('Content-Disposition', 'attachment; filename="' + name + '"')
    fsys.serve(e.response, e.request, name, name)
    // serve() escreve a resposta diretamente — não chamar e.next().
  },
  requireAppAdmin,
)
