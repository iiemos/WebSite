import { ethers, JsonRpcProvider } from 'ethers';
import { parseUnits, formatEther, isAddress } from 'ethers';
import { MaxUint256 } from 'ethers';
import i18n from './i18n/index.js';
import StakingABI from './abis/Staking.json';
import ERC20ABI from './abis/ERC20.json';
import TeamLevelABI from './abis/TeamLevel.json';
import RewardTrackerABI from './abis/RewardTracker.json';
import AigInsuranceABI from './abis/AigInsurance.json';

// Contract addresses - 从Vue项目获取的真实合约地址
const CONTRACTS = {
  STAKING: import.meta.env.VITE_STAKING_ADDRESS || '0xD82B1B0D51CB0D220eFbbbf2BBf3E2cCf173E722',
  USDT: import.meta.env.VITE_USDT_ADDRESS || '0x57B84A31E00eF4378E6b2D30703b73d02Aee13f8',
  AIG: import.meta.env.VITE_AIG_ADDRESS || '0xAbcD8707756cD3116E44B20804b67Ce95a216B0A',
  TEAM_LEVEL: import.meta.env.VITE_TEAM_LEVEL_ADDRESS || '0x1a5a3A1F23f6314Ffac0705fC19B9c6c9319Ae82',
  REWARD_TRACKER: import.meta.env.VITE_REWARD_TRACKER_ADDRESS || '0xF6ACbC9FE9757e93c85beF796ee52254B6073576',
  AIG_INSURANCE: import.meta.env.VITE_AIG_INSURANCE_ADDRESS || '0x2a40bcFD79512C4d865c776496Bf65B97EFCeC36',
  WEEKLY_REWARD: import.meta.env.VITE_WEEKLY_REWARD_ADDRESS || '0xfb6A8e1c0570f6f2482eEcb1fca10aE0c85961d1',
  COMMUNITY_REWARD: import.meta.env.VITE_COMMUNITY_REWARD_ADDRESS || '0x9FcE389d7f6ec79f89dFaF822450EcBdfA2bf24F',
  ASSET_PACK: import.meta.env.VITE_ASSET_PACK_ADDRESS || '0xE09112bEF5520fEfA49110961F47ca53262eE72E',
  INTERACTION_CONTRACT: import.meta.env.VITE_INTERACTION_CONTRACT_ADDRESS || '0xD049B52d29e23c8353E4214E74C0825C641bDc4A',
  MGN: import.meta.env.VITE_MGN_ADDRESS || '0x1b21dcffe9fd430518d41c59ab095cde5ec4d2f1',
  S6_REWARD_DISTRIBUTOR: import.meta.env.VITE_S6_REWARD_DISTRIBUTOR_ADDRESS || '0xC795B7fE8aA5B02e0159cf42f294472E5A631D79',
  NODE_REWARD_DISTRIBUTOR: import.meta.env.VITE_NODE_REWARD_DISTRIBUTOR_ADDRESS || '0x3e9E49C8eE7aA505A4d9E89fC22154F9dc53a41B'
};

// Global contract instances
let contractInstances = {
  staking: null,
  usdt: null,
  aig: null,
  teamLevel: null,
  rewardTracker: null,
  aigInsurance: null
};

// Initialize contracts with signer/provider
export const initializeContracts = (signer, provider) => {
  try {
    if (signer) {
      contractInstances.staking = new ethers.Contract(CONTRACTS.STAKING, StakingABI, signer);
      contractInstances.usdt = new ethers.Contract(CONTRACTS.USDT, ERC20ABI, signer);
      contractInstances.aig = new ethers.Contract(CONTRACTS.AIG, ERC20ABI, signer);
      contractInstances.teamLevel = new ethers.Contract(CONTRACTS.TEAM_LEVEL, TeamLevelABI, signer);
      contractInstances.rewardTracker = new ethers.Contract(CONTRACTS.REWARD_TRACKER, RewardTrackerABI, signer);
      contractInstances.aigInsurance = new ethers.Contract(CONTRACTS.AIG_INSURANCE, AigInsuranceABI, signer);
    } else if (provider) {
      contractInstances.staking = new ethers.Contract(CONTRACTS.STAKING, StakingABI, provider);
      contractInstances.usdt = new ethers.Contract(CONTRACTS.USDT, ERC20ABI, provider);
      contractInstances.aig = new ethers.Contract(CONTRACTS.AIG, ERC20ABI, provider);
      contractInstances.teamLevel = new ethers.Contract(CONTRACTS.TEAM_LEVEL, TeamLevelABI, provider);
      contractInstances.rewardTracker = new ethers.Contract(CONTRACTS.REWARD_TRACKER, RewardTrackerABI, provider);
      contractInstances.aigInsurance = new ethers.Contract(CONTRACTS.AIG_INSURANCE, AigInsuranceABI, provider);
    }
  } catch (error) {
    console.error('Failed to initialize contracts:', error);
  }
};

