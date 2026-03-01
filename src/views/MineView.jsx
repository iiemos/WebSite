import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { 
  fetchUserInfo, 
  fetchStakeRecords, 
  fetchUnstakeRecords, 
  fetchCommunityReward, 
  fetchTodayStake,
  fetchRewardSummary,
  requestCommunityRewardSignature,
  formatWei,
  formatAddress,
  transformDay,
  formatTimestamp,
} from '../api/index.js'
import CommunityRewardABI from '../abis/CommunityReward.json'
import S6RewardDistributorABI from '../abis/S6RewardDistributor.json'
import NodeRewardDistributorABI from '../abis/NodeRewardDistributor.json'
import { useNotification, useWalletVerification } from '../App.jsx'

function MineView() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { t } = useTranslation()
  const { addNotification } = useNotification()
  const { isVerified } = useWalletVerification()
  const CHAIN_ID = parseInt(import.meta.env.VITE_MOVA_CHAIN_ID || '61900', 10)
  
  // const {  isConnected } = useAccount();
  // const address = '0xc4bbfad25740517144361a4215054ecd8b70c148'
  // const address = '0xa2122d69e25821079d6af4a7130cb09f0ff8fd1e'
  // const address = '0x95c8e33969ba1e96523623e9fbe376a594557aec'
  // const address = '0xddc6a65251914b361f8784afc79162351009e487'
  // const address = '0xB67E9026aF55427beFF9bA7200363425Ac1a4B72'
  // Contract addresses
  const CONTRACTS = {
    REWARD_TRACKER: import.meta.env.VITE_REWARD_TRACKER_ADDRESS || '0xF6ACbC9FE9757e93c85beF796ee52254B6073576',
    TEAM_LEVEL: import.meta.env.VITE_TEAM_LEVEL_ADDRESS || '0x8a0d8C5f6E05B71FbE716dF4B4cA364B471a217c',
    COMMUNITY_REWARD: import.meta.env.VITE_COMMUNITY_REWARD_ADDRESS || '0x9d44c9aC514b2C1095B993232f4501780702A048',
    S6_REWARD_DISTRIBUTOR: import.meta.env.VITE_S6_REWARD_DISTRIBUTOR_ADDRESS || '0xC795B7fE8aA5B02e0159cf42f294472E5A631D79',
    NODE_REWARD_DISTRIBUTOR: import.meta.env.VITE_NODE_REWARD_DISTRIBUTOR_ADDRESS || '0x3e9E49C8eE7aA505A4d9E89fC22154F9dc53a41B',
  }


  
  // User info state
  const [userInfo, setUserInfo] = useState(null)
  const [userLoading, setUserLoading] = useState(false)
  
  // Stake records
  const [stakeRecords, setStakeRecords] = useState([])
  const [unstakeRecords, setUnstakeRecords] = useState([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  
  // Today's stake
  const [todayStake, setTodayStake] = useState({ personal: '0', team: '0' })
  
  // Security settings
  const [is2FAEnabled, setIs2FAEnabled] = useState(true)
  
  // Community reward
  const [communityReward, setCommunityReward] = useState(null)
  const [rewardLoading, setRewardLoading] = useState(false)
  const [communityRewardClaiming, setCommunityRewardClaiming] = useState(false)
  
  // S6 reward
  const [s6Reward, setS6Reward] = useState(null)
  const [s6RewardLoading, setS6RewardLoading] = useState(false)
  const [s6RewardClaiming, setS6RewardClaiming] = useState(false)
  
  // Node reward
  const [nodeReward, setNodeReward] = useState(null)
  const [nodeRewardLoading, setNodeRewardLoading] = useState(false)
  const [nodeRewardClaiming, setNodeRewardClaiming] = useState(false)
  
  // Node status
  const [isNode, setIsNode] = useState(false)
  
  // Reward summary (API)
  const [rewardSummary, setRewardSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Fetch user info
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
          console.log('用户信息',res);
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

  // Fetch stake and unstake records
  useEffect(() => {
    let mounted = true
    async function loadRecords() {
      if (!isConnected || !address || !isVerified) {
        setStakeRecords([])
        setUnstakeRecords([])
        return
      }
      setRecordsLoading(true)
      try {
        const [stakesRes, unstakesRes] = await Promise.all([
          fetchStakeRecords(address),
          fetchUnstakeRecords(address)
        ])
        if (mounted) {
          if (stakesRes && stakesRes.success) {
            setStakeRecords(stakesRes.stakes || [])
          }
          console.log('用户解除质押记录',unstakesRes);
          if (unstakesRes && unstakesRes.success) {
            setUnstakeRecords(unstakesRes.data || [])
          }
        }
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setRecordsLoading(false)
      }
    }
    loadRecords()
    return () => { mounted = false }
  }, [address, isConnected, isVerified])

  // Fetch today's stake
  useEffect(() => {
    let mounted = true
    async function loadTodayStake() {
      if (!isConnected || !address || !isVerified) {
        setTodayStake({ personal: '0', team: '0' })
        return
      }
      try {
        const res = await fetchTodayStake(address)
        if (mounted && res && res.success) {
          setTodayStake({
            personal: res.today_personal_stake || '0',
            team: res.today_team_stake || '0'
          })
        }
      } catch (e) {
        // ignore
      }
    }
    loadTodayStake()
    return () => { mounted = false }
  }, [address, isConnected, isVerified])
  
  // Fetch community reward
  useEffect(() => {
    let mounted = true
    async function loadCommunityReward() {
      if (!isConnected || !address || !isVerified) {
        setCommunityReward(null)
        return
      }
      setRewardLoading(true)
      try {
        const res = await fetchCommunityReward(address)
        if (mounted && res && res.success) {
          console.log('获取社区奖励信息：',res);
          setCommunityReward(res)
        }
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setRewardLoading(false)
      }
    }
    loadCommunityReward()
    return () => { mounted = false }
  }, [address, isConnected, isVerified])
  
  // Fetch S6 reward
  useEffect(() => {
    let mounted = true
    async function loadS6Reward() {
      if (!isConnected || !address || !isVerified || !userInfo || userInfo.team_level < 6) {
        setS6Reward(null)
        return
      }
      setS6RewardLoading(true)
      try {
        if (publicClient && CONTRACTS.S6_REWARD_DISTRIBUTOR) {
          try {
            const s6Reward = await publicClient.readContract({
              address: CONTRACTS.S6_REWARD_DISTRIBUTOR,
              abi: S6RewardDistributorABI,
              functionName: 'pendingReward',
              args: [address]
            })
            console.log('S6 reward:', s6Reward)
            setS6Reward({
              success: true,
              pending_reward: s6Reward.toString(),
              is_eligible: true
            })
          } catch (error) {
            console.warn('获取S6奖励失败:', error)
            setS6Reward(null)
          }
        }
      } catch (e) {
        console.error('获取S6奖励失败:', e)
      } finally {
        if (mounted) setS6RewardLoading(false)
      }
    }
    loadS6Reward()
    return () => { mounted = false }
  }, [address, isConnected, isVerified, userInfo, publicClient])
  
  // Fetch node reward
  useEffect(() => {
    let mounted = true
    async function loadNodeReward() {
      if (!isConnected || !address || !isVerified) {
        setNodeReward(null)
        setIsNode(false)
        return
      }
      setNodeRewardLoading(true)
      try {
        if (publicClient && CONTRACTS.NODE_REWARD_DISTRIBUTOR) {
          try {
            // 检查是否为节点成员
            const isNodeMember = await publicClient.readContract({
              address: CONTRACTS.NODE_REWARD_DISTRIBUTOR,
              abi: NodeRewardDistributorABI,
              functionName: 'isMember',
              args: [address]
            })
            console.log('是否节点成员:', isNodeMember)
            setIsNode(isNodeMember)
            
            if (isNodeMember) {
              const nodeReward = await publicClient.readContract({
                address: CONTRACTS.NODE_REWARD_DISTRIBUTOR,
                abi: NodeRewardDistributorABI,
                functionName: 'pendingReward',
                args: [address]
              })
              console.log('Node reward:', nodeReward)
              setNodeReward({
                success: true,
                pending_reward: nodeReward.toString(),
                is_eligible: true
              })
            }
          } catch (error) {
            console.warn('获取节点奖励失败:', error)
            setNodeReward(null)
            setIsNode(false)
          }
        }
      } catch (e) {
        console.error('获取节点奖励失败:', e)
      } finally {
        if (mounted) setNodeRewardLoading(false)
      }
    }
    loadNodeReward()
    return () => { mounted = false }
  }, [address, isConnected, isVerified, publicClient])
  


  // Fetch reward summary from API
  useEffect(() => {
    let mounted = true
    async function loadRewardSummary() {
      if (!isConnected || !address || !isVerified) {
        setRewardSummary(null)
        return
      }
      setSummaryLoading(true)
      try {
        const res = await fetchRewardSummary(address)
        console.log('获取奖励摘要:', res);
        if (mounted && res && res.success) {
          setRewardSummary(res)
        }
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setSummaryLoading(false)
      }
    }
    loadRewardSummary()
    return () => { mounted = false }
  }, [address, isConnected, isVerified])

  // Claim community reward
  const claimCommunityReward = async () => {
    // 参数检查：确保用户已验证、已连接钱包、有地址、有资格领取奖励、有walletClient且不在领取中
    if (!isVerified || !isConnected || !address || !communityReward?.is_eligible || !walletClient || communityRewardClaiming) return
    
    try {
      // 设置领取中状态，防止用户重复点击
      setCommunityRewardClaiming(true)
      
      // 生成时间戳和签名消息
      const timestamp = Math.floor(Date.now() / 1000)
      const message = `CommunityReward Claim Request\n\nAddress: ${address}\nTimestamp: ${timestamp}\nChain: ${CHAIN_ID}`
      
      // 使用钱包签名消息
      const userSignature = await walletClient.signMessage({ message })
      
      // 请求社区奖励签名（后端生成）
      const signRes = await requestCommunityRewardSignature({
        user: address,
        amount: null,
        user_signature: userSignature,
        message
      })
      
      // 检查签名响应
      if (!signRes || !signRes.success) {
        throw new Error(signRes?.error || 'Failed to request signature')
      }
      
      // 获取合约地址
      const contractAddress = signRes.contract || CONTRACTS.COMMUNITY_REWARD
      if (!contractAddress) {
        throw new Error('Missing community reward contract address')
      }
      
      // 调用合约的claimWithSignature函数领取奖励
      console.log('Claiming community reward with signature...')
      const tx = await walletClient.writeContract({
        address: contractAddress,
        abi: CommunityRewardABI,
        functionName: 'claimWithSignature',
        args: [
          signRes.level, // 团队等级
          signRes.amount, // 奖励金额
          signRes.nonce, // 随机数
          signRes.deadline, // 签名截止时间
          signRes.signature // 签名
        ]
      })
      console.log('Transaction sent:', tx)
      
      // 等待交易确认
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
      console.log('Transaction confirmed:', receipt)
      
      // 重新加载奖励数据
      const res = await fetchCommunityReward(address)
      if (res && res.success) {
        setCommunityReward(res)
      }
      
      // 显示成功通知
      addNotification('success', 'Community reward claimed successfully!')
    } catch (error) {
      // 捕获错误并显示错误通知
      console.error('Failed to claim community reward:', error)
      addNotification('error', 'Failed to claim community reward: ' + error.message)
    } finally {
      // 无论成功失败都重置领取中状态
      setCommunityRewardClaiming(false)
    }
  }
  
  // Claim S6 reward
  const claimS6Reward = async () => {
    if (!isVerified || !isConnected || !address || !s6Reward?.is_eligible || !walletClient || s6RewardClaiming) return
    
    try {
      setS6RewardClaiming(true)
      if (CONTRACTS.S6_REWARD_DISTRIBUTOR) {
        console.log('Claiming S6 reward...')
        const tx = await walletClient.writeContract({
          address: CONTRACTS.S6_REWARD_DISTRIBUTOR,
          abi: S6RewardDistributorABI,
          functionName: 'claim',
          args: []
        })
        console.log('Transaction sent:', tx)
        
        // Wait for transaction to complete
        const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
        console.log('Transaction confirmed:', receipt)
        
        // 重新加载奖励数据
        if (publicClient) {
          try {
            const s6Reward = await publicClient.readContract({
              address: CONTRACTS.S6_REWARD_DISTRIBUTOR,
              abi: S6RewardDistributorABI,
              functionName: 'pendingReward',
              args: [address]
            })
            console.log('获取s6Reward',s6Reward);
            setS6Reward({
              success: true,
              pending_reward: s6Reward.toString(),
              is_eligible: true
            })
          } catch (error) {
            console.warn('获取S6奖励失败:', error)
            setS6Reward(null)
          }
        }
        addNotification('success', 'S6 reward claimed successfully!')
      }
    } catch (error) {
      console.error('Failed to claim S6 reward:', error)
      addNotification('error', 'Failed to claim S6 reward: ' + error.message)
    } finally {
      setS6RewardClaiming(false)
    }
  }
  
  // Claim node reward
  const claimNodeReward = async () => {
    if (!isVerified || !isConnected || !address || !nodeReward?.is_eligible || !walletClient || nodeRewardClaiming) return
    
    try {
      setNodeRewardClaiming(true)
      if (CONTRACTS.NODE_REWARD_DISTRIBUTOR) {
        console.log('Claiming node reward...')
        const tx = await walletClient.writeContract({
          address: CONTRACTS.NODE_REWARD_DISTRIBUTOR,
          abi: NodeRewardDistributorABI,
          functionName: 'claim',
          args: []
        })
        console.log('Transaction sent:', tx)
        
        // Wait for transaction to complete
        const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
        console.log('Transaction confirmed:', receipt)
        
        // 重新加载奖励数据
        if (publicClient) {
          try {
            const nodeReward = await publicClient.readContract({
              address: CONTRACTS.NODE_REWARD_DISTRIBUTOR,
              abi: NodeRewardDistributorABI,
              functionName: 'pendingReward',
              args: [address]
            })
            setNodeReward({
              success: true,
              pending_reward: nodeReward.toString(),
              is_eligible: true
            })
          } catch (error) {
            console.warn('获取节点奖励失败:', error)
            setNodeReward(null)
          }
        }
        addNotification('success', 'Node reward claimed successfully!')
      }
    } catch (error) {
      console.error('Failed to claim node reward:', error)
      addNotification('error', 'Failed to claim node reward: ' + error.message)
    } finally {
      setNodeRewardClaiming(false)
    }
  }

  // Calculate total staked from records
  const totalStaked = stakeRecords.reduce((sum, stake) => {
    if (!stake.status) { // Only count active stakes
      return sum + BigInt(stake.amount || '0')
    }
    return sum
  }, BigInt(0))
  
  const getRewardAmountByTypes = (types) => {
    if (!rewardSummary || !Array.isArray(rewardSummary.data)) return '0'
    const reward = rewardSummary.data.find(item => types.includes(item.reward_type))
    return reward?.total_amount || '0'
  }

  // Get direct referral reward from summary
  const getDirectReferralReward = () => {
    return getRewardAmountByTypes(['direct_referral', 'direct', 'invite'])
  }

  // Get stake reward from summary
  const getStakeReward = () => {
    return getRewardAmountByTypes(['stake', 'staking', 'stake_profit'])
  }

  // Get team reward from summary
  const getTeamReward = () => {
    return getRewardAmountByTypes(['level', 'team', 'team_level_reward'])
  }

  // Get all reward from summary
  const getAllReward = () => {
    const stakeReward = getStakeReward()
    const teamReward = getTeamReward()
    console.log('质押收益',stakeReward);
    console.log('团队收益',teamReward);
    
    const directReward = getDirectReferralReward()
    const total = BigInt(stakeReward) + BigInt(teamReward) + BigInt(directReward)
    return total.toString()
  }
  return (
    <div className=" dark:bg-background-dark text-white min-h-screen">
      <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
        <div className="flex-1 flex flex-col overflow-y-auto pb-24 lg:pb-0">
          <div className="layout-container flex flex-col min-h-screen">
            <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 py-20 space-y-8">
              {/* Profile Header */}
              <section className="glass-panel rounded-xl p-6 flex flex-col gap-2 neon-border-purple border-l-4 border-l-white/20">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="relative">

                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">
                          {isConnected ? formatAddress(address) : t('mine.notConnected')}
                        </h1>
                        {isConnected && (
                          <button 
                            className="text-white/40 hover:text-primary transition-colors"
                            onClick={() => navigator.clipboard.writeText(address)}
                          >
                            <Icon icon="mdi:content-copy" className="text-lg" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center  mt-1">
                        <p className='text-primary font-medium'>
                          {userInfo?.is_valid_user ? t('mine.validUser') : t('mine.staker')}
                        </p>
                        <div className="ml-2 bg-primary px-3 py-1 rounded-full text-[10px] font-bold border-2 border-background-dark uppercase">
                          {userLoading ? '...' : 'S'+userInfo?.team_level || 'S0'}
                        </div>
                      </div>

                    </div>
                  </div>
                  <div className="text-right flex flex-col items-center md:items-end">
                    <p className="text-white/60 text-sm uppercase tracking-widest font-semibold mb-1">{t('mine.totalPerformance')}</p>
                    <p className="text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">
                      ${formatWei(userInfo?.personal_performance || '0', 2)} <span className="text-xl text-primary align-middle ml-2 font-medium">USD1</span>
                    </p>
                    <p className="text-white/40 text-sm mt-2">
                      {t('team.team')}: ${formatWei(userInfo?.team_performance || '0', 2)} USD1
                    </p>
                  </div>
                </div>
              </section>
              
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">

                <div className="glass-panel rounded-xl py-2 px-6 lg:p-6 flex flex-col gap-1 lg:gap-2 neon-border-purple border-l-4 border-l-accent-blue">
                  <p className="text-[#a692c9] text-xs font-semibold uppercase tracking-wider">
                    {t('common.stakeReward')}
                  </p>
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-bold leading-tight text-accent-blue">
                      {summaryLoading ? '...' : '$'+formatWei(getStakeReward(), 2)}
                    </p>
                    <p className="text-[#0bda6f] text-sm font-medium flex items-center">
                      <Icon icon="mdi:check-circle" className="text-sm mr-1" />
                      USD1
                    </p>
                  </div>
                </div>

                <div className="glass-panel rounded-xl py-2 px-6 lg:p-6 flex flex-col gap-1 lg:gap-2 neon-border-purple border-l-4 border-l-primary">
                  <p className="text-[#a692c9] text-xs font-semibold uppercase tracking-wider">
                    {t('common.teamReward')}
                  </p>
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-bold leading-tight truncate">
                      {summaryLoading ? '...' : '$'+formatWei(getTeamReward(), 2)}
                    </p>
                    <p className="text-[#0bda6f] text-sm font-medium flex items-center">
                      USD1
                    </p>
                  </div>
                </div>

                <div className="glass-panel rounded-xl py-2 px-6 lg:p-6  flex flex-col gap-1 lg:gap-2 neon-border-purple border-l-4 border-l-blue-500">
                  <p className="text-[#a692c9] text-xs font-semibold uppercase tracking-wider">
                    {t('common.inviteReward')}
                  </p>
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-bold leading-tight text-blue-400">
                      {summaryLoading ? '...' : '$'+formatWei(getDirectReferralReward(), 2)}
                    </p>
                    <p className="text-blue-400 text-sm font-medium flex items-center">
                      USD1
                    </p>
                  </div>
                </div>

                <div className="glass-panel rounded-xl py-2 px-6 lg:p-6  flex flex-col gap-1 lg:gap-2 neon-border-purple border-l-4 border-l-purple-500">
                  <p className="text-[#a692c9] text-xs font-semibold uppercase tracking-wider">
                    {t('common.allReward')}
                  </p>
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-bold leading-tight text-purple-400">
                      {summaryLoading ? '...' : '$'+formatWei(getAllReward(), 2)}
                    </p>
                    <p className="text-purple-400 text-sm font-medium flex items-center">
                      USD1
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Asset Balances */}
                <div className="lg:col-span-6 space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Icon icon="mdi:account-balance-wallet" className="text-primary" />
                      {t('mine.assetBalances')}
                    </h2>
                    <button className="text-xs text-primary font-bold hover:underline">{t('mine.manageAll')}</button>
                  </div>
                  {/* Reward Modules */}
                  {(userInfo?.team_level >= 3 || isNode) ? (
                    <div className="space-y-4">
                      {/* Community Reward (S3-S5) */}
                      {userInfo?.team_level >= 3 && (
                        <div className="glass-panel p-6 rounded-xl">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold flex items-center gap-2">
                              <Icon icon="mdi:community" className="text-primary" />
                              {t('mine.levelReward')} (S3-S6)
                            </h3>
                          </div>
                          {rewardLoading ? (
                            <div className="text-center text-white/40 py-8">{t('mine.loading')}</div>
                          ) : communityReward ? (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                <div>
                                  <p className="text-white/60 text-sm"></p>
                                  <p className="text-lg font-bold mt-1">
                                    {communityReward.is_eligible && (
                                      <span className="text-green-400">{t('mine.eligible')}</span>
                                    )}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-white/60 text-sm">{t('mine.pendingReward')}</p>
                                  <p className="text-3xl font-bold mt-1">{formatWei(communityReward.pending_reward, 2)} MGN</p>
                                </div>
                              </div>
                              <button 
                                className={`w-full py-2 border border-primary/50 bg-border-dark/50 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                                  communityReward.is_eligible && !communityRewardClaiming
                                    ? 'bg-primary hover:bg-primary/80 text-white'
                                    : 'bg-border-dark/50 cursor-not-allowed text-white/30'
                                }`}
                                onClick={claimCommunityReward}
                                disabled={!communityReward.is_eligible || communityRewardClaiming}
                              >
                                {communityRewardClaiming ? (
                                  <>
                                    <Icon icon="mdi:loading" className="animate-spin" />
                                    loading...
                                  </>
                                ) : (
                                  <>
                                    {t('mine.claimReward')}
                                    <Icon icon={communityReward.is_eligible ? 'mdi:arrow-right' : 'mdi:lock'} />
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="text-center text-white/40 py-8">{t('mine.noCommunityRewardData')}</div>
                          )}
                        </div>
                      )}
                      
                      {/* S6 Reward */}
                      {userInfo?.team_level >= 6 && (
                        <div className="glass-panel p-6 rounded-xl">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold flex items-center gap-2">
                              <Icon icon="mdi:star" className="text-yellow-400" />
                              S6 Reward
                            </h3>
                          </div>
                          {s6RewardLoading ? (
                            <div className="text-center text-white/40 py-8">{t('mine.loading')}</div>
                          ) : s6Reward ? (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                <div>
                                  <p className="text-white/60 text-sm"></p>
                                  <p className="text-lg font-bold mt-1">
                                    {s6Reward.is_eligible && (
                                      <span className="text-green-400">{t('mine.eligible')}</span>
                                    )}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-white/60 text-sm">{t('mine.pendingReward')}</p>
                                  <p className="text-3xl font-bold mt-1">${formatWei(s6Reward.pending_reward, 2)} USD1</p>
                                </div>
                              </div>
                              <button 
                                className={`w-full py-2 border border-primary/50 bg-border-dark/50 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                                  s6Reward.is_eligible && !s6RewardClaiming
                                    ? 'bg-primary hover:bg-primary/80 text-white'
                                    : 'bg-border-dark/50 cursor-not-allowed text-white/30'
                                }`}
                                onClick={claimS6Reward}
                                disabled={!s6Reward.is_eligible || s6RewardClaiming}
                              >
                                {s6RewardClaiming ? (
                                  <>
                                    <Icon icon="mdi:loading" className="animate-spin" />
                                    loading...
                                  </>
                                ) : (
                                  <>
                                    {t('mine.claimReward')}
                                    <Icon icon={s6Reward.is_eligible ? 'mdi:arrow-right' : 'mdi:lock'} />
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="text-center text-white/40 py-8">{t('mine.noCommunityRewardData')}</div>
                          )}
                        </div>
                      )}
                      
                      {/* Node Reward */}
                      {isNode && (
                        <div className="glass-panel p-6 rounded-xl space-y-4 group hover:border-primary/50 transition-all">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <Icon icon="mdi:hub" />
                              </div>
                              <div>
                                <p className="font-bold">{t('mine.nodeReward')}</p>
                                <p className="text-xs text-white/40">{t('mine.nodeParticipation')}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{nodeRewardLoading ? t('mine.loading') : `${formatWei(nodeReward?.pending_reward || '0', 2)}`}</p>
                              <p className="text-[10px] text-white/40">MGN</p>
                            </div>
                          </div>
                          <button 
                            className={`w-full py-2 border border-primary/50 bg-border-dark/50 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                              nodeReward?.is_eligible && !nodeRewardClaiming
                                ? 'bg-primary hover:bg-primary/80 text-white'
                                : 'bg-border-dark/50 cursor-not-allowed text-white/30'
                            }`}
                            onClick={claimNodeReward}
                            disabled={!nodeReward?.is_eligible || nodeRewardClaiming}
                          >
                            {nodeRewardClaiming ? (
                              <>
                                <Icon icon="mdi:loading" className="animate-spin" />
                                loading...
                              </>
                            ) : (
                              <>
                                {t('mine.claimReward')}
                                <Icon icon={nodeReward?.is_eligible ? 'mdi:arrow-right' : 'mdi:lock'} className="text-sm" />
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="glass-panel p-6 rounded-xl">
                      <div className="text-center text-white/40 py-8">{t('mine.noPendingReward')}</div>
                    </div>
                  )}
                </div>
                {/* Center Column: Personal Staking Stats */}
                <div className="lg:col-span-6 space-y-6">
                  {/* Unstake Records */}
                  <div className="glass-panel p-6 rounded-xl">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold">{t('mine.unstakeRecords')}</h3>
                      <span className="text-white/40 text-sm">{unstakeRecords.length} {t('mine.records')}</span>
                    </div>
                    {recordsLoading ? (
                      <div className="text-center text-white/40 py-8">{t('mine.loading')}</div>
                    ) : unstakeRecords.length === 0 ? (
                      <div className="text-center text-white/40 py-8">{t('mine.noUnstakeRecords')}</div>
                    ) : (
                      <div className="space-y-3">
                        {unstakeRecords.slice(0, 5).map((unstake, index) => (
                          <div key={unstake.id || index} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <div>
                              <p className="font-medium">{t('stake.reward')}: ${formatWei(unstake.reward, 4)} USD1</p>
                              <div className="flex items-center gap-4 mt-1">
                                <p className="text-xs text-white/40">{formatTimestamp(unstake.unstake_time)}</p>
                                {/* <p className="text-xs text-white/40">{transformDay(unstake.stake_index)}</p> */}
                              </div>
                            </div>
                            <span className="px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-400">
                              {t('mine.completed')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  

                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
      
      {/* Animated Grid Background */}
      <div className="fixed inset-0 z-0 bg-grid opacity-50 pointer-events-none"></div>
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,59,237,0.1)_0%,transparent_50%)] pointer-events-none"></div>
    </div>
  );
}

export default MineView;
