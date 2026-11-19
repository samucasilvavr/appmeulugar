// Importação de contatos via ARQUIVO (CSV / HTML / XLSX) — rota de ADMIN.
//
// Por que rota customizada: os contatos da lista importada são os DESTINATÁRIOS
// dos e-mails do AppMeuLugar (origem: lista pública da Caixa Econômica Federal),
// com dados de terceiros que NÃO são usuários do app. A importação valida cada
// e-mail, rejeita os inválidos e NUNCA duplica (mesmo e-mail em outra linha do
// arquivo ou já existente no banco é ignorado, nunca criado em segunda via).
//
// Formatos aceitos:
//   .csv  — separador ; ou , (autodetectado), com cabeçalho (e-mail obrigatório,
//           aceita "email", "e-mail", "e_mail", "e mail").
//   .html — extrai as linhas da primeira <table id="lista"> da relação
//           "Relação de Corretores e Imobiliárias credenciados CAIXA" (th como
//           cabeçalho; colunas mapeadas por nome, com fallback posicional).
//   .xlsx — ZIP (XLSX) lido sem lib externa: entradas (1)/(2) descomprimidas
//           pelo Inflater nativo do Go (java.util.zip.Inflater com raw=true),
//           sharedStrings.xml para textos, sheet1.xml para as células.
//
// Mapeamento (nomes aceitos no cabeçalho, sem acento/caixa/espaço):
//   email: e-mail / email / e_mail / e mail  (obrigatório)
//   name: nome / nome do corretor / corretor / imobiliaria / razao social
//   state: uf / uf creci / estado
//   creci: creci / numero do creci
//   phone: telefone / telefone 1 / telefone1 / celular / fone
//   city: cidade / municipio
//   source: sempre "Caixa Econômica Federal — credenciados (importado em <data>)"
//
// Runtime JSVM: TODA a lógica vive dentro do callback (sem require, sem
// referências a declarações de topo — veja memória do projeto).
routerAdd('POST', '/backend/v1/appmeulugar/admin/import-contacts', (e) => {
  if (!e.auth) {
    throw new UnauthorizedError('Faça login para acessar a importação de contatos.')
  }
  if (!e.hasSuperuserAuth() && e.auth.getString('profile') !== 'admin') {
    throw new ForbiddenError('Acesso restrito a administradores.')
  }

  // ---------- Helpers ----------
  function decodeEntities(s) {
    let out = String(s || '')
    out = out.replace(/&#(\d+);/g, function (_, n) {
      try {
        return String.fromCharCode(parseInt(n, 10))
      } catch (_) {
        return ''
      }
    })
    out = out.replace(/&#x([0-9a-fA-F]+);/g, function (_, h) {
      try {
        return String.fromCharCode(parseInt(h, 16))
      } catch (_) {
        return ''
      }
    })
    var named = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&apos;': "'",
      '&nbsp;': ' ',
      '&ccedil;': 'ç',
      '&atilde;': 'ã',
      '&otilde;': 'õ',
      '&aacute;': 'á',
      '&eacute;': 'é',
      '&iacute;': 'í',
      '&oacute;': 'ó',
      '&uacute;': 'ú',
      '&acirc;': 'â',
      '&ecirc;': 'ê',
      '&ocirc;': 'ô',
      '&agrave;': 'à',
      '&egrave;': 'è',
      '&igrave;': 'ì',
      '&ograve;': 'ò',
      '&ugrave;': 'ù',
      '&starf;': '★',
    }
    for (var k in named) {
      if (out.indexOf(k) !== -1) out = out.split(k).join(named[k])
    }
    return out
  }

  function stripTags(s) {
    var out = String(s || '')
    out = out.replace(/<[^>]*>/g, ' ')
    return decodeEntities(out)
  }

  function isEmail(s) {
    var v = String(s || '')
      .trim()
      .toLowerCase()
    if (v.length < 6 || v.length > 254) return false
    if (v.indexOf('@') < 1) return false
    var parts = v.split('@')
    if (parts.length !== 2) return false
    var domain = parts[1]
    if (domain.indexOf('.') === -1) return false
    if (domain.indexOf('.') === 0 || domain.lastIndexOf('.') === domain.length - 1) return false
    return /[^@\s]+@[^@\s]+\.[^@\s]+/.test(v)
  }

  function onlyDigits(s) {
    return String(s || '').replace(/\D+/g, '')
  }

  function normHeader(s) {
    var v = stripTags(String(s || ''))
    v = v.toLowerCase()
    v = v.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    v = v.replace(/[^a-z0-9]+/g, ' ').trim()
    return v
  }

  var EMAIL_HEADERS = ['email', 'e mail', 'e mail contato', 'e mail comercial', 'mail']
  var NAME_HEADERS = [
    'nome',
    'nome do corretor',
    'nome corretor',
    'corretor',
    'imobiliaria',
    'razao social',
    'razao social nome',
  ]
  var UF_HEADERS = ['uf', 'uf creci', 'estado', 'uf da imobiliaria']
  var CRECI_HEADERS = ['creci', 'numero do creci', 'n creci', 'creci numero']
  var PHONE_HEADERS = [
    'telefone',
    'telefone 1',
    'telefone1',
    'fone',
    'celular',
    'telefone contato',
    'whatsapp',
  ]
  var CITY_HEADERS = ['cidade', 'municipio', 'localidade']
  var OPTOUT_HEADERS = ['descadastrar', 'opt out', 'optout', 'nao enviar', 'unsubscribe']

  function pick(row, headers) {
    for (var i = 0; i < headers.length; i++) {
      for (var j = 0; j < row.length; j++) {
        if (row[j].key === headers[i] && row[j].value) return String(row[j].value).trim()
      }
    }
    return ''
  }

  // ---------- 1. Lê o arquivo (multipart) ----------
  var uploaded = null
  try {
    var upFiles = e.findUploadedFiles('file')
    if ((!upFiles || upFiles.length === 0) && e.request.formFile) {
      var pair = e.request.formFile('file')
      if (pair) uploaded = pair[0]
    } else if (upFiles && upFiles.length > 0) {
      uploaded = upFiles[0]
    }
  } catch (errFiles) {
    uploaded = null
  }
  if (!uploaded) {
    throw new BadRequestError('Envie um arquivo (campo "file"): CSV, HTML ou XLSX.')
  }
  // Lê o conteúdo binário do Reader (io.Reader.Read até EOF).
  var bytes = []
  try {
    var reader = uploaded.reader.open()
    var rbuf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 65536)
    while (true) {
      var rn = reader.read(rbuf)
      if (rn <= 0) break
      for (var rb = 0; rb < rn; rb++) bytes.push(rbuf[rb] & 0xff)
    }
    reader.close()
  } catch (errRead) {
    throw new BadRequestError('Não foi possível ler o arquivo enviado.')
  }
  if (bytes.length === 0) {
    throw new BadRequestError('Arquivo vazio.')
  }
  var originalName = String(uploaded.originalName || uploaded.name || 'arquivo').toLowerCase()
  var isCsv = originalName.indexOf('.csv') !== -1 || originalName.indexOf('.txt') !== -1
  var isHtml = originalName.indexOf('.htm') !== -1
  var isXlsx = originalName.indexOf('.xlsx') !== -1

  // ---------- 2. Extrai as linhas ----------
  // Descadastro: uma linha com e-mail válido e coluna de descadastro marcada
  // (ex.: coluna "descadastrar" = sim/true/1) marca o contato existente como
  // 'descadastrado' em vez de ignorá-lo.
  var rows = [] // cada linha: [{key: headerNormalizado, value: string}]

  // bytes é um array de códigos 0–255: decodifica como UTF-8 manualmente
  // (String(array) no JSVM não decodifica; e o HTML da Caixa é UTF-8).
  function decodeUtf8(arr) {
    var out2 = ''
    var i = 0
    while (i < arr.length) {
      var b = arr[i]
      var code = 0
      if (b < 0x80) {
        code = b
        i += 1
      } else if ((b & 0xe0) === 0xc0 && i + 1 < arr.length) {
        code = ((b & 0x1f) << 6) | (arr[i + 1] & 0x3f)
        i += 2
      } else if ((b & 0xf0) === 0xe0 && i + 2 < arr.length) {
        code = ((b & 0x0f) << 12) | ((arr[i + 1] & 0x3f) << 6) | (arr[i + 2] & 0x3f)
        i += 3
      } else if ((b & 0xf8) === 0xf0 && i + 3 < arr.length) {
        code =
          ((b & 0x07) << 18) |
          ((arr[i + 1] & 0x3f) << 12) |
          ((arr[i + 2] & 0x3f) << 6) |
          (arr[i + 3] & 0x3f)
        i += 4
      } else {
        code = 0xfffd
        i += 1
      }
      if (code > 0xffff) {
        code -= 0x10000
        out2 += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff))
      } else {
        out2 += String.fromCharCode(code)
      }
    }
    return out2
  }
  var text = decodeUtf8(bytes)

  if (isCsv) {
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1) // BOM
    var delim =
      text.indexOf(';') !== -1 && text.indexOf(',') !== -1
        ? text.indexOf(';') < text.indexOf(',')
          ? ';'
          : ','
        : text.indexOf(';') !== -1
          ? ';'
          : ','
    var lines = text.split(/\r?\n/)
    var header = null
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li]
      if (!line || !line.trim()) continue
      var cells = []
      var cur = ''
      var inQ = false
      for (var ci = 0; ci < line.length; ci++) {
        var ch = line.charAt(ci)
        if (ch === '"') {
          if (inQ && line.charAt(ci + 1) === '"') {
            cur += '"'
            ci++
          } else {
            inQ = !inQ
          }
        } else if (ch === delim && !inQ) {
          cells.push(cur)
          cur = ''
        } else {
          cur += ch
        }
      }
      cells.push(cur)
      if (!header) {
        header = cells.map(normHeader)
        continue
      }
      var obj = []
      for (var k = 0; k < header.length; k++) {
        obj.push({ key: header[k], value: (cells[k] || '').trim() })
      }
      rows.push(obj)
    }
  } else if (isHtml) {
    var html = text
    // Tenta a tabela id="lista" (padrão da CAIXA); cai para a primeira <table>.
    var tStart = html.indexOf('<table')
    var m = html.match(/<table[^>]*id=["']?lista["']?[^>]*>/i)
    if (m && m.index !== undefined) tStart = m.index
    var tEnd = html.indexOf('</table>', tStart)
    if (tStart === -1 || tEnd === -1) {
      throw new BadRequestError('Nenhuma tabela encontrada no HTML.')
    }
    var table = html.slice(tStart, tEnd)
    var rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    var rm
    var headerCells = null
    while ((rm = rowRe.exec(table)) !== null) {
      var inner = rm[1]
      var cells2 = []
      var cellRe = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi
      var cm
      while ((cm = cellRe.exec(inner)) !== null) {
        cells2.push(stripTags(cm[1]).trim().replace(/\s+/g, ' '))
      }
      if (cells2.length === 0) continue
      if (!headerCells) {
        // primeira linha com <th> OU qualquer primeira linha não-vazia
        if (/<th[\s>]/i.test(inner) || !headerCells) {
          headerCells = cells2.map(normHeader)
          // Se a primeira linha NÃO era cabeçalho (sem <th>), não descarta dados:
          if (!/<th[\s>]/i.test(inner)) {
            rows.push(
              cells2.map(function (v, i) {
                return { key: headerCells[i], value: v }
              }),
            )
          }
          continue
        }
      }
      var obj2 = []
      for (var k2 = 0; k2 < headerCells.length; k2++) {
        obj2.push({ key: headerCells[k2], value: cells2[k2] || '' })
      }
      rows.push(obj2)
    }
    if (!headerCells) {
      throw new BadRequestError('Cabeçalho não encontrado na tabela do HTML.')
    }
  } else if (isXlsx) {
    // XLSX = ZIP: extrai as entradas com Inflater (raw, sem zlib header).
    function inflateRaw(data) {
      var inflater = new java.util.zip.Inflater(true)
      inflater.setInput(data)
      var baos = new java.io.ByteArrayOutputStream()
      var buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192)
      try {
        while (!inflater.finished()) {
          var n = inflater.inflate(buf)
          if (n === 0) {
            if (inflater.needsInput() || inflater.needsDictionary()) break
          }
          baos.write(buf, 0, n)
        }
      } finally {
        inflater.end()
      }
      return String(baos.toString('UTF-8'))
    }

    // Parser mínimo de XML (sem lib externa).
    function textOf(xml, tag) {
      var re = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>', 'i')
      var m2 = xml.match(re)
      return m2 ? m2[1] : ''
    }
    function attrOf(xml, tag, attr) {
      var re = new RegExp('<' + tag + '[^>]*\\b' + attr + '=["\']([^"\']*)["\']', 'i')
      var m3 = xml.match(re)
      return m3 ? m3[1] : ''
    }

    // Localiza os offsets do ZIP (end of central directory) e itera as entradas.
    // Inflater espera bytes assinados (int8); converte de 0–255 para -128–127.
    var all = []
    for (var bc = 0; bc < bytes.length; bc++) {
      all.push(bytes[bc] > 127 ? bytes[bc] - 256 : bytes[bc])
    }
    var eocd = -1
    for (var i = all.length - 22; i >= 0; i--) {
      if (all[i] === 0x50 && all[i + 1] === 0x4b && all[i + 2] === 0x05 && all[i + 3] === 0x06) {
        eocd = i
        break
      }
    }
    if (eocd === -1) {
      throw new BadRequestError('XLSX inválido: não é um arquivo ZIP.')
    }
    var count = (all[eocd + 10] | (all[eocd + 11] << 8)) & 0xffff
    var cdOff =
      (all[eocd + 16] | (all[eocd + 17] << 8) | (all[eocd + 18] << 16) | (all[eocd + 19] << 24)) >>>
      0

    var shared = ''
    var sheet = ''
    var p = cdOff
    function toSignedByteArray(arr) {
      var jarr = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, arr.length)
      for (var z = 0; z < arr.length; z++) {
        jarr[z] = arr[z] > 127 ? arr[z] - 256 : arr[z]
      }
      return jarr
    }
    for (var idx = 0; idx < count && p + 46 <= all.length; idx++) {
      if (!(all[p] === 0x50 && all[p + 1] === 0x4b && all[p + 2] === 0x01 && all[p + 3] === 0x02))
        break
      var method = (all[p + 10] | (all[p + 11] << 8)) & 0xffff
      var csize =
        (all[p + 20] | (all[p + 21] << 8) | (all[p + 22] << 16) | (all[p + 23] << 24)) >>> 0
      var nameLen = (all[p + 28] | (all[p + 29] << 8)) & 0xffff
      var extraLen = (all[p + 30] | (all[p + 31] << 8)) & 0xffff
      var commLen = (all[p + 32] | (all[p + 33] << 8)) & 0xffff
      var lho = (all[p + 42] | (all[p + 43] << 8) | (all[p + 44] << 16) | (all[p + 45] << 24)) >>> 0
      var name = ''
      for (var nn = 0; nn < nameLen; nn++) name += String.fromCharCode(all[p + 46 + nn])
      var lname = name.toLowerCase()
      if (lname === 'xl/sharedstrings.xml' || lname === 'sharedstrings.xml') {
        shared = inflateRaw(
          toSignedByteArray(
            all.slice(lho + 30 + nameLen + extraLen, lho + 30 + nameLen + extraLen + csize),
          ),
        )
      } else if (lname === 'xl/worksheets/sheet1.xml' || lname === 'worksheets/sheet1.xml') {
        sheet = inflateRaw(
          toSignedByteArray(
            all.slice(lho + 30 + nameLen + extraLen, lho + 30 + nameLen + extraLen + csize),
          ),
        )
      }
      p += 46 + nameLen + extraLen + commLen
    }
    if (!sheet) {
      throw new BadRequestError('XLSX sem planilha na primeira aba (sheet1).')
    }

    // sharedStrings.xml → lista de strings compartilhadas.
    var sst = []
    var siRe = /<si>([\s\S]*?)<\/si>/gi
    var sim
    while ((sim = siRe.exec(shared)) !== null) {
      var s = ''
      var tRe = /<t[^>]*>([\s\S]*?)<\/t>/gi
      var tm
      while ((tm = tRe.exec(sim[1])) !== null) {
        s += decodeEntities(tm[1])
      }
      sst.push(s)
    }

    // sheet1.xml → linhas/células.
    var rowRe2 = /<row[^>]*>([\s\S]*?)<\/row>/gi
    var rm2
    var header2 = null
    while ((rm2 = rowRe2.exec(sheet)) !== null) {
      var cells3 = []
      var cRe = /<c[^>]*\br=["']?([A-Z]+)\d+["']?[^>]*?(?:\/>|>([\s\S]*?)<\/c>)/gi
      var cm2
      while ((cm2 = cRe.exec(rm2[1])) !== null) {
        var colLetters = cm2[1]
        var colIdx = 0
        for (var cl = 0; cl < colLetters.length; cl++) {
          colIdx = colIdx * 26 + (colLetters.charCodeAt(cl) - 64)
        }
        colIdx-- // A=0
        var cellXml = cm2[2] || ''
        var type = attrOf(cm2[0], 'c', 't')
        var val = ''
        if (type === 's') {
          var vi = textOf(cellXml, 'v')
          var i2 = parseInt(vi, 10)
          if (!isNaN(i2) && sst[i2] !== undefined) val = sst[i2]
        } else {
          val = decodeEntities(textOf(cellXml, 'v'))
        }
        while (cells3.length < colIdx) cells3.push('')
        cells3[colIdx] = stripTags(val).trim().replace(/\s+/g, ' ')
      }
      if (cells3.length === 0) continue
      if (!header2) {
        header2 = cells3.map(normHeader)
        continue
      }
      var obj3 = []
      for (var k3 = 0; k3 < header2.length; k3++) {
        obj3.push({ key: header2[k3], value: cells3[k3] || '' })
      }
      rows.push(obj3)
    }
    if (!header2) {
      throw new BadRequestError('Cabeçalho não encontrado no XLSX.')
    }
  } else {
    throw new BadRequestError('Formato não suportado: use CSV, HTML ou XLSX.')
  }

  if (rows.length === 0) {
    throw new BadRequestError('Nenhuma linha de dados encontrada no arquivo.')
  }

  // ---------- 3. Valida, deduplica e salva ----------
  var contactsCol = e.app.findCollectionByNameOrId('imported_contacts')
  var sourceTag = 'Caixa Econômica Federal — credenciados (importado em '
  var created = 0
  var skippedInvalid = 0
  var skippedDuplicate = 0
  var seenInFile = {}
  var optedOut = 0

  var OPTOUT_TRUE = { sim: true, yes: true, true: true, 1: true, s: true, y: true }

  for (var ri = 0; ri < rows.length; ri++) {
    var row = rows[ri]
    var email = pick(row, EMAIL_HEADERS)
    if (!email) {
      skippedInvalid++
      continue
    }
    email = email.trim().toLowerCase()
    if (!isEmail(email)) {
      skippedInvalid++
      continue
    }
    var optOut = OPTOUT_TRUE[String(pick(row, OPTOUT_HEADERS)).trim().toLowerCase()] === true
    if (seenInFile[email]) {
      skippedDuplicate++
      continue
    }
    seenInFile[email] = true

    // Já existe no banco? Descadastro marca o registro; senão, ignora —
    // nunca criamos segunda via para o mesmo e-mail.
    var existing = null
    try {
      // JSVM: findFirstRecordByFilter(collection, filter, params) — sem sort/limit/offset.
      existing = e.app.findFirstRecordByFilter('imported_contacts', 'email = {:email}', {
        email: email,
      })
    } catch (_) {
      existing = null
    }
    if (existing) {
      if (optOut && existing.getString('authorization_status') !== 'descadastrado') {
        existing.set('authorization_status', 'descadastrado')
        e.app.save(existing)
        optedOut++
      } else {
        skippedDuplicate++
      }
      continue
    }

    var rec = new Record(contactsCol)
    rec.set('email', email)
    rec.set('name', pick(row, NAME_HEADERS) || email.split('@')[0])
    rec.set('state', pick(row, UF_HEADERS).toUpperCase())
    rec.set('city', pick(row, CITY_HEADERS))
    rec.set('creci', pick(row, CRECI_HEADERS))
    rec.set('phone', pick(row, PHONE_HEADERS))
    rec.set('source', sourceTag + new Date().toISOString().slice(0, 10) + ')')
    rec.set('authorization_status', 'autorizado')
    try {
      e.app.save(rec)
      created++
    } catch (err) {
      skippedDuplicate++
    }
  }

  return e.json(200, {
    imported: created,
    duplicates: skippedDuplicate,
    invalid: skippedInvalid,
    opted_out: optedOut,
    total: rows.length,
  })
})
