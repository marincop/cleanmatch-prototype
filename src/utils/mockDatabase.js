// Mock Database & State Machine Engine for CleanMatch Prototype

// Initial Seeds
export const SEED_USERS = [
  { id: 'u-1', phone: '+886912345678', email: 'alice@example.com', name: '林艾麗斯 (Alice)', role: 'CUSTOMER', status: 'ACTIVE' },
  { id: 'u-2', phone: '+886987654321', email: 'bob@example.com', name: '陳小兵 (Bob)', role: 'CLEANER', status: 'ACTIVE' },
  { id: 'u-3', phone: '+886933333333', email: 'charlie@example.com', name: '王經理 (Charlie)', role: 'CLEANER', status: 'ACTIVE' },
  { id: 'u-4', phone: '+886944444444', email: 'david@example.com', name: '曾阿水 (David)', role: 'CLEANER', status: 'ACTIVE' },
  { id: 'u-5', phone: '+886955555555', email: 'tony@example.com', name: '李大同 (Tony)', role: 'CLEANER', status: 'ACTIVE' },
  { id: 'u-6', phone: '+886966666666', email: 'mary@example.com', name: '張小美 (Mary)', role: 'CLEANER', status: 'ACTIVE' },
  { id: 'u-7', phone: '+886900000000', email: 'admin@example.com', name: '系統管理員', role: 'ADMIN', status: 'ACTIVE' }
];

export const SEED_CLEANERS = [
  {
    id: 'c-bob',
    user_id: 'u-2',
    name: '陳小兵 (Bob)',
    cleaner_type: 'INDIVIDUAL',
    business_name: null,
    tax_id: null,
    service_radius_km: 10,
    service_location: { lat: 24.150, lng: 120.650 }, // Taichung West District
    avg_rating: 4.85,
    total_orders_completed: 42,
    verified_status: 'VERIFIED',
    membership_tier: 'REGULAR'
  },
  {
    id: 'c-charlie',
    user_id: 'u-3',
    name: '王經理 (Charlie - 潔淨科技)',
    cleaner_type: 'AGENCY',
    business_name: '潔淨科技股份有限公司',
    tax_id: '12345678',
    service_radius_km: 15,
    service_location: { lat: 24.162, lng: 120.665 },
    avg_rating: 4.90,
    total_orders_completed: 156,
    verified_status: 'VERIFIED',
    membership_tier: 'REGULAR'
  }
];

export const SEED_AGENCY_STAFF = [
  { id: 'as-1', agency_id: 'c-charlie', staff_user_id: 'u-4', role_in_agency: 'WORKER', status: 'ACTIVE' },
  { id: 'as-2', agency_id: 'c-charlie', staff_user_id: 'u-5', role_in_agency: 'WORKER', status: 'ACTIVE' },
  { id: 'as-3', agency_id: 'c-charlie', staff_user_id: 'u-6', role_in_agency: 'WORKER', status: 'ACTIVE' }
];

export const SEED_ADDRESSES = [
  {
    id: 'addr-1',
    user_id: 'u-1',
    category: 'RESIDENTIAL',
    contact_name: '林艾麗斯',
    contact_phone: '+886912345678',
    city: '台中市',
    district: '西區',
    street_address: '公益路二段61號 (公益大樓)',
    building_has_elevator: true,
    parking_info: '大樓地下室收費停車場',
    geo_location: { lat: 24.1512, lng: 120.6521 }
  },
  {
    id: 'addr-2',
    user_id: 'u-1',
    category: 'OFFICE',
    contact_name: '林艾麗斯',
    contact_phone: '+886912345678',
    city: '台中市',
    district: '南屯區',
    street_address: '大墩路588號 (商務辦公室 8F)',
    building_has_elevator: true,
    parking_info: '路邊停車格',
    geo_location: { lat: 24.1585, lng: 120.6482 }
  }
];

