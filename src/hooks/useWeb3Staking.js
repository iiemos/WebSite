import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, createWalletClient, custom, getContract } from 'viem';
import { mainnet } from 'viem/chains';
import { parseEther, formatEther } from 'viem';
import { ethers } from 'ethers';
import i18n from '../i18n/index.js';
import StakingABI from '../abis/Staking.json';
import ERC20ABI from '../abis/ERC20.json';
import TeamLevelABI from '../abis/TeamLevel.json';
import RewardTrackerABI from '../abis/RewardTracker.json';
import AigInsuranceABI from '../abis/AigInsurance.json';

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

export const useWeb3Staking = () => {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create clients
  const publicClient = createPublicClient({
    chain: mainnet,
    transport: window.ethereum ? custom(window.ethereum) : undefined
  });

  const walletClient = isConnected ? createWalletClient({
    chain: mainnet,
    transport: custom(window.ethereum)
  }) : null;

  // Contract instances
  const [contracts, setContracts] = useState({
    staking: null,
    usdt: null,
    aig: null,
    teamLevel: null,
    rewardTracker: null,
    aigInsurance: null
  });

  // Initialize contracts when wallet is available
  useEffect(() => {
    if (walletClient) {
      setContracts({
        staking: {
          address: CONTRACTS.STAKING,
          abi: StakingABI,
          client: walletClient
        },
        usdt: {
          address: CONTRACTS.USDT,
          abi: ERC20ABI,
          client: publicClient
        },
        aig: {
          address: CONTRACTS.AIG,
          abi: ERC20ABI,
          client: publicClient
        },
        teamLevel: {
          address: CONTRACTS.TEAM_LEVEL,
          abi: TeamLevelABI,
          client: publicClient
        },
        rewardTracker: {
          address: CONTRACTS.REWARD_TRACKER,
          abi: RewardTrackerABI,
          client: publicClient
        },
        aigInsurance: {
          address: CONTRACTS.AIG_INSURANCE,
          abi: AigInsuranceABI,
          client: publicClient
        }
      });
    }
  }, [walletClient, publicClient]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get token balances
  const getBalances = useCallback(async () => {
    if (!address || !provider || !contracts.usdt || !contracts.aig) {
      return { usdtBalance: '0', aigBalance: '0' };
    }

    try {
      const [usdtBalance, aigBalance] = await Promise.all([
        contracts.usdt.balanceOf(address),
        contracts.aig.balanceOf(address)
      ]);

      return {
        usdtBalance: ethers.utils.formatEther(usdtBalance),
        aigBalance: ethers.utils.formatEther(aigBalance)
      };
    } catch (err) {
      console.error('Failed to get balances:', err);
      return { usdtBalance: '0', aigBalance: '0' };
    }
  }, [address, provider, contracts.usdt, contracts.aig]);

  // Check token allowances
  const checkAllowances = useCallback(async (amount) => {
    if (!address || !contracts.staking || !contracts.usdt || !contracts.aig) {
      return { usdtAllowance: '0', aigAllowance: '0' };
    }

    try {
      const amountWei = ethers.utils.parseUnits(amount.toString(), 18);
      const aigAmountWei = amountWei.div(10);

      const [usdtAllowance, aigAllowance] = await Promise.all([
        contracts.usdt.allowance(address, CONTRACTS.STAKING),
        contracts.aig.allowance(address, CONTRACTS.STAKING)
      ]);

      return {
        usdtAllowance: ethers.utils.formatEther(usdtAllowance),
        aigAllowance: ethers.utils.formatEther(aigAllowance),
        needsUsdtApproval: usdtAllowance.lt(amountWei),
        needsAigApproval: aigAllowance.lt(aigAmountWei)
      };
    } catch (err) {
      console.error('Failed to check allowances:', err);
      return { usdtAllowance: '0', aigAllowance: '0', needsUsdtApproval: true, needsAigApproval: true };
    }
  }, [address, contracts.staking, contracts.usdt, contracts.aig]);

  // Approve tokens
  const approveTokens = useCallback(async (amount) => {
    if (!signer || !contracts.usdt || !contracts.aig) {
      throw new Error(i18n.t('error.walletNotConnected'));
    }

    setIsLoading(true);
    clearError();

    try {
      const amountWei = ethers.utils.parseUnits(amount.toString(), 18);
      const aigAmountWei = amountWei.div(10);

      // Approve USDT
      const usdtAllowance = await contracts.usdt.allowance(address, CONTRACTS.STAKING);
      if (usdtAllowance.lt(amountWei)) {
        const usdtTx = await contracts.usdt.approve(CONTRACTS.STAKING, ethers.constants.MaxUint256);
        await usdtTx.wait();
      }

      // Approve AIG
      const aigAllowance = await contracts.aig.allowance(address, CONTRACTS.STAKING);
      if (aigAllowance.lt(aigAmountWei)) {
        const aigTx = await contracts.aig.approve(CONTRACTS.STAKING, ethers.constants.MaxUint256);
        await aigTx.wait();
      }

      return true;
    } catch (err) {
      console.error('Approval failed:', err);
      setError(err.message || i18n.t('error.tokenApprovalFailed'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [signer, contracts.usdt, contracts.aig, address, clearError]);

  // Check if user is bound to referrer
  const checkBindStatus = useCallback(async () => {
    if (!address || !contracts.teamLevel) {
      return false;
    }

    try {
      return await contracts.teamLevel.isBindReferral(address);
    } catch (err) {
      console.error('Failed to check bind status:', err);
      return false;
    }
  }, [address, contracts.teamLevel]);

  // Stake with AIG
  const stakeWithAIG = useCallback(async (amount, stakeIndex) => {
    if (!signer || !contracts.staking) {
      throw new Error(i18n.t('error.walletNotConnected'));
    }

    setIsLoading(true);
    clearError();

    try {
      const amountWei = ethers.utils.parseUnits(amount.toString(), 18);
      
      // Check if user is bound
      const isBound = await checkBindStatus();
      
      let tx;
      if (isBound) {
        // User is bound, use regular staking
        tx = await contracts.staking.stakeWithAIG(amountWei, stakeIndex);
      } else {
        // User is not bound, need referrer - this should be handled by the caller
        throw new Error(i18n.t('error.newUserReferral'));
      }
      
      await tx.wait();
      return true;
    } catch (err) {
      console.error('Staking failed:', err);
      setError(err.message || i18n.t('error.stakeFailed'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [signer, contracts.staking, checkBindStatus, clearError]);

  // Stake with AIG and inviter
  const stakeWithAIGWithInviter = useCallback(async (amount, stakeIndex, inviter) => {
    if (!signer || !contracts.staking) {
      throw new Error(i18n.t('error.walletNotConnected'));
    }

    setIsLoading(true);
    clearError();

    try {
      const amountWei = ethers.utils.parseUnits(amount.toString(), 18);
      
      const tx = await contracts.staking.stakeWithAIGWithInviter(amountWei, stakeIndex, inviter);
      await tx.wait();
      
      return true;
    } catch (err) {
      console.error('Staking with inviter failed:', err);
      setError(err.message || i18n.t('error.stakeFailed'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [signer, contracts.staking, clearError]);

  // Unstake
  const unstake = useCallback(async (index) => {
    if (!signer || !contracts.staking) {
      throw new Error(i18n.t('error.walletNotConnected'));
    }

    setIsLoading(true);
    clearError();

    try {
      const tx = await contracts.staking.unstake(ethers.BigNumber.from(index));
      await tx.wait();
      return true;
    } catch (err) {
      console.error('Unstaking failed:', err);
      setError(err.message || i18n.t('error.unstakeFailed'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [signer, contracts.staking, clearError]);

  // Get user staking info
  const getUserStakeInfo = useCallback(async () => {
    if (!address || !contracts.staking) {
      return null;
    }

    try {
      const stakeInfo = await contracts.staking.userStakeInfos(address);
      return stakeInfo;
    } catch (err) {
      console.error('Failed to get user stake info:', err);
      return null;
    }
  }, [address, contracts.staking]);

  // Get hourly limits by type
  const getHourlyLimits = useCallback(async () => {
    if (!contracts.staking) {
      return [0, 0];
    }

    try {
      const [limit1Day, limit30Day] = await Promise.all([
        contracts.staking.getHourlyLimitByType(0),
        contracts.staking.getHourlyLimitByType(1)
      ]);

      return [
        Number(limit1Day.toString()),
        Number(limit30Day.toString())
      ];
    } catch (err) {
      console.error('Failed to get hourly limits:', err);
      return [0, 0];
    }
  }, [contracts.staking]);

  // Get remaining hourly limits
  const getRemainingHourlyLimits = useCallback(async () => {
    if (!contracts.staking) {
      return [0, 0];
    }

    try {
      const [remaining1Day, remaining30Day] = await Promise.all([
        contracts.staking.getRemainingHourlyLimitByType(0),
        contracts.staking.getRemainingHourlyLimitByType(1)
      ]);

      return [
        Number(remaining1Day.toString()),
        Number(remaining30Day.toString())
      ];
    } catch (err) {
      console.error('Failed to get remaining hourly limits:', err);
      return [0, 0];
    }
  }, [contracts.staking]);

  // Get user total staked
  const getUserTotalStaked = useCallback(async () => {
    if (!address || !contracts.staking) {
      return '0';
    }

    try {
      const totalStaked = await contracts.staking.userTotalStaked(address);
      return ethers.utils.formatEther(totalStaked);
    } catch (err) {
      console.error('Failed to get user total staked:', err);
      return '0';
    }
  }, [address, contracts.staking]);

  // Get reinvest tax info
  const getReinvestTaxInfo = useCallback(async () => {
    if (!address || !contracts.aigInsurance) {
      return {
        canClaim: false,
        amount: '0',
        unstakeAmount: '0',
        unstakeTime: '0'
      };
    }

    try {
      const taxInfo = await contracts.aigInsurance.getReinvestTaxInfo(address);
      return {
        canClaim: taxInfo.canClaim,
        amount: ethers.utils.formatEther(taxInfo.amount),
        unstakeAmount: ethers.utils.formatEther(taxInfo.unstakeAmount),
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
  }, [address, contracts.aigInsurance]);

  // Check if staking is started
  const checkStakingStarted = useCallback(async () => {
    if (!contracts.staking) {
      return false;
    }

    try {
      const startTime = await contracts.staking.startTime();
      const now = Math.floor(Date.now() / 1000);
      return Number(startTime.toString()) > 0 && Number(startTime.toString()) <= now;
    } catch (err) {
      console.error('Failed to check staking started:', err);
      return false;
    }
  }, [contracts.staking]);

  // Validate time restrictions (Beijing time)
  const validateTimeRestrictions = useCallback(() => {
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
  }, []);

  return {
    // State
    isLoading,
    error,
    contracts,
    
    // Actions
    clearError,
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
  };
};