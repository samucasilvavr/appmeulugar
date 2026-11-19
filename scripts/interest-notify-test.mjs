// Cria um interesse de teste compatível com o imóvel "Casa Asa Sul. 3 Quartos"
// para validar o hook de notificação de match (rodado uma vez, depois removido).
//
// Uso: SKIP_TEST_RUN=1 node run-interest-test.mjs
// Requer: PB_URL e PB_EMAIL/PB_PASSWORD no ambiente (superuser OU usuário comum).

const PB_URL = process.env.PB_URL
const EMAIL = process.env.PB_EMAIL
const PASS = process.env.PB_PASSWORD

if (!PB_URL || !EMAIL || !PASS) {
  console.error('Defina PB_URL, PB_EMAIL e PB_PASSWORD no ambiente.')
  process.exit(1)
}

async function createInterest(token) {
  const payload = {
    title: 'Teste QA — Casa Asa Sul (não responder)',
    purpose: 'comprar',
    property_type: 'casa',
    state: 'DF',
    city: 'Brasília',
    neighborhoods: 'Asa Sul',
    min_price: 1400000,
    max_price: 1750000, // imóvel de 1.600.000 cabe (teto até 1.935.000 = +10%)
    min_bedrooms: 2,
    min_bathrooms: 1,
    min_parking_spaces: 1,
    min_area: 0,
    preferences: [],
    notes: 'Registro de teste criado pelo agente — pode ser apagado.',
    status: 'ativo',
    contact_name: 'Teste QA',
    contact_email: 'samuca.silva.vr@gmail.com',
    contact_phone: '61995147223',
  }
  const res = await fetch(PB_URL + '/api/collections/interests/records', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  console.log('create interest →', res.status, JSON.stringify(json).slice(0, 300))
  return json.id
}

const res = await fetch(PB_URL + '/api/collections/users/auth-with-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identity: EMAIL, password: PASS }),
})
const auth = await res.json()
if (!res.ok) {
  console.error('auth failed:', res.status, JSON.stringify(auth).slice(0, 200))
  process.exit(1)
}
console.log('auth ok')
await createInterest(auth.token)
