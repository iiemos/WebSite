import { create } from 'zustand';
import { ethers, JsonRpcProvider } from 'ethers';
import { parseUnits, formatEther, isAddress } from 'ethers';
import { MaxUint256 } from 'ethers';
import i18n from '../i18n/index.js';

// Import ABIs directly
import StakingABI from '../abis/Staking.json';
import ERC20ABI from '../abis/ERC20.json';
import TeamLevelABI from '../abis/TeamLevel.json';
import AigInsuranceABI from '../abis/AigInsurance.json';

// Import Web3 contract functions directly (not as React hooks)
import { 
  getBalances, 
  checkAllowances, 
  approveTokens, 
  checkBindStatus, 
  stakeWithAIG, 
  stakeWithAIGWithInviter, 
  unstake, 
  getUserStakeInfo, 
  getHourlyLimits, 
  getRemainingHourlyLimits, 
  getUserTotalStaked, 
  getReinvestTaxInfo, 
  checkStakingStarted, 
  validateTimeRestrictions
} from '../web3Contracts';

const useStakeStore = create((set, get) => ({
  // Basic state
  isConnected: false,
  userAddress: '',
  provider: null,
  signer: null,
  referrer: '',
  
  // Balances
  usdtBalance: '0',
  aigBalance: '0',
  
  // Staking configuration
  stakeAmount: 100,
  selectedStakeIndex: 1, // 0 = 1 day, 1 = 30 days
  sliderMin: 100,
  sliderMax: 500,
  
  // Lock options
  lockOptions: [
    { days: 1, index: 0, rate: 0.3 },
    { days: 30, index: 1, rate: 47.33 }
  ],
  
  // Staking records
  stakeList: [],
  loadingRecords: false,
  
  // Limits and restrictions
  hourlyLimitByType: [0, 0],
  remainingHourlyLimitByType: [0, 0],
  usedHourlyAmount: 0,
  userTotalStaked: 0,
  
  // Cooldown and timers
  lastStakeTime: 0,
  countdown: 0,
  countdownTimer: null,
  isInCooldown: false,
  
  // Loading states
  isStakingBusy: false,
  isProcessing: false,
  UnstakeLoading: false,
  
  // Reinvest tax
  userReinvestTaxObj: {
    canClaim: false,
    amount: '',
    unstakeAmount: '',
    unstakeTime: ''
  },
  reinvestTaxCountdown: '00:00:00',
  reinvestTaxTimer: null,
  
  // Staking status
  isStakingStarted: false,
  enableAmountLimit: false,
  
  // Validation
  stakeAmountError: '',
  
  // Actions
  setConnection: (isConnected, userAddress, provider, signer) => {
    set({ isConnected, userAddress, provider, signer });
    if (isConnected) {
      get().loadStakeData();
    }
  },
  
  setReferrer: (referrer) => {
    set({ referrer });
  },
  
  setStakeAmount: (amount) => {
    set({ stakeAmount: amount });
    get().validateStakeAmount();
  },
  
  setSelectedStakeIndex: (index) => {
    set({ selectedStakeIndex: index });
    // Update used hourly amount for the selected type
    const { hourlyLimitByType, remainingHourlyLimitByType } = get();
    const usedAmount = hourlyLimitByType[index] - remainingHourlyLimitByType[index];
    set({ usedHourlyAmount: usedAmount });
  },
  
  validateStakeAmount: () => {
    const { stakeAmount, sliderMin, sliderMax, enableAmountLimit } = get();
    let error = '';
    
    if (!stakeAmount) {
      error = 'Please enter stake amount';
    } else if (enableAmountLimit && (stakeAmount < sliderMin || stakeAmount > sliderMax)) {
      error = `Amount must be between ${sliderMin} and ${sliderMax}`;
    } else if (stakeAmount % 10 !== 0) {
      error = 'Amount must be a multiple of 10';
    }
    
    set({ stakeAmountError: error });
    return !error;
  },
  
  selectLockDay: (opt) => {
    get().setSelectedStakeIndex(opt.index);
  },
  
  // Load staking data from real contracts
  loadStakeData: async () => {
    try {
      const { userAddress } = get();
      if (!userAddress) return;
      
      set({ loadingRecords: true });
      
      // Initialize contracts with provider (for read operations)
      // Disable batch requests as some RPC nodes don't support it
      const provider = new JsonRpcProvider(
        import.meta.env.VITE_RPC_URL || 'https://rpc.movachain.com/',
        undefined,
        { batchMaxCount: 1, staticNetwork: true }
      );
      
      // Get contract instances for read operations
      const stakingContract = new ethers.Contract(import.meta.env.VITE_STAKING_ADDRESS || '0xD82B1B0D51CB0D220eFbbbf2BBf3E2cCf173E722', StakingABI, provider);
      const usdtContract = new ethers.Contract(import.meta.env.VITE_USDT_ADDRESS || '0x57B84A31E00eF4378E6b2D30703b73d02Aee13f8', ERC20ABI, provider);
      const aigContract = new ethers.Contract(import.meta.env.VITE_AIG_ADDRESS || '0xAbcD8707756cD3116E44B20804b67Ce95a216B0A', ERC20ABI, provider);
      const aigInsuranceContract = new ethers.Contract(import.meta.env.VITE_AIG_INSURANCE_ADDRESS || '0x2a40bcFD79512C4d865c776496Bf65B97EFCeC36', AigInsuranceABI, provider);
      
      // Load all data from real contracts using Promise.allSettled for resilience
      const results = await Promise.allSettled([
        // 0: Get balances
        (async () => {
          const [usdtBalance, aigBalance] = await Promise.all([
            usdtContract.balanceOf(userAddress),
            aigContract.balanceOf(userAddress)
          ]);
          return {
            usdtBalance: formatEther(usdtBalance),
            aigBalance: formatEther(aigBalance)
          };
        })(),
        // 1: Get stake info
        stakingContract.userStakeInfos(userAddress),
        // stakingContract.userStakeInfos('0xc49592daef21fa0e541b0c50cc2fc615c4775a91'),
        // 2: Get hourly limits
        (async () => {
          const [limit1Day, limit30Day] = await Promise.all([
            stakingContract.getHourlyLimitByType(0),
            stakingContract.getHourlyLimitByType(1)
          ]);
          return [
            Number(limit1Day.toString()),
            Number(limit30Day.toString())
          ];
        })(),
        // 3: Get remaining limits
        (async () => {
          const [remaining1Day, remaining30Day] = await Promise.all([
            stakingContract.getRemainingHourlyLimitByType(0),
            stakingContract.getRemainingHourlyLimitByType(1)
          ]);
          return [
            Number(remaining1Day.toString()),
            Number(remaining30Day.toString())
          ];
        })(),
        // 4: Get total staked
        stakingContract.userTotalStaked(userAddress),
        // 5: Get reinvest tax info
        aigInsuranceContract.getReinvestTaxInfo(userAddress),
        // 6: Check if staking is started
        stakingContract.startTime()
      ]);
      
      // Extract results with fallback defaults
      const balances = results[0].status === 'fulfilled' 
        ? results[0].value 
        : { usdtBalance: '0', aigBalance: '0' };
      
      const stakeInfo = results[1].status === 'fulfilled' ? results[1].value : null;
      
      const hourlyLimits = results[2].status === 'fulfilled' 
        ? results[2].value 
        : [0, 0];
      
      const remainingLimits = results[3].status === 'fulfilled' 
        ? results[3].value 
        : [0, 0];
      
      const totalStaked = results[4].status === 'fulfilled' 
        ? formatEther(results[4].value) 
        : '0';
      
      const reinvestTaxInfo = results[5].status === 'fulfilled' 
        ? {
            canClaim: results[5].value.canClaim,
            amount: formatEther(results[5].value.amount),
            unstakeAmount: formatEther(results[5].value.unstakeAmount),
            unstakeTime: results[5].value.unstakeTime.toString()
          }
        : { canClaim: false, amount: '', unstakeAmount: '', unstakeTime: '' };
      
      const stakingStarted = results[6].status === 'fulfilled'
        ? (() => {
            const startTime = Number(results[6].value.toString());
            const now = Math.floor(Date.now() / 1000);
            return startTime > 0 && startTime <= now;
          })()
        : false;
      
      // Log any failed requests for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`Contract call ${index} failed:`, result.reason?.message || result.reason);
        }
      });
      
      // Transform stake info to frontend format
      let stakeList = [];
      if (stakeInfo && stakeInfo.amounts && stakeInfo.amounts.length > 0) {
        const length = stakeInfo.amounts.length;
        for (let i = 0; i < length; i++) {
          const rewardWei = stakeInfo.rewards[i] - stakeInfo.amounts[i];
          
          stakeList.push({
            oriStakeTime: Number(stakeInfo.oriStakeTimes[i].toString()),
            amount: parseFloat(formatEther(stakeInfo.amounts[i])).toFixed(0),
            amountWei: Number(stakeInfo.amounts[i].toString()),
            status: stakeInfo.statuses[i],
            stakeIndex: Number(stakeInfo.stakeIndexes[i].toString()),
            reward: parseFloat(formatEther(rewardWei)).toFixed(2),
            canEndData: Number(stakeInfo.canEndDatas[i].toString()),
            bEndData: stakeInfo.bEndDatas[i]
          });
        }
      }
      
      // Update state with contract data (uses defaults for failed calls)
      set({
        stakeList,
        usdtBalance: balances.usdtBalance,
        aigBalance: balances.aigBalance,
        hourlyLimitByType: hourlyLimits,
        remainingHourlyLimitByType: remainingLimits,
        userTotalStaked: totalStaked,
        userReinvestTaxObj: reinvestTaxInfo,
        isStakingStarted: stakingStarted,
        loadingRecords: false
      });
      
    } catch (error) {
      console.error('loadStakeData failed:', error);
      set({ 
        stakeList: [],
        loadingRecords: false 
      });
    }
  },
  