// Helper to calculate distance in km using Haversine formula (simulating PostGIS distance calculations)
export function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Initial Database State Generator
export function getInitialDB() {
  return {
    users: [...SEED_USERS],
    cleaner_profiles: [...SEED_CLEANERS],
    agency_staff: [...SEED_AGENCY_STAFF],
    customer_addresses: [...SEED_ADDRESSES],
    orders: [
      {
        id: 'order-seed-1',
        order_no: 'CM-20260815-1001',
        customer_id: 'u-1',
        address_id: 'a-1',
        booking_type: 'INSTANT_FIXED',
        service_type: 'HOME_GENERAL',
        space_size_ping: 25,
        scheduled_start_at: '2026-08-20T09:00:00.000Z',
        estimated_duration_hours: 4,
        total_amount: 2000,
        platform_fee: 300,
        cleaner_payout: 1700,
        notes: '希望攜帶專業吸塵器',
        status: 'PENDING_MATCH',
        cleaner_id: null,
        assigned_staff_id: null,
        accepted_at: null,
        has_preauth_hold: true
      },
      {
        id: 'order-seed-2',
        order_no: 'CM-20260815-1002',
        customer_id: 'u-1',
        address_id: 'a-1',
        booking_type: 'INSTANT_FIXED',
        service_type: 'DEEP_CLEAN',
        space_size_ping: 30,
        scheduled_start_at: '2026-08-21T10:00:00.000Z',
        estimated_duration_hours: 6,
        total_amount: 4500,
        platform_fee: 675,
        cleaner_payout: 3825,
        notes: '廚房油汙加強清潔',
        status: 'PENDING_MATCH',
        cleaner_id: null,
        assigned_staff_id: null,
        accepted_at: null,
        has_preauth_hold: true
      },
      {
        id: 'order-seed-3',
        order_no: 'CM-20260815-1003',
        customer_id: 'u-1',
        address_id: 'a-1',
        booking_type: 'INSTANT_FIXED',
        service_type: 'HOME_GENERAL',
        space_size_ping: 15,
        scheduled_start_at: '2026-08-22T13:00:00.000Z',
        estimated_duration_hours: 3,
        total_amount: 1500,
        platform_fee: 225,
        cleaner_payout: 1275,
        notes: '基本客廳起居打掃',
        status: 'PENDING_MATCH',
        cleaner_id: null,
        assigned_staff_id: null,
        accepted_at: null,
        has_preauth_hold: true
      },
      {
        id: 'order-seed-4',
        order_no: 'CM-20260815-1004',
        customer_id: 'u-1',
        address_id: 'a-1',
        booking_type: 'INSTANT_FIXED',
        service_type: 'OFFICE',
        space_size_ping: 50,
        scheduled_start_at: '2026-08-23T08:00:00.000Z',
        estimated_duration_hours: 5,
        total_amount: 5000,
        platform_fee: 750,
        cleaner_payout: 4250,
        notes: '商辦垃圾清理，木地板拖地',
        status: 'PENDING_MATCH',
        cleaner_id: null,
        assigned_staff_id: null,
        accepted_at: null,
        has_preauth_hold: true
      },
      {
        id: 'order-seed-5',
        order_no: 'CM-20260815-1005',
        customer_id: 'u-1',
        address_id: 'a-1',
        booking_type: 'INSTANT_FIXED',
        service_type: 'HOME_GENERAL',
        space_size_ping: 40,
        scheduled_start_at: '2026-08-24T09:00:00.000Z',
        estimated_duration_hours: 8,
        total_amount: 8000,
        platform_fee: 1200,
        cleaner_payout: 6800,
        notes: '全室玻璃窗框細部清潔',
        status: 'PENDING_MATCH',
        cleaner_id: null,
        assigned_staff_id: null,
        accepted_at: null,
        has_preauth_hold: true
      },
      {
        id: 'order-seed-6',
        order_no: 'CM-20260815-1006',
        customer_id: 'u-1',
        address_id: 'a-1',
        booking_type: 'INSTANT_FIXED',
        service_type: 'HOME_GENERAL',
        space_size_ping: 18,
        scheduled_start_at: '2026-08-25T14:00:00.000Z',
        estimated_duration_hours: 3.5,
        total_amount: 1800,
        platform_fee: 270,
        cleaner_payout: 1530,
        notes: '有貓咪寵物，打掃請注意關門防走失',
        status: 'PENDING_MATCH',
        cleaner_id: null,
        assigned_staff_id: null,
        accepted_at: null,
        has_preauth_hold: true
      },
      {
        id: 'order-seed-7',
        order_no: 'CM-20260815-1007',
        customer_id: 'u-1',
        address_id: 'a-1',
        booking_type: 'INSTANT_FIXED',
        service_type: 'DEEP_CLEAN',
        space_size_ping: 22,
        scheduled_start_at: '2026-08-26T09:00:00.000Z',
        estimated_duration_hours: 5,
        total_amount: 3800,
        platform_fee: 570,
        cleaner_payout: 3230,
        notes: '浴室水垢與牆壁發霉清除',
        status: 'PENDING_MATCH',
        cleaner_id: null,
        assigned_staff_id: null,
        accepted_at: null,
        has_preauth_hold: true
      },
      {
        id: 'order-seed-8',
        order_no: 'CM-20260815-1008',
        customer_id: 'u-1',
        address_id: 'a-1',
        booking_type: 'INSTANT_FIXED',
        service_type: 'HOME_GENERAL',
        space_size_ping: 28,
        scheduled_start_at: '2026-08-27T10:00:00.000Z',
        estimated_duration_hours: 4.5,
        total_amount: 2200,
        platform_fee: 330,
        cleaner_payout: 1870,
        notes: '主臥室床單除塵蟎與更換',
        status: 'PENDING_MATCH',
        cleaner_id: null,
        assigned_staff_id: null,
        accepted_at: null,
        has_preauth_hold: true
      }
    ],
    quotation_bids: [],
    payments: [],
    service_proof_photos: [],
    reviews: [],
    chat_messages: [],
    logs: [
      { id: 'log-1', timestamp: new Date().toISOString(), type: 'SYSTEM', message: 'CleanMatch 虛擬資料庫初始化成功。' },
      { id: 'log-2', timestamp: new Date().toISOString(), type: 'POSTGIS', message: '已為 cleaner_profiles (service_location) 與 customer_addresses (geo_location) 建立 GiST 空間索引。' }
    ]
  };
}

