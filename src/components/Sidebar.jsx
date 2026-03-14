import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'

function Sidebar({ isOpen, onClose }) {
  const location = useLocation()
  const { t } = useTranslation()
  
  // 在首页不显示侧边栏
  if (location.pathname === '/') {
    return null
  }
  
  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 flex-col bg-[#110d1a] border-r border-[#312447] p-6 justify-between top-16 lg:top-16 transform transition-transform duration-300 ease-in-out lg:pt-24 lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between flex-col h-full">
        <nav className="flex flex-col gap-2 w-full size-6">
          <Link
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer ${
              location.pathname === '/' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-[#a692c8] hover:text-white'
            }`}
            to="/"
            onClick={onClose}
          >
            <Icon icon="mdi:home-lightning-bolt" className='text-2xl' />
            <p className="text-xl font-bold">{t('common.home')}</p>
          </Link>
          <Link
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer ${
              location.pathname === '/swap' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-[#a692c8] hover:text-white'
            }`}
            to="/swap"
            onClick={onClose}
          >
            <Icon icon="mdi:account-balance-wallet" className='text-2xl' />
            <p className="text-xl font-medium">{t('common.swap')}</p>
          </Link>
          <Link
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer ${
              location.pathname === '/stake' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-[#a692c8] hover:text-white'
            }`}
            to="/stake"
            onClick={onClose}
          >
            <Icon icon="mdi:gavel" className='text-2xl' />
            <p className="text-xl font-medium">{t('common.stake')}</p>
          </Link>
          <Link
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer ${
              location.pathname === '/mint' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-[#a692c8] hover:text-white'
            }`}
            to="/mint"
            onClick={onClose}
          >
            <Icon icon="mdi:anvil" className='text-2xl' />
            <p className="text-xl font-medium">铸造</p>
          </Link>
          <Link
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer ${
              location.pathname === '/fuel-exchange' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-[#a692c8] hover:text-white'
            }`}
            to="/fuel-exchange"
            onClick={onClose}
          >
            <Icon icon="mdi:gas-station-outline" className='text-2xl' />
            <p className="text-xl font-medium">燃料兑换</p>
          </Link>
          <Link
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer ${
              location.pathname === '/team' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-[#a692c8] hover:text-white'
            }`}
            to="/team"
            onClick={onClose}
          >
            <Icon icon="mdi:database" className='text-2xl' />
            <p className="text-xl font-medium">{t('common.team')}</p>
          </Link>
          <Link
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer ${
              location.pathname === '/mine' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-[#a692c8] hover:text-white'
            }`}
            to="/mine"
            onClick={onClose}
          >
            <Icon icon="mdi:settings" className='text-2xl' />
            <p className="text-xl font-medium">{t('common.mine')}</p>
          </Link>
        </nav>
      </div>
    </aside>
  )
}

export default Sidebar