// Core staking logic with real contract calls
  onStake: async () => {
    try {
      const { isConnected, validateStakeAmount, isStakingBusy, isInCooldown, stakeAmount, selectedStakeIndex, userTotalStaked, referrer } = get();
      
      if (!isConnected) {
        throw new Error(i18n.t('error.connectWallet'));
      }
      
      if (!validateStakeAmount()) {
        return;
      }
      
      if (isStakingBusy || isInCooldown) {
        return;
      }
      
      set({ isStakingBusy: true, isProcessing: true });
      
      // Validate time restrictions (Beijing time)
      if (!validateTimeRestrictions()) {
        throw new Error(i18n.t('error.highTraffic'));
      }
      
      // Check maximum stake limit (10,000 USD1 per user)
      const totalStaked = parseFloat(userTotalStaked) || 0;
      const currentStakeAmount = parseFloat(stakeAmount) || 0;
      const totalAfterStake = totalStaked + currentStakeAmount;
      
      if (totalAfterStake > 10000) {
        throw new Error(`${i18n.t('error.maxStakeLimit')} ${totalStaked.toFixed(2)}`);
      }
      
      // Initialize contracts for write operations
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      if (!signer) {
        throw new Error(i18n.t('error.walletNotConnected'));
      }
      
      const stakingContract = new ethers.Contract(import.meta.env.VITE_STAKING_ADDRESS || '0xD82B1B0D51CB0D220eFbbbf2BBf3E2cCf173E722', StakingABI, signer);
      const usdtContract = new ethers.Contract(import.meta.env.VITE_USDT_ADDRESS || '0x57B84A31E00eF4378E6b2D30703b73d02Aee13f8', ERC20ABI, signer);
      const aigContract = new ethers.Contract(import.meta.env.VITE_AIG_ADDRESS || '0xAbcD8707756cD3116E44B20804b67Ce95a216B0A', ERC20ABI, signer);
      const teamLevelContract = new ethers.Contract(import.meta.env.VITE_TEAM_LEVEL_ADDRESS || '0x1a5a3A1F23f6314Ffac0705fC19B9c6c9319Ae82', TeamLevelABI, signer);
      
      // Check real balances (ethers v6 uses native BigInt)
      const amountWei = parseUnits(currentStakeAmount.toString(), 18);
      const aigAmountWei = amountWei / 10n;
      
      const [usdtBalance, aigBalance] = await Promise.all([
        usdtContract.balanceOf(await signer.getAddress()),
        aigContract.balanceOf(await signer.getAddress())
      ]);
      
      const usdtBalanceNum = parseFloat(formatEther(usdtBalance));
      const aigBalanceNum = parseFloat(formatEther(aigBalance));
      const requiredAIG = currentStakeAmount / 10;
      
      if (usdtBalanceNum < currentStakeAmount) {
        throw new Error(i18n.t('error.usd1Balance'));
      }
      
      // if (aigBalanceNum < requiredAIG) {
      //   throw new Error(i18n.t('error.aigBalance'));
      // }
      
      // Check and approve USD1
      const usdtAllowance = await usdtContract.allowance(await signer.getAddress(), import.meta.env.VITE_STAKING_ADDRESS || '0xD82B1B0D51CB0D220eFbbbf2BBf3E2cCf173E722');
      if (usdtAllowance < amountWei) {
        const usdtTx = await usdtContract.approve(import.meta.env.VITE_STAKING_ADDRESS || '0xD82B1B0D51CB0D220eFbbbf2BBf3E2cCf173E722', MaxUint256);
        await usdtTx.wait();
      }
      
      // Check and approve AIG
      // const aigAllowance = await aigContract.allowance(await signer.getAddress(), import.meta.env.VITE_STAKING_ADDRESS || '0xD82B1B0D51CB0D220eFbbbf2BBf3E2cCf173E722');
      // if (aigAllowance < aigAmountWei) {
      //   const aigTx = await aigContract.approve(import.meta.env.VITE_STAKING_ADDRESS || '0xD82B1B0D51CB0D220eFbbbf2BBf3E2cCf173E722', MaxUint256);
      //   await aigTx.wait();
      // }
      
      // Check if user is bound to referrer
      const isBound = await teamLevelContract.isBindReferral(await signer.getAddress());
      
      let stakeSuccess;
      if (isBound) {
        // User is bound, use regular staking
        // const tx = await stakingContract.stakeWithAIG(amountWei, selectedStakeIndex);
        const tx = await stakingContract.stake(amountWei, selectedStakeIndex);
        await tx.wait();
        stakeSuccess = true;
      } else {
        // User is not bound, need referrer
        if (!referrer || !isAddress(referrer)) {
          throw new Error(i18n.t('error.newUserReferral'));
        }
        // const tx = await stakingContract.stakeWithAIGWithInviter(amountWei, selectedStakeIndex, referrer);
        const tx = await stakingContract.stakeWithInviter(amountWei, selectedStakeIndex, referrer);
        await tx.wait();
        stakeSuccess = true;
      }
      
      if (!stakeSuccess) {
        throw new Error(i18n.t('error.stakeFailed'));
      }
      
      // Update last stake time for cooldown
      const nowTime = Date.now();
      set({ lastStakeTime: nowTime });
      get().startCountdown();
      
      // Reload data from contracts
      await get().loadStakeData();
      
      set({ isStakingBusy: false, isProcessing: false, stakeAmount: 100 });
      
    } catch (error) {
      console.error('Stake failed:', error);
      set({ isStakingBusy: false, isProcessing: false });
      throw error; // Re-throw to let component handle error
    }
  },
  
  // Unstake functionality with real contract calls
  onUnstake: async (index) => {
    console.log('onUnstake called with index:', index);
    try {
      const { isConnected, stakeList } = get();
      
      console.log('isConnected:', isConnected);
      console.log('stakeList length:', stakeList.length);
      
      if (!isConnected) {
        console.error('Wallet not connected');
        throw new Error(i18n.t('error.connectWallet'));
      }
      
      const record = stakeList[index];
      console.log('Stake record:', record);
      
      if (!record) {
        console.error('Stake record not found for index:', index);
        throw new Error('Stake record not found');
      }
      
      const canUnstakeResult = get().canUnstake(record);
      console.log('canUnstake result:', canUnstakeResult);
      
      if (!canUnstakeResult) {
        console.error('Cannot unstake at this time');
        throw new Error('Cannot unstake at this time');
      }
      
      set({ UnstakeLoading: true });
      console.log('UnstakeLoading set to true');
      
      // Initialize contract for write operation
      console.log('Initializing contract...');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      console.log('Signer obtained:', await signer.getAddress());
      
      const stakingContract = new ethers.Contract(
        import.meta.env.VITE_STAKING_ADDRESS || '0xD82B1B0D51CB0D220eFbbbf2BBf3E2cCf173E722', 
        StakingABI, 
        signer
      );
      
      // Call real unstake function with the correct index
      console.log('Calling unstake function with index:', index);
      const tx = await stakingContract.unstake(index);
      console.log('Transaction sent:', tx.hash);
      
      console.log('Waiting for transaction to confirm...');
      await tx.wait();
      console.log('Transaction confirmed');
      
      // Reload data from contracts
      console.log('Reloading stake data...');
      await get().loadStakeData();
      console.log('Stake data reloaded');
      
    } catch (error) {
      console.error('Unstake failed:', error);
      throw error; // Re-throw to let component handle error
    } finally {
      set({ UnstakeLoading: false });
      console.log('UnstakeLoading set to false');
    }
  },
  
  // Check if record can be unstaked
  canUnstake: (record) => {
    const now = Math.floor(Date.now() / 1000);
    return !record.status && now >= record.canEndData;
  },
  
  // Calculate reward for a record
  calculateReward: (record) => {
    // 获取当前时间戳（秒）
    const now = Math.floor(Date.now() / 1000);
    // 判断质押是否已过期
    const isExpired = now >= record.canEndData;
    
    // 如果质押已完成或已过期，直接返回记录中的奖励金额
    if (record.status || isExpired) {
      return parseFloat(record.reward).toFixed(4);
    }
    
    // 实时奖励计算
    // 根据质押类型获取日收益率（1天期为0.3%，30天期为1.3%）
    const dailyRate = record.stakeIndex === 0 ? 0.003 : 0.013;
    // 一天的秒数
    const secondsPerDay = 86400;
    // 计算每秒收益率（复利计算）
    const perSecondRate = Math.pow(1 + dailyRate, 1 / secondsPerDay);
    
    // 本金金额
    const principal = parseFloat(record.amount);
    // 已质押的秒数（确保不为负数）
    const elapsedSeconds = Math.max(0, now - record.oriStakeTime);
    // 计算当前金额（本金*（1+每秒收益率）^已质押秒数）
    const currentAmount = principal * Math.pow(perSecondRate, elapsedSeconds);
    // 计算利润（当前金额-本金）
    const profit = currentAmount - principal;
    
    // 返回利润，保留4位小数
    return profit.toFixed(4);
  },
  
  // Format countdown
  getCountdown: (endTimestamp) => {
    const now = Math.floor(Date.now() / 1000);
    const remainingSeconds = endTimestamp - now;
    
    if (remainingSeconds <= 0) {
      return 'Completed';
    }
    
    const days = Math.floor(remainingSeconds / (24 * 60 * 60));
    const hours = Math.floor((remainingSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((remainingSeconds % (60 * 60)) / 60);
    
    return `${days}D:${hours}H:${minutes}M`;
  },
  
  // Cooldown timer management
  startCountdown: () => {
    const { lastStakeTime } = get();
    if (lastStakeTime === 0) return;
    
    get().stopCountdown();
    
    const updateCountdown = () => {
      const now = Date.now();
      const remaining = 60000 - (now - lastStakeTime);
      const countdown = Math.ceil(remaining / 1000);
      
      set({ countdown });
      
      if (countdown <= 0) {
        set({ countdown: 0, lastStakeTime: 0, isInCooldown: false });
        get().stopCountdown();
      } else {
        set({ isInCooldown: true });
      }
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    set({ countdownTimer: timer });
  },
  
  stopCountdown: () => {
    const { countdownTimer } = get();
    if (countdownTimer) {
      clearInterval(countdownTimer);
      set({ countdownTimer: null });
    }
  },
  
  // Reinvest tax countdown
  updateReinvestTaxCountdown: () => {
    const { userReinvestTaxObj } = get();
    const now = Math.floor(Date.now() / 1000);
    const unstakeTime = Number(userReinvestTaxObj.unstakeTime);
    
    if (isNaN(unstakeTime)) {
      set({ reinvestTaxCountdown: '00:00:00' });
      return;
    }
    
    const countdownTime = unstakeTime + 12 * 3600;
    
    if (now >= countdownTime) {
      set({ reinvestTaxCountdown: '00:00:00' });
      return;
    }
    
    const remainingSeconds = countdownTime - now;
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');
    
    set({ reinvestTaxCountdown: `${formattedHours}:${formattedMinutes}:${formattedSeconds}` });
  },
  
  // Check if reinvest tax is valid
  isReinvestTaxValid: () => {
    const { userReinvestTaxObj } = get();
    const now = Math.floor(Date.now() / 1000);
    const unstakeTime = Number(userReinvestTaxObj.unstakeTime);
    
    if (isNaN(unstakeTime)) {
      return false;
    }
    
    const countdownEndTime = unstakeTime + 12 * 3600;
    console.log('now < countdownEndTime',now < countdownEndTime);
    
    return now < countdownEndTime;
  },
  
  // Format timestamp
  formatTimestamp: (ts) => {
    if (!ts) return '-';
    const d = new Date(Number(ts) * 1000);
    return d.toLocaleString();
  },
  
  // Transform day index to display
  transformDay: (index) => {
    if (index == '0') return '1D';
    if (index == '1') return '30D';
    return '';
  },
  
  // Cleanup timers
  cleanup: () => {
    get().stopCountdown();
    const { reinvestTaxTimer } = get();
    if (reinvestTaxTimer) {
      clearInterval(reinvestTaxTimer);
      set({ reinvestTaxTimer: null });
    }
  }
}));

export default useStakeStore;