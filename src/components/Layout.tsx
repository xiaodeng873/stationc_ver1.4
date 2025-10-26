import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Users, FileText, BarChart3, Menu, X, Home, Stethoscope, Heart, LogOut, User, CalendarCheck, CheckSquare, Utensils, BookOpen, Shield, Printer, Building2, Settings, ChevronFirst as FirstAid, Guitar as Hospital, Pill } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  user: SupabaseUser;
  onSignOut: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onSignOut }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { displayName } = useAuth();
  const location = useLocation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // 阻止背景滾動，允許導航區滾動
  useEffect(() => {
    const preventScroll = (e: TouchEvent) => {
      const target = e.target as Node;

      // 檢查是否在導航滾動區域內
      if (navRef.current && navRef.current.contains(target)) {
        const navElement = navRef.current;
        const { scrollTop, scrollHeight, clientHeight } = navElement;

        // 計算滾動方向
        const touchY = e.touches[0].clientY;
        const deltaY = touchY - (navElement as any).lastTouchY;
        (navElement as any).lastTouchY = touchY;

        // 在頂部且向下滾動，或在底部且向上滾動時，允許滾動
        const isAtTop = scrollTop === 0;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

        if ((isAtTop && deltaY > 0) || (isAtBottom && deltaY < 0)) {
          // 在邊界處，也允許滾動（不阻止橡皮筋效果）
          return;
        }

        // 在可滾動範圍內，允許滾動
        return;
      }

      // 不在導航區域，阻止滾動
      e.preventDefault();
    };

    const preventTouchStart = (e: TouchEvent) => {
      if (navRef.current && navRef.current.contains(e.target as Node)) {
        (navRef.current as any).lastTouchY = e.touches[0].clientY;
      }
    };

    if (sidebarOpen) {
      // 鎖定 body
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      // 監聽觸控事件
      document.addEventListener('touchstart', preventTouchStart, { passive: true });
      document.addEventListener('touchmove', preventScroll, { passive: false });
    } else {
      // 恢復 body
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);

      document.removeEventListener('touchstart', preventTouchStart);
      document.removeEventListener('touchmove', preventScroll);
    }

    return () => {
      document.removeEventListener('touchstart', preventTouchStart);
      document.removeEventListener('touchmove', preventScroll);
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // 香港時區輔助函數
  const getHongKongDate = () => {
    const now = new Date();
    // 使用 toLocaleString 直接獲取香港時區的時間
    const hongKongTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Hong_Kong"}));
    return hongKongTime;
  };

  const navigation = [
    { name: '主面板', href: '/', icon: Home },
    { name: '院友列表', href: '/patients', icon: Users },
    { name: '床位管理', href: '/station-bed', icon: Building2 },
    { name: 'VMO排程', href: '/scheduling', icon: Calendar },
    { name: '覆診管理', href: '/follow-up', icon: CalendarCheck },
    { name: '監測記錄', href: '/health', icon: Heart },
    { name: '健康評估', href: '/health-assessments', icon: Stethoscope },
    { name: '餐膳指引', href: '/meal-guidance', icon: Utensils },
    { name: '院友日誌', href: '/patient-logs', icon: BookOpen },
    { name: '約束物品', href: '/restraint', icon: Shield },
    { name: '出入院記錄', href: '/admission-records', icon: Hospital },
    { name: '傷口管理', href: '/wound', icon: Heart },
    { name: '處方管理', href: '/prescriptions', icon: Pill },
    { name: '藥物資料庫', href: '/drug-database', icon: Pill },
    { name: '藥物工作流程', href: '/medication-workflow', icon: CheckSquare },
    { name: '職員工作面板', href: '/staff-work-panel', icon: Users },
    { name: '醫院外展', href: '/hospital-outreach', icon: Hospital },
    { name: '範本管理', href: '/templates', icon: FileText },
    { name: '列印表格', href: '/print-forms', icon: Printer },
    { name: '任務管理', href: '/tasks', icon: CheckSquare },
    { name: '報表查詢', href: '/reports', icon: BarChart3 },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
      >
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed inset-y-0 left-0 w-64 bg-white flex flex-col">
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Stethoscope className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">StationC</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div
            ref={navRef}
            className="overflow-y-scroll px-4 py-6 flex-1"
            style={{
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              maxHeight: 'calc(100vh - 64px)',
              minHeight: 0
            }}
          >
            <div className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-50 text-blue-700'
                       : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
            <div style={{ height: '100px' }}></div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 transition-all duration-300 ${
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
      }`}>
        <div className="flex flex-col flex-1 bg-white border-r border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <Stethoscope className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">StationC</span>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              title={sidebarCollapsed ? '展開選單' : '收起選單'}
            >
              {sidebarCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
            </button>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'space-x-3 px-3'} py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700'
                     : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <div className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {getHongKongDate().toLocaleDateString('zh-TW', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </span>
            
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <User className="w-5 h-5" />
                <span className="text-sm">{displayName || user.email}</span>
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      console.log('Logout clicked'); // Debug log
                      onSignOut();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>登出</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;