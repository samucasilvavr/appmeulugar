import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  getChatsForUser,
  getMessagesByChat,
  sendMessage,
  toggleShareContact,
} from '@/services/chats'
import type { ChatRecord, MessageRecord } from '@/types/database'
import { useToast } from '@/hooks/use-toast'
import { MessageSquare, Send, ShieldCheck, Lock, Phone } from 'lucide-react'

export default function ChatPage() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  const [chats, setChats] = useState<ChatRecord[]>([])
  const [activeChat, setActiveChat] = useState<ChatRecord | null>(null)
  const [messages, setMessages] = useState<MessageRecord[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadChats = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getChatsForUser(user.id)
      setChats(data)

      const requestedChatId = searchParams.get('id')
      if (requestedChatId) {
        const found = data.find((c) => c.id === requestedChatId)
        if (found) setActiveChat(found)
        else if (data.length > 0) setActiveChat(data[0])
      } else if (data.length > 0 && !activeChat) {
        setActiveChat(data[0])
      }
    } catch (err) {
      console.error('Error loading chats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    loadChats()
  }, [user, isAuthenticated])

  useEffect(() => {
    async function loadMessages() {
      if (!activeChat) return
      try {
        const msgs = await getMessagesByChat(activeChat.id)
        setMessages(msgs)
        scrollToBottom()
      } catch (err) {
        console.error('Error loading messages:', err)
      }
    }
    loadMessages()

    const interval = setInterval(loadMessages, 5000)
    return () => clearInterval(interval)
  }, [activeChat])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !activeChat || !user) return

    setSending(true)
    const textToSend = inputText.trim()
    setInputText('')

    try {
      const newMsg = await sendMessage(activeChat.id, user.id, textToSend)
      setMessages((prev) => [...prev, newMsg])
      scrollToBottom()
    } catch (err) {
      console.error('Error sending message:', err)
      toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const handleToggleShare = async (checked: boolean) => {
    if (!activeChat) return
    try {
      const updated = await toggleShareContact(activeChat.id, checked)
      setActiveChat(updated)
      toast({
        title: checked ? 'Contato compartilhado!' : 'Compartilhamento revogado',
        description: checked
          ? 'O corretor agora pode ver seu telefone e e-mail para agendamento externo.'
          : 'Seus dados de contato voltaram a ficar protegidos e ocultos.',
      })
    } catch (err) {
      console.error('Error toggling share contact:', err)
    }
  }

  const otherUser = activeChat
    ? user?.id === activeChat.buyer_id
      ? activeChat.expand?.broker_id
      : activeChat.expand?.buyer_id
    : null

  const isBuyer = user?.id === activeChat?.buyer_id

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <MessageSquare className="h-7 w-7 text-primary" />
          Conversas Internas
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Chat seguro liberado somente após o aceite de apresentações com privacidade garantida
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[650px] border rounded-2xl bg-card overflow-hidden shadow-sm">
        {/* CHATS SIDEBAR */}
        <div className="md:col-span-1 border-r flex flex-col h-full bg-muted/20">
          <div className="p-3.5 border-b bg-card">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Conversas ativas ({chats.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y">
            {loading ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Carregando conversas...
              </div>
            ) : chats.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
                <p>Nenhuma conversa ativa no momento.</p>
                <p className="text-[11px] text-muted-foreground/80">
                  O chat é aberto automaticamente quando o interessado aceita uma apresentação.
                </p>
              </div>
            ) : (
              chats.map((c) => {
                const partner = user?.id === c.buyer_id ? c.expand?.broker_id : c.expand?.buyer_id
                const prop = c.expand?.property_id
                const isSelected = activeChat?.id === c.id

                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveChat(c)}
                    className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1 ${
                      isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground truncate">
                        {partner?.name || 'Participante'}
                      </span>
                      {partner?.creci && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-emerald-600 border-emerald-300"
                        >
                          CRECI
                        </Badge>
                      )}
                    </div>

                    <span className="text-[11px] font-medium text-primary truncate">
                      {prop?.title || 'Imóvel'}
                    </span>

                    <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                      {c.last_message || 'Início da conversa'}
                    </p>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ACTIVE CHAT WINDOW */}
        <div className="md:col-span-2 flex flex-col h-full bg-card">
          {activeChat ? (
            <>
              {/* Chat Top Header */}
              <div className="p-3.5 border-b flex flex-wrap items-center justify-between gap-3 bg-muted/10">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      {otherUser?.name || 'Participante'}
                    </span>
                    {otherUser?.creci && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold"
                      >
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        CRECI {otherUser.creci}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground block truncate">
                    Imóvel: {activeChat.expand?.property_id?.title || 'Apresentação'}
                  </span>
                </div>

                {/* SHARE CONTACT PRIVACY CONTROLLER */}
                {isBuyer ? (
                  <div className="flex items-center gap-2 bg-background p-2 rounded-lg border shadow-sm">
                    <div className="space-y-0.5 text-right">
                      <span className="text-[11px] font-bold text-foreground block">
                        Compartilhar telefone/e-mail
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {activeChat.share_contact
                          ? 'Liberado para o corretor'
                          : 'Oculto e protegido'}
                      </span>
                    </div>
                    <Switch
                      checked={!!activeChat.share_contact}
                      onCheckedChange={handleToggleShare}
                    />
                  </div>
                ) : (
                  <div>
                    {activeChat.share_contact ? (
                      <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-[11px] space-y-0.5">
                        <span className="font-bold flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Contato autorizado pelo cliente:
                        </span>
                        <p>{activeChat.expand?.buyer_id?.phone || 'Telefone não informado'}</p>
                        <p>{activeChat.expand?.buyer_id?.email}</p>
                      </div>
                    ) : (
                      <div className="p-1.5 bg-muted text-muted-foreground rounded-md text-[10px] flex items-center gap-1">
                        <Lock className="h-3 w-3 text-primary" />
                        Contato direto não compartilhado pelo cliente
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-muted/5">
                {messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                    <p>Nenhuma mensagem trocada ainda.</p>
                    <p className="text-[11px]">Envie uma mensagem abaixo para iniciar o diálogo.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender_id === user?.id

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm ${
                            isMine
                              ? 'bg-primary text-primary-foreground rounded-br-none'
                              : 'bg-muted text-foreground border rounded-bl-none'
                          }`}
                        >
                          <p>{m.text}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                          {new Date(m.created).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Send Box */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t flex items-center gap-2 bg-card"
              >
                <Input
                  placeholder="Digite sua mensagem..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="text-xs h-10 flex-1"
                />
                <Button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  size="sm"
                  className="h-10 px-4 text-xs font-semibold shadow-sm"
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  Enviar
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2">
              <MessageSquare className="h-12 w-12 text-muted-foreground/40" />
              <h3 className="font-semibold text-sm text-foreground">
                Nenhuma conversa selecionada
              </h3>
              <p className="text-xs max-w-xs">
                Selecione uma conversa na barra lateral para ver as mensagens.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