// Get token balances
export const getBalances = async (address) => {
  try {
    if (!address || !contractInstances.usdt || !contractInstances.aig) {
      return { usdtBalance: '0', aigBalance: '0' };
    }

    const [usdtBalance, aigBalance] = await Promise.all([
      contractInstances.usdt.balanceOf(address),
      contractInstances.aig.balanceOf(address)
    ]);

    return {
      usdtBalance: formatEther(usdtBalance),
      aigBalance: formatEther(aigBalance)
    };
  } catch (err) {
    console.error('Failed to get balances:', err);
    return { usdtBalance: '0', aigBalance: '0' };
  }
};

// Check token allowances
export const checkAllowances = async (address, amount) => {
  try {
    if (!address || !contractInstances.staking || !contractInstances.usdt || !contractInstances.aig) {
      return { usdtAllowance: '0', aigAllowance: '0', needsUsdtApproval: true, needsAigApproval: true };
    }

    const amountWei = parseUnits(amount.toString(), 18);
    const aigAmountWei = amountWei.div(10);

    const [usdtAllowance, aigAllowance] = await Promise.all([
      contractInstances.usdt.allowance(address, CONTRACTS.STAKING),
      contractInstances.aig.allowance(address, CONTRACTS.STAKING)
    ]);

    return {
      usdtAllowance: formatEther(usdtAllowance),
      aigAllowance: formatEther(aigAllowance),
      needsUsdtApproval: usdtAllowance.lt(amountWei),
      needsAigApproval: aigAllowance.lt(aigAmountWei)
    };
  } catch (err) {
    console.error('Failed to check allowances:', err);
    return { usdtAllowance: '0', aigAllowance: '0', needsUsdtApproval: true, needsAigApproval: true };
  }
};

// Approve tokens
export const approveTokens = async (address, amount) => {
  try {
    if (!contractInstances.usdt || !contractInstances.aig) {
      throw new Error(i18n.t('error.walletNotConnected'));
    }

    const amountWei = parseUnits(amount.toString(), 18);
    const aigAmountWei = amountWei.div(10);

    // Approve USDT
    const usdtAllowance = await contractInstances.usdt.allowance(address, CONTRACTS.STAKING);
    if (usdtAllowance.lt(amountWei)) {
      const usdtTx = await contractInstances.usdt.approve(CONTRACTS.STAKING, MaxUint256);
      await usdtTx.wait();
    }

    // Approve AIG
    const aigAllowance = await contractInstances.aig.allowance(address, CONTRACTS.STAKING);
    if (aigAllowance.lt(aigAmountWei)) {
      const aigTx = await contractInstances.aig.approve(CONTRACTS.STAKING, MaxUint256);
      await aigTx.wait();
    }

    return true;
  } catch (err) {
      console.error('Approval failed:', err);
      throw new Error(`${i18n.t('error.tokenApprovalFailed')}: ${err.message || 'Unknown error'}`);
    }
};

// Check if user is bound to referrer
export const checkBindStatus = async (address) => {
  try {
    if (!address || !contractInstances.teamLevel) {
      return false;
    }
    return await contractInstances.teamLevel.isBindReferral(address);
  } catch (err) {
    console.error('Failed to check bind status:', err);
    return false;
  }
};

// Stake with AIG
export const stakeWithAIG = async (amount, stakeIndex) => {
  try {
    if (!contractInstances.staking) {
      throw new Error(i18n.t('error.walletNotConnected'));
    }

    const amountWei = parseUnits(amount.toString(), 18);
    
    // Check if user is bound
    const isBound = await checkBindStatus();
    
    let tx;
    if (isBound) {
      // User is bound, use regular staking
      tx = await contractInstances.staking.stakeWithAIG(amountWei, stakeIndex);
    } else {
      // User is not bound, need referrer - this should be handled by the caller
      throw new Error(i18n.t('error.newUserReferral'));
    }
    
    await tx.wait();
    return true;
  } catch (err) {
      console.error('Staking failed:', err);
      throw new Error(`${i18n.t('error.stakeFailed')}: ${err.message || 'Unknown error'}`);
    }
};

// Stake with AIG and inviter
export const stakeWithAIGWithInviter = async (amount, stakeIndex, inviter) => {
  try {
    if (!contractInstances.staking) {
      throw new Error(i18n.t('error.walletNotConnected'));
    }

    const amountWei = parseUnits(amount.toString(), 18);
    
    // Validate referrer
    if (!inviter || !isAddress(inviter)) {
      throw new Error(i18n.t('error.invalidReferrer'));
    }

    const tx = await contractInstances.staking.stakeWithAIGWithInviter(amountWei, stakeIndex, inviter);
    await tx.wait();
    
    return true;
  } catch (err) {
      console.error('Staking with inviter failed:', err);
      throw new Error(`${i18n.t('error.stakeFailed')}: ${err.message || 'Unknown error'}`);
    }
};

