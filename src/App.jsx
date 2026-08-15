import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Calendar, Compass, ShieldAlert, Award, Star, ArrowRight, DollarSign, Clock, Sparkles, Plus, Check, LogOut, Database, Users, Terminal, Shield, ArrowRightLeft, FileCode, CheckCircle, Phone, Lock, Building, Trash2 } from 'lucide-react';
import { dbAPI, getInitialDB, addLog } from './utils/mockDatabase';
import CustomerDashboard from './components/CustomerDashboard';
import CleanerDashboard from './components/CleanerDashboard';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const getEntrance = () => {
    if (import.meta.env.VITE_ENTRANCE) return import.meta.env.VITE_ENTRANCE;
    const port = window.location.port;
    if (port === '5174' || port === '5176' || port === '5200' || port === '5202' || window.location.pathname.includes('cleaner')) {
      return 'CLEANER';
    }
    return 'CUSTOMER';
  };
  const entrance = getEntrance();
  const params = new URLSearchParams(window.location.search);
  const isDevMode = params.get('dev') === 'true' || params.get('admin') === 'true';

  const [db, setDb] = useState(getInitialDB());
  const [currentUser, setCurrentUser] = useState(null); // null forces signup
  const [activePersona, setActivePersona] = useState(entrance); // 'CUSTOMER', 'CLEANER', 'ADMIN'
  const [showDebug, setShowDebug] = useState(false); // Developer console toggle
  const [registrationSuccess, setRegistrationSuccess] = useState(false); // Success confirmation card trigger
  const [tempUser, setTempUser] = useState(null); // Temporarily store user until confirmation click
  const [portalMode, setPortalMode] = useState('REGISTER'); // 'REGISTER' or 'LOGIN'

  // Active Signup Tab: 'CUSTOMER', 'CLEANER_INDIVIDUAL', 'CLEANER_AGENCY'
  const [signupTab, setSignupTab] = useState(entrance === 'CUSTOMER' ? 'CUSTOMER' : 'CLEANER_INDIVIDUAL');

  const lastFetchedDbRef = useRef('');

  const getApiUrl = (path) => {
    const port = window.location.port;
    if (port && (port.startsWith('51') || port.startsWith('52') || port === '3000')) {
      return `http://localhost:8080${path}`;
    }
    return path;
  };

  // 1. Polling database state from Python FastAPI sync server
  useEffect(() => {
    const loadDB = () => {
      fetch(getApiUrl('/api/v1/sync/db'))
        .then(r => r.json())
        .then(data => {
          if (data && data.users) {
            const dataStr = JSON.stringify(data);
            if (dataStr !== lastFetchedDbRef.current) {
              lastFetchedDbRef.current = dataStr;
              setDb(data);
            }
          }
        })
        .catch(err => console.log('Sync server unavailable (using client memory):', err));
    };
    loadDB();
    const interval = setInterval(loadDB, 2000);
    return () => clearInterval(interval);
  }, []);

  // 2. Watcher to post local database updates back to the Python FastAPI sync server
  useEffect(() => {
    if (!db || !db.users) return;
    const dbStr = JSON.stringify(db);
    if (dbStr === lastFetchedDbRef.current) return;

    const timer = setTimeout(() => {
      lastFetchedDbRef.current = dbStr;
      fetch(getApiUrl('/api/v1/sync/db'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(db)
      }).catch(err => console.log('Failed to write to sync server:', err));
    }, 300);
    return () => clearTimeout(timer);
  }, [db]);
  
  // Simulated OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  
  // --- Form States ---
  
  // 1. Common / Customer Fields
  const [phone, setPhone] = useState('+886912345678');
  const [name, setName] = useState('林艾麗斯');
  const [email, setEmail] = useState('alice@example.com');
  const [addrCategory, setAddrCategory] = useState('RESIDENTIAL');
  const [addrCity, setAddrCity] = useState('台中市');
  const [addrDistrict, setAddrDistrict] = useState('西區');
  const [addrStreet, setAddrStreet] = useState('公益路二段61號');
  const [hasElevator, setHasElevator] = useState(true);
  const [parkingInfo, setParkingInfo] = useState('大樓地下室停車場');
  const [lat, setLat] = useState(24.1512);
  const [lng, setLng] = useState(120.6521);

  // 2. Individual Cleaner Fields
  const [cleanerCity, setCleanerCity] = useState('台中市');
  const [cleanerDistrict, setCleanerDistrict] = useState('西區');
  const [cleanerStreet, setCleanerStreet] = useState('精誠路50號');
  const [idCardUrl, setIdCardUrl] = useState('s3://cleanmatch-secure/id_cards/encrypted_id.pdf');
  const [policeRecordUrl, setPoliceRecordUrl] = useState('s3://cleanmatch-secure/police_records/record_clean.pdf');

  // 3. Agency / Company Cleaner Fields
  const [businessName, setBusinessName] = useState('潔淨科技股份有限公司');
  const [taxId, setTaxId] = useState('12345678');
  const [agencyRadius, setAgencyRadius] = useState(15);
  const [agencyCity, setAgencyCity] = useState('台中市');
  const [agencyDistrict, setAgencyDistrict] = useState('南屯區');
  const [agencyStreet, setAgencyStreet] = useState('大墩路588號');
  const [businessLicenseUrl, setBusinessLicenseUrl] = useState('s3://cleanmatch-secure/business_licenses/license_verified.pdf');
  const [staffNameInput, setStaffNameInput] = useState('');
  const [staffPhoneInput, setStaffPhoneInput] = useState('');
  const [agencyStaffList, setAgencyStaffList] = useState([
    { name: '曾阿水 (David)', phone: '+886944444444' }
  ]);

  const handleAddStaff = () => {
    if (!staffNameInput || !staffPhoneInput) {
      alert('請填寫員工姓名與電話');
      return;
    }
    setAgencyStaffList([...agencyStaffList, { name: staffNameInput, phone: staffPhoneInput }]);
    setStaffNameInput('');
    setStaffPhoneInput('');
  };

  const handleRemoveStaff = (index) => {
    setAgencyStaffList(agencyStaffList.filter((_, i) => i !== index));
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!phone || !name) {
      alert('請填寫姓名與手機號碼');
      return;
    }
    setOtpSent(true);
    let updatedDB = addLog(db, 'PAYMENT', `[OTP 簡訊通道] 向手機號碼 ${phone} 發送 OTP 驗證碼：123456`);
    setDb(updatedDB);
  };

  const handleRegisterVerify = (e) => {
    e.preventDefault();
    if (otpCode !== '123456') {
      alert('驗證碼錯誤！請輸入 123456');
      return;
    }

    let updatedDB = { ...db };
    const newUserId = `u-${Date.now()}`;
    let loggedInUser = null;

    if (signupTab === 'CUSTOMER') {
      // 1. Register Customer User
      const newCustomer = {
        id: newUserId,
        phone,
        email,
        name,
        role: 'CUSTOMER',
        status: 'ACTIVE'
      };
      
      // Geocoding simulator: automatically resolve lat/lng coordinates based on address fields
      let resolvedLat = 24.1512;
      let resolvedLng = 120.6521;
      
      if (addrDistrict.includes('南屯')) {
        resolvedLat = 24.1585;
        resolvedLng = 120.6482;
      } else if (addrDistrict.includes('北區')) {
        resolvedLat = 24.1650;
        resolvedLng = 120.6620;
      } else {
        // Generate randomized coordinate around Taichung West District center
        const offsetLat = (Math.random() - 0.5) * 0.015;
        const offsetLng = (Math.random() - 0.5) * 0.015;
        resolvedLat = 24.1512 + offsetLat;
        resolvedLng = 120.6521 + offsetLng;
      }

      const newAddress = {
        id: `addr-${Date.now()}`,
        user_id: newUserId,
        category: addrCategory,
        contact_name: name,
        contact_phone: phone,
        city: addrCity,
        district: addrDistrict,
        street_address: addrStreet,
        building_has_elevator: hasElevator,
        parking_info: parkingInfo,
        geo_location: { lat: resolvedLat, lng: resolvedLng }
      };

      updatedDB.users = [...updatedDB.users, newCustomer];
      updatedDB.customer_addresses = [...updatedDB.customer_addresses, newAddress];
      updatedDB = addLog(updatedDB, 'DATABASE', `[案主註冊] 成功創建案主：${name} (${phone})`);
      updatedDB = addLog(updatedDB, 'POSTGIS', `[Geocoding API] 自動解析地址「${addrCity}${addrDistrict}${addrStreet}」為地理坐標 (${resolvedLat.toFixed(5)}, ${resolvedLng.toFixed(5)})`);
      loggedInUser = newCustomer;

    } else if (signupTab === 'CLEANER_INDIVIDUAL') {
      // 2. Register Cleaner (Individual)
      const newCleanerUser = {
        id: newUserId,
        phone,
        email,
        name,
        role: 'CLEANER',
        status: 'ACTIVE'
      };

      // Geocoding simulation for Cleaner Address
      let resolvedCleanerLat = 24.150;
      let resolvedCleanerLng = 120.650;
      
      if (cleanerDistrict.includes('南屯')) {
        resolvedCleanerLat = 24.1585;
        resolvedCleanerLng = 120.6482;
      } else if (cleanerDistrict.includes('北區')) {
        resolvedCleanerLat = 24.1650;
        resolvedCleanerLng = 120.6620;
      } else {
        // Generate randomized coordinate around Taichung West District center
        const offsetLat = (Math.random() - 0.5) * 0.015;
        const offsetLng = (Math.random() - 0.5) * 0.015;
        resolvedCleanerLat = 24.1512 + offsetLat;
        resolvedCleanerLng = 120.6521 + offsetLng;
      }

      const newCleanerProfile = {
        id: `c-ind-${Date.now()}`,
        user_id: newUserId,
        name,
        cleaner_type: 'INDIVIDUAL',
        business_name: null,
        tax_id: null,
        id_card_encrypted: idCardUrl,
        police_record_url: policeRecordUrl,
        service_radius_km: 15, // Default 15km service radius set silently under the hood
        service_location: { lat: resolvedCleanerLat, lng: resolvedCleanerLng },
        avg_rating: 5.00,
        total_orders_completed: 0,
        verified_status: 'VERIFIED'
      };

      updatedDB.users = [...updatedDB.users, newCleanerUser];
      updatedDB.cleaner_profiles = [...updatedDB.cleaner_profiles, newCleanerProfile];
      updatedDB = addLog(updatedDB, 'DATABASE', `[個體清潔員註冊] 成功註冊：${name}，上傳身分證與良民證 S3 憑證`);
      updatedDB = addLog(updatedDB, 'POSTGIS', `[Geocoding API] 自動解析清潔員地址「${cleanerCity}${cleanerDistrict}${cleanerStreet}」為服務中心點坐標 (${resolvedCleanerLat.toFixed(5)}, ${resolvedCleanerLng.toFixed(5)})`);
      loggedInUser = newCleanerUser;

    } else if (signupTab === 'CLEANER_AGENCY') {
      // 3. Register Cleaning Company
      const newAgencyManager = {
        id: newUserId,
        phone,
        email,
        name,
        role: 'CLEANER',
        status: 'ACTIVE'
      };

      const agencyProfileId = `c-age-${Date.now()}`;
      
      // Geocoding simulation for Cleaning Agency
      let resolvedAgencyLat = 24.162;
      let resolvedAgencyLng = 120.665;
      
      if (agencyDistrict.includes('南屯')) {
        resolvedAgencyLat = 24.1585;
        resolvedAgencyLng = 120.6482;
      } else if (agencyDistrict.includes('西區')) {
        resolvedAgencyLat = 24.1512;
        resolvedAgencyLng = 120.6521;
      } else if (agencyDistrict.includes('北區')) {
        resolvedAgencyLat = 24.1650;
        resolvedAgencyLng = 120.6620;
      } else {
        const offsetLat = (Math.random() - 0.5) * 0.015;
        const offsetLng = (Math.random() - 0.5) * 0.015;
        resolvedAgencyLat = 24.160 + offsetLat;
        resolvedAgencyLng = 120.660 + offsetLng;
      }

      const newAgencyProfile = {
        id: agencyProfileId,
        user_id: newUserId,
        name: `${businessName} (${name})`,
        cleaner_type: 'AGENCY',
        business_name: businessName,
        tax_id: taxId,
        id_card_encrypted: null,
        police_record_url: null,
        business_license_url: businessLicenseUrl,
        service_radius_km: agencyRadius,
        service_location: { lat: resolvedAgencyLat, lng: resolvedAgencyLng },
        avg_rating: 5.00,
        total_orders_completed: 0,
        verified_status: 'VERIFIED'
      };

      updatedDB.users = [...updatedDB.users, newAgencyManager];
      updatedDB.cleaner_profiles = [...updatedDB.cleaner_profiles, newAgencyProfile];
      
      // Add staff records
      agencyStaffList.forEach((staffMember, index) => {
        const staffUserId = `u-staff-${Date.now()}-${index}`;
        const staffUser = {
          id: staffUserId,
          phone: staffMember.phone,
          email: `${staffUserId}@cleanmatch.com`,
          name: staffMember.name,
          role: 'CLEANER',
          status: 'ACTIVE'
        };
        const staffLink = {
          id: `as-${Date.now()}-${index}`,
          agency_id: agencyProfileId,
          staff_user_id: staffUserId,
          role_in_agency: 'WORKER',
          status: 'ACTIVE'
        };
        updatedDB.users.push(staffUser);
        updatedDB.agency_staff.push(staffLink);
      });

      updatedDB = addLog(updatedDB, 'DATABASE', `[清潔公司註冊] 成功註冊「${businessName}」，公司統編：${taxId}，營業登記證已上傳 (GCS)。已指派 ${agencyStaffList.length} 位旗下員工。`);
      updatedDB = addLog(updatedDB, 'POSTGIS', `[Geocoding API] 自動解析營業地址「${agencyCity}${agencyDistrict}${agencyStreet}」為營運中心點座標 (${resolvedAgencyLat.toFixed(5)}, ${resolvedAgencyLng.toFixed(5)})`);
      updatedDB = addLog(updatedDB, 'POSTGIS', `[Google Maps API] 設定使用 Google Maps 距離矩陣 API 進行後續到府派單距離與導航里程之計算`);
      loggedInUser = newAgencyManager;
    }

    setDb(updatedDB);
    setTempUser(loggedInUser);
    setRegistrationSuccess(true);
  };

  const handleSendLoginOtp = (e) => {
    e.preventDefault();
    if (!phone) {
      alert('請輸入手機號碼');
      return;
    }
    // Verify if phone is registered in db.users
    const userExists = db.users.find(u => u.phone === phone);
    if (!userExists) {
      alert('此手機號碼尚未註冊！請切換至「新會員註冊」建立帳戶。');
      return;
    }
    setOtpSent(true);
    let updatedDB = addLog(db, 'PAYMENT', `[OTP 登入簡訊] 向手機號碼 ${phone} 發送登入簡訊驗證碼：123456`);
    setDb(updatedDB);
  };
  const handleLoginVerify = (e) => {
    e.preventDefault();
    if (otpCode !== '123456') {
      alert('簡訊驗證碼錯誤！請輸入 123456');
      return;
    }
    const user = db.users.find(u => u.phone === phone);
    if (!user) {
      alert('登入失敗，找不到該用戶');
      return;
    }

    // Entrance role validation
    if (entrance === 'CUSTOMER' && user.role !== 'CUSTOMER') {
      alert(`登入失敗！此入口僅限「案主/客戶」登入。\n\n您是「${user.role === 'CLEANER' ? '服務商/清潔人員' : '管理員'}」身分，請移至清潔端入口 (Port 5174) 登入！`);
      return;
    }
    if (entrance === 'CLEANER' && user.role !== 'CLEANER') {
      alert(`登入失敗！此入口僅限「清潔服務員/公司」登入。\n\n您是「客戶/案主」身分，請移至客戶端入口 (Port 5173) 登入！`);
      return;
    }
    
    let updatedDB = addLog(db, 'DATABASE', `[會員登入] 用戶「${user.name}」已透過手機號碼 ${phone} 驗證登入。`);
    setDb(updatedDB);
    
    // Reset states
    setOtpSent(false);
    setOtpCode('');
    setCurrentUser(user);
    setActivePersona(user.role);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setOtpSent(false);
    setOtpCode('');
  };

  const clearLogs = () => {
    setDb(prev => ({
      ...prev,
      logs: [{ id: 'log-clear', timestamp: new Date().toISOString(), type: 'SYSTEM', message: '日誌已清空。' }]
    }));
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="glass-panel app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--accent-teal), var(--accent-indigo))', padding: '10px', borderRadius: 'var(--radius-sm)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.5px' }}>
              CleanMatch <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--accent-teal)', background: 'var(--accent-teal-glow)', padding: '2px 8px', borderRadius: '999px', marginLeft: '6px' }}>O2O Clean Platform</span>
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>居家與商辦清潔媒合系統 - 移動端註冊驗證沙盒</p>
          </div>
        </div>

        {/* Global Monitor Button & Profiles */}
        <div className="app-header-controls">
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className={`btn ${showDebug ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 12px', fontSize: '0.75rem', borderRadius: '6px', borderColor: 'var(--accent-teal)', color: showDebug ? '#fff' : 'var(--accent-teal)' }}
          >
            <Database size={12} />
            {showDebug ? '隱藏技術監控' : '顯示技術監控'}
          </button>

          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Persona Switcher Tabs */}
              {isDevMode && (
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <button 
                    onClick={() => setActivePersona('CUSTOMER')}
                    className={`btn ${activePersona === 'CUSTOMER' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '5px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                  >
                    🙋‍♂️ 案主前台
                  </button>
                  <button 
                    onClick={() => setActivePersona('CLEANER')}
                    className={`btn ${activePersona === 'CLEANER' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '5px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                  >
                    🧹 服務端
                  </button>
                  <button 
                    onClick={() => setActivePersona('ADMIN')}
                    className={`btn ${activePersona === 'ADMIN' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '5px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                  >
                    ⚙️ 管理後端
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{currentUser.name}</span>
                <button onClick={handleLogout} className="btn btn-danger" style={{ padding: '5px 8px', fontSize: '0.7rem' }}>
                  <LogOut size={10} />
                  登出
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Grid Workspace */}
      {currentUser === null ? (
        registrationSuccess ? (
          /* REGISTRATION SUCCESS CONFIRMATION STEP */
          <div className="fade-in" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px 10px' }}>
            <div className="glass-panel glass-panel-glow-teal" style={{ width: '100%', maxWidth: '440px', padding: '32px', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--status-completed)', padding: '16px', borderRadius: '50%', marginBottom: '16px' }}>
                <CheckCircle size={48} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>🎉 註冊成功，認證完成！</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                您的 CleanMatch 帳戶已成功建立並通過驗證。
              </p>

              {/* Display dynamic details based on registered role */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'left', marginBottom: '24px', fontSize: '0.8rem', display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>會員姓名：</span>
                  <span style={{ fontWeight: 700 }}>{tempUser?.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>認證電話：</span>
                  <span style={{ fontFamily: 'monospace' }}>{tempUser?.phone}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>註冊身分：</span>
                  <span style={{ color: tempUser?.role === 'CUSTOMER' ? 'var(--accent-teal)' : 'var(--accent-indigo)', fontWeight: 700 }}>
                    {tempUser?.role === 'CUSTOMER' ? '🙋‍♂️ 案主 (顧客)' : '🧹 清潔服務商'}
                  </span>
                </div>
                
                {tempUser?.role === 'CUSTOMER' ? (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '4px' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>📍 首設服務地址：</p>
                    <p style={{ color: '#fff', fontWeight: 600 }}>{addrCity}{addrDistrict}{addrStreet}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--accent-teal)', marginTop: '4px' }}>📡 已成功在 PostGIS 空間資料庫建立地理定位點。</p>
                  </div>
                ) : signupTab === 'CLEANER_INDIVIDUAL' ? (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '4px' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>📍 常駐服務點：</p>
                    <p style={{ color: '#fff', fontWeight: 600 }}>{cleanerCity}{cleanerDistrict}{cleanerStreet}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)', marginTop: '4px' }}>📡 已完成證件驗證，並啟用 15 公里接單半徑。</p>
                  </div>
                ) : (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '4px' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>🏢 營業登記地址：</p>
                    <p style={{ color: '#fff', fontWeight: 600 }}>{agencyCity}{agencyDistrict}{agencyStreet}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--accent-pink)', marginTop: '4px' }}>📡 統編已驗證，已為旗下 {agencyStaffList.length} 位清潔員啟用智慧派工。</p>
                  </div>
                )}
              </div>

              {/* Confirm to Enter App */}
              <button 
                onClick={() => {
                  if (tempUser) {
                    setCurrentUser(tempUser);
                    setActivePersona(tempUser.role);
                  }
                  setRegistrationSuccess(false);
                  setTempUser(null);
                }} 
                className="btn btn-primary animate-pulse-glow" 
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.9rem', fontWeight: 700 }}
              >
                🚀 開始搜尋打掃人員與公司
              </button>
            </div>
          </div>
        ) : (
          /* MULTI-TAB REGISTER PORTAL (Mobile First optimized) */
          <div className="fade-in" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px 10px' }}>
            <div className="glass-panel glass-panel-glow-teal" style={{ width: '100%', maxWidth: '480px', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            
            {/* Mode Switcher: Sign Up vs Sign In */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', marginBottom: '20px' }}>
              <button 
                type="button"
                onClick={() => { setPortalMode('REGISTER'); setOtpSent(false); setOtpCode(''); }}
                style={{ flex: 1, border: 'none', background: portalMode === 'REGISTER' ? 'var(--accent-teal)' : 'none', color: '#fff', padding: '8px 4px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                📝 新會員註冊
              </button>
              <button 
                type="button"
                onClick={() => { setPortalMode('LOGIN'); setOtpSent(false); setOtpCode(''); }}
                style={{ flex: 1, border: 'none', background: portalMode === 'LOGIN' ? 'var(--accent-teal)' : 'none', color: '#fff', padding: '8px 4px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                🔑 會員登入 (簡訊密碼)
              </button>
            </div>

            {portalMode === 'REGISTER' ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Sparkles style={{ color: 'var(--accent-teal)' }} />
                    CleanMatch 會員註冊系統
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    第一次預約/接單，必須先完成系統註冊方可使用。
                  </p>
                </div>

                {/* TAB SELECTOR */}
                {!otpSent && (
                  <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', overflowX: 'auto' }}>
                    {entrance === 'CUSTOMER' ? (
                      <div style={{ flex: 1, textAlign: 'center', color: 'var(--accent-teal)', fontSize: '0.8rem', fontWeight: 700, padding: '4px' }}>
                        🙋‍♂️ 案主前台 會員註冊
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => setSignupTab('CLEANER_INDIVIDUAL')}
                          style={{ flex: 1, border: 'none', background: signupTab === 'CLEANER_INDIVIDUAL' ? 'var(--accent-indigo)' : 'none', color: '#fff', padding: '8px 4px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          🧹 個人清潔員
                        </button>
                        <button 
                          onClick={() => setSignupTab('CLEANER_AGENCY')}
                          style={{ flex: 1, border: 'none', background: signupTab === 'CLEANER_AGENCY' ? 'var(--accent-pink)' : 'none', color: '#fff', padding: '8px 4px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          🏢 清潔公司
                        </button>
                      </>
                    )}
                  </div>
                )}

                {!otpSent ? (
              /* Step 1: Input details based on selected signup tab */
              <form onSubmit={handleSendOtp} style={{ display: 'grid', gap: '12px' }}>
                
                {/* 1. Common account info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>聯絡姓名 / 負責人</label>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>手機號碼 (認證號)</label>
                    <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem', outline: 'none' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>電子郵件 (選填)</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem', outline: 'none' }} />
                </div>

                {/* --- CUSTOMER REGISTRATION FIELDS --- */}
                {signupTab === 'CUSTOMER' && (
                  <div className="fade-in" style={{ display: 'grid', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-teal)' }}>📍 初始化我的第一個服務地址</span>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>地址類別</span>
                        <select value={addrCategory} onChange={e => setAddrCategory(e.target.value)} style={{ padding: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '0.75rem', borderRadius: '4px' }}>
                          <option value="RESIDENTIAL">居家住宅 (Residential)</option>
                          <option value="OFFICE">辦公商辦 (Office)</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>電梯設備</span>
                        <select value={hasElevator ? 'yes' : 'no'} onChange={e => setHasElevator(e.target.value === 'yes')} style={{ padding: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '0.75rem', borderRadius: '4px' }}>
                          <option value="yes">大樓有電梯 (Elevator)</option>
                          <option value="no">無電梯 (Walk-up stairs)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '8px' }}>
                      <input type="text" placeholder="縣市(台中市)" value={addrCity} onChange={e => setAddrCity(e.target.value)} style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '0.75rem', borderRadius: '4px' }} />
                      <input type="text" placeholder="區(西區)" value={addrDistrict} onChange={e => setAddrDistrict(e.target.value)} style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '0.75rem', borderRadius: '4px' }} />
                      <input type="text" placeholder="路街與巷弄號" value={addrStreet} onChange={e => setAddrStreet(e.target.value)} style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '0.75rem', borderRadius: '4px' }} />
                    </div>

                    <input type="text" placeholder="停車資訊 (如: 門口可暫停、路邊車格)" value={parkingInfo} onChange={e => setParkingInfo(e.target.value)} style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '0.75rem', borderRadius: '4px' }} />
                  </div>
                )}

                {/* --- INDIVIDUAL CLEANER REGISTRATION FIELDS --- */}
                {signupTab === 'CLEANER_INDIVIDUAL' && (
                  <div className="fade-in" style={{ display: 'grid', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-indigo)' }}>🛡️ 常駐服務地址與安全資歷審查</span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>📍 常駐地址 (系統將自動解析地理座標定位)</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '8px' }}>
                        <input type="text" placeholder="縣市(台中市)" value={cleanerCity} onChange={e => setCleanerCity(e.target.value)} style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '0.75rem', borderRadius: '4px' }} />
                        <input type="text" placeholder="區(西區)" value={cleanerDistrict} onChange={e => setCleanerDistrict(e.target.value)} style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '0.75rem', borderRadius: '4px' }} />
                        <input type="text" placeholder="路街與巷弄號" value={cleanerStreet} onChange={e => setCleanerStreet(e.target.value)} style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '0.75rem', borderRadius: '4px' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>身分證加密直傳 (Simulated GCS Link)</span>
                      <input type="text" value={idCardUrl} onChange={e => setIdCardUrl(e.target.value)} style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: '#9ca3af', fontSize: '0.7rem', borderRadius: '4px' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>良民證審查存檔 (Simulated GCS Link)</span>
                      <input type="text" value={policeRecordUrl} onChange={e => setPoliceRecordUrl(e.target.value)} style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: '#9ca3af', fontSize: '0.7rem', borderRadius: '4px' }} />
                    </div>
                  </div>
                )}

                {/* --- AGENCY / COMPANY REGISTRATION FIELDS --- */}
                {signupTab === 'CLEANER_AGENCY' && (
                  <div className="fade-in" style={{ display: 'grid', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-pink)' }}>🏢 公司工商登記與派工團隊 (B2B Supply)</span>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>公司登記全名</span>
                        <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '0.75rem', borderRadius: '4px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>統一編號</span>
                        <input type="text" value={taxId} onChange={e => setTaxId(e.target.value)} style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '0.75rem', borderRadius: '4px' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>營業登記證 (Simulated GCS Link)</span>
                      <input type="text" value={businessLicenseUrl} onChange={e => setBusinessLicenseUrl(e.target.value)} style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', color: '#9ca3af', fontSize: '0.7rem', borderRadius: '4px' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>派工半徑： {agencyRadius} 公里</span>
                      <input type="range" min="5" max="100" value={agencyRadius} onChange={e => setAgencyRadius(parseInt(e.target.value))} style={{ height: '4px', background: 'rgba(255,255,255,0.1)' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>📍 營業地址 (系統將使用 Google Maps API 計算到府距離)</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '8px' }}>
                        <input type="text" placeholder="縣市(台中市)" value={agencyCity} onChange={e => setAgencyCity(e.target.value)} style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '0.75rem', borderRadius: '4px' }} />
                        <input type="text" placeholder="區(南屯區)" value={agencyDistrict} onChange={e => setAgencyDistrict(e.target.value)} style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '0.75rem', borderRadius: '4px' }} />
                        <input type="text" placeholder="路街與巷弄號" value={agencyStreet} onChange={e => setAgencyStreet(e.target.value)} style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '0.75rem', borderRadius: '4px' }} />
                      </div>
                    </div>

                    {/* Manage Staff sub-form */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>旗下派遣員工清單 (共 {agencyStaffList.length} 人)</span>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '4px', marginTop: '6px' }}>
                        <input type="text" placeholder="員工姓名" value={staffNameInput} onChange={e => setStaffNameInput(e.target.value)} style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '0.7rem', borderRadius: '3px' }} />
                        <input type="tel" placeholder="手機門號" value={staffPhoneInput} onChange={e => setStaffPhoneInput(e.target.value)} style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '0.7rem', borderRadius: '3px' }} />
                        <button type="button" onClick={handleAddStaff} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>新增</button>
                      </div>

                      <div style={{ display: 'grid', gap: '4px', marginTop: '8px', maxHeight: '80px', overflowY: 'auto' }}>
                        {agencyStaffList.map((st, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.02)', fontSize: '0.7rem' }}>
                            <span>{st.name} ({st.phone})</span>
                            <button type="button" onClick={() => handleRemoveStaff(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={12} /></button>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', padding: '10px', marginTop: '6px', fontSize: '0.85rem' }}>
                  獲取簡訊驗證碼
                </button>
              </form>
            ) : (
              /* Step 2: Input SMS Code */
              <form onSubmit={handleRegisterVerify} style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>已發送簡訊驗證碼至 {phone}</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" required maxLength="6" placeholder="請輸入 123456" 
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      style={{ width: '100%', padding: '10px 10px 10px 36px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: '#fff', outline: 'none', fontSize: '1rem', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--status-pending)', textAlign: 'center', marginTop: '4px' }}>
                    🔑 測試提示：請輸入系統模擬驗證碼 123456
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button type="button" onClick={() => setOtpSent(false)} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                    返回修改
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                    驗證並登入
                  </button>
                </div>
              </form>
            )}
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Lock style={{ color: 'var(--accent-teal)' }} size={20} />
                    CleanMatch 會員登入系統
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    使用註冊手機號碼做為帳號，配合簡訊密碼（OTP）登入系統。
                  </p>
                </div>

                {!otpSent ? (
                  /* Login Step 1: Phone number account input */
                  <form onSubmit={handleSendLoginOtp} style={{ display: 'grid', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>手機號碼 (登入帳號)</label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                          type="tel" required placeholder="請輸入註冊手機 (例如：+886912345678)" 
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          style={{ width: '100%', padding: '10px 10px 10px 36px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: '#fff', outline: 'none', fontSize: '0.95rem' }}
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', padding: '12px', fontSize: '0.85rem' }}>
                      獲取簡訊登入密碼
                    </button>
                  </form>
                ) : (
                  /* Login Step 2: Input SMS password (verification code) */
                  <form onSubmit={handleLoginVerify} style={{ display: 'grid', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>已向手機發送登入簡訊密碼至 {phone}</label>
                      <div style={{ position: 'relative' }}>
                        <Lock size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                          type="text" required maxLength="6" placeholder="請輸入 123456" 
                          value={otpCode}
                          onChange={e => setOtpCode(e.target.value)}
                          style={{ width: '100%', padding: '10px 10px 10px 36px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: '#fff', outline: 'none', fontSize: '1rem', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
                        />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--status-pending)', textAlign: 'center', marginTop: '4px' }}>
                        🔑 測試提示：請輸入系統模擬簡訊密碼 123456
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      <button type="button" onClick={() => setOtpSent(false)} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                        返回修改
                      </button>
                      <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                        確認登入
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {/* Hidden Seed bypass - Only display if showDebug is toggled ON to keep mobile screen neat */}
            {showDebug && (
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '12px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>[開發者模式] 快速以種子測試帳號繞過登入：</p>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {entrance === 'CUSTOMER' && (
                    <button onClick={() => { setCurrentUser(db.users[0]); setActivePersona('CUSTOMER'); }} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.65rem' }}>案主 Alice</button>
                  )}
                  {entrance === 'CLEANER' && (
                    <>
                      <button onClick={() => { setCurrentUser(db.users[1]); setActivePersona('CLEANER'); }} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.65rem' }}>清潔員 Bob</button>
                      <button onClick={() => { setCurrentUser(db.users[2]); setActivePersona('CLEANER'); }} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.65rem' }}>公司經理 Charlie</button>
                    </>
                  )}
                  {isDevMode && (
                    <button onClick={() => { setCurrentUser(db.users[6]); setActivePersona('ADMIN'); }} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.65rem' }}>管理員 Admin</button>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        )
      ) : (
        /* CORE WORKSPACE (After Registration & Login) */
        <main className={`main-content ${showDebug ? 'show-debug' : ''}`}>
          
          {/* Left Area: Active Persona App View */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Active Persona Intro Banner */}
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(17,24,39,0.9), rgba(9,15,30,0.9))' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>
                    {activePersona === 'CUSTOMER' ? '🙋‍♂️' : activePersona === 'CLEANER' ? '🧹' : '⚙️'}
                  </span>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>
                    {activePersona === 'CUSTOMER' ? '客戶前台預約系統' : activePersona === 'CLEANER' ? '清潔服務員接單系統' : '平台營運決策後台'}
                  </h2>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {activePersona === 'CUSTOMER' && `以案主 ${currentUser.name} 身份預約、加購、驗收與撥款。測試 PostGIS 地理定位與綠界交易託管。`}
                  {activePersona === 'CLEANER' && `以服務人員 ${currentUser.name} 身份承接排程與驗證施作實拍。`}
                  {activePersona === 'ADMIN' && '監控平台財務營收、抽成佣金，以及針對爭議訂單進行仲裁（撥款或全額退刷）。'}
                </p>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                <Users size={14} style={{ color: 'var(--accent-teal)' }} />
                <span>身分：{activePersona}</span>
              </div>
            </div>

            {/* Render Active View */}
            {activePersona === 'CUSTOMER' && (
              <CustomerDashboard db={db} setDb={setDb} activeUser={currentUser} />
            )}
            {activePersona === 'CLEANER' && (
              <CleanerDashboard db={db} setDb={setDb} />
            )}
            {activePersona === 'ADMIN' && (
              <AdminDashboard db={db} setDb={setDb} />
            )}
          </div>

          {/* Right Area: Simulator Logs & DB Inspector (Conditioned on showDebug) */}
          {showDebug && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Section A: System Logs Console */}
              <section className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '320px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <Terminal size={16} style={{ color: 'var(--accent-teal)' }} />
                    核心系統日誌交易追蹤 (Redis / PostGIS)
                  </h3>
                  <button onClick={clearLogs} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}>
                    清除日誌
                  </button>
                </div>

                {/* Console Log Area */}
                <div style={{ flex: 1, background: '#05070c', border: '1px solid var(--border-light)', borderRadius: '4px', padding: '12px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.75rem', display: 'flex', flexDirection: 'column-reverse', gap: '6px' }}>
                  {db.logs.map(log => {
                    let color = '#fff';
                    if (log.type === 'REDIS') color = 'var(--accent-indigo)';
                    if (log.type === 'POSTGIS') color = 'var(--accent-teal)';
                    if (log.type === 'PAYMENT') color = '#fbbf24';
                    if (log.type === 'DATABASE') color = '#10b981';
                    if (log.type === 'ADMIN') color = 'var(--accent-pink)';
                    
                    return (
                      <div key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                        <span style={{ color: '#6b7280' }}>[{log.timestamp.slice(11, 19)}]</span>{' '}
                        <span style={{ color, fontWeight: 700 }}>[{log.type}]</span>{' '}
                        <span style={{ color: '#d1d5db' }}>{log.message}</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Section B: Database Inspector */}
              <section className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '380px' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Database size={16} style={{ color: 'var(--accent-indigo)' }} />
                  PostgreSQL 資料表監視器 (Live Inspector)
                </h3>

                {/* Inspector Tabs */}
                <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px', marginBottom: '12px', overflowX: 'auto' }}>
                  {['orders', 'payments', 'bids', 'photos'].map(tab => (
                    <button 
                      key={tab} 
                      onClick={() => setActiveInspectorTab(tab)}
                      style={{ 
                        background: activeInspectorTab === tab ? 'rgba(99,102,241,0.15)' : 'none', 
                        border: 'none', 
                        color: activeInspectorTab === tab ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {tab === 'orders' && 'orders'}
                      {tab === 'payments' && 'payments'}
                      {tab === 'bids' && 'quotation_bids'}
                      {tab === 'photos' && 'proof_photos'}
                    </button>
                  ))}
                </div>

                {/* Table Viewer grid */}
                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', fontSize: '0.7rem', background: '#05070c', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                  
                  {activeInspectorTab === 'orders' && (
                    db.orders.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>暫無訂單資料 (Empty Set)</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '6px 4px' }}>order_no</th>
                            <th style={{ padding: '6px 4px' }}>type</th>
                            <th style={{ padding: '6px 4px' }}>amount</th>
                            <th style={{ padding: '6px 4px' }}>status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {db.orders.map(o => (
                            <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                              <td style={{ padding: '6px 4px', fontFamily: 'monospace' }}>{o.order_no}</td>
                              <td style={{ padding: '6px 4px' }}>{o.booking_type === 'INSTANT_FIXED' ? '定價' : '競標'}</td>
                              <td style={{ padding: '6px 4px', color: 'var(--accent-teal)' }}>NT$ {o.total_amount}</td>
                              <td style={{ padding: '6px 4px' }}>
                                <span style={{ color: `var(--status-${o.status.toLowerCase()})`, fontWeight: 700 }}>{o.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  )}

                  {activeInspectorTab === 'payments' && (
                    db.payments.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>暫無支付流水 (Empty Set)</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '6px 4px' }}>order_no</th>
                            <th style={{ padding: '6px 4px' }}>auth</th>
                            <th style={{ padding: '6px 4px' }}>captured</th>
                            <th style={{ padding: '6px 4px' }}>status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {db.payments.map(p => {
                            const order = db.orders.find(o => o.id === p.order_id);
                            return (
                              <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                <td style={{ padding: '6px 4px', fontFamily: 'monospace' }}>{order?.order_no || '未知'}</td>
                                <td style={{ padding: '6px 4px' }}>NT$ {p.auth_amount}</td>
                                <td style={{ padding: '6px 4px' }}>{p.captured_amount !== null ? `NT$ ${p.captured_amount}` : '-'}</td>
                                <td style={{ padding: '6px 4px', color: p.status === 'PAID' ? 'var(--status-completed)' : p.status === 'AUTHORIZED' ? 'var(--status-accepted)' : 'var(--status-disputed)', fontWeight: 700 }}>{p.status}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )
                  )}

                  {activeInspectorTab === 'bids' && (
                    db.quotation_bids.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>暫無競標單 (Empty Set)</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '6px 4px' }}>order_no</th>
                            <th style={{ padding: '6px 4px' }}>cleaner</th>
                            <th style={{ padding: '6px 4px' }}>bid</th>
                            <th style={{ padding: '6px 4px' }}>status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {db.quotation_bids.map(b => {
                            const order = db.orders.find(o => o.id === b.order_id);
                            const cleaner = db.cleaner_profiles.find(c => c.id === b.cleaner_id);
                            return (
                              <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                <td style={{ padding: '6px 4px', fontFamily: 'monospace' }}>{order?.order_no || '未知'}</td>
                                <td style={{ padding: '6px 4px' }}>{cleaner?.name.split(' (')[0]}</td>
                                <td style={{ padding: '6px 4px', color: 'var(--accent-indigo)' }}>NT$ {b.bid_amount}</td>
                                <td style={{ padding: '6px 4px', fontWeight: 700, color: b.status === 'ACCEPTED' ? 'var(--status-completed)' : b.status === 'REJECTED' ? 'var(--status-disputed)' : 'var(--status-pending)' }}>{b.status}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )
                  )}

                  {activeInspectorTab === 'photos' && (
                    db.service_proof_photos.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>暫無相片憑證 (Empty Set)</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '6px 4px' }}>order_no</th>
                            <th style={{ padding: '6px 4px' }}>phase</th>
                            <th style={{ padding: '6px 4px' }}>area</th>
                            <th style={{ padding: '6px 4px' }}>signature</th>
                          </tr>
                        </thead>
                        <tbody>
                          {db.service_proof_photos.map(p => {
                            const order = db.orders.find(o => o.id === p.order_id);
                            return (
                              <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                <td style={{ padding: '6px 4px', fontFamily: 'monospace' }}>{order?.order_no || '未知'}</td>
                                <td style={{ padding: '6px 4px' }}>{p.photo_phase === 'BEFORE_CLEANING' ? '施作前' : '施作後'}</td>
                                <td style={{ padding: '6px 4px' }}>{p.area_tag}</td>
                                <td style={{ padding: '6px 4px' }}>{p.client_signed_url ? '已簽名驗收' : '未簽名'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )
                  )}

                </div>
              </section>

            </div>
          )}
        </main>
      )}
    </div>
  );
}
