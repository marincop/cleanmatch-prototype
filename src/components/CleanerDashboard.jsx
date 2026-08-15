import React, { useState } from 'react';
import { Compass, ShieldCheck, MapPin, Camera, CheckCircle, AlertTriangle, AlertCircle, Cpu, Clock, Send, DollarSign, Sparkles } from 'lucide-react';
import { dbAPI } from '../utils/mockDatabase';

export default function CleanerDashboard({ db, setDb }) {
  // Current Active Cleaner Profile selection
  const [cleanerId, setCleanerId] = useState('c-bob');
  
  // Custom Bid Form States
  const [bidAmounts, setBidAmounts] = useState({}); // orderId -> bidAmount
  const [bidDurations, setBidDurations] = useState({}); // orderId -> hours
  const [bidNotes, setBidNotes] = useState({}); // orderId -> notes
  const [selectedStaffForOrder, setSelectedStaffForOrder] = useState({});

  // Simulating Cleaner Location offset (meters away from target)
  const [locationOffset, setLocationOffset] = useState(150); // slider in meters

  // Photo uploads mock list
  const mockImages = [
    { name: '廚房 (清潔前)', url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&auto=format&fit=crop&q=60' },
    { name: '廚房 (清潔後)', url: 'https://images.unsplash.com/photo-1556911220-115f0341a021?w=400&auto=format&fit=crop&q=60' },
    { name: '客廳 (清潔前)', url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400&auto=format&fit=crop&q=60' },
    { name: '客廳 (清潔後)', url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&auto=format&fit=crop&q=60' }
  ];
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [photoPhase, setPhotoPhase] = useState('BEFORE_CLEANING');
  const [areaTag, setAreaTag] = useState('KITCHEN');

  // Chatroom state
  const [chatOrderId, setChatOrderId] = useState(null);
  const [chatRecipientName, setChatRecipientName] = useState('');
  const [chatRecipientId, setChatRecipientId] = useState('');
  const [typedMessage, setTypedMessage] = useState('');

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeCleaner) return;
    
    const updated = dbAPI.sendChatMessage(db, {
      orderId: chatOrderId,
      senderId: activeCleaner.user_id,
      senderName: activeCleaner.name,
      message: typedMessage
    });
    setDb(updated);
    const sentMsg = typedMessage;
    setTypedMessage('');
    
    // Simulate auto-reply after 1.5s
    setTimeout(() => {
      const mockReply = "您好，我是案主！已收到您的訊息，謝謝！";
      const replyDB = dbAPI.sendChatMessage(updated, {
        orderId: chatOrderId,
        senderId: chatRecipientId,
        senderName: chatRecipientName,
        message: mockReply
      });
      setDb(replyDB);
    }, 1500);
  };

  const handleAbandonOrder = (orderId) => {
    if (confirm('確定要放棄此筆已接單的清潔委託嗎？系統將自動解除您的服務排程，將訂單退回搶單池重新進行媒合。')) {
      try {
        const updated = dbAPI.abandonOrder(db, orderId, cleanerId);
        setDb(updated);
        alert('已成功取消接單！該訂單已重新回到搶單池中。');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleSimulateTimeout = (orderId) => {
    try {
      const updated = dbAPI.simulate24HoursTimeout(db, orderId);
      setDb(updated);
      alert('已成功模擬接單後「24 小時無動作」！該訂單已自動釋放，重新上架回到即時搶單池中。');
    } catch (err) {
      alert(err.message);
    }
  };

  const activeCleaner = db.cleaner_profiles.find(c => c.id === cleanerId);

  // Handles claiming instant fixed price orders
  const handleClaim = (orderId, simulateConflict) => {
    try {
      const selectedStaff = selectedStaffForOrder[orderId];
      if (activeCleaner && activeCleaner.cleaner_type === 'AGENCY' && !selectedStaff) {
        alert('公司接單前，請先選定指派前往現場的施作服務人員！所有即時溝通將由經理統一處理。');
        return;
      }
      
      // Membership limit validation
      const isVip = activeCleaner?.membership_tier === 'VIP';
      const myActiveOrdersCount = db.orders.filter(o => o.cleaner_id === cleanerId && (o.status === 'ACCEPTED' || o.status === 'ASSIGNED')).length;
      if (!isVip && myActiveOrdersCount >= 1) {
        alert('搶單失敗：您目前是「普通會員」，一次最多只能承接 1 個未完工案件。\n\n請前往後台頂部點擊「升級 VIP 會員 (每月 NT$ 888)」即可解鎖一次接 10 個案子的權限！');
        return;
      }
      if (isVip && myActiveOrdersCount >= 10) {
        alert('搶單失敗：您已達到「VIP 會員」的承接上限（10 個未完工案件）。\n\n請先完成手頭現有的清潔服務，方可繼續接單！');
        return;
      }

      const updated = dbAPI.claimOrder(db, orderId, cleanerId, selectedStaff, simulateConflict);
      setDb(updated);
      alert('搶單與派工成功！此預約已加入公司服務排程。');
    } catch (err) {
      alert(err.message);
    }
  };

  // Handles submitting custom bids
  const handleBidSubmit = (e, orderId) => {
    e.preventDefault();
    const bidAmount = parseFloat(bidAmounts[orderId]);
    const duration = parseFloat(bidDurations[orderId]) || 3;
    const note = bidNotes[orderId] || '';

    if (!bidAmount || bidAmount <= 0) {
      alert('請輸入有效的報價金額');
      return;
    }

    try {
      const updated = dbAPI.submitBid(db, {
        orderId,
        cleanerId,
        bidAmount,
        proposedDurationHours: duration,
        notes: note
      });
      setDb(updated);
      
      // Clear forms
      setBidAmounts(prev => ({ ...prev, [orderId]: '' }));
      setBidDurations(prev => ({ ...prev, [orderId]: '' }));
      setBidNotes(prev => ({ ...prev, [orderId]: '' }));
      alert('報價單已成功發布！客戶接受後將通知您。');
    } catch (err) {
      alert(err.message);
    }
  };

  // Handles GPS location sign-in check
  const handleCheckIn = (orderId, addressGeo) => {
    // Generate simulated coordinates based on offsets
    // 0.000009 degrees is roughly 1 meter
    const offsetDegrees = (locationOffset / 1000) / 111; // simple flat conversion
    const simulatedLatLng = {
      lat: addressGeo.lat + offsetDegrees,
      lng: addressGeo.lng
    };

    try {
      const updated = dbAPI.checkIn(db, orderId, simulatedLatLng);
      setDb(updated);
      alert('電子打卡簽到成功！您已進入服務圍籬區，服務正式開始。');
    } catch (err) {
      alert(err.message);
    }
  };

  // Upload proof photo
  const handlePhotoUpload = (orderId) => {
    const photo = mockImages[selectedPhotoIndex];
    try {
      const updated = dbAPI.uploadPhoto(db, {
        orderId,
        phase: photoPhase,
        areaTag,
        photoUrl: photo.url
      });
      setDb(updated);
      alert(`[S3 直傳] 已成功上傳 ${areaTag} ${photoPhase === 'BEFORE_CLEANING' ? '施作前' : '施作後'} 照片。`);
    } catch (err) {
      alert(err.message);
    }
  };

  // Request final sign-off
  const handleRequestSignOff = (orderId) => {
    // Ensure cleaner uploaded at least one AFTER photo
    const afterPhotos = db.service_proof_photos.filter(p => p.order_id === orderId && p.photo_phase === 'AFTER_CLEANING');
    if (afterPhotos.length === 0) {
      alert('提報完工前，必須至少上傳一張「施作後」照片作為完工憑證！');
      return;
    }

    try {
      const updated = dbAPI.requestSignOff(db, orderId);
      setDb(updated);
      alert('完工審查已提交給客戶，等待客戶簽字確認中。');
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter orders
  const allClaimableOrders = db.orders.filter(o => o.booking_type === 'INSTANT_FIXED' && o.status === 'PENDING_MATCH');
  const isVip = activeCleaner?.membership_tier === 'VIP';
  const claimableOrders = isVip ? allClaimableOrders.slice(0, 30) : allClaimableOrders.slice(0, 5);
  const customRfqOrders = db.orders.filter(o => o.booking_type === 'CUSTOM_BIDDING' && o.status === 'PENDING_MATCH');
  const myAssignedOrders = db.orders.filter(o => o.cleaner_id === cleanerId);

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      
      {/* Cleaner Switcher Panel */}
      <section className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>當前服務人員身份：</span>
          <span style={{ fontWeight: 700, color: 'var(--accent-teal)' }}>{activeCleaner?.name}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '12px' }}>
            類型: {activeCleaner?.cleaner_type === 'INDIVIDUAL' ? '個體戶' : '清潔公司'} | 平均星等: ★{activeCleaner?.avg_rating} | 已完工件數: {activeCleaner?.total_orders_completed} 件
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setCleanerId('c-bob')} 
            className={`btn ${cleanerId === 'c-bob' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
          >
            切換為：陳小兵 (個體)
          </button>
          <button 
            onClick={() => setCleanerId('c-charlie')} 
            className={`btn ${cleanerId === 'c-charlie' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
          >
            切換為：王經理 (公司)
          </button>
        </div>
      </section>

      {/* Membership / VIP Subscription Panel */}
      <section className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ 
            background: activeCleaner?.membership_tier === 'VIP' ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'rgba(255,255,255,0.08)',
            color: activeCleaner?.membership_tier === 'VIP' ? '#000000' : 'var(--text-secondary)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontWeight: 800,
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: activeCleaner?.membership_tier === 'VIP' ? '0 0 10px rgba(245,158,11,0.4)' : 'none'
          }}>
            <Sparkles size={12} />
            {activeCleaner?.membership_tier === 'VIP' ? '👑 VIP 訂閱會員' : '👤 普通會員'}
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>
              {activeCleaner?.membership_tier === 'VIP' 
                ? '已解鎖 30 筆搶單案源看滿看飽！一次可承接至多 10 個清潔任務。' 
                : '普通會員限制：僅顯示搶單池前 5 筆案源，且一次僅能接 1 個案子。'}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {activeCleaner?.membership_tier === 'VIP' 
                ? 'VIP 訂閱狀態：每月自動扣款中 (月費 NT$ 888)' 
                : '升級 VIP 解鎖最多 30 筆最新案源並支持同時接 10 個案子。月費僅需 NT$ 888！'}
            </p>
          </div>
        </div>
        <div>
          {activeCleaner?.membership_tier === 'VIP' ? (
            <button 
              onClick={() => {
                if (confirm('確定要退訂 VIP 會員身分嗎？退訂後將回歸普通會員限制（一次接 1 案，僅顯示 5 筆案源）。')) {
                  const updated = dbAPI.downgradeToRegular(db, cleanerId);
                  setDb(updated);
                  alert('已成功取消 VIP 自動訂閱，重置為普通會員。');
                }
              }}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.8rem', width: 'auto', borderColor: '#f59e0b', color: '#f59e0b' }}
            >
              取消訂閱 VIP
            </button>
          ) : (
            <button 
              onClick={() => {
                if (confirm('確定要訂閱升級為 VIP 會員嗎？月費 NT$ 888，按確認將使用信用卡進行每月續訂扣款。')) {
                  const updated = dbAPI.upgradeToVIP(db, cleanerId);
                  setDb(updated);
                  alert('🎉 恭喜！升級成功！您已成功成為 VIP 會員，解鎖所有特權！');
                }
              }}
              className="btn btn-primary animate-pulse-glow"
              style={{ padding: '8px 16px', fontSize: '0.8rem', width: 'auto', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#000', border: 'none' }}
            >
              👑 升級 VIP 會員 (NT$ 888/月)
            </button>
          )}
        </div>
      </section>

      {/* Grid: 1. Claim Pool & Custom RFQs, 2. Assigned tasks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        
        {/* Left: Claim pool */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Instant orders claiming */}
          <section className="glass-panel glass-panel-glow-indigo" style={{ padding: '20px', flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-indigo)' }}>
              <Cpu size={16} />
              標準單即時搶單池 (Concurrency protected)
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              一般居家標準定價清潔，先搶先得。系統在搶單 API 處設計了 Redis 分散式鎖，防止兩個人在同一毫秒預約同一訂單。
            </p>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', borderRadius: '4px', padding: '8px 12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: isVip ? '#fbbf24' : 'var(--text-secondary)', fontWeight: 600 }}>
                {isVip ? '👑 VIP 會員權限：已解鎖最多 30 筆案源' : '👤 普通會員權限：僅顯示前 5 筆案源'} 
                (當前搶單池內共有 {allClaimableOrders.length} 筆)
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                進行中接單：{db.orders.filter(o => o.cleaner_id === cleanerId && (o.status === 'ACCEPTED' || o.status === 'ASSIGNED')).length} / {isVip ? '10' : '1'} 案
              </span>
            </div>

            {claimableOrders.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                目前搶單池中暫無可接訂單。
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {claimableOrders.map(order => {
                  const addr = db.customer_addresses.find(a => a.id === order.address_id);
                  return (
                    <div key={order.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{order.order_no}</span>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>坪數：{order.space_size_ping} 坪 | 時間：{new Date(order.scheduled_start_at).toLocaleString()}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <MapPin size={10} /> {addr?.city}{addr?.district}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent-teal)' }}>NT$ {order.total_amount.toLocaleString()}</span>
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>扣除抽佣預計實領 NT$ {order.cleaner_payout.toLocaleString()}</p>
                        </div>
                      </div>

                      {activeCleaner && activeCleaner.cleaner_type === 'AGENCY' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', marginBottom: '4px' }}>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>指派現場施作服務員</label>
                          <select 
                            required
                            value={selectedStaffForOrder[order.id] || ''} 
                            onChange={e => setSelectedStaffForOrder({...selectedStaffForOrder, [order.id]: e.target.value})}
                            style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: '#ffffff', fontSize: '0.75rem', outline: 'none', width: '100%' }}
                          >
                            <option value="" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>-- 選擇派駐現場服務員 --</option>
                            {db.agency_staff.filter(s => s.agency_id === activeCleaner.id).map(s => {
                              const u = db.users.find(usr => usr.id === s.staff_user_id);
                              return <option key={s.id} value={u?.id} style={{ background: 'var(--bg-secondary)', color: '#fff' }}>{u ? u.name : '現場施作者'}</option>;
                            })}
                          </select>
                        </div>
                      )}

                      {/* Claim Button Matrix */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button onClick={() => handleClaim(order.id, false)} className="btn btn-primary" style={{ flex: 1, padding: '6px 0', fontSize: '0.75rem', justifyContent: 'center' }}>
                          直接搶單
                        </button>
                        <button onClick={() => handleClaim(order.id, true)} className="btn btn-secondary" style={{ flex: 1, padding: '6px 0', fontSize: '0.75rem', justifyContent: 'center', borderColor: 'var(--accent-pink)', color: 'var(--accent-pink)' }}>
                          模擬併發衝突 (409)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Custom RFQs bidding pool */}
          <section className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Compass size={16} />
              專案競標估價池 (Office / Deep Clean)
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              大型商辦或空屋裝潢後細清委託案，需向客戶提交報價與工時方案。
            </p>

            {customRfqOrders.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                目前暫無競標案。
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {customRfqOrders.map(order => {
                  const addr = db.customer_addresses.find(a => a.id === order.address_id);
                  const isSubmitted = db.quotation_bids.some(b => b.order_id === order.id && b.cleaner_id === cleanerId);
                  
                  return (
                    <div key={order.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{order.order_no}</span>
                            {isSubmitted && <span className="badge badge-completed" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>已報價</span>}
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>坪數：{order.space_size_ping} 坪 | 項目：{order.service_type === 'OFFICE' ? '辦公室清潔' : '空屋細清'}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <MapPin size={10} /> {addr?.city}{addr?.district}
                          </p>
                        </div>
                      </div>

                      {/* Bid Submission form */}
                      {!isSubmitted ? (
                        <form onSubmit={(e) => handleBidSubmit(e, order.id)} style={{ marginTop: '12px', display: 'grid', gap: '8px', gridTemplateColumns: '1fr 1fr', background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.02)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>報價金額 (NT$)</label>
                            <input 
                              type="number" required placeholder="例如: 6500"
                              value={bidAmounts[order.id] || ''}
                              onChange={e => setBidAmounts({...bidAmounts, [order.id]: e.target.value})}
                              style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: '3px', color: '#fff', fontSize: '0.75rem', outline: 'none' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>預估工時 (小時)</label>
                            <input 
                              type="number" step="0.5" required placeholder="例如: 4.5"
                              value={bidDurations[order.id] || ''}
                              onChange={e => setBidDurations({...bidDurations, [order.id]: e.target.value})}
                              style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: '3px', color: '#fff', fontSize: '0.75rem', outline: 'none' }}
                            />
                          </div>
                          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>工務方案備註</label>
                            <input 
                              type="text" placeholder="例如: 派任兩位人員含洗地機具"
                              value={bidNotes[order.id] || ''}
                              onChange={e => setBidNotes({...bidNotes, [order.id]: e.target.value})}
                              style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: '3px', color: '#fff', fontSize: '0.75rem', outline: 'none' }}
                            />
                          </div>
                          <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1', padding: '6px 0', fontSize: '0.75rem', justifyContent: 'center', marginTop: '4px' }}>
                            送出專案報價
                          </button>
                        </form>
                      ) : (
                        <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', padding: '6px 10px', borderRadius: '3px' }}>
                          您的報價方案已提交，請靜待案主審核。
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right: Assigned Task Sheet */}
        <section className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={16} />
            我的服務排程委託 ({myAssignedOrders.length})
          </h3>

          {myAssignedOrders.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', flex: 1 }}>
              目前您尚未接到任何清潔委託案。請於左側搶單池或報價池承接。
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px', flex: 1 }}>
              {myAssignedOrders.map(order => {
                const addr = db.customer_addresses.find(a => a.id === order.address_id);
                const orderPhotos = db.service_proof_photos.filter(p => p.order_id === order.id);
                
                return (
                  <div key={order.id} className="glass-panel" style={{ padding: '14px', background: 'rgba(0,0,0,0.15)', borderLeft: `3px solid var(--status-${order.status.toLowerCase()})` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{order.order_no}</span>
                      <span className={`badge badge-${order.status.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>{order.status}</span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <p>服務類別：{order.service_type === 'HOME_GENERAL' ? '一般居家清潔' : order.service_type === 'DEEP_CLEAN' ? '深層大掃除' : order.service_type === 'OFFICE' ? '商辦定期清潔' : '空屋裝潢細清'}</p>
                      <p style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><MapPin size={10} /> {addr?.city}{addr?.district}{addr?.street_address}</p>
                      <p style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Clock size={10} /> 預定開工：{new Date(order.scheduled_start_at).toLocaleString()}</p>
                      <p style={{ fontWeight: 700, color: '#fff', marginTop: '2px' }}>實撥報酬: NT$ {order.cleaner_payout.toLocaleString()} (平台費已扣)</p>
                      
                      {(() => {
                        const customer = db.users.find(u => u.id === order.customer_id);
                        const isFemale = customer ? (/麗|艾|美|怡|婷|雅|玲|芳|娟|敏|秀|君|雯|婷/.test(customer.name) || customer.name.toLowerCase().includes('alice')) : false;
                        const customerTitle = customer ? `${customer.name.charAt(0)}${isFemale ? '小姐' : '先生'}` : '案主';
                        return (
                          <div style={{ marginTop: '6px', background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.72rem' }}>
                            <p style={{ fontWeight: 700, color: 'var(--accent-teal)' }}>💬 案主聯絡資訊 (限內建聊天室)</p>
                            <p style={{ marginTop: '2px' }}>聯絡人：{customerTitle}</p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Cleaner Actions: Chat, Cancel, Timeout Simulation */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => {
                          const customer = db.users.find(u => u.id === order.customer_id);
                          setChatOrderId(order.id);
                          setChatRecipientId(customer?.id || '');
                          setChatRecipientName(customer ? `${customer.name.charAt(0)}${/麗|艾|美|怡|婷|雅|玲|芳|娟|敏|秀|君|雯|婷/.test(customer.name) || customer.name.toLowerCase().includes('alice') ? '小姐' : '先生'}` : '案主');
                        }}
                        className="btn btn-secondary animate-pulse-glow" 
                        style={{ padding: '6px 10px', fontSize: '0.72rem', flex: 1, justifyContent: 'center' }}
                      >
                        💬 聊天室
                      </button>
                      
                      {order.status === 'ACCEPTED' && (
                        <>
                          <button 
                            onClick={() => handleAbandonOrder(order.id)}
                            className="btn btn-danger" 
                            style={{ padding: '6px 10px', fontSize: '0.72rem', flex: 1, justifyContent: 'center' }}
                          >
                            放棄接單
                          </button>
                          
                          <button 
                            onClick={() => handleSimulateTimeout(order.id)}
                            className="btn btn-accent animate-pulse-glow" 
                            style={{ padding: '6px 10px', fontSize: '0.72rem', width: '100%', justifyContent: 'center', marginTop: '4px' }}
                            title="模擬接單後 24 小時內無任何打卡簽到動作，系統自動將其釋放回到搶單池。"
                          >
                            ⏳ 模擬 24H 無動作自動釋放
                          </button>
                        </>
                      )}
                    </div>

                    {/* Active task processing helper */}

                    {/* Step A: ACCEPTED -> GPS checkin fence */}
                    {order.status === 'ACCEPTED' && (
                      <div style={{ marginTop: '12px', background: 'rgba(6,182,212,0.05)', borderRadius: '4px', padding: '10px', border: '1px solid rgba(6,182,212,0.2)' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-teal)', marginBottom: '6px' }}>電子圍籬與打卡簽到 (PostGIS 空間檢索驗證)</p>
                        
                        {/* Location simulator slider */}
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                            <span>模擬您與目的地距離:</span>
                            <span style={{ fontWeight: 700, color: locationOffset <= 200 ? 'var(--status-completed)' : 'var(--status-disputed)' }}>
                              {locationOffset} 公尺 {locationOffset <= 200 ? '(圍籬內)' : '(超出圍籬限制 >200m)'}
                            </span>
                          </div>
                          <input 
                            type="range" min="0" max="1000" value={locationOffset}
                            onChange={e => setLocationOffset(parseInt(e.target.value))}
                            style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', outline: 'none', appearance: 'none', borderRadius: '2px', marginTop: '4px' }}
                          />
                        </div>

                        <button 
                          onClick={() => handleCheckIn(order.id, addr.geo_location)} 
                          className="btn btn-primary" 
                          style={{ width: '100%', padding: '6px 0', fontSize: '0.75rem', justifyContent: 'center' }}
                        >
                          簽到打卡開始工作
                        </button>
                      </div>
                    )}

                    {/* Step B: IN_PROGRESS -> Upload proof photos */}
                    {order.status === 'IN_PROGRESS' && (
                      <div style={{ marginTop: '12px', background: 'rgba(139,92,246,0.05)', borderRadius: '4px', padding: '10px', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-indigo)', marginBottom: '8px' }}>上傳施作實拍照存證 (S3直傳 Presigned URL)</p>
                        
                        {/* Selector grid */}
                        <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: '1fr 1fr', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>施作階段</span>
                            <select value={photoPhase} onChange={e => setPhotoPhase(e.target.value)} style={{ padding: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '3px', color: '#fff', fontSize: '0.7rem' }}>
                              <option value="BEFORE_CLEANING">施作前 (Before)</option>
                              <option value="AFTER_CLEANING">施作後 (After)</option>
                            </select>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>清潔區域標籤</span>
                            <select value={areaTag} onChange={e => setAreaTag(e.target.value)} style={{ padding: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '3px', color: '#fff', fontSize: '0.7rem' }}>
                              <option value="KITCHEN">廚房防區 (Kitchen)</option>
                              <option value="LIVING_ROOM">客廳大廳 (Living Room)</option>
                              <option value="BATHROOM">衛浴浴廁 (Bathroom)</option>
                            </select>
                          </div>
                        </div>

                        {/* Image picker simulator */}
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>選擇欲上傳的照片(模擬)</span>
                          <select value={selectedPhotoIndex} onChange={e => setSelectedPhotoIndex(parseInt(e.target.value))} style={{ width: '100%', padding: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '3px', color: '#fff', fontSize: '0.7rem', marginTop: '2px' }}>
                            {mockImages.map((img, i) => (
                              <option key={i} value={i}>{img.name}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handlePhotoUpload(order.id)} className="btn btn-secondary" style={{ flex: 1, padding: '6px 0', fontSize: '0.7rem', justifyContent: 'center' }}>
                            <Camera size={12} /> 上傳單張相片
                          </button>
                          
                          <button onClick={() => handleRequestSignOff(order.id)} className="btn btn-primary" style={{ flex: 1, padding: '6px 0', fontSize: '0.7rem', justifyContent: 'center' }}>
                            提交完工審核
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step C: Uploaded Photos display */}
                    {orderPhotos.length > 0 && (
                      <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>已存證照片 ({orderPhotos.length} 張):</span>
                        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginTop: '4px' }}>
                          {orderPhotos.map(p => (
                            <div key={p.id} style={{ position: 'relative', width: '55px', height: '40px', borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--border-light)', flexShrink: 0 }}>
                              <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step D: Disputed warning */}
                    {order.status === 'DISPUTED' && (
                      <div style={{ marginTop: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', padding: '10px', borderRadius: '4px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <AlertTriangle size={14} style={{ color: 'var(--status-disputed)', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444' }}>此訂單已被發起爭議</p>
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>案主申訴原因："{db.logs.find(l => l.message.includes('爭議流程') && l.message.includes(order.order_no))?.message.split('原因：')[1]?.slice(0, -1) || '施作瑕疵'}"。平台管理員將會審核驗退方案。</p>
                        </div>
                      </div>
                    )}

                    {/* Step E: Settled message */}
                    {order.status === 'SETTLED' && (
                      <div style={{ marginTop: '10px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', padding: '8px', borderRadius: '4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <CheckCircle size={12} style={{ color: 'var(--status-completed)' }} />
                        <span style={{ fontSize: '0.65rem', color: 'var(--status-completed)' }}>服務已完成扣款結案，撥款金額已入您的電子錢包！</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* Chatroom Modal */}
      {chatOrderId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', height: '500px', display: 'flex', flexDirection: 'column', padding: '16px', position: 'relative' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} style={{ color: 'var(--accent-teal)' }} />
                  內建即時聊天室 (媒合期限制)
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>與 {chatRecipientName} 溝通中</p>
              </div>
              <button 
                onClick={() => setChatOrderId(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>
            
            {/* Messages box */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px', marginBottom: '12px' }}>
              {(db.chat_messages || [])
                .filter(m => m.order_id === chatOrderId)
                .map(m => {
                  const isMe = m.sender_id === (activeCleaner ? activeCleaner.user_id : '');
                  return (
                    <div key={m.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: isMe ? 'right' : 'left', marginBottom: '2px' }}>
                        {m.sender_name}
                      </div>
                      <div style={{ 
                        padding: '8px 12px', 
                        borderRadius: '12px', 
                        background: isMe ? 'var(--accent-teal)' : 'rgba(255,255,255,0.08)', 
                        color: '#ffffff', 
                        fontSize: '0.8rem',
                        lineHeight: 1.4
                      }}>
                        {m.message}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: isMe ? 'right' : 'left', marginTop: '2px' }}>
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
              {(db.chat_messages || []).filter(m => m.order_id === chatOrderId).length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '40px' }}>
                  💬 目前無對話紀錄。發案與媒合期間僅能使用內建聊天室溝通。
                </div>
              )}
            </div>
            
            {/* Quick Messages */}
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', marginBottom: '8px', paddingBottom: '4px' }}>
              {["你好，已收到您的要求！", "請問還有其他需要加強的地方嗎？", "我已經出發，預計準時抵達！"].map((quickMsg, idx) => (
                <button 
                  key={idx}
                  onClick={() => setTypedMessage(quickMsg)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '4px 10px', fontSize: '0.65rem', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {quickMsg}
                </button>
              ))}
            </div>
            
            {/* Input field */}
            <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="輸入訊息..." 
                value={typedMessage} 
                onChange={e => setTypedMessage(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem', width: 'auto' }}>
                傳送
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
