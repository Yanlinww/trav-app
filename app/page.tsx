'use client';

import React, { useState } from 'react';
import { FaRobot, FaUtensils, FaCompass, FaShieldAlt, FaRoute, FaThList } from 'react-icons/fa';

// 模擬數據
const FEATURED_PLANS = [
  { id: 1, title: '京都週末放空計畫', tags: ['文化深度', '安靜'], image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=300', category: 'hidden' },
  { id: 2, title: '花東海岸單身騎行', tags: ['戶外探索', '療癒'], image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300', category: 'recommended' },
  { id: 3, title: '東京一人極致拉麵巡禮', tags: ['美食', '一人食'], image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=300', category: 'food' },
];

export default function Home() {
  const [aiQuery, setAiQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: '全部項目', icon: <FaThList /> },
    { id: 'food', label: '一人食', icon: <FaUtensils /> },
    { id: 'hidden', label: '隱藏點', icon: <FaCompass /> },
    { id: 'safety', label: '安全區', icon: <FaShieldAlt /> },
    { id: 'recommended', label: '推薦行程', icon: <FaRoute /> },
  ];

  const filteredPlans = activeCategory === 'all' 
    ? FEATURED_PLANS 
    : FEATURED_PLANS.filter(plan => plan.category === activeCategory);

  return (
    <div style={styles.container}>
      {/* 1. AI 行程顧問 */}
      <header style={styles.header}>
        <div style={styles.aiSearchBox}>
          <FaRobot style={styles.aiIcon} />
          <input
            type="text"
            placeholder="AI 顧問：你想去哪裡？或想找什麼感覺？"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </header>

      {/* 2. 景點地圖模式 (已刪除目前定位標籤) */}
      <section style={styles.mapSection}>
        <div style={styles.mapMockup}>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 'auto' }}>
            [ 地圖預覽區 - 未來嵌入 Google Maps API ]
          </p>
        </div>
      </section>

      {/* 3. 精選主題企劃 */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>編輯推薦企劃</h3>
        <div style={styles.horizontalScroll}>
          {filteredPlans.length > 0 ? (
            filteredPlans.map(plan => (
              <div key={plan.id} style={styles.planCard}>
                <img src={plan.image} alt={plan.title} style={styles.planImage} />
                <div style={styles.planInfo}>
                  <h4 style={styles.planTitle}>{plan.title}</h4>
                  <div style={styles.tagContainer}>
                    {plan.tags.map(tag => (
                      <span key={tag} style={styles.tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: '#94a3b8', fontSize: '14px', padding: '10px' }}>該分類目前暫無推薦內容</p>
          )}
        </div>
      </section>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { fontFamily: 'sans-serif' },
  header: { padding: '15px 20px 10px', backgroundColor: '#fff' },
  aiSearchBox: { display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '12px 16px', borderRadius: '30px', border: '1px solid #e2e8f0' },
  aiIcon: { color: '#3b82f6', fontSize: '20px', marginRight: '12px' },
  searchInput: { border: 'none', backgroundColor: 'transparent', outline: 'none', width: '100%', fontSize: '15px' },
  mapSection: { padding: '10px 20px' },
  mapMockup: { height: '220px', backgroundColor: '#e2e8f0', borderRadius: '16px', position: 'relative', backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px', display: 'flex', padding: '12px' },
  section: { padding: '20px' },
  sectionTitle: { fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b' },
  horizontalScroll: { display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '10px' },
  planCard: { minWidth: '240px', backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  planImage: { width: '100%', height: '120px', objectFit: 'cover' },
  planInfo: { padding: '12px' },
  planTitle: { margin: '0 0 8px 0', fontSize: '15px', color: '#334155' },
  tagContainer: { display: 'flex', gap: '8px' },
  tag: { fontSize: '11px', color: '#3b82f6', backgroundColor: '#eff6ff', padding: '4px 8px', borderRadius: '8px' }
};