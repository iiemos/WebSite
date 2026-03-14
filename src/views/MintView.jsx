import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import useStakeStore from '../stores/stakeStore';
import { useWalletIntegration } from '../hooks/useWalletIntegration';
import { useNotification, useWalletVerification } from '../App.jsx';
import { MOCK_ADDRESS, USE_STATIC_DATA } from '../config/mock.js';
import { DEFAULT_MINT_AMOUNT, MINT_FUEL_FEE_RLF, TICKET_OPTIONS } from '../config/ticketing.js';

function MintView() {
  useWalletIntegration();

  const { address: walletAddress, isConnected: walletConnected } = useAccount();
  const address = USE_STATIC_DATA ? MOCK_ADDRESS : walletAddress;
  const isConnected = USE_STATIC_DATA ? true : walletConnected;
  const { isVerified: walletVerified } = useWalletVerification();
  const isVerified = USE_STATIC_DATA ? true : walletVerified;
  const { addNotification } = useNotification();

  const {
    usdtBalance,
    loadingRecords,
    stakeList,
    ticketHoldings,
    ticketHoldingsInitialized,
    mintedTotalCount,
    mintedTodayCount,
    mintDayKey,
    dailyMintLimit,
    loadStakeData,
    initializeTicketHoldingsFromStakeList,
    consumeTicketHoldings,
    refreshMintCounterDay,
    increaseMintCount
  } = useStakeStore();

  const [selectedTicketIndex, setSelectedTicketIndex] = useState(0);
  const [mintAmount, setMintAmount] = useState(DEFAULT_MINT_AMOUNT);

  const normalizeMintAmount = (value) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) return;
    setMintAmount(Math.max(1, Math.floor(parsedValue)));
  };

  useEffect(() => {
    refreshMintCounterDay();
  }, [refreshMintCounterDay]);

  useEffect(() => {
    if (isConnected && isVerified) {
      loadStakeData();
    }
  }, [isConnected, isVerified, loadStakeData]);

  useEffect(() => {
    if (ticketHoldingsInitialized || loadingRecords) return;
    if (isConnected && isVerified && stakeList.length === 0) return;
    initializeTicketHoldingsFromStakeList(stakeList);
  }, [initializeTicketHoldingsFromStakeList, isConnected, isVerified, loadingRecords, stakeList, ticketHoldingsInitialized]);

  const effectiveMintedTodayCount = mintDayKey === new Date().toDateString() ? mintedTodayCount : 0;
  const totalMintableCount = ticketHoldings.reduce((sum, count) => sum + count, 0);
  const todayRemainingMintCount = Math.max(0, Math.min(totalMintableCount, dailyMintLimit - effectiveMintedTodayCount));
  const selectedTicket = TICKET_OPTIONS[selectedTicketIndex] || TICKET_OPTIONS[0];
  const selectedTicketHoldingCount = ticketHoldings[selectedTicketIndex] || 0;

  const handleMint = () => {
    refreshMintCounterDay();

    if (!isConnected || !address) {
      addNotification('error', '请先连接钱包');
      return;
    }

    if (!isVerified) {
      addNotification('error', '请先完成钱包签名验证');
      return;
    }

    if (selectedTicketHoldingCount < 1) {
      addNotification('error', '当前门票不足，无法铸造');
      return;
    }

    if (todayRemainingMintCount < 1) {
      addNotification('error', '今日铸造次数已用完');
      return;
    }

    if (mintAmount < 1) {
      addNotification('error', '请输入有效的铸造金额');
      return;
    }

    if (Number(usdtBalance || 0) < mintAmount) {
      addNotification('error', 'USDT 余额不足');
      return;
    }

    const consumed = consumeTicketHoldings(selectedTicketIndex, 1);
    if (!consumed) {
      addNotification('error', '门票扣减失败，请刷新后重试');
      return;
    }

    increaseMintCount(1);
    addNotification('success', `铸造已提交：${selectedTicket.name} 1张`);
  };

  return (
    <div className="dark:bg-background-dark font-display text-white min-h-screen">
      {/* 背景/网格保持原样 */}
      <div className="fixed inset-0 z-0 bg-grid opacity-50 pointer-events-none"></div>
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,59,237,0.1)_0%,transparent_50%)] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col lg:flex-row">
        <main className="max-w-[1440px] mx-auto w-full px-4 md:px-10 py-10 pt-18">
          <div className="mb-6">
            <h3 className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">铸造中心</h3>
            <p className="text-[#a692c8] text-sm">使用已购买门票进行铸造，查看次数与燃料需求。</p>
          </div>

          <div className="glass-panel neon-border-purple rounded-2xl px-6 lg:px-10 py-4 border-b border-[#312447] bg-background-dark/50 backdrop-blur-md mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-primary/60 bg-clip-text text-transparent">我的门票</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col items-center shrink-0 bg-primary/10 px-5 py-3 rounded-xl border border-primary/30 min-w-[140px]">
                  <p className="text-primary text-[10px] font-bold">可铸造总次数</p>
                  <p className="text-white font-black text-3xl">{totalMintableCount}</p>
                </div>
                <div className="flex flex-col items-center shrink-0 bg-[#1c152a] px-5 py-3 rounded-xl border border-[#312447] min-w-[140px]">
                  <p className="text-[#a692c8] text-[10px] font-bold">今日剩余次数</p>
                  <p className="text-white font-black text-3xl">{todayRemainingMintCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:grid lg:grid-cols-3 gap-8 items-start">
            <div className="glass-card rounded-2xl p-6 border-[#312447] mb-8 lg:mb-0">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Icon icon="mdi:ticket-outline" className="text-primary" />
                  选择铸造门票
                </h3>
              </div>
              <div className="flex flex-col gap-4">
                {TICKET_OPTIONS.map((ticket, index) => (
                  <button
                    key={ticket.name}
                    type="button"
                    onClick={() => setSelectedTicketIndex(index)}
                    className={`text-left bg-primary/10 rounded-2xl p-5 border transition-all ${
                      selectedTicketIndex === index
                        ? 'border-primary/200 bg-primary/100 neon-border-purple'
                        : 'border-[#312447] hover:border-primary/50'
                    }`}
                  >
                    <p className="text-xl font-black mb-1">{ticket.name}</p>
                    <p className="text-[#a692c8] text-sm mb-3">{ticket.desc}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#a692c8]">持有数量</span>
                      <span className={`font-bold ${selectedTicketIndex === index ? 'text-white' : 'text-primary'}`}>
                        {ticketHoldings[index] || 0} 张
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 border-[#312447] mb-8 lg:mb-0 lg:col-span-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Icon icon="mdi:anvil" className="text-primary" />
                  铸造模块
                </h3>
                <p className="text-[#a692c8] text-sm">
                  当前铸造门票：{selectedTicket.name}（剩余 {selectedTicketHoldingCount} 张）
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-[#110d1a] border border-[#312447] rounded-xl p-4">
                    <p className="text-[#a692c8] text-xs uppercase mb-3">铸造 - 我的门票列表</p>
                    <div className="space-y-2">
                      {TICKET_OPTIONS.map((ticket, index) => (
                        <div key={ticket.name} className="flex items-center justify-between text-sm">
                          <span className="text-white font-medium">{ticket.name}</span>
                          <span className="text-primary font-bold">{ticketHoldings[index] || 0} 张</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#110d1a] border border-[#312447] rounded-xl p-4">
                    <p className="text-[#a692c8] text-xs uppercase mb-3">铸造次数提示</p>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-[#a692c8]">可铸造总次数</span>
                      <span className="text-white font-bold">{totalMintableCount} 次</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#a692c8]">今日剩余次数</span>
                      <span className="text-white font-bold">{todayRemainingMintCount} / {dailyMintLimit} 次</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-[#a692c8]">累计已铸造</span>
                      <span className="text-white font-bold">{mintedTotalCount} 次</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#110d1a] border border-[#312447] rounded-xl p-4">
                    <p className="text-[#a692c8] text-xs uppercase mb-3">铸造金额输入</p>
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={mintAmount}
                        onChange={(e) => normalizeMintAmount(e.target.value)}
                        className="w-full bg-background-dark/50 border border-[#312447] rounded-lg px-3 py-2 text-white font-bold outline-none focus:border-primary"
                      />
                      <span className="text-white font-bold whitespace-nowrap">USDT</span>
                    </div>
                    <p className="text-[#a692c8] text-sm mt-2">余额：{parseFloat(usdtBalance || 0).toLocaleString()} USDT</p>
                  </div>

                  <div className="bg-[#110d1a] border border-[#312447] rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[#a692c8] text-xs uppercase">燃料费显示</p>
                        <p className="text-white font-bold mt-1">{MINT_FUEL_FEE_RLF} RLF</p>
                      </div>
                      <Link
                        to="/fuel-exchange"
                        className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-sm font-bold"
                      >
                        去兑换
                      </Link>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleMint}
                    disabled={!isConnected || selectedTicketHoldingCount < 1 || todayRemainingMintCount < 1}
                    className={`w-full py-4 font-black rounded-xl transition-all uppercase tracking-widest text-sm ${
                      !isConnected || selectedTicketHoldingCount < 1 || todayRemainingMintCount < 1
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-primary text-white glow-primary hover:opacity-90'
                    }`}
                  >
                    立即铸造
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default MintView;
