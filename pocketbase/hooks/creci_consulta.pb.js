// Consulta de CRECI via API pública https://api.buscacreci.com.br.
//
// A chamada é feita no BACKEND porque a API externa não permite acesso direto
// do browser (CORS) e porque o fluxo tem 3 etapas com polling:
//
//   Etapa 1: GET /?creci={UF}{NUMERO}              → { codigo_solicitacao }
//   Etapa 2: polling de 2s em /status?codigo_solicitacao=... até status === 'FINALIZADO'
//   Etapa 3: GET /creci?id={creciID}               → dados completos do corretor
//
// Rota pública (sem auth — é uma consulta de verificação de credencial):
//   GET /backend/v1/appmeulugar/creci/consultar?uf=SP&creci=123456-F
//
// Resposta:
//   { ok: true,  status: 'ativo'|'inativo', resultado: { nomeCompleto, creciCompleto,
//     situacao, cidade, estado } }
//   { ok: false, instavel: true }  → API fora do ar ou timeout de 25s
//   { ok: false, motivo: '...' }   → CRECI não localizado etc.
//
// Estados com consulta automática indisponível (MG, TO) são tratados no
// frontend (não consultados), mas o hook também os recusa por segurança.
//
// Timeout total de 25s: cada etapa tem seu $http.send com timeout próprio e o
// loop de polling para quando Date.now() passa do deadline. Logs de falha vão
// para o console do hook (não bloqueiam a UI).
//
// Runtime JSVM: lógica 100% inline no callback (sem require() nem funções
// top-level dentro do callback).

routerAdd(
  'GET',
  '/backend/v1/appmeulugar/creci/consultar',
  (e) => {
    var API_BASE = 'https://api.buscacreci.com.br'
    var TOTAL_DEADLINE_MS = 25000
    var POLL_INTERVAL_MS = 2000
    var UNAVAILABLE_STATES = ['MG', 'TO']

    var uf = String(e.request.url.query().get('uf') || '')
      .trim()
      .toUpperCase()
    var creci = String(e.request.url.query().get('creci') || '')
      .trim()
      .toUpperCase()

    if (!uf || uf.length !== 2) {
      throw new BadRequestError('Informe a UF do CRECI (2 letras).')
    }
    if (!creci) {
      throw new BadRequestError('Informe o número do CRECI.')
    }
    if (!/^[A-Z0-9.\-\/ ]{4,20}$/.test(creci)) {
      throw new BadRequestError(
        'Número de CRECI inválido. Use apenas letras, números, ponto, hífen ou barra.',
      )
    }
    if (UNAVAILABLE_STATES.indexOf(uf) !== -1) {
      throw new BadRequestError(
        'Consulta automática indisponível para este estado. Verifique diretamente no site oficial do CRECI regional.',
      )
    }

    function httpGet(url, timeoutSec) {
      try {
        var res = $http.send({
          url: url,
          method: 'GET',
          headers: { Accept: 'application/json' },
          timeout: timeoutSec,
        })
        return res
      } catch (err) {
        console.log('buscacreci http error (' + url + '): ' + err)
        return null
      }
    }

    function parseJson(res) {
      if (!res) return null
      if (res.statusCode < 200 || res.statusCode >= 300) {
        console.log('buscacreci http status ' + res.statusCode + ' em ' + res.raw)
        return null
      }
      try {
        return res.json
      } catch (_) {
        return null
      }
    }

    var deadline = Date.now() + TOTAL_DEADLINE_MS

    // ---- Etapa 1: solicitar consulta ----
    var step1 = parseJson(httpGet(API_BASE + '/?creci=' + encodeURIComponent(uf + creci), 12))
    if (!step1) {
      console.log('buscacreci: etapa 1 sem resposta para ' + uf + creci)
      return e.json(200, { ok: false, instavel: true })
    }
    var codigoSolicitacao = String(step1.codigo_solicitacao || '')
    if (!codigoSolicitacao) {
      // Alguns estados retornam o resultado direto na etapa 1 (sem fila).
      var direct =
        step1.creciID ||
        step1.id ||
        (step1.creclist && step1.creclist[0] && step1.creclist[0].id) ||
        ''
      if (!direct) {
        return e.json(200, { ok: false, motivo: 'CRECI não localizado na base do CRECI.' })
      }
      codigoSolicitacao = ''
      var directId = direct
      var step3d = parseJson(httpGet(API_BASE + '/creci?id=' + encodeURIComponent(directId), 12))
      if (!step3d) return e.json(200, { ok: false, instavel: true })
      return e.json(200, {
        ok: true,
        status: String(step3d.situacao || '').toLowerCase() === 'ativo' ? 'ativo' : 'inativo',
        resultado: {
          nomeCompleto: String(step3d.nomeCompleto || ''),
          creciCompleto: String(step3d.creciCompleto || uf + creci),
          situacao: String(step3d.situacao || ''),
          cidade: String(step3d.cidade || ''),
          estado: String(step3d.estado || uf),
        },
      })
    }

    // ---- Etapa 2: consultar status até FINALIZADO (a cada 2s) ----
    var creciId = ''
    while (Date.now() < deadline) {
      sleep(POLL_INTERVAL_MS)
      if (Date.now() > deadline) break

      var step2 = parseJson(
        httpGet(
          API_BASE + '/status?codigo_solicitacao=' + encodeURIComponent(codigoSolicitacao),
          10,
        ),
      )
      if (!step2) continue // falha pontual de rede: tenta de novo no próximo ciclo

      var statusValue = String(step2.status || '').toUpperCase()
      if (statusValue === 'FINALIZADO') {
        creciId = String(step2.creciID || step2.id || '')
        break
      }
      if (statusValue === 'ERRO' || statusValue === 'FALHA' || statusValue === 'NAO_ENCONTRADO') {
        return e.json(200, { ok: false, motivo: 'CRECI não localizado na base do CRECI.' })
      }
    }
    if (!creciId) {
      console.log('buscacreci: etapa 2 não finalizou a tempo para ' + uf + creci)
      return e.json(200, { ok: false, instavel: true })
    }

    // ---- Etapa 3: buscar os dados do corretor ----
    var step3 = parseJson(httpGet(API_BASE + '/creci?id=' + encodeURIComponent(creciId), 12))
    if (!step3) {
      console.log('buscacreci: etapa 3 sem resposta para creciID ' + creciId)
      return e.json(200, { ok: false, instavel: true })
    }

    var situacao = String(step3.situacao || '')
    return e.json(200, {
      ok: true,
      status: situacao.toLowerCase() === 'ativo' ? 'ativo' : 'inativo',
      resultado: {
        nomeCompleto: String(step3.nomeCompleto || ''),
        creciCompleto: String(step3.creciCompleto || uf + creci),
        situacao: situacao,
        cidade: String(step3.cidade || ''),
        estado: String(step3.estado || uf),
      },
    })
  },
  (e) => {
    return e.next()
  },
)
