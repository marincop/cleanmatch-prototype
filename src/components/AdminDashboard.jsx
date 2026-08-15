import React from 'react';
import { ShieldCheck, TrendingUp, DollarSign, Users, Star, Award, Map, CheckCircle2, XCircle } from 'lucide-react';
import { dbAPI } from '../utils/mockDatabase';

export default function AdminDashboard({ db, setDb }) {
  // Statistics Calculations
  const activeOrders = db.orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'DRAFT');
  const totalGMV = activeOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  
  const settledOrders = db.orders.filter(o => o.status === 'SETTLED');
  const platformRevenue = settledOrders.reduce((sum, o) => sum + parseFloat(o.platform_fee || 0), 0);
  const cleanerPayouts = settledOrders.reduce((sum, o) => sum + parseFloat(o.cleaner_payout || 0), 0);
  
  const avgRating = db.reviews.length > 0
    ? (db.reviews.reduce((sum, r) => sum + r.rating, 0) / db.reviews.length).toFixed(1)
    : '5.0';

  const disputedOrders = db.orders.filter(o => o.status === 'DISPUTED');

  const handleArbitration = (orderId, decision) => {
    try {
      const updated = dbAPI.adminArbitrate(db, orderId, decision);
      setDb(updated);
      alert(decision === 'RELEASE_PAYMENT' ? '裁決完成：款項已核撥給服務商，訂單結案。' : '裁決完成：預授權額度已刷退並釋放，案主退款成功。');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      
      {/* 1. Analytics Cards Row */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        
        {/* GMV */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(99,102,241,0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', color: 'var(--accent-indigo)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>平台成交總額 (GMV)</p>
            <p style={{ fontSize: '1.3rem', fontWeight: 700 }}>NT$ {totalGMV.toLocaleString()}</p>
          </div>
        </div>

        {/* Platform Revenue */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(6,182,212,0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', color: 'var(--accent-teal)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>平台抽佣營收 (15%)</p>
            <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-teal)' }}>NT$ {platformRevenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Payouts */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(16,185,129,0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', color: 'var(--status-completed)' }}>
            <Award size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>已撥款服務商總計</p>
            <p style={{ fontSize: '1.3rem', fontWeight: 700 }}>NT$ {cleanerPayouts.toLocaleString()}</p>
          </div>
        </div>

        {/* Active Users */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(245,158,11,0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', color: 'var(--status-pending)' }}>
            <Users size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>平台登錄會員</p>
            <p style={{ fontSize: '1.3rem', fontWeight: 700 }}>{db.users.length} 名 (★{avgRating})</p>
          </div>
        </div>

      </section>

      {/* 2. Dispute Arbitration Panel */}
      <section className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '14px', color: 'var(--accent-pink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={18} />
          爭議仲裁調解中心 ({disputedOrders.length})
        </h3>
        
        {disputedOrders.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
            當前平台暫無任何申訴中之爭議訂單。交易環境安全穩定。
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '20px' }}>
            {disputedOrders.map(order => {
              const customer = db.users.find(u => u.id === order.customer_id);
              const cleaner = db.cleaner_profiles.find(c => c.id === order.cleaner_id);
              const photos = db.service_proof_photos.filter(p => p.order_id === order.id);
              
              // Get dispute log for reasons
              const disputeLog = db.logs.find(l => l.message.includes('爭議投訴') && l.message.includes(order.order_no));
              const disputeReason = disputeLog ? disputeLog.message.split('原因：')[1] || '未詳述' : '未詳述';

              return (
                <div key={order.id} style={{ border: '1px solid rgba(239,68,68,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>訂單案號: {order.order_no}</span>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        申訴委託人: {customer?.name} ({customer?.phone}) | 被申訴服務商: {cleaner?.name}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#ff7878', fontWeight: 600, marginTop: '8px' }}>
                        客戶申訴理由: "{disputeReason}"
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-pink)' }}>NT$ {order.total_amount.toLocaleString()}</span>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>平台佣金 NT$ {order.platform_fee}</p>
                    </div>
                  </div>

                  {/* Proof Photos Audit */}
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>上傳之相片證物審核 ({photos.length} 張)：</p>
                    {photos.length === 0 ? (
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>清潔人員未上傳相片憑證。</p>
                    ) : (
                      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {photos.map(p => (
                          <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ width: '150px', height: '110px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                              <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                              [{p.photo_phase === 'BEFORE_CLEANING' ? '施作前' : '施作後'}] - {p.area_tag}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Arbitration Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => handleArbitration(order.id, 'RELEASE_PAYMENT')} 
                      className="btn btn-primary" 
                      style={{ padding: '8px 16px', fontSize: '0.75rem', background: 'linear-gradient(135deg, var(--status-completed), #059669)' }}
                    >
                      <CheckCircle2 size={14} /> 裁決駁回客訴：撥款給清潔員
                    </button>
                    <button 
                      onClick={() => handleArbitration(order.id, 'REFUND')} 
                      className="btn btn-danger" 
                      style={{ padding: '8px 16px', fontSize: '0.75rem' }}
                    >
                      <XCircle size={14} /> 裁決客訴成立：全額退刷客戶
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. PostGIS Location Map visualizer */}
      <section className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Map size={18} />
          Taichung PostGIS 地理分佈與電子圍籬監控
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          以台中市西區公益路為中心，圖形化展示資料庫中 PostGIS Geometry (Point, 4326) 的經緯度點位關係與圍籬感應區域。
        </p>

        {/* Visual Map Grid Canvas */}
        <div style={{ height: '300px', background: 'rgba(0,0,0,0.4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', position: 'relative', overflow: 'hidden' }}>
          
          {/* Coordinates grid lines */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '1px', background: 'rgba(255,255,255,0.03)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', background: 'rgba(255,255,255,0.03)' }} />
          
          {/* Grid scales */}
          <span style={{ position: 'absolute', bottom: '6px', left: '10px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>經度 (LNG) 120.6450 ~ 120.6650</span>
          <span style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.65rem', color: 'var(--text-muted)', writingMode: 'vertical-rl' }}>緯度 (LAT) 24.1450 ~ 24.1650</span>
          
          {/* Legend */}
          <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-light)', display: 'grid', gap: '4px', fontSize: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-teal)' }} />
              <span>案主地址 (Alice Home/Office)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-indigo)' }} />
              <span>清潔人員 (Bob / Charlie)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(6,182,212,0.1)', border: '1px dashed var(--accent-teal)' }} />
              <span>空間簽到圍籬 (200m)</span>
            </div>
          </div>

          {/* PLOTTED GEOMETRY POINTS */}

          {/* 1. Address 1: Alice Home (24.1512, 120.6521) */}
          <div style={{ position: 'absolute', top: '69%', left: '35.5%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
            {/* Geofence 200m circle */}
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '1px dashed var(--accent-teal)', background: 'rgba(6,182,212,0.08)', position: 'absolute', transform: 'translate(0, 4px)', zIndex: 1 }} />
            
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-teal)', boxShadow: '0 0 8px var(--accent-teal)', position: 'relative', zIndex: 2 }} />
            <span style={{ fontSize: '0.65rem', background: '#000', padding: '2px 4px', borderRadius: '3px', marginTop: '2px', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap', zIndex: 2 }}>Alice 居家 (公益路)</span>
          </div>

          {/* 2. Address 2: Alice Office (24.1585, 120.6482) */}
          <div style={{ position: 'absolute', top: '32.5%', left: '16%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '1px dashed var(--accent-teal)', background: 'rgba(6,182,212,0.08)', position: 'absolute', transform: 'translate(0, 4px)', zIndex: 1 }} />
            
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-teal)', boxShadow: '0 0 8px var(--accent-teal)', position: 'relative', zIndex: 2 }} />
            <span style={{ fontSize: '0.65rem', background: '#000', padding: '2px 4px', borderRadius: '3px', marginTop: '2px', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap', zIndex: 2 }}>Alice 辦公室 (大墩路)</span>
          </div>

          {/* 3. Cleaner 1: Bob (24.1500, 120.6500) */}
          <div style={{ position: 'absolute', top: '75%', left: '25%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-indigo)', boxShadow: '0 0 8px var(--accent-indigo)' }} />
            <span style={{ fontSize: '0.65rem', background: '#000', padding: '2px 4px', borderRadius: '3px', marginTop: '2px', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}>清潔員 Bob (★4.8)</span>
          </div>

          {/* 4. Cleaner 2: Charlie (24.1620, 120.6650) */}
          <div style={{ position: 'absolute', top: '15%', left: '85%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-indigo)', boxShadow: '0 0 8px var(--accent-indigo)' }} />
            <span style={{ fontSize: '0.65rem', background: '#000', padding: '2px 4px', borderRadius: '3px', marginTop: '2px', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}>潔淨公司 Charlie</span>
          </div>

        </div>
      </section>
      
    </div>
  );
}
