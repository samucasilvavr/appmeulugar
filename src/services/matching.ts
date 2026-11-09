import type { PropertyRecord, InterestRecord } from '@/types/database'

export interface MatchResult {
  score: number // 0 to 100
  isEligible: boolean
  matchedCriteria: string[]
  unmatchedCriteria: string[]
}

/**
 * Match criteria between an Interest and a Property
 * Mandatory criteria:
 * - Purpose must match (comprar vs comprar, alugar vs alugar)
 * - State & City must match
 * - Property type must match
 * - Price must be <= Interest max_price
 */
export function calculateMatchScore(
  interest: InterestRecord,
  property: PropertyRecord,
): MatchResult {
  const matched: string[] = []
  const unmatched: string[] = []

  // 1. Mandatory: Purpose
  if (interest.purpose !== property.purpose) {
    return {
      score: 0,
      isEligible: false,
      matchedCriteria: [],
      unmatchedCriteria: [`Finalidade diferente (${property.purpose} vs ${interest.purpose})`],
    }
  }
  matched.push(`Finalidade compatível (${property.purpose})`)

  // 2. Mandatory: State and City
  const stateMatch = interest.state.trim().toLowerCase() === property.state.trim().toLowerCase()
  const cityMatch = interest.city.trim().toLowerCase() === property.city.trim().toLowerCase()
  if (!stateMatch || !cityMatch) {
    return {
      score: 0,
      isEligible: false,
      matchedCriteria: matched,
      unmatchedCriteria: [
        `Localização incompatível (${property.city}/${property.state} vs ${interest.city}/${interest.state})`,
      ],
    }
  }
  matched.push(`Mesma cidade (${property.city}/${property.state})`)

  // 3. Mandatory: Property Type
  if (interest.property_type !== property.property_type) {
    return {
      score: 0,
      isEligible: false,
      matchedCriteria: matched,
      unmatchedCriteria: [
        `Tipo de imóvel diferente (${property.property_type} vs ${interest.property_type})`,
      ],
    }
  }
  matched.push(`Tipo compatível (${property.property_type})`)

  // 4. Mandatory: Price range
  if (property.price > interest.max_price * 1.1) {
    // Allows 10% negotiation margin, otherwise ineligible
    return {
      score: 0,
      isEligible: false,
      matchedCriteria: matched,
      unmatchedCriteria: [
        `Preço acima do teto desejado (R$ ${property.price.toLocaleString('pt-BR')} vs máx R$ ${interest.max_price.toLocaleString('pt-BR')})`,
      ],
    }
  }

  let score = 50 // Base score for passing all mandatory filters

  // Price within budget bonus
  if (property.price <= interest.max_price) {
    score += 15
    matched.push(`Preço dentro do orçamento (R$ ${property.price.toLocaleString('pt-BR')})`)
  } else {
    matched.push(`Preço negociável (até 10% acima do teto)`)
  }

  // Neighborhood match bonus
  if (interest.neighborhoods && property.neighborhood) {
    const desiredList = interest.neighborhoods
      .toLowerCase()
      .split(',')
      .map((s) => s.trim())
    const propNeigh = property.neighborhood.toLowerCase().trim()
    const found = desiredList.some((d) => propNeigh.includes(d) || d.includes(propNeigh))
    if (found) {
      score += 15
      matched.push(`Bairro desejado: ${property.neighborhood}`)
    } else {
      unmatched.push(`Bairro diferente dos prioritários (${property.neighborhood})`)
    }
  }

  // Bedrooms match bonus
  if (interest.min_bedrooms) {
    if ((property.bedrooms || 0) >= interest.min_bedrooms) {
      score += 10
      matched.push(`${property.bedrooms} dormitórios (mínimo exigido: ${interest.min_bedrooms})`)
    } else {
      unmatched.push(
        `Menos dormitórios que o desejado (${property.bedrooms || 0} vs mín. ${interest.min_bedrooms})`,
      )
    }
  }

  // Bathrooms match bonus
  if (interest.min_bathrooms) {
    if ((property.bathrooms || 0) >= interest.min_bathrooms) {
      score += 5
      matched.push(`${property.bathrooms} banheiros (mínimo: ${interest.min_bathrooms})`)
    }
  }

  // Parking spaces match bonus
  if (interest.min_parking_spaces) {
    if ((property.parking_spaces || 0) >= interest.min_parking_spaces) {
      score += 5
      matched.push(
        `${property.parking_spaces} vagas de garagem (mínimo: ${interest.min_parking_spaces})`,
      )
    }
  }

  // Clamp score
  score = Math.min(100, score)

  return {
    score,
    isEligible: true,
    matchedCriteria: matched,
    unmatchedCriteria: unmatched,
  }
}