// Transaction Logging helper
export function addLog(db, type, message) {
  const newLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    type,
    message
  };
  return {
    ...db,
    logs: [newLog, ...db.logs].slice(0, 100) // Keep last 100 logs
  };
}

// Order Database API
export const dbAPI = {
  // 1. Create a Standard or Custom Order
  createOrder: (db, { customerId, addressId, bookingType, serviceType, spaceSizePing, scheduledStartAt, items, estimatedHours, notes }) => {
    const orderId = `order-${Date.now()}`;
    const orderNo = `CM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const address = db.customer_addresses.find(a => a.id === addressId);
    
    // Compute total amount
    const totalAmount = items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
    const platformFee = parseFloat((totalAmount * 0.15).toFixed(2)); // 15% platform commission
    const cleanerPayout = parseFloat((totalAmount - platformFee).toFixed(2));
    
    const newOrder = {
      id: orderId,
      order_no: orderNo,
      customer_id: customerId,
      cleaner_id: null,
      assigned_staff_id: null,
      address_id: addressId,
      booking_type: bookingType, // 'INSTANT_FIXED' or 'CUSTOM_BIDDING'
      service_type: serviceType, // 'HOME_GENERAL', 'DEEP_CLEAN', 'OFFICE', 'MOVE_IN_OUT'
      space_size_ping: spaceSizePing,
      scheduled_start_at: scheduledStartAt,
      estimated_duration_hours: estimatedHours || (spaceSizePing * 0.1 + 2), // Default rough estimation
      total_amount: bookingType === 'CUSTOM_BIDDING' ? 0.00 : totalAmount,
      platform_fee: bookingType === 'CUSTOM_BIDDING' ? 0.00 : platformFee,
      cleaner_payout: bookingType === 'CUSTOM_BIDDING' ? 0.00 : cleanerPayout,
      status: bookingType === 'CUSTOM_BIDDING' ? 'PENDING_MATCH' : 'PENDING_MATCH',
      notes: notes || null,
      created_at: new Date().toISOString()
    };
    
    let updatedDB = { ...db, orders: [...db.orders, newOrder] };
    
    // Create order items
    const orderItems = items.map(item => ({
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      order_id: orderId,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.unit_price * item.quantity
    }));
    updatedDB.order_items = [...(updatedDB.order_items || []), ...orderItems];
    
    updatedDB = addLog(updatedDB, 'DATABASE', `訂單 ${orderNo} 建立成功。類型: ${bookingType} | ${serviceType}。`);
    
    // For INSTANT_FIXED, we run a pre-authorization payment automatically
    if (bookingType === 'INSTANT_FIXED') {
      const paymentId = `pay-${Date.now()}`;
      const newPayment = {
        id: paymentId,
        order_id: orderId,
        payment_gateway: 'ECPay (綠界科技)',
        gateway_transaction_id: `gpay-${Date.now()}`,
        auth_amount: totalAmount,
        captured_amount: null,
        status: 'AUTHORIZED',
        invoice_number: `AB-${Math.floor(10000000 + Math.random() * 90000000)}`,
        created_at: new Date().toISOString()
      };
      
      updatedDB.payments = [...updatedDB.payments, newPayment];
      updatedDB = addLog(updatedDB, 'PAYMENT', `兩階段請款[預授權]: 成功向第三方支付授權額度 NT$${totalAmount}，訂單金額暫託保管中。`);
    } else {
      updatedDB = addLog(updatedDB, 'DATABASE', `辦公室/深層清潔招標案：等待服務商進行估價與報價。`);
    }
    
    return updatedDB;
  },

  // 2. Claim Order (Instant Fixed Order)
  claimOrder: (db, orderId, cleanerId, staffUserId, simulateConflict = false) => {
    let updatedDB = { ...db };
    const order = updatedDB.orders.find(o => o.id === orderId);
    
    if (!order) {
      throw new Error("找不到該訂單");
    }
    
    if (order.status !== 'PENDING_MATCH') {
      throw new Error(`搶單失敗: 訂單狀態非 PENDING_MATCH，目前狀態為 ${order.status}`);
    }
    
    const cleaner = updatedDB.cleaner_profiles.find(c => c.id === cleanerId);
    const orderNo = order.order_no;
    
    // Simulate Redis lock `lock:order:{order_id}` check
    updatedDB = addLog(updatedDB, 'REDIS', `搶單嘗試：請求獲取 Redis 分散式鎖 lock:order:${orderId}...`);
    
    if (simulateConflict) {
      updatedDB = addLog(updatedDB, 'REDIS', `[衝突模擬] 鎖搶占失敗！另一個清潔員已持有該鎖。搶單衝突 (409 Conflict)。`);
      throw new Error("搶單失敗！此筆訂單剛剛已被其他服務人員預約搶走 (Redis lock error: 409 Conflict)");
    }
    
    // Acquire lock and update database
    updatedDB = addLog(updatedDB, 'REDIS', `鎖獲取成功：lock:order:${orderId} 鎖定 3 秒。`);
    
    // Update order with claimed cleaner
    updatedDB.orders = updatedDB.orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          cleaner_id: cleanerId,
          assigned_staff_id: staffUserId || (cleaner.cleaner_type === 'AGENCY' ? 'u-4' : cleaner.user_id), // Bob if Bob, Tony/David if selected
          status: 'ACCEPTED',
          accepted_at: new Date().toISOString()
        };
      }
      return o;
    });
    
    // Create Schedule Entry
    const scheduleId = `sched-${Date.now()}`;
    const start_time = order.scheduled_start_at;
    const end_time = new Date(new Date(start_time).getTime() + (order.estimated_duration_hours * 60 * 60 * 1000)).toISOString();
    const newSchedule = {
      id: scheduleId,
      cleaner_id: cleanerId,
      start_time,
      end_time,
      status: 'BOOKED',
      order_id: orderId
    };
    updatedDB.cleaner_schedules = [...(updatedDB.cleaner_schedules || []), newSchedule];
    
    updatedDB = addLog(updatedDB, 'DATABASE', `搶單成功：清潔員 [${cleaner.name}] 成功取得訂單 ${orderNo}，排程更新為 BOOKED。`);
    updatedDB = addLog(updatedDB, 'REDIS', `解鎖成功：釋放 Redis 鎖 lock:order:${orderId}。`);
    
    return updatedDB;
  },

  // 3. Cleaner Submits Bid for Custom RFQ
  submitBid: (db, { orderId, cleanerId, bidAmount, proposedDurationHours, notes }) => {
    let updatedDB = { ...db };
    const order = updatedDB.orders.find(o => o.id === orderId);
    if (!order) throw new Error("找不到該訂單");
    
    const bidId = `bid-${Date.now()}`;
    const newBid = {
      id: bidId,
      order_id: orderId,
      cleaner_id: cleanerId,
      bid_amount: bidAmount,
      proposed_duration_hours: proposedDurationHours,
      notes,
      status: 'PENDING',
      created_at: new Date().toISOString()
    };
    
    updatedDB.quotation_bids = [...updatedDB.quotation_bids, newBid];
    
    const cleaner = updatedDB.cleaner_profiles.find(c => c.id === cleanerId);
    updatedDB = addLog(updatedDB, 'DATABASE', `報價通知：服務商 [${cleaner.name}] 針對訂單 ${order.order_no} 提交報價 NT$${bidAmount} (${proposedDurationHours} 小時)。`);
    
    return updatedDB;
  },

  // 4. Customer Accepts a Bid
  acceptBid: (db, orderId, bidId) => {
    let updatedDB = { ...db };
    const order = updatedDB.orders.find(o => o.id === orderId);
    if (!order) throw new Error("找不到該訂單");
    
    const bid = updatedDB.quotation_bids.find(b => b.id === bidId);
    if (!bid) throw new Error("找不到該報價單");
    
    const cleaner = updatedDB.cleaner_profiles.find(c => c.id === bid.cleaner_id);
    
    // Update all bids for this order
    updatedDB.quotation_bids = updatedDB.quotation_bids.map(b => {
      if (b.order_id === orderId) {
        return {
          ...b,
          status: b.id === bidId ? 'ACCEPTED' : 'REJECTED'
        };
      }
      return b;
    });
    
    const totalAmount = bid.bid_amount;
    const platformFee = parseFloat((totalAmount * 0.15).toFixed(2));
    const cleanerPayout = parseFloat((totalAmount - platformFee).toFixed(2));
    
    // Update order status and details
    updatedDB.orders = updatedDB.orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          cleaner_id: bid.cleaner_id,
          assigned_staff_id: cleaner.cleaner_type === 'AGENCY' ? 'u-4' : cleaner.user_id,
          total_amount: totalAmount,
          platform_fee: platformFee,
          cleaner_payout: cleanerPayout,
          estimated_duration_hours: bid.proposed_duration_hours,
          status: 'ACCEPTED'
        };
      }
      return o;
    });
    
    // Pre-authorize payment for the bid amount
    const paymentId = `pay-${Date.now()}`;
    const newPayment = {
      id: paymentId,
      order_id: orderId,
      payment_gateway: 'ECPay (綠界科技)',
      gateway_transaction_id: `gpay-${Date.now()}`,
      auth_amount: totalAmount,
      captured_amount: null,
      status: 'AUTHORIZED',
      invoice_number: `AB-${Math.floor(10000000 + Math.random() * 90000000)}`,
      created_at: new Date().toISOString()
    };
    
    updatedDB.payments = [...updatedDB.payments, newPayment];
    
    // Schedule update
    const scheduleId = `sched-${Date.now()}`;
    const start_time = order.scheduled_start_at;
    const end_time = new Date(new Date(start_time).getTime() + (bid.proposed_duration_hours * 60 * 60 * 1000)).toISOString();
    const newSchedule = {
      id: scheduleId,
      cleaner_id: bid.cleaner_id,
      start_time,
      end_time,
      status: 'BOOKED',
      order_id: orderId
    };
    updatedDB.cleaner_schedules = [...(updatedDB.cleaner_schedules || []), newSchedule];
    
    updatedDB = addLog(updatedDB, 'DATABASE', `成交通知：客戶已接受 [${cleaner.name}] 的報價。訂單 ${order.order_no} 狀態更新為已接受 (ACCEPTED)。`);
    updatedDB = addLog(updatedDB, 'PAYMENT', `兩階段請款[預授權]: 成功向第三方支付授權額度 NT$${totalAmount}，款項暫託中。`);
    
    return updatedDB;
  },

  // 5. Check-In & PostGIS GeoFence Validate
  checkIn: (db, orderId, currentLatLng) => {
    let updatedDB = { ...db };
    const order = updatedDB.orders.find(o => o.id === orderId);
    if (!order) throw new Error("找不到該訂單");
    
    const address = updatedDB.customer_addresses.find(a => a.id === order.address_id);
    if (!address) throw new Error("找不到地址資訊");
    
    const distKm = getDistanceKm(
      currentLatLng.lat,
      currentLatLng.lng,
      address.geo_location.lat,
      address.geo_location.lng
    );
    const distM = distKm * 1000;
    
    updatedDB = addLog(updatedDB, 'POSTGIS', `定位驗證：清潔人員當前坐標為 (${currentLatLng.lat.toFixed(5)}, ${currentLatLng.lng.toFixed(5)})，案主地址坐標為 (${address.geo_location.lat.toFixed(5)}, ${address.geo_location.lng.toFixed(5)})。空間距離差：${distM.toFixed(1)} 公尺。`);
    
    if (distM > 200) {
      updatedDB = addLog(updatedDB, 'POSTGIS', `[異常攔截] 簽到失敗！距離大於電子圍籬限制 (200公尺)。請務必抵達現場後再行簽到。`);
      throw new Error(`電子圍籬簽到失敗：您目前距離案主位置 ${distM.toFixed(0)} 公尺（限制在 200 公尺內）。`);
    }
    
    // Distance matches < 200m
    updatedDB.orders = updatedDB.orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: 'IN_PROGRESS' };
      }
      return o;
    });
    
    updatedDB = addLog(updatedDB, 'DATABASE', `定位合格：進入圍籬範圍，電子簽到成功。訂單狀態更新為服務中 (IN_PROGRESS)。`);
    return updatedDB;
  },

  // 6. Upload Proof Photos (Simulate Presigned S3 Link direct upload)
  uploadPhoto: (db, { orderId, phase, areaTag, photoUrl }) => {
    let updatedDB = { ...db };
    const order = updatedDB.orders.find(o => o.id === orderId);
    if (!order) throw new Error("找不到該訂單");
    
    const photoId = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const address = updatedDB.customer_addresses.find(a => a.id === order.address_id);
    
    const newPhoto = {
      id: photoId,
      order_id: orderId,
      photo_phase: phase, // 'BEFORE_CLEANING' or 'AFTER_CLEANING'
      area_tag: areaTag,
      photo_url: photoUrl,
      captured_lat_lng: address.geo_location, // Mock correct metadata
      created_at: new Date().toISOString()
    };
    
    updatedDB.service_proof_photos = [...updatedDB.service_proof_photos, newPhoto];
    
    updatedDB = addLog(updatedDB, 'STORAGE', `上傳成功：透過 S3 Presigned URL 直傳雲端槽，完成 [${phase === 'BEFORE_CLEANING' ? '施作前' : '施作後'}] - [${areaTag}] 照片上傳。`);
    return updatedDB;
  },

  // 7. Request Sign-Off (Cleaner requests client's approval)
  requestSignOff: (db, orderId) => {
    let updatedDB = { ...db };
    const order = updatedDB.orders.find(o => o.id === orderId);
    if (!order) throw new Error("找不到該訂單");
    
    updatedDB.orders = updatedDB.orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: 'PENDING_APPROVAL' };
      }
      return o;
    });
    
    updatedDB = addLog(updatedDB, 'DATABASE', `完工提報：服務人員已完成工作並提交認證，訂單狀態變更為待驗收 (PENDING_APPROVAL)。`);
    return updatedDB;
  },

  // 8. Client Approves & Signs
  approveOrder: (db, orderId, signatureUrl) => {
    let updatedDB = { ...db };
    const order = updatedDB.orders.find(o => o.id === orderId);
    if (!order) throw new Error("找不到該訂單");
    
    // Save signature url in the proof metadata
    updatedDB.service_proof_photos = updatedDB.service_proof_photos.map(p => {
      if (p.order_id === orderId && p.photo_phase === 'AFTER_CLEANING') {
        return { ...p, client_signed_url: signatureUrl };
      }
      return p;
    });
    
    // Status to COMPLETED
    updatedDB.orders = updatedDB.orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: 'COMPLETED' };
      }
      return o;
    });
    
    updatedDB = addLog(updatedDB, 'DATABASE', `驗收成功：客戶已電子簽名確認。訂單更新為已完工 (COMPLETED)。`);
    
    // Trigger asynchronous capturing
    updatedDB = addLog(updatedDB, 'PAYMENT', `兩階段請款[請款通知]: 觸發背景非同步扣款工作 Worker，向第三方發起 Capture 扣款請求 NT$${order.total_amount}...`);
    
    // Instantly simulate the capture completion and settle order after a brief step
    updatedDB.payments = updatedDB.payments.map(p => {
      if (p.order_id === orderId) {
        return {
          ...p,
          captured_amount: order.total_amount,
          status: 'PAID'
        };
      }
      return p;
    });
    
    updatedDB.orders = updatedDB.orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: 'SETTLED' };
      }
      return o;
    });
    
    updatedDB = addLog(updatedDB, 'PAYMENT', `信用卡扣款成功！訂單交易完成 (Paid & Settled)。`);
    updatedDB = addLog(updatedDB, 'DATABASE', `分帳作業：撥款金額 NT$${order.cleaner_payout} 已記錄於服務商電子錢包；平台抽佣 NT$${order.platform_fee}。`);
    
    return updatedDB;
  },

  // 9. Client Files a Dispute
  disputeOrder: (db, orderId, comment) => {
    let updatedDB = { ...db };
    const order = updatedDB.orders.find(o => o.id === orderId);
    if (!order) throw new Error("找不到該訂單");
    
    updatedDB.orders = updatedDB.orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: 'DISPUTED' };
      }
      return o;
    });
    
    updatedDB = addLog(updatedDB, 'DATABASE', `爭議投訴：案主發起爭議流程。原因：${comment}。狀態變更為 DISPUTED，款項暫時凍結。`);
    return updatedDB;
  },

  // 10. Admin Resolves Dispute
  adminArbitrate: (db, orderId, decision) => {
    let updatedDB = { ...db };
    const order = updatedDB.orders.find(o => o.id === orderId);
    if (!order) throw new Error("找不到該訂單");
    
    if (decision === 'RELEASE_PAYMENT') {
      updatedDB.payments = updatedDB.payments.map(p => {
        if (p.order_id === orderId) {
          return {
            ...p,
            captured_amount: order.total_amount,
            status: 'PAID'
          };
        }
        return p;
      });
      
      updatedDB.orders = updatedDB.orders.map(o => {
        if (o.id === orderId) {
          return { ...o, status: 'SETTLED' };
        }
        return o;
      });
      
      updatedDB = addLog(updatedDB, 'ADMIN', `爭議裁決：管理員判定「釋放款項給清潔員」。`);
      updatedDB = addLog(updatedDB, 'PAYMENT', `兩階段請款[請款通知]: 扣款 NT$${order.total_amount}。狀態更新為 SETTLED。`);
    } else if (decision === 'REFUND') {
      updatedDB.payments = updatedDB.payments.map(p => {
        if (p.order_id === orderId) {
          return {
            ...p,
            captured_amount: 0,
            status: 'REFUNDED'
          };
        }
        return p;
      });
      
      updatedDB.orders = updatedDB.orders.map(o => {
        if (o.id === orderId) {
          return { ...o, status: 'REFUNDED' };
        }
        return o;
      });
      
      updatedDB = addLog(updatedDB, 'ADMIN', `爭議裁決：管理員判定「全額刷退案主」。`);
      updatedDB = addLog(updatedDB, 'PAYMENT', `退款通知: 已向第三方支付取消預授權。額度已釋回。狀態更新為 REFUNDED。`);
    }
    
    return updatedDB;
  },

  // 11. Customer Reviews Cleaner
  submitReview: (db, { orderId, reviewerId, revieweeId, rating, comment }) => {
    let updatedDB = { ...db };
    const order = updatedDB.orders.find(o => o.id === orderId);
    if (!order) throw new Error("找不到該訂單");
    
    const reviewId = `rev-${Date.now()}`;
    const newReview = {
      id: reviewId,
      order_id: orderId,
      reviewer_id: reviewerId,
      reviewee_id: revieweeId,
      rating: parseInt(rating),
      comment,
      created_at: new Date().toISOString()
    };
    
    updatedDB.reviews = [...updatedDB.reviews, newReview];
    
    // Update Cleaner average rating and total count
    updatedDB.cleaner_profiles = updatedDB.cleaner_profiles.map(c => {
      if (c.user_id === revieweeId) {
        const count = c.total_orders_completed + 1;
        const newRating = parseFloat(((c.avg_rating * c.total_orders_completed + rating) / count).toFixed(2));
        return {
          ...c,
          total_orders_completed: count,
          avg_rating: newRating
        };
      }
      return c;
    });
    
    updatedDB = addLog(updatedDB, 'DATABASE', `評價提交：案主發送評分 ${rating} 顆星！清潔人員平均評分已重新計算。`);
    return updatedDB;
  },

  // 12. Cancel/Delete Order
  cancelOrder: (db, orderId) => {
    let updatedDB = { ...db };
    const order = updatedDB.orders.find(o => o.id === orderId);
    if (!order) throw new Error("找不到該訂單");
    
    // Set status to CANCELLED
    updatedDB.orders = updatedDB.orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: 'CANCELLED' };
      }
      return o;
    });

    // Update payments if exists
    updatedDB.payments = updatedDB.payments.map(p => {
      if (p.order_id === orderId) {
        return { ...p, status: 'REFUNDED' };
      }
      return p;
    });
    
    updatedDB = addLog(updatedDB, 'DATABASE', `取消委託：案主主動取消訂單「${order.order_no}」。信用卡預授權已自動撤銷釋放。`);
    return updatedDB;
  },

  // 13. Modify Order
  modifyOrder: (db, orderId, { addressId, spaceSize, scheduledAt, customBudget, notes }) => {
    let updatedDB = { ...db };
    const order = updatedDB.orders.find(o => o.id === orderId);
    if (!order) throw new Error("找不到該訂單");

    updatedDB.orders = updatedDB.orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          address_id: addressId,
          space_size_ping: spaceSize,
          scheduled_start_at: new Date(scheduledAt).toISOString(),
          total_amount: customBudget,
          notes: notes || null,
          items: o.booking_type === 'CUSTOM_BIDDING' ? o.items : [
            { 
              item_name: `${o.service_type === 'DEEP_CLEAN' ? '深層清潔施作' : '一般居家標準清潔'} (${spaceSize} 坪)`, 
              quantity: 1, 
              unit_price: customBudget 
            }
          ]
        };
      }
      return o;
    });

    // Update payments amount if exists
    updatedDB.payments = updatedDB.payments.map(p => {
      if (p.order_id === orderId) {
        return { ...p, auth_amount: customBudget };
      }
      return p;
    });

    updatedDB = addLog(updatedDB, 'DATABASE', `修改委託：案主修改訂單「${order.order_no}」細項。預算變更為 NT$${customBudget}，開工時間變更為：${scheduledAt}。`);
    return updatedDB;
  },

  // 14. Send Chat Message
  sendChatMessage: (db, { orderId, senderId, senderName, message }) => {
    let updatedDB = { ...db };
    const newMessage = {
      id: `msg-${Date.now()}`,
      order_id: orderId,
      sender_id: senderId,
      sender_name: senderName,
      message,
      timestamp: new Date().toISOString()
    };
    updatedDB.chat_messages = [...(updatedDB.chat_messages || []), newMessage];
    
    updatedDB = addLog(updatedDB, 'DATABASE', `[聊天室] 「${senderName}」發送訊息：${message}`);
    return updatedDB;
  },

  // 15. Abandon Order (Cleaner Cancels Acceptance)
  abandonOrder: (db, orderId, cleanerId) => {
    let updatedDB = { ...db };
    const order = updatedDB.orders.find(o => o.id === orderId);
    if (!order) throw new Error("找不到該訂單");
    
    const cleaner = updatedDB.cleaner_profiles.find(c => c.id === cleanerId);
    
    updatedDB.orders = updatedDB.orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          cleaner_id: null,
          assigned_staff_id: null,
          status: 'PENDING_MATCH',
          accepted_at: null
        };
      }
      return o;
    });

    // Remove cleaner schedule entry
    updatedDB.cleaner_schedules = updatedDB.cleaner_schedules.filter(s => s.order_id !== orderId);
    
    updatedDB = addLog(updatedDB, 'DATABASE', `[放棄接單] 清潔服務商 [${cleaner?.name || '服務商'}] 放棄承接訂單 ${order.order_no}，該預約已重新釋放回到搶單池。`);
    return updatedDB;
  },

  // 16. Simulate 24 Hours Idle Timeout (Auto Release)
  simulate24HoursTimeout: (db, orderId) => {
    let updatedDB = { ...db };
    const order = updatedDB.orders.find(o => o.id === orderId);
    if (!order) throw new Error("找不到該訂單");
    
    updatedDB.orders = updatedDB.orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          cleaner_id: null,
          assigned_staff_id: null,
          status: 'PENDING_MATCH',
          accepted_at: null
        };
      }
      return o;
    });

    // Remove cleaner schedule entry
    updatedDB.cleaner_schedules = updatedDB.cleaner_schedules.filter(s => s.order_id !== orderId);
    
    updatedDB = addLog(updatedDB, 'DATABASE', `[逾時自動釋放] 承接人員對訂單 ${order.order_no} 逾 24 小時未執行定位打卡，系統自動解除承接狀態，將訂單退回即時搶單池。`);
    return updatedDB;
  },

  // 17. Upgrade Cleaner to VIP
  upgradeToVIP: (db, cleanerId) => {
    let updatedDB = { ...db };
    updatedDB.cleaner_profiles = updatedDB.cleaner_profiles.map(c => {
      if (c.id === cleanerId) {
        return { ...c, membership_tier: 'VIP' };
      }
      return c;
    });
    
    const cleaner = updatedDB.cleaner_profiles.find(c => c.id === cleanerId);
    updatedDB = addLog(updatedDB, 'DATABASE', `[會員升級] 清潔服務商 [${cleaner?.name}] 成功訂閱升級為 VIP 會員 (每月 NT$ 888)！解鎖搶單池 30 筆上限及同時接 10 個案子。`);
    return updatedDB;
  },

  // 18. Downgrade Cleaner to Regular
  downgradeToRegular: (db, cleanerId) => {
    let updatedDB = { ...db };
    updatedDB.cleaner_profiles = updatedDB.cleaner_profiles.map(c => {
      if (c.id === cleanerId) {
        return { ...c, membership_tier: 'REGULAR' };
      }
      return c;
    });
    
    const cleaner = updatedDB.cleaner_profiles.find(c => c.id === cleanerId);
    updatedDB = addLog(updatedDB, 'DATABASE', `[會員降級] 清潔服務商 [${cleaner?.name}] 已退訂 VIP，會員身分變更為普通會員。`);
    return updatedDB;
  }
};
