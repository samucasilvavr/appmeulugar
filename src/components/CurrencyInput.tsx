import * as React from 'react'
import { cn } from '@/lib/utils'

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

interface CurrencyInputProps extends Omit<
  React.ComponentProps<'input'>,
  'value' | 'onChange' | 'type'
> {
  /** Valor numérico em reais (ex.: 550000). '' quando vazio. */
  value: number | ''
  onChange: (value: number | '') => void
  id?: string
  className?: string
  placeholder?: string
}

/**
 * Campo de moeda BRL: o usuário digita apenas dígitos (os dois últimos são centavos,
 * como em apps bancários) e o campo formata no padrão brasileiro enquanto digita.
 * Valor numérico cru (centavos) vai para o payload; nada de vírgula ou ponto manual.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, placeholder = 'R$ 0,00', ...props }, ref) => {
    const [display, setDisplay] = React.useState<string>(() =>
      typeof value === 'number' ? formatBRL(value) : '',
    )

    // Sincroniza quando o valor muda por fora (edição de registro existente, reset de filtros)
    React.useEffect(() => {
      setDisplay(typeof value === 'number' && !Number.isNaN(value) ? formatBRL(value) : '')
    }, [value])

    const digitsToCents = (raw: string): number | '' => {
      if (!raw) return ''
      const cents = Number(raw)
      if (!Number.isFinite(cents)) return ''
      return cents / 100
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '')
      if (!raw) {
        setDisplay('')
        onChange('')
        return
      }
      setDisplay(formatBRL(Number(raw) / 100))
      onChange(digitsToCents(raw))
    }

    return (
      <div className="relative">
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            className,
          )}
          value={display}
          onChange={handleChange}
          {...props}
        />
      </div>
    )
  },
)
CurrencyInput.displayName = 'CurrencyInput'

export { CurrencyInput }
export type { CurrencyInputProps }
