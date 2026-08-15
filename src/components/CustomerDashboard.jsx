import React, { useState } from 'react';
import { MapPin, Calendar, Compass, ShieldAlert, Award, Star, ArrowRight, DollarSign, Clock, Sparkles, Plus, Check } from 'lucide-react';
import { dbAPI } from '../utils/mockDatabase';

export default function CustomerDashboard({ db, setDb, activeUser }) {
  // Booking Form State
  const [addressId, setAddressId] = useState(db.customer_addresses[0]?.id || '');
  const [bookingType, setBookingType] = useState('INSTANT_FIXED'); // 'INSTANT_FIXED' or 'CUSTOM_BIDDING'
  const [serviceType, setServiceType] = useState('HOME_GENERAL');
  const [spaceSize, setSpaceSize] = useState(25);
  const [scheduledAt, setScheduledAt] = useState('2026-08-20T09:00');
  const [customBudget, setCustomBudget] = useState(2000);
  const [otherRequirements, setOtherRequirements] = useState('');
  
  // Custom Booking Add-ons
  const [addOns, setAddOns] = useState({
    hoodClean: false,
    balconyClean: false,
    windowClean: false
  });

  // Dispute state
  const [disputeOrderId, setDisputeOrderId] = useState(null);
  const [disputeComment, setDisputeComment] = useState('');

  // Review State
  const [reviewOrderId, setReviewOrderId] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Signature Mock URL
  const [signatureData, setSignatureData] = useState('https://images.unsplash.com/photo-1517842645767-c639042777db?w=150&auto=format&fit=crop&q=60'); // simple placeholder signature image link

  // Modify/Cancel states & handlers
  const [modifyOrderTarget, setModifyOrderTarget] = useState(null);
  const [editAddressId, setEditAddressId] = useState('');
  const [editSpaceSize, setEditSpaceSize] = useState(25);
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [editCustomBudget, setEditCustomBudget] = useState(2000);
  const [editOtherRequirements, setEditOtherRequirements] = useState('');

  // Chatroom state
  const [chatOrderId, setChatOrderId] = useState(null);
  const [chatRecipientName, setChatRecipientName] = useState('');
  const [chatRecipientId, setChatRecipientId] = useState('');
  const [typedMessage, setTypedMessage] = useState('');

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;
    
    const updated = dbAPI.sendChatMessage(db, {
      orderId: chatOrderId,
      senderId: activeUser.id,
      senderName: activeUser.name,
      message: typedMessage
    });
    setDb(updated);
    const sentMsg = typedMessage;
    setTypedMessage('');
    
    // Simulate auto-reply after 1.5s
    setTimeout(() => {
      const mockReply = "您好！已收到您的訊息，我會在預約時間準時抵達並備妥清潔用具，謝謝！";
      const replyDB = dbAPI.sendChatMessage(updated, {
        orderId: chatOrderId,
        senderId: chatRecipientId,
        senderName: chatRecipientName,
        message: mockReply
      });
      setDb(replyDB);
    }, 1500);
  };

  const handleCancelOrder = (orderId) => {
    if (confirm('確定要取消並刪除此筆打掃委託嗎？系統將自動向綠界支付發送取消通知，釋放您的信用卡預授權額度。')) {
      try {
        const updated = dbAPI.cancelOrder(db, orderId);
        setDb(updated);
        alert('委託已成功取消！');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleOpenModifyModal = (order) => {
    setModifyOrderTarget(order);
    setEditAddressId(order.address_id);
    setEditSpaceSize(order.space_size_ping);
    const localTime = new Date(order.scheduled_start_at).toISOString().slice(0, 16);
    setEditScheduledAt(localTime);
    setEditCustomBudget(order.total_amount);
    setEditOtherRequirements(order.notes || '');
  };

  const handleModifySubmit = (e) => {
    e.preventDefault();
    try {
      const updated = dbAPI.modifyOrder(db, modifyOrderTarget.id, {
        addressId: editAddressId,
        spaceSize: editSpaceSize,
        scheduledAt: editScheduledAt,
        customBudget: editCustomBudget,
        notes: editOtherRequirements
      });
      setDb(updated);
      setModifyOrderTarget(null);
      alert('委託內容已成功修改！已同步更新綠界預授權金額與資料庫定位。');
    } catch (err) {
      alert(err.message);
    }
  };

  // Calculation for instant fixed pricing
  const basePricePerPing = serviceType === 'DEEP_CLEAN' ? 120 : 80;
  const areaPrice = spaceSize * basePricePerPing;
  let items = [
    { item_name: `${serviceType === 'DEEP_CLEAN' ? '深層清潔施作' : '一般居家標準清潔'} (${spaceSize} 坪)`, quantity: 1, unit_price: areaPrice }
  ];
  
  if (addOns.hoodClean) items.push({ item_name: '抽油煙機深層拆洗', quantity: 1, unit_price: 1500 });
  if (addOns.balconyClean) items.push({ item_name: '陽台落地窗及地板清洗', quantity: 1, unit_price: 1000 });
  if (addOns.windowClean) items.push({ item_name: '全屋玻璃窗內側擦拭', quantity: 1, unit_price: 800 });

  const totalAmount = items.reduce((sum, i) => sum + i.unit_price, 0);

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    try {
      const finalItems = [
        { 
          item_name: `${serviceType === 'DEEP_CLEAN' ? '深層清潔施作' : '一般居家標準清潔'} (${spaceSize} 坪)` + 
            (addOns.hoodClean || addOns.balconyClean || addOns.windowClean ? ' [細部工項需求]' : ''), 
          quantity: 1, 
          unit_price: customBudget 
        }
      ];

      const updated = dbAPI.createOrder(db, {
        customerId: activeUser.id,
        addressId,
        bookingType,
        serviceType,
        spaceSizePing: spaceSize,
        scheduledStartAt: new Date(scheduledAt).toISOString(),
        items: bookingType === 'CUSTOM_BIDDING' ? [
          { item_name: `客製專案估價：${serviceType === 'OFFICE' ? '商辦大樓清潔' : '空屋/裝潢細清'} (${spaceSize} 坪)`, quantity: 1, unit_price: 0 }
        ] : finalItems,
        estimatedHours: spaceSize * 0.1 + (bookingType === 'CUSTOM_BIDDING' ? 3 : 1.5),
        notes: otherRequirements
      });
      setDb(updated);
      
      // Reset form options
      setAddOns({ hoodClean: false, balconyClean: false, windowClean: false });
      setOtherRequirements('');
      alert(bookingType === 'INSTANT_FIXED' ? '標準清潔預約成功！信用卡額度已預授權凍結。' : '客製招標發布成功！已通知服務商進行估價。');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAcceptBid = (orderId, bidId) => {
    try {
      const updated = dbAPI.acceptBid(db, orderId, bidId);
      setDb(updated);
      alert('已成功接受此報價，系統已凍結您的信用卡額度！');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSignOff = (orderId) => {
    try {
      const updated = dbAPI.approveOrder(db, orderId, signatureData);
      setDb(updated);
      alert('驗收完成！系統已完成信用卡扣款並撥款予服務人員。感謝您的使用！');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFileDispute = (e) => {
    e.preventDefault();
    if (!disputeComment.trim()) return;
    try {
      const updated = dbAPI.disputeOrder(db, disputeOrderId, disputeComment);
      setDb(updated);
      setDisputeOrderId(null);
      setDisputeComment('');
      alert('爭議投訴已送交平台客服，款項已暫停撥發並進入託管凍結。');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    try {
      const order = db.orders.find(o => o.id === reviewOrderId);
      const updated = dbAPI.submitReview(db, {
        orderId: reviewOrderId,
        reviewerId: activeUser.id,
        revieweeId: order.cleaner_id === 'c-bob' ? 'u-2' : 'u-3', // Maps cleaner profile back to user
        rating,
        comment: reviewComment
      });
      setDb(updated);
      setReviewOrderId(null);
      setReviewComment('');
      alert('感謝您的評價！這對提升服務品質很有幫助。');
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter orders for active user (Alice)
  const myOrders = db.orders.filter(o => o.customer_id === activeUser.id);

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      
      {/* 1. Booking Form Panel */}
      <section className="glass-panel glass-panel-glow-teal" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '20px', background: 'linear-gradient(135deg, var(--accent-teal), #ffffff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={22} style={{ color: 'var(--accent-teal)' }} />
          發起清潔媒合預約
        </h2>
        
        <form onSubmit={handleBookingSubmit} className="booking-form">
          
          {/* Address selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>選擇服務地址</label>
            <select 
              value={addressId} 
              onChange={e => setAddressId(e.target.value)}
              style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: '#ffffff', outline: 'none' }}
            >
              {db.customer_addresses.map(addr => (
                <option key={addr.id} value={addr.id} style={{ background: 'var(--bg-secondary)' }}>
                  [{addr.category === 'RESIDENTIAL' ? '居家' : '商辦'}] {addr.city}{addr.district}{addr.street_address}
                </option>
              ))}
            </select>
          </div>

          {/* Booking Type select */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>預約機制模式</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                onClick={() => { setBookingType('INSTANT_FIXED'); setServiceType('HOME_GENERAL'); }}
                className={`btn ${bookingType === 'INSTANT_FIXED' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '10px 5px', fontSize: '0.8rem' }}
              >
                標準定價搶單
              </button>
              <button 
                type="button" 
                onClick={() => { setBookingType('CUSTOM_BIDDING'); setServiceType('OFFICE'); }}
                className={`btn ${bookingType === 'CUSTOM_BIDDING' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '10px 5px', fontSize: '0.8rem' }}
              >
                專案競標估價
              </button>
            </div>
          </div>

          {/* Service type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>服務項目類別</label>
            <select
              value={serviceType}
              onChange={e => setServiceType(e.target.value)}
              style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: '#ffffff', outline: 'none' }}
            >
              {bookingType === 'INSTANT_FIXED' ? (
                <>
                  <option value="HOME_GENERAL" style={{ background: 'var(--bg-secondary)' }}>一般居家標準清潔</option>
                  <option value="DEEP_CLEAN" style={{ background: 'var(--bg-secondary)' }}>全屋深層大掃除</option>
                </>
              ) : (
                <>
                  <option value="OFFICE" style={{ background: 'var(--bg-secondary)' }}>辦公室定期清潔維護</option>
                  <option value="MOVE_IN_OUT" style={{ background: 'var(--bg-secondary)' }}>空屋裝潢細部清潔</option>
                </>
              )}
            </select>
          </div>

          {/* Space size and Time */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>房屋坪數 ({spaceSize} 坪)</label>
            <input 
              type="range" min="5" max="150" value={spaceSize} 
              onChange={e => setSpaceSize(parseInt(e.target.value))}
              style={{ height: '6px', background: 'rgba(255,255,255,0.1)', outline: 'none', appearance: 'none', borderRadius: '3px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>預定開工時間</label>
            <input 
              type="datetime-local" value={scheduledAt} 
              onChange={e => setScheduledAt(e.target.value)}
              style={{ padding: '9px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: '#ffffff', outline: 'none' }}
            />
          </div>

          {bookingType === 'INSTANT_FIXED' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>設定委託預算 (NT$)</label>
              <input 
                type="number" 
                required 
                min="100"
                value={customBudget} 
                onChange={e => setCustomBudget(parseInt(e.target.value) || 0)}
                style={{ padding: '9px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: '#ffffff', outline: 'none' }}
              />
            </div>
          )}

          {/* If INSTANT_FIXED: show add-ons & live quote */}
          {bookingType === 'INSTANT_FIXED' && (
            <div style={{ gridColumn: '1 / -1', marginTop: '8px', borderTop: '1px dashed var(--border-light)', paddingTop: '16px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>細部工項需求 (選填)</p>
              <div className="booking-addons">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={addOns.hoodClean} onChange={e => setAddOns({...addOns, hoodClean: e.target.checked})} />
                  抽油煙機拆洗
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={addOns.balconyClean} onChange={e => setAddOns({...addOns, balconyClean: e.target.checked})} />
                  陽台細洗
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={addOns.windowClean} onChange={e => setAddOns({...addOns, windowClean: e.target.checked})} />
                  窗戶內側擦拭
                </label>
              </div>
            </div>
          )}

          {/* Custom Requirements Notes */}
          <div style={{ gridColumn: '1 / -1', marginTop: '8px', borderTop: '1px dashed var(--border-light)', paddingTop: '16px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>其他客製需求說明 (選填)</label>
            <textarea
              placeholder="請填寫其他清潔備註 (例如：家中有養寵物、加強廚房除油垢、需要配合倒垃圾...)"
              value={otherRequirements}
              onChange={e => setOtherRequirements(e.target.value)}
              style={{ width: '100%', height: '80px', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: '#ffffff', outline: 'none', resize: 'vertical', fontSize: '0.85rem' }}
            />
          </div>

          {/* Pricing Panel / Footer */}
          <div className="booking-footer">
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {bookingType === 'INSTANT_FIXED' ? '綠界/信用卡預授權代管交易' : '專案競價 (成交後才授權信用卡額度)'}
              </p>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-teal)' }}>
                {bookingType === 'INSTANT_FIXED' ? `委託預算: NT$ ${customBudget.toLocaleString()}` : '等待服務商線上報價'}
              </p>
            </div>
            
            <button type="submit" className="btn btn-primary">
              確認送出，發送媒合單
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </section>

      {/* 2. Active Orders Checklist */}
      <section className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          我的委託訂單 ({myOrders.length})
        </h2>

        {myOrders.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-md)' }}>
            目前暫無任何委託案。請使用上方表單建立清潔預約。
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {myOrders.map(order => {
              const address = db.customer_addresses.find(a => a.id === order.address_id);
              const cleaner = db.cleaner_profiles.find(c => c.id === order.cleaner_id);
              const bids = db.quotation_bids.filter(b => b.order_id === order.id);
              const photos = db.service_proof_photos.filter(p => p.order_id === order.id);
              
              return (
                <div key={order.id} className="glass-panel" style={{ padding: '16px', borderLeft: `4px solid var(--status-${order.status.toLowerCase()})` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>{order.order_no}</span>
                        <span className={`badge badge-${order.status.toLowerCase()}`}>{order.status}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        服務項目：{order.service_type === 'HOME_GENERAL' ? '一般居家清潔' : order.service_type === 'DEEP_CLEAN' ? '深層大掃除' : order.service_type === 'OFFICE' ? '商辦大樓清潔' : '空屋裝潢細清'} ({order.space_size_ping} 坪)
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <MapPin size={12} /> {address?.city}{address?.district}{address?.street_address}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Calendar size={12} /> 預計開工：{new Date(order.scheduled_start_at).toLocaleString()} (預估約 {order.estimated_duration_hours} 小時)
                      </p>
                      {order.notes && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--accent-teal)', marginTop: '6px', background: 'rgba(6,182,212,0.05)', padding: '6px 10px', borderRadius: '4px', border: '1px solid rgba(6,182,212,0.1)', display: 'inline-block' }}>
                          📝 需求說明：{order.notes}
                        </p>
                      )}
                      
                      {cleaner && (
                        <div style={{ marginTop: '8px', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '3px', maxWidth: '320px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent-teal)' }}>
                            {cleaner.cleaner_type === 'AGENCY' ? '🏢 服務清潔公司 (統一由經理協調)' : '🧹 服務清潔員聯絡方式'}
                          </span>
                          <span>名稱：{cleaner.name} (★{cleaner.avg_rating})</span>
                          {cleaner.cleaner_type === 'AGENCY' && (
                            <span style={{ color: 'var(--accent-teal)', fontWeight: 600, marginTop: '2px', background: 'rgba(20,184,166,0.05)', padding: '4px 6px', borderRadius: '3px' }}>
                              👤 現場指派施作服務員：
                              {(() => {
                                const staffUser = db.users.find(u => u.id === order.assigned_staff_id);
                                return staffUser ? staffUser.name : '派遣中';
                              })()}
                            </span>
                          )}
                          <span>聯絡信箱：{db.users.find(u => u.id === cleaner.user_id)?.email || '未提供'}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>實付金額 (託管中)</p>
                      <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                        {order.total_amount > 0 ? `NT$ ${order.total_amount.toLocaleString()}` : '待議價'}
                      </p>
                      {cleaner && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--accent-teal)', marginTop: '4px' }}>
                          指派人員: {cleaner.name} (★{cleaner.avg_rating})
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions for modifying or cancelling order */}
                  {(order.status === 'PENDING_MATCH' || order.status === 'ACCEPTED' || order.status === 'ASSIGNED') && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', marginBottom: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', flexWrap: 'wrap' }}>
                      {cleaner && (
                        <button 
                          onClick={() => {
                            setChatOrderId(order.id);
                            setChatRecipientId(cleaner.user_id);
                            setChatRecipientName(cleaner.name);
                          }}
                          className="btn btn-secondary animate-pulse-glow" 
                          style={{ padding: '6px 12px', fontSize: '0.75rem', width: 'auto' }}
                        >
                          💬 開啟內建聊天室
                        </button>
                      )}
                      {order.status === 'PENDING_MATCH' && (
                        <button 
                          onClick={() => handleOpenModifyModal(order)}
                          className="btn btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '0.75rem', width: 'auto' }}
                        >
                          修改委託內容
                        </button>
                      )}
                      <button 
                        onClick={() => handleCancelOrder(order.id)}
                        className="btn btn-danger" 
                        style={{ padding: '6px 12px', fontSize: '0.75rem', width: 'auto' }}
                      >
                        取消/刪除委託
                      </button>
                    </div>
                  )}

                  {/* 2a. Display Bids for Custom Bidding order if status is PENDING_MATCH */}
                  {order.booking_type === 'CUSTOM_BIDDING' && order.status === 'PENDING_MATCH' && (
                    <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', padding: '12px', border: '1px solid var(--border-light)' }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-indigo)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Compass size={14} /> 服務商報價回應 (共 {bids.length} 筆)
                      </p>
                      {bids.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>等待服務商評估並遞送報價單中...</p>
                      ) : (
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {bids.map(bid => {
                            const bidCleaner = db.cleaner_profiles.find(c => c.id === bid.cleaner_id);
                            return (
                              <div key={bid.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                                <div>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{bidCleaner?.name}</span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>平均評分：★{bidCleaner?.avg_rating}</span>
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>報價工時：{bid.proposed_duration_hours} 小時 | 說明: "{bid.notes}"</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-teal)' }}>NT$ {bid.bid_amount.toLocaleString()}</span>
                                  <button 
                                    onClick={() => {
                                      setChatOrderId(order.id);
                                      setChatRecipientId(bidCleaner.user_id);
                                      setChatRecipientName(bidCleaner.name);
                                    }} 
                                    className="btn btn-secondary" 
                                    style={{ padding: '6px 12px', fontSize: '0.75rem', width: 'auto' }}
                                  >
                                    💬 線上聊聊
                                  </button>
                                  <button onClick={() => handleAcceptBid(order.id, bid.id)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem', width: 'auto' }}>
                                    接受報價
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2b. Display Uploaded Photos for checking before/after proof */}
                  {photos.length > 0 && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>現場施作相片存證</p>
                      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {photos.map(p => (
                          <div key={p.id} style={{ position: 'relative', width: '120px', height: '90px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-light)', flexShrink: 0 }}>
                            <img src={p.photo_url} alt={p.area_tag} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', fontSize: '0.65rem', color: '#fff', textAlign: 'center', padding: '2px 0' }}>
                              [{p.photo_phase === 'BEFORE_CLEANING' ? '前' : '後'}] {p.area_tag}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2c. Client Sign-Off Action (PENDING_APPROVAL) */}
                  {order.status === 'PENDING_APPROVAL' && (
                    <div style={{ marginTop: '16px', background: 'rgba(99,102,241,0.05)', borderRadius: 'var(--radius-sm)', padding: '16px', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>完工驗收確認與款項核撥</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        清潔人員已完成工作並提交驗收照片，請確認現場。若無問題，請於下方完成驗收簽字。
                      </p>
                      
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {/* Mock Signature Preview */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>手寫簽名檔(虛擬)</span>
                          <img src={signatureData} alt="Client Signature" style={{ height: '30px', width: '80px', objectFit: 'contain', background: '#fff', padding: '2px', borderRadius: '2px' }} />
                        </div>

                        <button onClick={() => handleSignOff(order.id)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                          <Check size={14} /> 點選簽署並撥款
                        </button>
                        
                        <button 
                          onClick={() => { setDisputeOrderId(order.id); setDisputeComment(''); }} 
                          className="btn btn-danger" 
                          style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                        >
                          <ShieldAlert size={14} /> 發起客訴爭議
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2d. Order Settled -> Display review action */}
                  {order.status === 'SETTLED' && !db.reviews.some(r => r.order_id === order.id) && (
                    <div style={{ marginTop: '16px', background: 'rgba(16,185,129,0.05)', borderRadius: 'var(--radius-sm)', padding: '12px', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>訂單已結案完成！為您的服務人員留下評價吧。</span>
                      <button onClick={() => { setReviewOrderId(order.id); setRating(5); setReviewComment(''); }} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--status-completed)', color: 'var(--status-completed)' }}>
                        <Star size={12} fill="var(--status-completed)" /> 填寫服務評價
                      </button>
                    </div>
                  )}
                  
                  {order.status === 'SETTLED' && db.reviews.some(r => r.order_id === order.id) && (
                    <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', padding: '8px 12px', borderRadius: '4px' }}>
                      <span>已給予評價：★{db.reviews.find(r => r.order_id === order.id).rating} 顆星 ({db.reviews.find(r => r.order_id === order.id).comment})</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Dispute Modal */}
      {disputeOrderId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '24px', position: 'relative' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <ShieldAlert size={20} />
              申訴清潔爭議
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              發起爭議後，該筆託管資金將會暫時凍結鎖定。平台管理員將會介入審核清潔照片及進行仲裁。
            </p>
            <form onSubmit={handleFileDispute}>
              <textarea 
                placeholder="請輸入申訴具體原因 (例如：廚房油汙未清理、地板多處積水未乾...)" 
                required 
                value={disputeComment}
                onChange={e => setDisputeComment(e.target.value)}
                style={{ width: '100%', height: '100px', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: '#ffffff', outline: 'none', resize: 'none', marginBottom: '16px', fontSize: '0.85rem' }}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setDisputeOrderId(null)} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>取消</button>
                <button type="submit" className="btn btn-accent" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>提交爭議</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewOrderId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Star size={18} fill="var(--status-pending)" style={{ color: 'var(--status-pending)' }} />
              提交服務評價
            </h3>
            <form onSubmit={handleReviewSubmit}>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
                {[1, 2, 3, 4, 5].map(num => (
                  <button 
                    key={num} 
                    type="button" 
                    onClick={() => setRating(num)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <Star 
                      size={32} 
                      fill={num <= rating ? 'var(--status-pending)' : 'none'} 
                      style={{ color: num <= rating ? 'var(--status-pending)' : 'var(--text-muted)' }} 
                    />
                  </button>
                ))}
              </div>
              <textarea 
                placeholder="寫下您對這次清潔服務的真實感想吧！您的回饋將做為其他案主的重要參考。" 
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                style={{ width: '100%', height: '80px', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: '#ffffff', outline: 'none', resize: 'none', marginBottom: '16px', fontSize: '0.85rem' }}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setReviewOrderId(null)} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>取消</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>提交評價</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modify Order Modal */}
      {modifyOrderTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '24px', position: 'relative' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Compass size={20} style={{ color: 'var(--accent-indigo)' }} />
              修改委託單內容 ({modifyOrderTarget.order_no})
            </h3>
            
            <form onSubmit={handleModifySubmit} style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>選擇服務地址</label>
                <select 
                  value={editAddressId} 
                  onChange={e => setEditAddressId(e.target.value)}
                  style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: '#ffffff' }}
                >
                  {db.customer_addresses.map(addr => (
                    <option key={addr.id} value={addr.id} style={{ background: 'var(--bg-secondary)' }}>
                      [{addr.category === 'RESIDENTIAL' ? '居家' : '商辦'}] {addr.city}{addr.district}{addr.street_address}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>房屋坪數 ({editSpaceSize} 坪)</label>
                <input 
                  type="range" min="5" max="150" value={editSpaceSize} 
                  onChange={e => setEditSpaceSize(parseInt(e.target.value))}
                  style={{ height: '6px', background: 'rgba(255,255,255,0.1)', outline: 'none', appearance: 'none', borderRadius: '3px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>預定開工時間</label>
                <input 
                  type="datetime-local" value={editScheduledAt} 
                  onChange={e => setEditScheduledAt(e.target.value)}
                  style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: '#ffffff' }}
                />
              </div>

              {modifyOrderTarget.booking_type === 'INSTANT_FIXED' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>設定委託預算 (NT$)</label>
                  <input 
                    type="number" required min="100" 
                    value={editCustomBudget} 
                    onChange={e => setEditCustomBudget(parseInt(e.target.value) || 0)}
                    style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: '#ffffff' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>其他客製需求說明</label>
                <textarea 
                  value={editOtherRequirements} 
                  onChange={e => setEditOtherRequirements(e.target.value)}
                  style={{ width: '100%', height: '60px', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: '#ffffff', outline: 'none', resize: 'vertical', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setModifyOrderTarget(null)} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem', width: 'auto' }}>取消</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', width: 'auto' }}>確認儲存</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  const isMe = m.sender_id === activeUser.id;
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
              {["你好，請問大約幾點到？", "你好，請問需要自備清潔劑嗎？", "好的，沒問題，到時見！"].map((quickMsg, idx) => (
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
