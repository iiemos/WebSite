import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { useAccount } from 'wagmi';
import { useTranslation } from 'react-i18next';
import useStakeStore from '../stores/stakeStore';
import { useNotification, useWalletVerification } from '../App.jsx';
import { MOCK_ADDRESS, USE_STATIC_DATA } from '../config/mock.js';

function FuelExchangeView() {
  const { address: walletAddress, isConnected: walletConnected } = useAccount();
  const address = USE_STATIC_DATA ? MOCK_ADDRESS : walletAddress;
  const isConnected = USE_STATIC_DATA ? true : walletConnected;
  const { isVerified: walletVerified } = useWalletVerification();
  const isVerified = USE_STATIC_DATA ? true : walletVerified;
  const { addNotification } = useNotification();
  const { t } = useTranslation();
  const { usdtBalance, loadStakeData } = useStakeStore();

  const [mode, setMode] = useState('instant');
  const [amount, setAmount] = useState('10');
  const rlfBalance = 1240.5;

  useEffect(() => {
    if (isConnected && isVerified) {
      loadStakeData();
    }
  }, [isConnected, isVerified, loadStakeData]);

  const normalizedAmount = useMemo(() => {
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
  }, [amount]);

  const currentUsdtBalance = Number.parseFloat(usdtBalance || '0');
  const equivalentUsdt = normalizedAmount.toFixed(2);
  const processingFee = 0;

  const handleExchange = () => {
    if (!isConnected || !address) {
      addNotification('error', t('fuelExchange.errorConnectWallet'));
      return;
    }
    if (!isVerified) {
      addNotification('error', t('fuelExchange.errorVerifyWallet'));
      return;
    }
    if (normalizedAmount <= 0) {
      addNotification('error', t('fuelExchange.errorInvalidAmount'));
      return;
    }
    if (normalizedAmount > rlfBalance) {
      addNotification('error', t('fuelExchange.errorInsufficientRlf'));
      return;
    }

    const modeLabel = mode === 'instant' ? t('fuelExchange.instant') : t('fuelExchange.delayed');
    addNotification('success', t('fuelExchange.submitSuccess', { mode: modeLabel, amount: normalizedAmount.toFixed(2) }));
  };

  return (
    <div className="dark:bg-background-dark font-display text-white min-h-screen">
      {/* 背景/网格保持原样 */}
      <div className="fixed inset-0 z-0 bg-grid opacity-50 pointer-events-none"></div>
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,59,237,0.1)_0%,transparent_50%)] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col lg:flex-row">
        <main className="max-w-[1440px] mx-auto w-full px-4 md:px-10 py-10 pt-18">
          <div className="mb-6">
            <h3 className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">{t('fuelExchange.title')}</h3>
            <p className="text-[#a692c8] text-sm">{t('fuelExchange.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <section className="xl:col-span-2 glass-card rounded-2xl p-6 border-[#312447] relative overflow-hidden">
              <div className="absolute -top-20 -right-20 size-48 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 size-48 bg-accent-blue/10 blur-3xl rounded-full pointer-events-none" />

              <div className="relative space-y-6">
                <div className="inline-flex rounded-xl border border-[#312447] bg-background-dark/60 p-1">
                  <button
                    type="button"
                    onClick={() => setMode('instant')}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors ${
                      mode === 'instant' ? 'bg-primary text-white glow-primary' : 'text-[#a692c8] hover:text-white'
                    }`}
                  >
                    {t('fuelExchange.instant')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('delayed')}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors ${
                      mode === 'delayed' ? 'bg-primary text-white glow-primary' : 'text-[#a692c8] hover:text-white'
                    }`}
                  >
                    {t('fuelExchange.delayed')}
                  </button>
                </div>

                <div className="bg-[#110d1a] border border-[#312447] rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <p className="text-[#a692c8] text-xs uppercase">{t('fuelExchange.amountLabel')}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2 py-1 rounded bg-primary/10 text-primary">
                        {t('fuelExchange.rlfBalance', {
                          balance: rlfBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        })}
                      </span>
                      <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400">
                        {t('fuelExchange.usdtBalance', {
                          balance: currentUsdtBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex h-[50px] items-center rounded-xl border border-[#312447] bg-background-dark/50 px-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                            className="w-full bg-transparent text-2xl md:text-3xl font-black text-white outline-none"
                            placeholder="0.00"
                          />
                          <span className="text-white font-bold">RLF</span>
                        </div>
                      </div>

                      <div className="inline-flex h-[50px] shrink-0 items-center gap-2 px-4 rounded-xl bg-primary/10 border border-primary/30">
                        <span className="size-7 rounded-full bg-primary/20 flex items-center justify-center">
                          <Icon icon="mdi:lightning-bolt" className="text-primary" />
                        </span>
                        <span className="text-white font-bold">{t('fuelExchange.fuel')}</span>
                      </div>
                    </div>
                    <p className="text-[#a692c8] text-sm">≈ {equivalentUsdt} USDT</p>
                  </div>
                </div>

                <div className="bg-[#110d1a] border border-[#312447] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#a692c8]">{t('fuelExchange.exchangeRate')}</span>
                    <strong className="text-white">{t('fuelExchange.exchangeRateValue')}</strong>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#a692c8]">{t('fuelExchange.processingFee')}</span>
                    <strong className="text-emerald-400">{processingFee.toFixed(2)} USDT</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExchange}
                  className="w-full py-4 font-black rounded-xl transition-all uppercase tracking-widest text-sm bg-primary text-white glow-primary hover:opacity-90"
                >
                  {mode === 'instant' ? t('fuelExchange.submitInstant') : t('fuelExchange.submitDelayed')}
                </button>

                <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
                  <Icon icon="mdi:clock-outline" className="text-primary mt-0.5" />
                  <p className="text-sm text-[#d4c5f5]">
                    {t('fuelExchange.delayedNote')}
                  </p>
                </div>
              </div>
            </section>

            <aside className="glass-panel rounded-2xl p-6 border-[#312447] h-fit">
              <div className="flex items-center gap-2 mb-4">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-sm text-[#a692c8]">{t('fuelExchange.status')}</p>
              </div>

              <div className="rounded-xl border border-[#312447] bg-[#110d1a] p-4 mb-4">
                <p className="text-xs text-[#a692c8] mb-1">{t('fuelExchange.nextBatch')}</p>
                <p className="text-white font-bold text-lg">{t('fuelExchange.nextBatchTime')}</p>
                <p className="text-[#a692c8] text-xs mt-1">{t('fuelExchange.estimatedDelivery')}</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-xl border border-[#312447] bg-[#110d1a] p-3 flex items-center gap-2 text-sm">
                  <Icon icon="mdi:shield-check-outline" className="text-primary" />
                  <span className="text-white">{t('fuelExchange.secureProtocol')}</span>
                </div>
                <div className="rounded-xl border border-[#312447] bg-[#110d1a] p-3 flex items-center gap-2 text-sm">
                  <Icon icon="mdi:rocket-launch-outline" className="text-primary" />
                  <span className="text-white">{t('fuelExchange.autoAirdrop')}</span>
                </div>
                <div className="rounded-xl border border-[#312447] bg-[#110d1a] p-3 flex items-center gap-2 text-sm">
                  <Icon icon="mdi:lan-connect" className="text-primary" />
                  <span className="text-white">{t('fuelExchange.multiChainSync')}</span>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

export default FuelExchangeView;
