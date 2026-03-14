import React, { createContext, useContext } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import {  useAccount, WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Sidebar from './components/Sidebar.jsx'
import Header from './components/Header.jsx'
import CookieConsent from './components/CookieConsent.jsx'
import HomeView from './views/HomeView.jsx'
import StakeView from './views/StakeView.jsx'
import MintView from './views/MintView.jsx'
import FuelExchangeView from './views/FuelExchangeView.jsx'
import SwapView from './views/SwapView.jsx'
import TeamView from './views/TeamView.jsx'
import MineView from './views/MineView.jsx'
import './i18n/index.js'
import { useEffect, useState } from 'react'
import ReferrerDialog from './components/ReferrerDialog.jsx'
import Notification from './components/Notification.jsx'
import { fetchUserInfo } from './api/index.js'
import { USE_STATIC_DATA, MOCK_ADDRESS } from './config/mock.js'

// Create React Query client
const queryClient = new QueryClient()

// Create Notification Context
export const NotificationContext = createContext()
export const WalletVerificationContext = createContext()

// Custom hook for using notification context
export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}

export const useWalletVerification = () => {
  const context = useContext(WalletVerificationContext)
  if (!context) {
    throw new Error('useWalletVerification must be used within WalletVerificationProvider')
  }
  return context
}

// Mova网络配置 (来自Vue项目App.vue)
const movaChain = {
  id: parseInt(import.meta.env.VITE_MOVA_CHAIN_ID) || 61900,
  name: import.meta.env.VITE_NETWORK_NAME || 'Mova Mainnet',
  network: 'movachain',
  nativeCurrency: {
    name: import.meta.env.VITE_NATIVE_CURRENCY_NAME || 'MOV',
    symbol: import.meta.env.VITE_NATIVE_CURRENCY_SYMBOL || 'MOV',
    decimals: 18
  },
  rpcUrls: {
    public: { http: [import.meta.env.VITE_RPC_URL || 'https://rpc.movachain.com/'] },
    default: { http: [import.meta.env.VITE_RPC_URL || 'https://rpc.movachain.com/'] }
  },
  blockExplorers: {
    default: { name: 'Mova Explorer', url: import.meta.env.VITE_BLOCK_EXPLORER || 'https://explorer.movachain.com/' }
  }
}

// Create Wagmi config with Mova network
const config = createConfig({
  chains: [movaChain],
  connectors: [
    injected(),
  ],
  transports: {
    [movaChain.id]: http(import.meta.env.VITE_RPC_URL || 'https://rpc.movachain.com/'),
  },
})

// Referral binding checker component
function ReferralBindingChecker({ onBindingStatus }) {
  const { address: walletAddress, isConnected: walletConnected } = useAccount()
  const address = USE_STATIC_DATA ? MOCK_ADDRESS : walletAddress
  const isConnected = USE_STATIC_DATA ? true : walletConnected
  const { isVerified } = useWalletVerification()
  const effectiveVerified = USE_STATIC_DATA ? true : isVerified
  
  useEffect(() => {
    if (USE_STATIC_DATA) {
      onBindingStatus(true)
      return
    }

    let mounted = true
    
    async function checkBindingStatus() {
      if (!isConnected || !address || !effectiveVerified) {
        if (mounted) onBindingStatus(null)
        return
      }
      
      try {
        console.log('Checking referral binding for address:', address)
        
        // 使用 fetchUserInfo 接口获取用户信息
        const userInfo = await fetchUserInfo(address)
        
        // 检查接口返回值
        if (!userInfo) {
          console.error('Failed to get user info')
          if (mounted) onBindingStatus(false)
          return
        }
        
        // 根据接口返回值判断是否需要显示邀请弹窗
        if (userInfo.success === false && userInfo.error === '用户不存在') {
          console.log('User does not exist, showing referrer dialog')
          if (mounted) onBindingStatus(false)
        } else {
          console.log('User exists, not showing referrer dialog')
          if (mounted) onBindingStatus(true)
        }
      } catch (error) {
        console.error('Error checking referral binding:', error)
        // If there's an error, assume user is not bound
        if (mounted) onBindingStatus(false)
      }
    }
    
    // Only check if user is connected and has an address
    checkBindingStatus()
    return () => { mounted = false }
  }, [address, isConnected, effectiveVerified, onBindingStatus])
  
  return null
}

