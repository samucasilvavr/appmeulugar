import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { UserRecord, UserProfile } from '@/types/database'

interface SignUpData {
  email: string
  password: string
  passwordConfirm: string
  name: string
  profile: UserProfile
  phone?: string
  state?: string
  city?: string
  creci?: string
  creci_uf?: string
  real_estate?: string
  regions?: string
  creci_status?: 'aprovado' | 'pendente'
  creci_photo?: File | null
}

interface AuthContextType {
  user: UserRecord | null
  loading: boolean
  isAuthenticated: boolean
  signIn: (email: string, pass: string) => Promise<{ error: any; record?: UserRecord }>
  signUp: (data: SignUpData) => Promise<{ error: any }>
  signOut: () => void
  refreshUser: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<{ error: any }>
  confirmPasswordReset: (token: string, password: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserRecord | null>(
    (pb.authStore.record as unknown as UserRecord) || null,
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUser((pb.authStore.record as unknown as UserRecord) || null)
    setLoading(false)

    const unsubscribe = pb.authStore.onChange((token, record) => {
      setUser((record as unknown as UserRecord) || null)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const refreshUser = async () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      try {
        const fresh = await pb.collection('users').getOne<UserRecord>(pb.authStore.record.id)
        setUser(fresh)
      } catch (err) {
        console.error('Failed to refresh user:', err)
      }
    }
  }

  const signIn = async (email: string, pass: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword<UserRecord>(email, pass)
      const record = authData.record as unknown as UserRecord
      setUser(record)
      return { error: null, record }
    } catch (error) {
      return { error }
    }
  }

  const signUp = async (data: SignUpData) => {
    try {
      // A foto da carteirinha vai como campo de arquivo (multipart) do próprio
      // registro; 'creci_review' é marcado no hook de cadastro quando a foto
      // vem anexada (conferência posterior pelo admin).
      const payload: Record<string, any> = { ...data }
      delete payload.creciPhoto
      if (data.profile === 'corretor') {
        payload.creci_status = data.creci_status ?? 'pendente'
        if (data.creciPhoto) {
          payload.creci_photo = data.creciPhoto
        }
      } else {
        delete payload.creci_status
      }
      await pb.collection('users').create<UserRecord>(payload)

      // Best-effort email verification request
      try {
        await pb.collection('users').requestVerification(data.email)
      } catch {
        // ignore mail sending error during local development
      }

      // Auto login after sign up
      const authData = await pb
        .collection('users')
        .authWithPassword<UserRecord>(data.email, data.password)
      setUser(authData.record)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
    setUser(null)
  }

  const requestPasswordReset = async (email: string) => {
    try {
      await pb.collection('users').requestPasswordReset(email)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const confirmPasswordReset = async (token: string, password: string) => {
    try {
      await pb.collection('users').confirmPasswordReset(token, password, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        refreshUser,
        requestPasswordReset,
        confirmPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
