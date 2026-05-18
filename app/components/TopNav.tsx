import React from 'react';
import { FaCompass, FaCalendarAlt, FaBriefcase, FaComments, FaUser } from 'react-icons/fa';

export type TabType = 'explore' | 'trips' | 'toolkit' | 'community' | 'profile';

interface TopNavProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TopNav: React.FC<TopNavProps> = ({ currentTab, onTabChange }) => {
  const navItems = [
    { id: 'explore' as TabType, label: '探索', icon: <FaCompass /> },
    { id: 'trips' as TabType, label: '計畫', icon: <FaCalendarAlt /> },
    { id: 'toolkit' as TabType, label: '工具', icon: <FaBriefcase /> },
    { id: 'community' as TabType, label: '討論區', icon: <FaComments /> },
    { id: 'profile' as TabType, label: '我的', icon: <FaUser /> },
  ];

  return (
    <nav style={styles.navBar}>
      <div style={styles.navContainer}>
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={{
                ...styles.tabButton,
                color: isActive ? '#fb923c' : '#94a3b8',
                borderBottom: isActive ? '3px solid #fb923c' : '3px solid transparent', // 增加頂部頁籤感
              }}
            >
              <div style={styles.iconWrapper}>
                {item.icon}
              </div>
              <span style={{ 
                ...styles.label, 
                fontWeight: isActive ? 'bold' : 'normal',
                color: isActive ? '#fb923c' : '#64748b'
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  navBar: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
  },
  navContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '50px', // 縮減高度使其放在頂部時更精緻
    maxWidth: '600px',
    margin: '0 auto',
  },
  tabButton: {
    background: 'none',
    border: 'none',
    display: 'flex',
    flexDirection: 'row', // 圖示與文字橫向排列，節省頂部垂直空間
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    cursor: 'pointer',
    gap: '6px',
    transition: 'all 0.15s ease',
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '16px',
  },
  label: {
    fontSize: '13px',
  },
};

export default TopNav;