function AppContent() {
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
  const { address: walletAddress, isConnected: walletConnected } = useAccount()
  const address = USE_STATIC_DATA ? MOCK_ADDRESS : walletAddress
  const isConnected = USE_STATIC_DATA ? true : walletConnected
  const [isVerified, setIsVerified] = useState(USE_STATIC_DATA)
  const [globalReferrerVisible, setGlobalReferrerVisible] = useState(false)
  const [hasClosedReferrerDialog, setHasClosedReferrerDialog] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationId, setNotificationId] = useState(1)

  useEffect(() => {
    if (USE_STATIC_DATA) {
      setIsVerified(true)
      return
    }

    if (isConnected && address) {
      const verified = localStorage.getItem(`signature_verified_${address}`) === 'true'
      setIsVerified(verified)
    } else {
      setIsVerified(false)
    }
  }, [address, isConnected])

  useEffect(() => {
    if (!isVerified && !USE_STATIC_DATA) {
      setGlobalReferrerVisible(false)
    }
  }, [isVerified])
  
  const toggleMenu = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }
  
  // Handle referral binding status
  const handleBindingStatus = (bound) => {
    if (USE_STATIC_DATA) return
    console.log('Handling binding status:', bound)
    if (bound === false && !hasClosedReferrerDialog) {
      console.log('User not bound, showing referrer dialog')
      setGlobalReferrerVisible(true)
    } else if (bound === true) {
      console.log('User already bound, hiding referrer dialog')
      setGlobalReferrerVisible(false)
    }
  }

  // Handle referrer dialog close
  const handleReferrerDialogClose = () => {
    console.log('Referrer dialog closed, setting hasClosedReferrerDialog to true')
    setGlobalReferrerVisible(false)
    setHasClosedReferrerDialog(true)
  }

  // Add notification
  const addNotification = (type, message) => {
    const id = notificationId
    setNotificationId(id + 1)
    setNotifications(prev => [...prev, { id, type, message }])
  }

  // Remove notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(note => note.id !== id))
  }

  return (
    <WalletVerificationContext.Provider value={{ isVerified: USE_STATIC_DATA ? true : isVerified, setIsVerified }}>
      <NotificationContext.Provider value={{ addNotification }}>
        <div className="bg-background-light dark:bg-background-dark text-white min-h-screen">
          {/* 在除了首页之外的页面显示 Header */}
          {location.pathname !== '/' && <Header toggleMenu={toggleMenu} />}
          
          {/* Referral Binding Checker */}
          <ReferralBindingChecker onBindingStatus={handleBindingStatus} />
          
          <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
            {/* Sidebar Navigation */}
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            
            {/* Main Content Area */}
            <main className={`flex-1 flex flex-col overflow-y-auto ${location.pathname !== '/' ? 'pt-20 h-[calc(100vh-5rem)]' : ''}`}>
              <Routes>
                <Route path="/" element={<HomeView />} />
                <Route path="/stake" element={<StakeView />} />
                <Route path="/mint" element={<MintView />} />
                <Route path="/fuel-exchange" element={<FuelExchangeView />} />
                <Route path="/swap" element={<SwapView />} />
                <Route path="/team" element={<TeamView />} />
                <Route path="/mine" element={<MineView />} />
              </Routes>
            </main>
            {globalReferrerVisible && <ReferrerDialog visible={true} onClose={handleReferrerDialogClose} />}
          </div>
          
          {/* Global Cookie Consent Banner */}
          <CookieConsent />
          
          {/* Global Notification Component */}
          <Notification notifications={notifications} onClose={removeNotification} />
        </div>
      </NotificationContext.Provider>
    </WalletVerificationContext.Provider>
  )
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppContent />
        </Router>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
