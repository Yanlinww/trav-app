import React from 'react';
import { FaBars, FaBell } from 'react-icons/fa';

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  onNotificationClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  title = "獨旅達人", 
  onMenuClick, 
  onNotificationClick 
}) => {
  return (
    <header style={styles.header}>
      {/* 左側：漢堡選單按鈕 */}
      <button onClick={onMenuClick} style={styles.iconButton} aria-label="選單">
        <FaBars style={styles.icon} />
      </button>

      {/* 中間：APP 標題 Logo */}
      <div style={styles.titleContainer}>
        <h1 style={styles.title}>{title}</h1>
      </div>

      {/* 右側：通知中心與頭像 */}
      <div style={styles.rightContainer}>
        <button onClick={onNotificationClick} style={styles.iconButton} aria-label="通知">
          <div style={styles.badgeContainer}>
            <FaBell style={styles.icon} />
            {/* 模擬未讀通知紅點 */}
            <span style={styles.badge}></span>
          </div>
        </button>
        
        {/* 個人微型頭像 */}
        <div style={styles.avatar}>
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100" 
            alt="User Avatar" 
            style={styles.avatarImg}
          />
        </div>
      </div>
    </header>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '64px',
    padding: '0 16px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  iconButton: {
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '50%',
    transition: 'background-color 0.2s',
  },
  icon: {
    color: '#334155',
    fontSize: '20px',
  },
  titleContainer: {
    flex: 1,
    textAlign: 'center',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#0f172a',
    margin: 0,
    letterSpacing: '0.5px',
  },
  rightContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badgeContainer: {
    position: 'relative',
    display: 'inline-block',
  },
  badge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    width: '8px',
    height: '8px',
    backgroundColor: '#ef4444', // 紅點提醒
    borderRadius: '50%',
    border: '1px solid #fff',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '2px solid #fb923c', // 核心橘色外圈
    marginLeft: '4px',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  }
};

export default Header;