// Unstake
export const unstake = async (index) => {
  try {
    if (!contractInstances.staking) {
      throw new Error(i18n.t('error.walletNotConnected'));
    }

    const tx = await contractInstances.staking.unstake(index);
    await tx.wait();
    
    return true;
  } catch (err) {
      console.error('Unstaking failed:', err);
      throw new Error(`${i18n.t('error.unstakeFailed')}: ${err.message || 'Unknown error'}`);
    }
};

// Get user staking info
export const getUserStakeInfo = async (address) => {
  try {
    if (!address || !contractInstances.staking) {
      return null;
    }
    const stakeInfo = await contractInstances.staking.userStakeInfos(address);
    return stakeInfo;
  } catch (err) {
    console.error('Failed to get user stake info:', err);
    return null;
  }
};

// Get hourly limits by type
export const getHourlyLimits = async () => {
  try {
    if (!contractInstances.staking) {
      return [0, 0];
    }
    const [limit1Day, limit30Day] = await Promise.all([
      contractInstances.staking.getHourlyLimitByType(0),
      contractInstances.staking.getHourlyLimitByType(1)
    ]);
    return [
      Number(limit1Day.toString()),
      Number(limit30Day.toString())
    ];
  } catch (err) {
    console.error('Failed to get hourly limits:', err);
    return [0, 0];
  }
};

// Get remaining hourly limits
export const getRemainingHourlyLimits = async () => {
  try {
    if (!contractInstances.staking) {
      return [0, 0];
    }
    const [remaining1Day, remaining30Day] = await Promise.all([
      contractInstances.staking.getRemainingHourlyLimitByType(0),
      contractInstances.staking.getRemainingHourlyLimitByType(1)
    ]);
    return [
      Number(remaining1Day.toString()),
      Number(remaining30Day.toString())
    ];
  } catch (err) {
    console.error('Failed to get remaining hourly limits:', err);
    return [0, 0];
  }
};

// Get user total staked
export const getUserTotalStaked = async (address) => {
  try {
    if (!address || !contractInstances.staking) {
      return '0';
    }
    const totalStaked = await contractInstances.staking.userTotalStaked(address);
    return formatEther(totalStaked);
  } catch (err) {
    console.error('Failed to get user total staked:', err);
    return '0';
  }
};

// Get reinvest tax info
export const getReinvestTaxInfo = async (address) => {
  try {
    if (!address || !contractInstances.aigInsurance) {
      return {
        canClaim: false,
        amount: '0',
        unstakeAmount: '0',
        unstakeTime: '0'
      };
    }
    const taxInfo = await contractInstances.aigInsurance.getReinvestTaxInfo(address);
    return {
      canClaim: taxInfo.canClaim,
      amount: formatEther(taxInfo.amount),
      unstakeAmount: formatEther(taxInfo.unstakeAmount),
      unstakeTime: taxInfo.unstakeTime.toString()
    };
  } catch (err) {
    console.error('Failed to get reinvest tax info:', err);
    return {
      canClaim: false,
      amount: '0',
      unstakeAmount: '0',
      unstakeTime: '0'
    };
  }
};

// Check if staking is started
export const checkStakingStarted = async () => {
  try {
    if (!contractInstances.staking) {
      return false;
    }
    const startTime = await contractInstances.staking.startTime();
    const now = Math.floor(Date.now() / 1000);
    return Number(startTime.toString()) > 0 && Number(startTime.toString()) <= now;
  } catch (err) {
    console.error('Failed to check staking started:', err);
    return false;
  }
};

// Validate time restrictions (Beijing time)
export const validateTimeRestrictions = () => {
  try {
    const now = new Date();
    const beijingTimeString = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const beijingTime = new Date(beijingTimeString);
    const hours = beijingTime.getHours();
    const minutes = beijingTime.getMinutes();
    
    // Check restricted time periods: 13:59-14:01, 16:59-17:01, 19:59-20:01
    const isInRestrictedTime = (
      (hours === 13 && minutes >= 59) || (hours === 14 && minutes <= 1) ||
      (hours === 16 && minutes >= 59) || (hours === 17 && minutes <= 1) ||
      (hours === 19 && minutes >= 59) || (hours === 20 && minutes <= 1)
    );
    
    return !isInRestrictedTime;
  } catch (err) {
    console.error('Failed to validate time restrictions:', err);
    return false;
  }
};

// Export contract instances for direct access
export { contractInstances };