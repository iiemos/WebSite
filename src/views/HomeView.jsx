import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { useAccount } from 'wagmi'
import WalletConnect from '../components/WalletConnect.jsx';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/index.js';
import { useNotification, useWalletVerification } from '../App.jsx';
import { MOCK_ADDRESS, USE_STATIC_DATA } from '../config/mock.js';
import { 
  fetchGlobalStakeStats, 
  fetchDateStakeStats,
  fetchUserInfo, 
  formatWei 
} from '../api/index.js'

function HomeView() {
  const { address: walletAddress, isConnected: walletConnected } = useAccount()
  const address = USE_STATIC_DATA ? MOCK_ADDRESS : walletAddress
  const isConnected = USE_STATIC_DATA ? true : walletConnected
  const { t } = useTranslation()
  const { isVerified: walletVerified } = useWalletVerification()
  const isVerified = USE_STATIC_DATA ? true : walletVerified
  const { addNotification } = useNotification()

  const homeCopy = {
    heroTitle: '原点计划',
    heroSubtitle: '从数字原点到星际文明，构建“地面 AI + 人形机器人 + 算力接入”的跨轨道价值网络。',
    networkHint: '机器自治时代的去中心化算力协作层',
    globalStatsTitle: '算力网络总规模',
    userStatusTitle: '生态建设者状态',
    tvlTitle: '算力价值总量',
    dailyStakeTitle: '当日算力需求',
    performanceTitle: '个人贡献值',
    assetsTitle: '核心基座模块',
    assetsSubtitle: '以 H200 算力中心、工业算法优化与 C2C 算力平台构建持续增长引擎。',
    viewModules: '查看核心模块',
    moduleOneTag: 'H200 Base',
    moduleOneTitle: 'H200 算力中心',
    moduleOneDesc: '以 200 万美金级 NVIDIA H200 作为物理锚点，承载深度推理与稳定现金流能力。',
    moduleOneMetricA: '核心能力',
    moduleOneMetricAValue: '高带宽推理',
    moduleOneMetricB: '价值贡献',
    moduleOneMetricBValue: '财务母体支柱',
    moduleTwoTag: 'C2C Network',
    moduleTwoTitle: '去中心化算力平台',
    moduleTwoDesc: '连接全球闲置 GPU 与边缘节点，实现算力供需自动匹配，降低全社会算力成本。',
    moduleTwoMetricA: '结算机制',
    moduleTwoMetricAValue: 'MOON + CAMO',
    moduleTwoMetricB: '目标形态',
    moduleTwoMetricBValue: '全球 C2C 调度',
    ctaTitle: '重写算力底层协议',
    ctaSubtitle: '围绕“算力需求增长 → MOON 持续销毁 → 生态价值上升”构建长期价值飞轮。',
    ctaButton: '进入算力生态',
    footerBrand: '原点计划',
    footerDesc: '星空不再是遥不可及的画布，而是可以被计算、被映射、被拥有的未来。',
    protocolTitle: '核心架构',
    protocolItem1: 'H200 算力中心',
    protocolItem2: '工业算法优化',
    protocolItem3: '去中心化算力平台',
    protocolItem4: 'MOON 价值飞轮',
    companyTitle: '路线图',
    companyItem1: '2026 Q1：算力中心扩容',
    companyItem2: '2026 Q3：工业算法落地',
    companyItem3: '2027：C2C 平台 Beta',
    companyItem4: '持续推进星际文明叙事',
    newsletterTitle: '生态更新',
    newsletterDesc: '订阅原点计划动态，获取算力网络与生态进展。',
  }

  const marvinInviteLink = 'https://xxxxx.io/invite/ABCD1234'
  const marvinFeatureRows = [
    { cmd: '创世节点', desc: '招募 1413 名全球创世节点' },
    { cmd: '体育赛事', desc: '抢占 Web3 赛事头矿权益' },
    { cmd: '游戏竞技', desc: 'Play-to-Earn 激励持续释放' },
    { cmd: '协议执行', desc: '100% 自动执行与透明结算' },
  ]
  
  // Global staking stats
  const [globalStats, setGlobalStats] = useState({
    currentStake: '0',
    stake30d: '0',
    stake1d: '0',
    loading: true
  })
  
  // Date stake stats
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [dateStats, setDateStats] = useState({
    total_stake: '0',
    stake_1d: '0',
    stake_30d: '0',
    total_unstake: '0',
    unstake_1d: '0',
    unstake_30d: '0',
    loading: true
  })
  
  // User info
  const [userInfo, setUserInfo] = useState(null)
  const [userLoading, setUserLoading] = useState(false)
  
  // Mobile menu toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Language menu toggle
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)
  const languageMenuRef = useRef(null)
  
  // Languages - Only show English and Chinese
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'zh-hant', name: "繁體中文" },
    { code: 'ja', name: "日本語" },
    { code: 'ko', name: "한국어" },
    { code: 'pl', name: "Polski" },
    { code: 'vi', name: "Tiếng Việt" },
    { code: 'th', name: "ไทย" },
  ]
  
  // Handle language change
  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('i18nextLng', lang);
    setIsLanguageMenuOpen(false)
  }
  
  // Handle date change
  const handleDateChange = (e) => {
    const newDate = e.target.value
    setSelectedDate(newDate)
    loadDateStakeStats(newDate)
  }

  const handleCopyMarvinInviteLink = async () => {
    try {
      if (!navigator?.clipboard?.writeText) {
        addNotification('error', '当前环境不支持自动复制')
        return
      }
      await navigator.clipboard.writeText(marvinInviteLink)
      addNotification('success', '邀请链接已复制')
    } catch {
      addNotification('error', '复制失败，请手动复制')
    }
  }
  
  // Load date stake stats
  const loadDateStakeStats = async (date) => {
    if (!date || !isVerified) return
    try {
      setDateStats(prev => ({ ...prev, loading: true }))
      const res = await fetchDateStakeStats(date)
      if (res && res.success) {
        setDateStats({
          total_stake: res.stake_data?.total_stake || '0',
          stake_1d: res.stake_data?.stake_1d || '0',
          stake_30d: res.stake_data?.stake_30d || '0',
          total_unstake: res.unstake_data?.total_unstake || '0',
          unstake_1d: res.unstake_data?.unstake_1d || '0',
          unstake_30d: res.unstake_data?.unstake_30d || '0',
          loading: false
        })
      } else {
        setDateStats(prev => ({ ...prev, loading: false }))
      }
    } catch (e) {
      setDateStats(prev => ({ ...prev, loading: false }))
    }
  }

  // Close language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
        setIsLanguageMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Load date stake stats when date changes
  useEffect(() => {
    if (selectedDate && isVerified) {
      loadDateStakeStats(selectedDate)
    } else if (!isVerified) {
      setDateStats({
        total_stake: '0',
        stake_1d: '0',
        stake_30d: '0',
        total_unstake: '0',
        unstake_1d: '0',
        unstake_30d: '0',
        loading: false
      })
    }
  }, [selectedDate, isVerified])

  // Fetch global stats
  useEffect(() => {
    let mounted = true
    async function loadGlobalStats() {
      if (!isVerified) {
        if (mounted) {
          setGlobalStats({
            currentStake: '0',
            stake30d: '0',
            stake1d: '0',
            loading: false
          })
        }
        return
      }
      try {
        const res = await fetchGlobalStakeStats()
        if (mounted && res && res.success) {
          setGlobalStats({
            currentStake: res.current_stake || '0',
            stake30d: res.stake_30d || '0',
            stake1d: res.stake_1d || '0',
            loading: false
          })
        } else {
          setGlobalStats(prev => ({ ...prev, loading: false }))
        }
      } catch (e) {
        if (mounted) setGlobalStats(prev => ({ ...prev, loading: false }))
      }
    }
    loadGlobalStats()
    return () => { mounted = false }
  }, [isVerified])

  // Fetch user info when wallet connected
  useEffect(() => {
    let mounted = true
    async function loadUserInfo() {
      if (!isConnected || !address || !isVerified) {
        setUserInfo(null)
        return
      }
      setUserLoading(true)
      try {
        const res = await fetchUserInfo(address)
        if (mounted && res && res.success) {
          setUserInfo(res)
        }
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setUserLoading(false)
      }
    }
    loadUserInfo()
    return () => { mounted = false }
  }, [address, isConnected, isVerified])
  

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-drift"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-blue/10 blur-[120px] rounded-full animate-drift" style={{ animationDelay: '-5s' }}></div>
        <div className="absolute inset-0 grid-bg animate-drift opacity-30" style={{ animationDuration: '30s' }}></div>
      </div>
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-header">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <button
              className="md:hidden text-white " 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Icon icon={isMobileMenuOpen ? "mdi:close" : "mdi:menu"} className="text-3xl" />
          </button>
          <div className="flex items-center gap-2">
            {/* <img src="/img/coin.png" alt="Project Origin Logo" className="size-12" /> */}
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Project <span className="text-[#a855f7]">Origin</span>
            </h2>
          </div>
          

          
          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-10">
            <Link className="text-sm font-medium hover:text-primary transition-colors" to="/">{t('common.home')}</Link>
            <Link className="text-sm font-medium hover:text-primary transition-colors" to="/swap">{t('common.swap')}</Link>
            <Link className="text-sm font-medium hover:text-primary transition-colors" to="/stake">{t('common.stake')}</Link>
            <Link className="text-sm font-medium hover:text-primary transition-colors" to="/team">{t('common.team')}</Link>
            <Link className="text-sm font-medium hover:text-primary transition-colors" to="/mine">{t('common.mine')}</Link>
          </nav>
          
          {/* Wallet connect */}
          <div className="flex items-center gap-4">
            <WalletConnect />
            <div className="relative" ref={languageMenuRef}>
              <button 
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
              >
                <Icon icon="mdi:earth" className="text-3xl" />
              </button>
              {isLanguageMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white/10 backdrop-blur-lg rounded-lg shadow-lg border border-white/20 animate-fade-in">
                  <div className="py-2">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        className={`w-full text-left px-4 py-2 hover:bg-white/10 transition-colors ${i18n.language === lang.code ? 'bg-white/10 font-medium' : ''}`}
                        onClick={() => handleLanguageChange(lang.code)}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-background-dark/95 backdrop-blur-lg border-t border-white/5">
            <nav className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-2">
              <Link className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer text-2xl font-medium hover:text-primary" to="/" onClick={() => setIsMobileMenuOpen(false)}>
                <Icon icon="mdi:home-lightning-bolt" />
                <p className="text-xl font-medium">{t('common.home')}</p>
              </Link>
              <Link className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer text-2xl font-medium hover:text-primary" to="/swap" onClick={() => setIsMobileMenuOpen(false)}>
                <Icon icon="mdi:account-balance-wallet" />
                <p className="text-xl font-medium">{t('common.swap')}</p>
              </Link>
              <Link className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer text-2xl font-medium hover:text-primary" to="/stake" onClick={() => setIsMobileMenuOpen(false)}>
                <Icon icon="mdi:gavel" />
                <p className="text-xl font-medium">{t('common.stake')}</p>
              </Link>
              <Link className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer text-2xl font-medium hover:text-primary" to="/team" onClick={() => setIsMobileMenuOpen(false)}>
                <Icon icon="mdi:database" />
                <p className="text-xl font-medium">{t('common.team')}</p>
              </Link>
              <Link className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer text-2xl font-medium hover:text-primary" to="/mine" onClick={() => setIsMobileMenuOpen(false)}>
                <Icon icon="mdi:settings" />
                <p className="text-xl font-medium">{t('common.mine')}</p>
              </Link>
            </nav>
          </div>
        )}
      </header>
      
      {/* Hero Section */}
      <main className="pt-20">
        <section className="relative min-h-[85vh] flex items-center justify-center px-6 hero-gradient overflow-hidden">
          <div className="max-w-5xl w-full flex flex-col items-center text-center z-10">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
              {homeCopy.heroTitle}
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mb-10 font-normal leading-relaxed">
              {homeCopy.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
              <Link className="w-full sm:w-auto px-20 py-4 rounded-xl bg-primary text-white font-bold text-lg shadow-xl shadow-primary/40 hover:translate-y-[-4px] transition-all" to="/stake">
                {t('common.startStaking')}
              </Link>
            </div>
            {/* Hero Animation */}
            <div className="relative w-full max-w-3xl aspect-[16/9] rounded-3xl overflow-hidden border border-white/10 bg-slate-900/40 backdrop-blur-md animate-float">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-72 h-72 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-[2px] border-primary/30 animate-rotate-slow"></div>
                  <div className="absolute inset-8 rounded-full border-[1px] border-accent-blue/20 animate-rotate-reverse"></div>
                  <div className="absolute inset-16 rounded-full border-[3px] border-dashed border-primary/10 animate-rotate-slow" style={{ animationDuration: '20s' }}></div>
                  <div className="absolute inset-20 rounded-full bg-gradient-to-br from-primary to-accent-blue opacity-30 blur-3xl animate-breathing"></div>
                  <div className="relative z-10 flex items-center justify-center w-24 h-24 rounded-full bg-slate-900/80 border border-white/10 shadow-2xl">
                    <img src="/img/coin1.png" alt="Project Origin Logo" />
                  </div>
                  <div className="absolute top-0 left-1/2 size-2 bg-primary rounded-full blur-[1px] animate-pulse"></div>
                  <div className="absolute bottom-10 right-10 size-3 bg-accent-blue rounded-full blur-[2px] animate-pulse" style={{ animationDelay: '1s' }}></div>
                  <div className="absolute top-20 left-10 size-2 bg-white rounded-full blur-[1px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-between items-end">
                <div className="text-left">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">{t('common.networkStatus')}</p>
                  <p className="text-sm font-medium text-white">{homeCopy.networkHint}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* API Live Data */}
        <section className="py-6 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon icon="mdi:cloud" className="text-primary text-3xl" />
                <span className="font-bold">{homeCopy.globalStatsTitle}</span>
              </div>
              <div className="text-sm text-white/70">
                {globalStats.loading ? t('common.loading') : `${t('common.total')}: ${formatWei(globalStats.currentStake)} USDT`}
              </div>
            </div>
            <div className="glass-panel p-6 rounded-xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon icon="mdi:account-circle" className="text-primary text-3xl" />
                <span className="font-bold">{homeCopy.userStatusTitle}</span>
              </div>
              <span className="text-sm text-white/70">
                {isConnected ? (userLoading ? t('common.loading') : `${t('team.level')}: ${userInfo?.team_level_name || 'N/A'}`) : t('common.notConnected')}
              </span>
            </div>
          </div>
        </section>
        

        {/* Stats Section */}
        <section className="py-20 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glow-card p-8 rounded-xl flex flex-col gap-3 animate-breathing">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">{homeCopy.tvlTitle}</p>
                <Icon icon="solar:wallet-bold" className="text-primary text-3xl" />
              </div>
              <p className="text-4xl font-bold tracking-tight">
                {globalStats.loading ? '...' : `$${formatWei(globalStats.currentStake, 0)}`}
              </p>
              <div className="flex items-center gap-2 text-[#0bda6f] text-sm font-bold">
                <Icon icon="mdi:trending-up" className="text-sm size-6" />
              </div>
            </div>
            <div className="glow-card p-8 rounded-xl flex flex-col gap-3 animate-breathing" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">{homeCopy.dailyStakeTitle}</p>
                <Icon icon="lsicon:lightning-filled" className="text-accent-blue text-3xl" />
              </div>
              <p className="text-4xl font-bold tracking-tight">
                {dateStats.loading ? '...' : `$${formatWei(dateStats.total_stake, 0)}`}
              </p>
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                当日算力需求快照 ({selectedDate})
                {/* <div className="flex items-center gap-4">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-primary focus:ring-0 focus:outline-none transition-all"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div> */}
              </div>
            </div>
            <div className="glow-card p-8 rounded-xl flex flex-col gap-3 animate-breathing" style={{ animationDelay: '1s' }}>
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">{homeCopy.performanceTitle}</p>
                <Icon icon="fluent:people-team-24-filled" className="text-purple-400 text-3xl" />
              </div>
              <p className="text-4xl font-bold tracking-tight">
                {!isConnected ? 'N/A' : userLoading ? '...' : `$${formatWei(userInfo?.personal_performance || '0', 0)}`}
              </p>
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                {isConnected ? `${t('team.team')}: $${formatWei(userInfo?.team_performance || '0', 0)}` : t('common.connectWalletToView')}
              </div>
            </div>
          </div>
        </section>
        
        {/* Assets Section */}
        <section className="py-20 px-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold mb-4">{homeCopy.assetsTitle}</h2>
              <p className="text-slate-400 leading-relaxed">{homeCopy.assetsSubtitle}</p>
            </div>
            <Link className="group flex items-center gap-2 text-primary font-bold transition-all hover:pr-2" to="/stake">
              {homeCopy.viewModules}
              <Icon icon="mdi:arrow-forward" className="group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="token-card p-8 rounded-2xl border border-white/5 flex items-center gap-6 group animate-figure-eight">
              <div className="size-20 rounded-full bg-slate-800 flex items-center justify-center p-4 border border-white/10 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-500">
                <div className="size-full rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg">
                  <img src="/img/usdt.svg" alt="" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-500 text-[20px] font-bold uppercase">{homeCopy.moduleOneTag}</span>
                  <h3 className="text-xl font-bold">{homeCopy.moduleOneTitle}</h3>
              </div>
              <p className="text-slate-400 text-sm mb-4 leading-snug">{homeCopy.moduleOneDesc}</p>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{homeCopy.moduleOneMetricA}</p>
                  <p className="text-lg font-bold text-white">{homeCopy.moduleOneMetricAValue}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{homeCopy.moduleOneMetricB}</p>
                  <p className="text-lg font-bold text-white">{homeCopy.moduleOneMetricBValue}</p>
                </div>
              </div>
              </div>
            </div>
            <div className="token-card p-8 rounded-2xl border border-white/5 flex items-center gap-6 group animate-figure-eight" style={{ animationDelay: '-2s' }}>
              <div className="size-20 rounded-full bg-slate-800 flex items-center justify-center p-4 border border-white/10 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(124,59,237,0.3)] transition-all duration-500">
                <div className="size-full rounded-full flex items-center justify-center shadow-lg">
                  <img src="/img/usdt.svg" alt="" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[20px] font-bold uppercase">{homeCopy.moduleTwoTag}</span>
                  <h3 className="text-xl font-bold">{homeCopy.moduleTwoTitle}</h3>
              </div>
              <p className="text-slate-400 text-sm mb-4 leading-snug">{homeCopy.moduleTwoDesc}</p>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{homeCopy.moduleTwoMetricA}</p>
                  <p className="text-lg font-bold text-white">{homeCopy.moduleTwoMetricAValue}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{homeCopy.moduleTwoMetricB}</p>
                  <p className="text-lg font-bold text-white">{homeCopy.moduleTwoMetricBValue}</p>
                </div>
              </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-primary mb-6">
              <Icon icon="mdi:sparkles" className="text-lg" />
              <span className="font-medium">邀请</span>
              <Icon icon="mdi:sparkles" className="text-lg" />
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">邀请好友</h2>
            <p className="text-lg text-slate-400 mb-6">Project Origin：共筑 Web3 确权价值生态</p>
            <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-4 justify-center">
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 h-12 px-4 flex-1">
                <span className="flex-1 min-w-0 text-sm text-primary font-mono truncate">{marvinInviteLink}</span>
              </div>
              <button
                type="button"
                className="h-12 px-5 border border-primary/40 text-primary rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
                onClick={handleCopyMarvinInviteLink}
              >
                <Icon icon="mdi:content-copy" className="text-sm" />
                复制
              </button>
            </div>
          </div>

          <div className="relative rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-background-dark/60 to-accent-blue/10 p-8 md:p-12 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 blur-3xl pointer-events-none"></div>
            <div className="relative grid lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <div>
                  <h3 className="text-3xl font-bold text-white mb-4">Project Origin：共筑 Web3 确权价值生态</h3>
                  <p className="text-slate-300">
                    构建“现实行为 × 区块链确权 × 公益激励”全链路体系
                  </p>
                </div>

                <div className="space-y-3">
                  {marvinFeatureRows.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-all"
                    >
                      <Icon icon="mdi:check-decagram" className="text-primary" />
                      <code className="text-primary font-mono font-medium">{item.cmd}</code>
                      <span className="text-slate-300">- {item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <div className="relative group">
                  <div className="w-72 h-72 bg-gradient-to-br from-primary/30 via-primary/20 to-accent-blue/30 rounded-3xl border border-primary/40 flex items-center justify-center backdrop-blur-sm group-hover:scale-105 transition-transform duration-500">
                    <Icon icon="mdi:hexagon-multiple" className="text-primary text-8xl animate-pulse" />
                  </div>
                  <div className="absolute -top-5 -right-5 w-10 h-10 bg-primary rounded-full animate-bounce"></div>
                  <div className="absolute -bottom-5 -left-5 w-7 h-7 bg-accent-blue rounded-full animate-pulse"></div>
                  <div className="absolute top-1/2 -left-6 w-5 h-5 bg-primary rounded-full animate-ping"></div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto rounded-3xl bg-gradient-to-br from-primary to-accent-blue p-1px">
            <div className="bg-background-dark/90 rounded-[calc(1.5rem-1px)] p-12 md:p-20 text-center relative ">
              <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full animate-drift"></div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent-blue/20 blur-[100px] rounded-full animate-drift" style={{ animationDelay: '-3s' }}></div>
              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-4xl font-bold mb-6">{homeCopy.ctaTitle}</h2>
                <p className="text-slate-400 mb-10 text-lg">{homeCopy.ctaSubtitle}</p>
                <Link className="bg-white text-background-dark font-bold px-10 py-4 rounded-xl text-lg hover:bg-slate-200 hover:scale-105 transition-all shadow-xl" to="/stake">
                  {homeCopy.ctaButton}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <Icon icon="mdi:deployed-code" className="text-primary" />
              <span className="text-xl font-bold">{homeCopy.footerBrand}</span>
            </div>
            <p className="text-slate-500 text-sm mb-6">{homeCopy.footerDesc}</p>
            <div className="flex items-center gap-4">
              <a className="text-slate-500 hover:text-white transition-colors" href="#">
                <Icon icon="mdi:share" />
              </a>
              <a className="text-slate-500 hover:text-white transition-colors" href="#">
                <Icon icon="mdi:forum" />
              </a>
              <a className="text-slate-500 hover:text-white transition-colors" href="#">
                <Icon icon="mdi:language" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-6">{homeCopy.protocolTitle}</h4>
            <ul className="space-y-4 text-sm text-slate-500">
              <li><a className="hover:text-primary transition-colors" href="#">{homeCopy.protocolItem1}</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">{homeCopy.protocolItem2}</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">{homeCopy.protocolItem3}</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">{homeCopy.protocolItem4}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">{homeCopy.companyTitle}</h4>
            <ul className="space-y-4 text-sm text-slate-500">
              <li><a className="hover:text-primary transition-colors" href="#">{homeCopy.companyItem1}</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">{homeCopy.companyItem2}</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">{homeCopy.companyItem3}</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">{homeCopy.companyItem4}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">{homeCopy.newsletterTitle}</h4>
            <p className="text-sm text-slate-500 mb-4">{homeCopy.newsletterDesc}</p>
            <div className="flex gap-2">
              <input className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm w-full focus:border-primary focus:ring-0 focus:outline-none transition-all" placeholder={t('common.emailAddress')} type="email" />
              <button className="bg-primary p-2 rounded-lg text-white hover:bg-primary/80 transition-colors">
                <Icon icon="mdi:send" />
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-12 border-t border-white/5 text-center text-slate-600 text-xs">
          {t('common.copyright')}
        </div>
      </footer>
    </div>
  )
}

export default HomeView
