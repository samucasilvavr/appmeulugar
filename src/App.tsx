/* Main App Component - Handles routing (using react-router-dom), query client and other providers - use this file to add all routes */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'

import Layout from './components/Layout'
import Index from './pages/Index'
import NotFound from './pages/NotFound'
import SearchPage from './pages/Search'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import ForgotPasswordPage from './pages/ForgotPassword'
import VerifyEmailPage from './pages/VerifyEmail'
import ResetPasswordPage from './pages/ResetPassword'
import PublishInterestPage from './pages/PublishInterest'
import PublishPropertyPage from './pages/PublishProperty'
import BuyerDashboard from './pages/BuyerDashboard'
import BrokerDashboard from './pages/BrokerDashboard'
import ViewPresentationPage from './pages/ViewPresentation'
import ChatPage from './pages/Conversas'
import AdminDashboard from './pages/AdminDashboard'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/buscar" element={<SearchPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<RegisterPage />} />
            <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
            <Route path="/verificar-email" element={<VerifyEmailPage />} />
            <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
            <Route path="/publicar-interesse" element={<PublishInterestPage />} />
            <Route path="/publicar-imovel" element={<PublishPropertyPage />} />
            <Route path="/painel-interessado" element={<BuyerDashboard />} />
            <Route path="/painel-corretor" element={<BrokerDashboard />} />
            <Route path="/apresentacao/:id" element={<ViewPresentationPage />} />
            <Route path="/conversas" element={<ChatPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
