import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
//  AWS API LAYER — talks to Express backend on EC2 via ALB
// ═══════════════════════════════════════════════════════════════════════════════
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const apiFetch = async (path, opts = {}) => {
  const token = localStorage.getItem("vertix_token");
  const isForm = opts.body instanceof FormData;
  const headers = {
    ...(isForm ? {} : { "Content-Type": "application/json" }),
    ...(token   ? { Authorization: `Bearer ${token}` } : {}),
    ...opts.headers,
  };
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    body: isForm ? opts.body : opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Request failed"), { status: res.status });
  return data;
};

const apiGet    = (p)    => apiFetch(p);
const apiPost   = (p, b) => apiFetch(p, { method: "POST",   body: b });
const apiPut    = (p, b) => apiFetch(p, { method: "PUT",    body: b });
const apiPatch  = (p, b) => apiFetch(p, { method: "PATCH",  body: b });
const apiDelete = (p)    => apiFetch(p, { method: "DELETE" });

// Helper: upload file to profile/product endpoints
const apiUpload = (p, formData) => apiFetch(p, { method: "POST", body: formData });


// ─── Currency ─────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

// ─── Themes ───────────────────────────────────────────────────────────────────
const L = { bg:"#F1F5F9",card:"#FFFFFF",nav:"#FFFFFF",border:"#E2E8F0",text:"#0F172A",sub:"#64748B",muted:"#94A3B8",accent:"#2563EB",accentL:"#EFF6FF",success:"#10B981",warn:"#F59E0B",danger:"#EF4444",inp:"#F8FAFC",inpB:"#CBD5E1",sh:"rgba(15,23,42,0.07)" };
const D = { bg:"#060D1A",card:"#0F172A",nav:"#070E1C",border:"#1E293B",text:"#F1F5F9",sub:"#94A3B8",muted:"#475569",accent:"#3B82F6",accentL:"#1E3A5F28",success:"#10B981",warn:"#F59E0B",danger:"#EF4444",inp:"#1E293B",inpB:"#334155",sh:"rgba(0,0,0,0.45)" };

// ─── Languages ────────────────────────────────────────────────────────────────
const LANGS = {
  en:{ code:"en",label:"English",flag:"🇺🇸" },
  hi:{ code:"hi",label:"हिन्दी",flag:"🇮🇳" },
  ta:{ code:"ta",label:"தமிழ்",flag:"🇮🇳" },
  es:{ code:"es",label:"Español",flag:"🇪🇸" },
  fr:{ code:"fr",label:"Français",flag:"🇫🇷" },
  de:{ code:"de",label:"Deutsch",flag:"🇩🇪" },
  ar:{ code:"ar",label:"العربية",flag:"🇸🇦" },
};

// ─── Products ─────────────────────────────────────────────────────────────────
const ALL_PRODUCTS = [
  { id:1,  name:"Nexus Pro Headphones",   cat:"Audio",       price:24900,  orig:33200,  rating:4.2, reviews:1240, emoji:"🎧", badge:"BESTSELLER", desc:"Studio-grade ANC, 40hr battery, Hi-Res Audio certified.", seller:"AudioTech Pro" },
  { id:2,  name:"Quantum V1 Laptop",      cat:"Computers",   price:124900, orig:149900, rating:4.7, reviews:865,  emoji:"💻", badge:"NEW",         desc:"12-core CPU, 32GB RAM, 2TB NVMe, OLED 120Hz, 18hr battery.", seller:"VERTIX Official" },
  { id:3,  name:"Quantum V1 Smartwatch",  cat:"Wearables",   price:37400,  orig:41600,  rating:4.5, reviews:632,  emoji:"⌚", badge:"SALE",        desc:"Always-on AMOLED, ECG + SpO2, GPS, 5ATM water-resistant.", seller:"WearTech" },
  { id:4,  name:"ArcPad Pro Tablet",      cat:"Computers",   price:66600,  orig:83200,  rating:4.4, reviews:418,  emoji:"📱", badge:null,          desc:"12.9\" Liquid Retina, M3 chip, USB-C Thunderbolt 4.", seller:"VERTIX Official" },
  { id:5,  name:"Vortex Gaming Mouse",    cat:"Gaming",      price:7400,   orig:9900,   rating:4.8, reviews:2103, emoji:"🖱️", badge:"TOP PICK",    desc:"26000 DPI, 8 buttons, 95hr battery, ergonomic shell.", seller:"GameGear" },
  { id:6,  name:"NovaBuds X",             cat:"Audio",       price:12400,  orig:16600,  rating:4.3, reviews:987,  emoji:"🎵", badge:"SALE",        desc:"Adaptive ANC, spatial audio, 36hr case battery, IPX4.", seller:"AudioTech Pro" },
  { id:7,  name:"Phantom Keyboard",       cat:"Gaming",      price:14900,  orig:18200,  rating:4.6, reviews:761,  emoji:"⌨️", badge:null,          desc:"Hall-effect switches, 8000Hz polling, per-key RGB.", seller:"GameGear" },
  { id:8,  name:"StreamDeck Elite",       cat:"Gaming",      price:20700,  orig:24900,  rating:4.5, reviews:534,  emoji:"🎮", badge:"NEW",         desc:"32 LCD keys, drag-and-drop actions, USB-C hub.", seller:"GameGear" },
  { id:9,  name:"UltraWide Monitor",      cat:"Computers",   price:54100,  orig:66600,  rating:4.6, reviews:312,  emoji:"🖥️", badge:null,          desc:"34\" IPS, 165Hz, 1ms, HDR600, USB-C 90W, curved.", seller:"DisplayPro" },
  { id:10, name:"Nomad Drone",            cat:"Electronics", price:74900,  orig:91600,  rating:4.3, reviews:187,  emoji:"🚁", badge:"NEW",         desc:"4K/60fps camera, 45min flight, obstacle avoidance.", seller:"SkyTech" },
  { id:11, name:"Carbon Wallet",          cat:"Accessories", price:6600,   orig:8200,   rating:4.9, reviews:2400, emoji:"👛", badge:"TOP PICK",    desc:"RFID blocking carbon fibre, 12 cards, ultra-slim 2mm.", seller:"UrbanCarry" },
  { id:12, name:"Apex Speaker",           cat:"Audio",       price:16600,  orig:20700,  rating:4.5, reviews:678,  emoji:"🔊", badge:"SALE",        desc:"360° sound, IPX7 waterproof, 24hr playtime.", seller:"AudioTech Pro" },
  { id:13, name:"PowerBank 30000",        cat:"Electronics", price:3499,   orig:4999,   rating:4.4, reviews:890,  emoji:"🔋", badge:"SALE",        desc:"30000mAh, 65W fast charge, USB-C + 3 USB-A ports.", seller:"ChargeTech" },
  { id:14, name:"Mechanical Gamepad",     cat:"Gaming",      price:4999,   orig:6499,   rating:4.3, reviews:445,  emoji:"🕹️", badge:null,          desc:"Hall-effect thumbsticks, 12hr battery, cross-platform.", seller:"GameGear" },
  { id:15, name:"Smart LED Desk Lamp",    cat:"Electronics", price:2299,   orig:2999,   rating:4.6, reviews:1120, emoji:"💡", badge:null,          desc:"Touch-dimmer, 5 colour temps, USB-C charging port.", seller:"LightHouse" },
  { id:16, name:"Titanium Laptop Stand",  cat:"Accessories", price:5499,   orig:6999,   rating:4.7, reviews:760,  emoji:"🗂️", badge:"TOP PICK",    desc:"Aerospace titanium, 8-angle adjustable, 12kg load.", seller:"DeskPro" },
];

const CATS = ["All","Computers","Audio","Gaming","Wearables","Electronics","Accessories"];

const NOTIFS_INIT = [
  { id:1,type:"order",  title:"Order Shipped",      msg:"Your Quantum V1 Laptop is on its way! ETA 2 days.",   time:"2 min ago",  read:false, icon:"📦" },
  { id:2,type:"deal",   title:"Flash Sale 40% Off", msg:"Audio products on sale for the next 24 hours.",       time:"1 hr ago",   read:false, icon:"🔥" },
  { id:3,type:"seller", title:"New Sale!",           msg:"Your listing 'Carbon Wallet' sold for ₹6,600.",      time:"3 hrs ago",  read:false, icon:"💰" },
  { id:4,type:"system", title:"Security Alert",      msg:"New sign-in detected from Chrome on Windows 11.",    time:"Yesterday",  read:true,  icon:"🔒" },
  { id:5,type:"order",  title:"Order Delivered",     msg:"Your NovaBuds X has been delivered successfully.",   time:"2 days ago", read:true,  icon:"✅" },
  { id:6,type:"deal",   title:"Price Drop Alert",    msg:"Vortex Gaming Mouse dropped to ₹7,400.",             time:"3 days ago", read:true,  icon:"📉" },
];

const ORDERS_INIT = [
  { id:"VTX-A8F2", date:"12 Mar 2025", status:"delivered",  address:"123 MG Road, Chennai — 600001",       items:[{ name:"Nexus Pro Headphones",emoji:"🎧",qty:1,price:24900 }], total:29382 },
  { id:"VTX-B3K7", date:"8 Mar 2025",  status:"shipped",    address:"456 Park Street, Mumbai — 400001",    items:[{ name:"NovaBuds X",emoji:"🎵",qty:2,price:12400 },{ name:"Carbon Wallet",emoji:"👛",qty:1,price:6600 }], total:37484 },
  { id:"VTX-C9P1", date:"1 Mar 2025",  status:"processing", address:"123 MG Road, Chennai — 600001",       items:[{ name:"Vortex Gaming Mouse",emoji:"🖱️",qty:1,price:7400 }], total:8732 },
  { id:"VTX-D2R5", date:"22 Feb 2025", status:"delivered",  address:"22 Anna Nagar, Chennai — 600040",     items:[{ name:"Apex Speaker",emoji:"🔊",qty:1,price:16600 }], total:19588 },
];

// ─── Mini Components ──────────────────────────────────────────────────────────
function Logo({ size=22, col="#0F172A" }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:"8px",cursor:"pointer" }}>
      <svg width={size*1.5} height={size*1.5} viewBox="0 0 32 32" fill="none">
        <path d="M4 4 L12 26 L16 16 L20 26 L28 4" stroke="#2563EB" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 4 L13 20 L16 14 L19 20 L25 4" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      </svg>
      <span style={{ fontFamily:"'Barlow',sans-serif",fontWeight:800,fontSize:size,letterSpacing:"2.5px",color:col,textTransform:"uppercase",userSelect:"none" }}>VERTIX</span>
    </div>
  );
}

function Stars({ rating, size=12 }) {
  return (
    <span style={{ display:"inline-flex",gap:"1px",alignItems:"center" }}>
      {[1,2,3,4,5].map(i=>(
        <svg key={i} width={size} height={size} viewBox="0 0 12 12">
          <polygon points="6,1 7.5,4.5 11,5 8.5,7.5 9,11 6,9.5 3,11 3.5,7.5 1,5 4.5,4.5" fill={i<=Math.round(rating)?"#F59E0B":"#E2E8F0"}/>
        </svg>
      ))}
    </span>
  );
}

function Pill({ text, color="#2563EB" }) {
  return <span style={{ background:color+"22",color,fontSize:"9px",fontWeight:800,fontFamily:"'Barlow',sans-serif",letterSpacing:"1px",padding:"3px 9px",borderRadius:"20px",textTransform:"uppercase" }}>{text}</span>;
}

function StatusBadge({ status }) {
  const map = { delivered:{c:"#10B981",l:"Delivered"}, shipped:{c:"#2563EB",l:"Shipped"}, processing:{c:"#F59E0B",l:"Processing"}, cancelled:{c:"#EF4444",l:"Cancelled"} };
  const s = map[status]||map.processing;
  return <span style={{ background:s.c+"22",color:s.c,fontSize:"10px",fontWeight:800,padding:"3px 10px",borderRadius:"20px",fontFamily:"'Barlow',sans-serif",textTransform:"uppercase" }}>{s.l}</span>;
}

function Toasts({ items }) {
  return (
    <div style={{ position:"fixed",top:"78px",right:"20px",zIndex:9999,display:"flex",flexDirection:"column",gap:"8px",pointerEvents:"none" }}>
      {items.map(t=>(
        <div key={t.id} style={{ background:t.type==="success"?"#0D9488":t.type==="error"?"#DC2626":"#2563EB",color:"#fff",padding:"11px 18px",borderRadius:"10px",fontSize:"13px",fontFamily:"'Barlow',sans-serif",fontWeight:600,boxShadow:"0 8px 24px rgba(0,0,0,0.25)",display:"flex",alignItems:"center",gap:"10px",maxWidth:"300px",animation:"toastSlide .3s ease" }}>
          <span>{t.type==="success"?"✓":t.type==="error"?"✕":"ℹ"}</span>{t.msg}
        </div>
      ))}
    </div>
  );
}

function Field({ label, type="text", value, onChange, placeholder, th, icon, readOnly=false, as="input" }) {
  const base = { width:"100%",background:readOnly?th.bg:th.inp,border:`1.5px solid ${th.inpB}`,color:th.text,borderRadius:"8px",fontSize:"13px",fontFamily:"'Barlow',sans-serif",outline:"none",boxSizing:"border-box",transition:"border-color .2s" };
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:"5px" }}>
      {label && <label style={{ color:th.sub,fontSize:"11px",fontFamily:"'Barlow',sans-serif",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase" }}>{label}</label>}
      <div style={{ position:"relative" }}>
        {icon && <span style={{ position:"absolute",left:"12px",top:"50%",transform:"translateY(-50%)",fontSize:"15px",pointerEvents:"none" }}>{icon}</span>}
        {as==="textarea"
          ? <textarea value={value} onChange={e=>onChange(e.target.value)} readOnly={readOnly} placeholder={placeholder} style={{ ...base,padding:"11px 14px",resize:"vertical",minHeight:"80px" }} onFocus={e=>{ if(!readOnly) e.target.style.borderColor=th.accent; }} onBlur={e=>e.target.style.borderColor=th.inpB}/>
          : <input readOnly={readOnly} type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{ ...base,padding:icon?"11px 14px 11px 38px":"11px 14px" }} onFocus={e=>{ if(!readOnly) e.target.style.borderColor=th.accent; }} onBlur={e=>e.target.style.borderColor=th.inpB}/>
        }
      </div>
    </div>
  );
}

function Btn({ children, onClick, variant="primary", full=false, small=false, th, disabled=false, style:ex={} }) {
  const vs = {
    primary: { background:disabled?"#93C5FD":th.accent, color:"#fff", border:"none" },
    ghost:   { background:"transparent", color:th.text, border:`1.5px solid ${th.border}` },
    outline: { background:"transparent", color:th.accent, border:`1.5px solid ${th.accent}` },
    danger:  { background:"transparent", color:th.danger, border:`1.5px solid ${th.danger}` },
  };
  return (
    <button onClick={disabled?undefined:onClick} disabled={disabled}
      style={{ ...vs[variant],borderRadius:"8px",padding:small?"7px 14px":"11px 22px",fontSize:small?"12px":"13px",fontFamily:"'Barlow',sans-serif",fontWeight:700,letterSpacing:"0.8px",cursor:disabled?"default":"pointer",width:full?"100%":"auto",transition:"all .2s",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"7px",...ex }}
      onMouseEnter={e=>{ if(!disabled){ e.currentTarget.style.opacity="0.85"; e.currentTarget.style.transform="translateY(-1px)"; }}}
      onMouseLeave={e=>{ e.currentTarget.style.opacity="1"; e.currentTarget.style.transform="translateY(0)"; }}>
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════
function AuthPage({ onAuth, isDark, setDark, lang, setLang, loading }) {
  const th = isDark ? D : L;
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name:"",email:"",password:"",confirmPwd:"",phone:"" });
  const [loading, setLoading] = useState(false);
  const set = k => v => setForm(f=>({...f,[k]:v}));
  const [localLoading, setLocalLoading] = useState(false);
  const isLoading = loading || localLoading;
  const submit = async () => {
    if (!form.email) { return; }
    setLocalLoading(true);
    await onAuth({
      name: form.name || undefined,
      email: form.email,
      password: form.password,
      phone: form.phone || undefined,
    }, mode);
    setLocalLoading(false);
  };
  return (
    <div style={{ minHeight:"100vh",display:"grid",gridTemplateColumns:"1fr 1fr",background:th.bg }}>
      <div style={{ background:"linear-gradient(145deg,#060D1A 0%,#0F2A4A 55%,#1E40AF 100%)",display:"flex",flexDirection:"column",justifyContent:"center",padding:"64px",position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",inset:0,opacity:0.06 }}>
          {[...Array(9)].map((_,i)=><div key={i} style={{ position:"absolute",width:`${100+i*45}px`,height:`${100+i*45}px`,border:"1px solid #60A5FA",borderRadius:`${8+i*4}px`,top:`${8+i*9}%`,left:`${3+i*7}%`,transform:`rotate(${i*18}deg)` }}/>)}
        </div>
        <div style={{ position:"relative",zIndex:1 }}>
          <Logo size={26} col="#FFFFFF"/>
          <div style={{ marginTop:"48px",color:"#60A5FA",fontSize:"10px",fontFamily:"'Barlow',sans-serif",fontWeight:700,letterSpacing:"3.5px",marginBottom:"12px" }}>INDIA'S PREMIUM MARKETPLACE</div>
          <h1 style={{ color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontSize:"clamp(32px,3.5vw,52px)",fontWeight:800,lineHeight:1.08,marginBottom:"18px",textTransform:"uppercase" }}>
            Shop Smarter.<br/>Sell Faster.<br/><span style={{ color:"#60A5FA" }}>Scale Higher.</span>
          </h1>
          <p style={{ color:"#94A3B8",fontSize:"14px",lineHeight:"1.85",fontFamily:"'Barlow',sans-serif",maxWidth:"340px",marginBottom:"36px" }}>Join 2M+ buyers and sellers — India's fastest-growing premium electronics marketplace.</p>
          {[["🛡️","Secure Payments","UPI · Cards · NetBanking"],["🚀","Fast Delivery","Free above ₹999 pan-India"],["💰","Seller Protection","Guaranteed ₹ payouts"],["🌍","7 Languages","Shop in your language"]].map(([ic,ti,su])=>(
            <div key={ti} style={{ display:"flex",alignItems:"center",gap:"14px",marginBottom:"14px" }}>
              <div style={{ width:"36px",height:"36px",background:"rgba(96,165,250,0.12)",borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"17px",border:"1px solid rgba(96,165,250,0.2)",flexShrink:0 }}>{ic}</div>
              <div><div style={{ color:"#E2E8F0",fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"13px" }}>{ti}</div><div style={{ color:"#64748B",fontFamily:"'Barlow',sans-serif",fontSize:"11px" }}>{su}</div></div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"40px",background:th.card,overflowY:"auto",position:"relative" }}>
        <div style={{ position:"absolute",top:"20px",right:"24px",display:"flex",gap:"10px" }}>
          <select value={lang} onChange={e=>setLang(e.target.value)} style={{ background:th.inp,border:`1px solid ${th.border}`,color:th.text,borderRadius:"6px",padding:"6px 10px",fontSize:"12px",fontFamily:"'Barlow',sans-serif",cursor:"pointer",outline:"none" }}>
            {Object.values(LANGS).map(l=><option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
          </select>
          <button onClick={()=>setDark(d=>!d)} style={{ background:th.inp,border:`1px solid ${th.border}`,color:th.text,borderRadius:"6px",padding:"6px 10px",cursor:"pointer",fontSize:"14px" }}>{isDark?"☀️":"🌙"}</button>
        </div>
        <div style={{ width:"100%",maxWidth:"400px" }}>
          <div style={{ marginBottom:"28px" }}>
            <h2 style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"28px",fontWeight:800,textTransform:"uppercase",marginBottom:"6px" }}>{mode==="login"?"Sign In to VERTIX":"Create your Account"}</h2>
            <p style={{ color:th.sub,fontSize:"13px",fontFamily:"'Barlow',sans-serif" }}>
              {mode==="login"?"New to VERTIX? ":"Already have an account? "}
              <span onClick={()=>setMode(m=>m==="login"?"register":"login")} style={{ color:th.accent,cursor:"pointer",fontWeight:700 }}>{mode==="login"?"Create Account":"Sign In"}</span>
            </p>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
            {mode==="register" && <Field label="Full Name" value={form.name} onChange={set("name")} placeholder="Arjun Kumar" th={th} icon="👤"/>}
            <Field label="Email" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" th={th} icon="✉️"/>
            {mode==="register" && <Field label="Phone" value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" th={th} icon="📱"/>}
            <Field label="Password" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" th={th} icon="🔑"/>
            {mode==="register" && <Field label="Confirm Password" type="password" value={form.confirmPwd} onChange={set("confirmPwd")} placeholder="••••••••" th={th} icon="🔒"/>}
            {mode==="login" && <div style={{ textAlign:"right" }}><span style={{ color:th.accent,fontSize:"12px",cursor:"pointer",fontFamily:"'Barlow',sans-serif",fontWeight:600 }}>Forgot password?</span></div>}
            <Btn onClick={submit} full th={th} disabled={isLoading}>{isLoading?"Please wait…":mode==="login"?"Sign In":"Create Account"}</Btn>
            <div style={{ display:"flex",alignItems:"center",gap:"12px" }}><div style={{ flex:1,height:"1px",background:th.border }}/><span style={{ color:th.muted,fontSize:"11px",fontFamily:"'Barlow',sans-serif" }}>OR</span><div style={{ flex:1,height:"1px",background:th.border }}/></div>
            {[["G","Continue with Google","#DB4437"],["f","Continue with Facebook","#1877F2"]].map(([lt,lb,c])=>(
              <button key={lb} onClick={submit} style={{ width:"100%",background:isDark?th.inp:"#fff",border:`1.5px solid ${th.border}`,color:th.text,borderRadius:"8px",padding:"11px",fontSize:"13px",fontFamily:"'Barlow',sans-serif",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px" }} onMouseEnter={e=>e.currentTarget.style.borderColor=c} onMouseLeave={e=>e.currentTarget.style.borderColor=th.border}>
                <span style={{ fontWeight:800,color:c,fontSize:"16px" }}>{lt}</span>{lb}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOPBAR
// ═══════════════════════════════════════════════════════════════════════════════
function Topbar({ user, page, setPage, isDark, setDark, lang, setLang, cartCount, notifCount, wishCount, searchQ, setSearchQ }) {
  const th = isDark ? D : L;
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) { setProfileOpen(false); setLangOpen(false); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <header style={{ background:th.nav,borderBottom:`1px solid ${th.border}`,position:"sticky",top:0,zIndex:200,boxShadow:`0 2px 12px ${th.sh}` }}>
      <div style={{ background:"#060D1A",padding:"6px 28px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <span style={{ color:"#94A3B8",fontSize:"11px",fontFamily:"'Barlow',sans-serif" }}>🔥 Flash Sale — 40% off Audio · Free delivery above ₹999</span>
        <div style={{ display:"flex",gap:"14px" }}>
          {["Track Order","Help","Sell on VERTIX"].map(l=>(
            <span key={l} onClick={()=>{ if(l==="Sell on VERTIX") setPage("seller"); }} style={{ color:"#94A3B8",fontSize:"11px",fontFamily:"'Barlow',sans-serif",cursor:"pointer" }} onMouseEnter={e=>e.target.style.color="#60A5FA"} onMouseLeave={e=>e.target.style.color="#94A3B8"}>{l}</span>
          ))}
        </div>
      </div>
      <div style={{ padding:"0 28px",display:"flex",alignItems:"center",gap:"12px",height:"60px" }}>
        <div onClick={()=>setPage("home")}><Logo size={18} col={th.text}/></div>
        <div style={{ flex:1,maxWidth:"520px",position:"relative",margin:"0 8px" }}>
          <div style={{ position:"absolute",left:"12px",top:"50%",transform:"translateY(-50%)",color:th.muted,pointerEvents:"none" }}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="9" cy="9" r="7"/><line x1="18" y1="18" x2="13.65" y2="13.65"/></svg>
          </div>
          <input value={searchQ}
            onChange={e=>{ setSearchQ(e.target.value); setPage("home"); }}
            onKeyDown={e=>{ if(e.key==="Enter"){ setPage("home"); e.target.blur(); } }}
            placeholder="Search products, categories or price e.g. ₹10000…"
            style={{ width:"100%",background:th.inp,border:`1.5px solid ${th.inpB}`,color:th.text,borderRadius:"10px",padding:"9px 36px 9px 38px",fontSize:"12px",fontFamily:"'Barlow',sans-serif",outline:"none",boxSizing:"border-box" }}
            onFocus={e=>e.target.style.borderColor=th.accent} onBlur={e=>e.target.style.borderColor=th.inpB}/>
          {searchQ && <button onClick={()=>{ setSearchQ(""); setPage("home"); }} style={{ position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:th.muted,cursor:"pointer",fontSize:"18px",lineHeight:1,padding:0,fontWeight:700 }}>×</button>}
        </div>
        {[{k:"home",l:"Home",ic:"🏠"},{k:"wishlist",l:"Wishlist",ic:"❤️",b:wishCount},{k:"notifications",l:"Alerts",ic:"🔔",b:notifCount},{k:"seller",l:"Sell",ic:"🏪"}].map(n=>(
          <button key={n.k} onClick={()=>setPage(n.k)} style={{ position:"relative",background:page===n.k?th.accentL:"transparent",border:"none",borderRadius:"8px",padding:"7px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px",color:page===n.k?th.accent:th.sub,fontFamily:"'Barlow',sans-serif",fontWeight:600,fontSize:"12px",transition:"all .2s",whiteSpace:"nowrap" }} onMouseEnter={e=>{ if(page!==n.k) e.currentTarget.style.background=isDark?"#1E293B":"#F8FAFC"; }} onMouseLeave={e=>{ if(page!==n.k) e.currentTarget.style.background="transparent"; }}>
            {n.ic} {n.l}
            {n.b>0 && <span style={{ background:th.accent,color:"#fff",width:"16px",height:"16px",borderRadius:"50%",fontSize:"9px",fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",position:"absolute",top:"1px",right:"1px" }}>{n.b}</span>}
          </button>
        ))}
        <button onClick={()=>setPage("cart")} style={{ position:"relative",background:page==="cart"?th.accentL:"transparent",border:"none",borderRadius:"8px",padding:"7px 10px",cursor:"pointer",color:page==="cart"?th.accent:th.sub,display:"flex",alignItems:"center",gap:"5px",fontFamily:"'Barlow',sans-serif",fontWeight:600,fontSize:"12px" }}>
          🛒 Cart {cartCount>0 && <span style={{ background:th.accent,color:"#fff",width:"16px",height:"16px",borderRadius:"50%",fontSize:"9px",fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center" }}>{cartCount}</span>}
        </button>
        <div ref={ref} style={{ position:"relative" }}>
          <button onClick={()=>{ setLangOpen(o=>!o); setProfileOpen(false); }} style={{ background:th.inp,border:`1px solid ${th.border}`,color:th.text,borderRadius:"8px",padding:"7px 9px",cursor:"pointer",fontSize:"12px",fontFamily:"'Barlow',sans-serif",display:"flex",alignItems:"center",gap:"5px" }}>
            {LANGS[lang].flag} {lang.toUpperCase()} ▾
          </button>
          {langOpen && (
            <div style={{ position:"absolute",right:0,top:"calc(100% + 8px)",background:th.card,border:`1px solid ${th.border}`,borderRadius:"12px",padding:"8px",boxShadow:`0 16px 48px ${th.sh}`,zIndex:300,minWidth:"170px" }}>
              {Object.values(LANGS).map(l=>(
                <button key={l.code} onClick={()=>{ setLang(l.code); setLangOpen(false); }} style={{ width:"100%",background:lang===l.code?th.accentL:"transparent",border:"none",borderRadius:"8px",padding:"9px 12px",cursor:"pointer",color:lang===l.code?th.accent:th.text,fontFamily:"'Barlow',sans-serif",fontSize:"13px",textAlign:"left",display:"flex",alignItems:"center",gap:"10px",fontWeight:lang===l.code?700:500 }}>
                  <span style={{ fontSize:"18px" }}>{l.flag}</span>{l.label}{lang===l.code&&<span style={{ marginLeft:"auto" }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={()=>setDark(d=>!d)} style={{ background:th.inp,border:`1px solid ${th.border}`,color:th.text,borderRadius:"8px",padding:"7px 9px",cursor:"pointer",fontSize:"14px",lineHeight:1 }}>{isDark?"☀️":"🌙"}</button>
        <div style={{ position:"relative" }}>
          <button onClick={()=>{ setProfileOpen(o=>!o); setLangOpen(false); }} style={{ background:"none",border:`2px solid ${th.accent}`,borderRadius:"50%",width:"36px",height:"36px",cursor:"pointer",padding:0,overflow:"hidden",flexShrink:0 }}>
            {user.photo ? <img src={user.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%" }}/> : <div style={{ width:"100%",height:"100%",background:th.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px",color:"#fff" }}>👤</div>}
          </button>
          {profileOpen && (
            <div style={{ position:"absolute",right:0,top:"calc(100% + 10px)",background:th.card,border:`1px solid ${th.border}`,borderRadius:"14px",padding:"8px",boxShadow:`0 16px 48px ${th.sh}`,zIndex:300,minWidth:"220px" }}>
              <div style={{ padding:"12px 14px 10px",borderBottom:`1px solid ${th.border}`,marginBottom:"6px",display:"flex",alignItems:"center",gap:"10px" }}>
                <div style={{ width:"38px",height:"38px",borderRadius:"50%",overflow:"hidden",background:th.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  {user.photo ? <img src={user.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <span style={{ color:"#fff",fontSize:"17px" }}>👤</span>}
                </div>
                <div>
                  <div style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"13px" }}>{user.name}</div>
                  <div style={{ color:th.sub,fontSize:"11px",fontFamily:"'Barlow',sans-serif" }}>{user.email}</div>
                </div>
              </div>
              {[{ic:"👤",lb:"My Profile",k:"profile"},{ic:"📦",lb:"My Orders",k:"orders"},{ic:"❤️",lb:"Wishlist",k:"wishlist"},{ic:"📍",lb:"My Addresses",k:"addresses"},{ic:"🔔",lb:"Notifications",k:"notifications"},{ic:"🏪",lb:"Seller Hub",k:"seller"},{ic:"⚙️",lb:"Settings",k:"settings"}].map(it=>(
                <button key={it.k} onClick={()=>{ setPage(it.k); setProfileOpen(false); }} style={{ width:"100%",background:"transparent",border:"none",borderRadius:"8px",padding:"9px 12px",cursor:"pointer",color:th.text,fontFamily:"'Barlow',sans-serif",fontSize:"13px",textAlign:"left",display:"flex",alignItems:"center",gap:"10px",fontWeight:500 }} onMouseEnter={e=>e.currentTarget.style.background=isDark?"#1E293B":"#F8FAFC"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{ fontSize:"15px" }}>{it.ic}</span>{it.lb}
                </button>
              ))}
              <div style={{ height:"1px",background:th.border,margin:"6px 0" }}/>
              <button onClick={()=>{ setPage("logout"); setProfileOpen(false); }} style={{ width:"100%",background:"transparent",border:"none",borderRadius:"8px",padding:"9px 12px",cursor:"pointer",color:th.danger,fontFamily:"'Barlow',sans-serif",fontSize:"13px",textAlign:"left",display:"flex",alignItems:"center",gap:"10px",fontWeight:600 }} onMouseEnter={e=>e.currentTarget.style.background="#FEE2E2"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOME PAGE — search by name, category, price
// ═══════════════════════════════════════════════════════════════════════════════
function HomePage({ isDark, products: propProducts, onAddCart, onWishlist, wishlist, onView, searchQ, onSearch }) {
  const th = isDark ? D : L;
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("featured");

  // Reset category filter when a new search is typed
  const prevSearchQ = useRef(searchQ);
  useEffect(() => {
    if (searchQ && searchQ !== prevSearchQ.current) { setCat("All"); }
    prevSearchQ.current = searchQ;
  }, [searchQ]);
  const bcols = { BESTSELLER:"#F59E0B", NEW:"#10B981", SALE:"#2563EB", "TOP PICK":"#8B5CF6" };

  const matchSearch = (p) => {
    if (!searchQ.trim()) return true;
    const q = searchQ.trim().toLowerCase().replace("₹","").replace(/,/g,"");
    const rangeM = q.match(/^(\d+)\s*[-to]+\s*(\d+)$/);
    if (rangeM) return p.price >= +rangeM[1] && p.price <= +rangeM[2];
    const ltM = q.match(/^[<]\s*(\d+)$/);
    if (ltM) return p.price < +ltM[1];
    const gtM = q.match(/^[>]\s*(\d+)$/);
    if (gtM) return p.price > +gtM[1];
    if (/^\d+$/.test(q)) { const n=+q; return p.price>=n*0.8&&p.price<=n*1.2; }
    const name=(p.name||"").toLowerCase();const category=(p.cat||p.category||"").toLowerCase();const seller=(p.seller||p.seller_name||"").toLowerCase();const desc=(p.desc||p.description||"").toLowerCase();return name.includes(q)||category.includes(q)||seller.includes(q)||desc.includes(q);
  };

  const sourceProds = propProducts || ALL_PRODUCTS;
  const catFilter = (p) => cat === "All" || (p.cat || p.category || "") === cat;
  let prods = sourceProds.filter(p => catFilter(p) && matchSearch(p));
  if (sort==="price_asc")  prods = [...prods].sort((a,b)=>a.price-b.price);
  if (sort==="price_desc") prods = [...prods].sort((a,b)=>b.price-a.price);
  if (sort==="rating")     prods = [...prods].sort((a,b)=>b.rating-a.rating);

  return (
    <div style={{ background:th.bg,minHeight:"calc(100vh - 108px)" }}>
      <div style={{ background:"linear-gradient(135deg,#060D1A 0%,#0F2A4A 55%,#1D4ED8 100%)",padding:"50px 28px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"36px",alignItems:"center" }}>
        <div>
          <Pill text="INDIA'S BEST DEALS 2025" color="#60A5FA"/>
          <h1 style={{ color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontSize:"clamp(34px,4vw,60px)",fontWeight:800,lineHeight:1.05,margin:"12px 0 14px",textTransform:"uppercase" }}>
            Trending Now<br/><span style={{ color:"#60A5FA" }}>on VERTIX</span>
          </h1>
          <p style={{ color:"#94A3B8",fontSize:"14px",fontFamily:"'Barlow',sans-serif",marginBottom:"24px",lineHeight:1.75 }}>Premium electronics & accessories — curated for India.</p>
          <div style={{ display:"flex",gap:"10px" }}>
            <button style={{ background:"#2563EB",color:"#fff",border:"none",borderRadius:"8px",padding:"11px 22px",fontFamily:"'Barlow',sans-serif",fontSize:"13px",fontWeight:700,cursor:"pointer" }}>🛒 Shop Now</button>
            <button style={{ background:"transparent",color:"#fff",border:"1.5px solid rgba(255,255,255,0.3)",borderRadius:"8px",padding:"11px 22px",fontFamily:"'Barlow',sans-serif",fontSize:"13px",fontWeight:700,cursor:"pointer" }}>🏪 Start Selling</button>
          </div>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px" }}>
          {ALL_PRODUCTS.slice(0,4).map(p=>(
            <div key={p.id} onClick={()=>onView(p)} style={{ background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"12px",padding:"14px",cursor:"pointer",textAlign:"center",transition:"all .2s" }} onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.13)"; e.currentTarget.style.transform="translateY(-2px)"; }} onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.07)"; e.currentTarget.style.transform="none"; }}>
              <div style={{ fontSize:"32px",marginBottom:"6px" }}>{p.emoji}</div>
              <div style={{ color:"#E2E8F0",fontSize:"11px",fontFamily:"'Barlow',sans-serif",fontWeight:700,lineHeight:1.2 }}>{p.name}</div>
              <div style={{ color:"#60A5FA",fontSize:"13px",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,marginTop:"3px" }}>{fmt(p.price)}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background:th.card,borderBottom:`1px solid ${th.border}`,padding:"11px 28px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap",position:"sticky",top:"108px",zIndex:100 }}>
        <div style={{ display:"flex",gap:"6px",flexWrap:"wrap" }}>
          {CATS.map(c=><button key={c} onClick={()=>setCat(c)} style={{ background:cat===c?th.accent:th.bg,color:cat===c?"#fff":th.sub,border:`1px solid ${cat===c?th.accent:th.border}`,borderRadius:"20px",padding:"5px 14px",cursor:"pointer",fontSize:"12px",fontFamily:"'Barlow',sans-serif",fontWeight:cat===c?700:500,transition:"all .2s" }}>{c}</button>)}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:"8px" }}>
          <select value={sort} onChange={e=>setSort(e.target.value)} style={{ background:th.inp,border:`1px solid ${th.border}`,color:th.text,borderRadius:"6px",padding:"6px 10px",fontSize:"12px",fontFamily:"'Barlow',sans-serif",outline:"none",cursor:"pointer" }}>
            <option value="featured">Featured</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="rating">Top Rated</option>
          </select>
          <span style={{ color:th.muted,fontSize:"11px",fontFamily:"'Barlow',sans-serif" }}>{prods.length} items</span>
        </div>
      </div>
      {searchQ && <div style={{ padding:"10px 28px",fontFamily:"'Barlow',sans-serif",fontSize:"13px",color:th.sub }}>🔍 {prods.length} result{prods.length!==1?"s":""} for <strong style={{ color:th.text }}>"{searchQ}"</strong></div>}
      {prods.length===0 ? (
        <div style={{ textAlign:"center",padding:"80px 28px" }}>
          <div style={{ fontSize:"52px",marginBottom:"12px" }}>🔍</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif",fontSize:"22px",fontWeight:800,color:th.text,marginBottom:"8px",textTransform:"uppercase" }}>No products found</div>
          <div style={{ fontFamily:"'Barlow',sans-serif",fontSize:"13px",color:th.sub }}>Try name, category, or price (e.g. "Audio", "₹10000", "5000-20000")</div>
        </div>
      ) : (
        <div style={{ padding:"24px 28px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"16px" }}>
          {prods.map((p,i)=>{
            const origP=p.orig||p.orig_price||p.price; const disc=origP>p.price?Math.round((1-p.price/origP)*100):0; const inW=wishlist.some(w=>String(w)===String(p.id));
            return (
              <div key={p.id} style={{ background:th.card,borderRadius:"16px",overflow:"hidden",border:`1px solid ${th.border}`,transition:"all .25s",animation:`fadeUp .4s ease ${i*0.03}s both`,boxShadow:`0 2px 8px ${th.sh}` }} onMouseEnter={e=>{ e.currentTarget.style.boxShadow=`0 12px 36px ${th.sh}`; e.currentTarget.style.transform="translateY(-4px)"; }} onMouseLeave={e=>{ e.currentTarget.style.boxShadow=`0 2px 8px ${th.sh}`; e.currentTarget.style.transform="none"; }}>
                <div style={{ position:"relative",height:"150px",background:isDark?th.bg:"#F8FAFC",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }} onClick={()=>onView(p)}>
                  <div style={{ fontSize:"64px" }}>{p.emoji}</div>
                  {p.badge && <div style={{ position:"absolute",top:"8px",left:"8px" }}><Pill text={p.badge} color={bcols[p.badge]}/></div>}
                  <div style={{ position:"absolute",top:"8px",right:"8px",background:"rgba(239,68,68,0.13)",color:"#EF4444",fontSize:"10px",fontWeight:800,padding:"3px 7px",borderRadius:"20px",fontFamily:"'Barlow',sans-serif" }}>-{disc}%</div>
                  <button onClick={e=>{ e.stopPropagation(); onWishlist(p.id); }} style={{ position:"absolute",bottom:"8px",right:"8px",background:inW?"#FEE2E2":"rgba(255,255,255,0.88)",border:"none",borderRadius:"50%",width:"28px",height:"28px",cursor:"pointer",fontSize:"13px",display:"flex",alignItems:"center",justifyContent:"center" }}>{inW?"❤️":"🤍"}</button>
                </div>
                <div style={{ padding:"12px" }}>
                  <div style={{ color:th.muted,fontSize:"10px",letterSpacing:"2px",fontFamily:"'Barlow',sans-serif",fontWeight:700,textTransform:"uppercase",marginBottom:"3px" }}>{p.cat}</div>
                  <div onClick={()=>onView(p)} style={{ color:th.text,fontSize:"13px",fontFamily:"'Barlow',sans-serif",fontWeight:700,marginBottom:"5px",lineHeight:1.3,cursor:"pointer" }}>{p.name}</div>
                  <div style={{ display:"flex",alignItems:"center",gap:"4px",marginBottom:"8px" }}><Stars rating={p.rating}/><span style={{ color:th.muted,fontSize:"10px",fontFamily:"'Barlow',sans-serif" }}>({p.reviews.toLocaleString()})</span></div>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <div>
                      <span style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"18px",fontWeight:800 }}>{fmt(p.price)}</span>
                      <span style={{ color:th.muted,fontSize:"10px",textDecoration:"line-through",marginLeft:"4px" }}>{fmt(p.orig||p.orig_price||p.price)}</span>
                    </div>
                    <Btn small th={th} onClick={()=>onAddCart(p)}>Add</Btn>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT DETAIL
// ═══════════════════════════════════════════════════════════════════════════════
function ProductDetailPage({ product, isDark, onAddCart, onWishlist, wishlist, onBack }) {
  const th = isDark ? D : L;
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState("overview");
  const inW = wishlist.some(w=>String(w)===String(product.id));
  const origP = product.orig||product.orig_price||product.price; const disc = origP>product.price?Math.round((1-product.price/origP)*100):0;
  return (
    <div style={{ background:th.bg,minHeight:"calc(100vh - 108px)",padding:"28px" }}>
      <div style={{ maxWidth:"1080px",margin:"0 auto" }}>
        <button onClick={onBack} style={{ background:"none",border:`1px solid ${th.border}`,color:th.sub,borderRadius:"8px",padding:"7px 14px",cursor:"pointer",fontFamily:"'Barlow',sans-serif",fontSize:"12px",marginBottom:"22px",display:"flex",alignItems:"center",gap:"6px" }}>← Back</button>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:"36px" }}>
          <div>
            <div style={{ background:th.card,border:`1px solid ${th.border}`,borderRadius:"18px",height:"300px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"100px",marginBottom:"10px" }}>{product.emoji}</div>
            <div style={{ display:"flex",gap:"8px" }}>{[0,1,2].map(i=><div key={i} style={{ flex:1,background:th.card,border:`1.5px solid ${i===0?th.accent:th.border}`,borderRadius:"10px",height:"66px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",cursor:"pointer" }}>{product.emoji}</div>)}</div>
          </div>
          <div>
            <div style={{ display:"flex",gap:"7px",marginBottom:"10px" }}>
              {product.badge && <Pill text={product.badge} color="#2563EB"/>}
              <Pill text={`-${disc}% OFF`} color="#EF4444"/>
            </div>
            <h1 style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"28px",fontWeight:800,marginBottom:"6px",textTransform:"uppercase" }}>{product.name}</h1>
            <div style={{ color:th.sub,fontSize:"12px",fontFamily:"'Barlow',sans-serif",marginBottom:"10px" }}>By <span style={{ color:th.accent,fontWeight:600 }}>{product.seller}</span> · {product.cat}</div>
            <div style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px" }}><Stars rating={product.rating} size={14}/><span style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700 }}>{product.rating}</span><span style={{ color:th.muted,fontSize:"11px" }}>({product.reviews.toLocaleString()} reviews)</span></div>
            <div style={{ display:"flex",alignItems:"baseline",gap:"10px",marginBottom:"18px" }}>
              <span style={{ color:th.accent,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"32px",fontWeight:800 }}>{fmt(product.price)}</span>
              <span style={{ color:th.muted,fontSize:"14px",textDecoration:"line-through" }}>{fmt(origP)}</span>
              <span style={{ color:"#10B981",fontSize:"12px",fontFamily:"'Barlow',sans-serif",fontWeight:700 }}>Save {fmt(origP-product.price)}</span>
            </div>
            <div style={{ display:"flex",background:th.bg,borderRadius:"10px",padding:"3px",marginBottom:"14px",border:`1px solid ${th.border}` }}>
              {["overview","specs","reviews"].map(tb=><button key={tb} onClick={()=>setTab(tb)} style={{ flex:1,background:tab===tb?th.card:"transparent",border:"none",borderRadius:"8px",padding:"7px",cursor:"pointer",color:tab===tb?th.text:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"12px",fontWeight:tab===tb?700:500,textTransform:"capitalize" }}>{tb}</button>)}
            </div>
            {tab==="overview" && <p style={{ color:th.sub,fontSize:"13px",fontFamily:"'Barlow',sans-serif",lineHeight:"1.85",marginBottom:"18px" }}>{product.desc}</p>}
            {tab==="specs" && <div style={{ marginBottom:"18px" }}>{[["Category",product.cat],["Rating",`${product.rating}/5 ⭐`],["Reviews",product.reviews.toLocaleString()],["Stock","In Stock"],["Warranty","1 Year"],["Seller",product.seller]].map(([k,v])=><div key={k} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${th.border}` }}><span style={{ color:th.muted,fontSize:"12px",fontFamily:"'Barlow',sans-serif" }}>{k}</span><span style={{ color:th.text,fontSize:"12px",fontFamily:"'Barlow',sans-serif",fontWeight:600 }}>{v}</span></div>)}</div>}
            {tab==="reviews" && <div style={{ marginBottom:"18px",display:"flex",flexDirection:"column",gap:"9px" }}>{[{u:"Arjun M.",r:5,c:"Premium quality! Worth every rupee."},{u:"Priya K.",r:4,c:"Fast delivery. Highly recommend!"},{u:"Rahul P.",r:5,c:"Best in class. VERTIX never disappoints!"}].map((rv,i)=><div key={i} style={{ background:th.bg,borderRadius:"10px",padding:"11px",border:`1px solid ${th.border}` }}><div style={{ display:"flex",justifyContent:"space-between",marginBottom:"3px" }}><span style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"12px" }}>{rv.u}</span><Stars rating={rv.r}/></div><span style={{ color:th.sub,fontSize:"12px",fontFamily:"'Barlow',sans-serif" }}>{rv.c}</span></div>)}</div>}
            <div style={{ display:"flex",gap:"9px",alignItems:"center",marginBottom:"11px" }}>
              <div style={{ display:"flex",alignItems:"center",gap:"7px",background:th.inp,border:`1px solid ${th.border}`,borderRadius:"8px",padding:"7px 11px" }}>
                <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{ background:"none",border:"none",color:th.text,cursor:"pointer",fontSize:"17px",fontWeight:700 }}>−</button>
                <span style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,minWidth:"22px",textAlign:"center" }}>{qty}</span>
                <button onClick={()=>setQty(q=>q+1)} style={{ background:"none",border:"none",color:th.text,cursor:"pointer",fontSize:"17px",fontWeight:700 }}>+</button>
              </div>
              <Btn th={th} full onClick={()=>{ for(let i=0;i<qty;i++) onAddCart(product); }}>🛒 Add to Cart</Btn>
              <button onClick={()=>onWishlist(product.id)} style={{ background:inW?"#FEE2E2":th.inp,border:`1px solid ${inW?"#FCA5A5":th.border}`,borderRadius:"8px",width:"40px",height:"40px",cursor:"pointer",fontSize:"17px",display:"flex",alignItems:"center",justifyContent:"center" }}>{inW?"❤️":"🤍"}</button>
            </div>
            <div style={{ display:"flex",gap:"12px",flexWrap:"wrap" }}>
              {["🚚 Free Shipping","🔄 7-Day Returns","🔒 Secure Pay","🛡️ 1-Yr Warranty"].map(f=><span key={f} style={{ color:th.sub,fontSize:"11px",fontFamily:"'Barlow',sans-serif" }}>{f}</span>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE PAGE — update name, age, DOB, profile photo
// ═══════════════════════════════════════════════════════════════════════════════
function ProfilePage({ isDark, user, setUser, addToast }) {
  const th = isDark ? D : L;
  const imgRef = useRef();

  const [form, setForm] = useState({
    name: user.name || "",
    dob:  user.dob  || "",
    phone: user.phone || "",
    gender: user.gender || "",
    bio: user.bio || "",
  });
  const [editing, setEditing] = useState(false);
  const [photoHover, setPhotoHover] = useState(false);
  const [errors, setErrors] = useState({});

  const set = k => v => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:""})); };

  // Auto-calculate age from DOB
  const calcAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birth = new Date(dob);
    if (isNaN(birth)) return null;
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 && age < 120 ? age : null;
  };

  const age = calcAge(form.dob);

  const formatDOBDisplay = (dob) => {
    if (!dob) return "Not set";
    const d = new Date(dob);
    if (isNaN(d)) return dob;
    return d.toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" });
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (form.dob) {
      const a = calcAge(form.dob);
      if (a === null || a < 10 || a > 100) errs.dob = "Please enter a valid date of birth";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { addToast("Photo must be under 5MB","error"); return; }
    // Preview immediately
    const r = new FileReader();
    r.onload = ev => setUser(u=>({...u, photo:ev.target.result}));
    r.readAsDataURL(file);
    // Upload to S3 via backend
    try {
      const fd = new FormData(); fd.append("photo", file);
      const res = await apiUpload("/api/profile/photo", fd);
      setUser(u=>({...u, photo_url:res.photo_url, photo:res.photo_url}));
      addToast("Profile photo uploaded to S3! 📸","success");
    } catch {
      addToast("Photo saved locally (S3 unavailable)","success");
    }
  };

  const removePhoto = async () => {
    setUser(u=>({...u,photo:null,photo_url:null}));
    try { await apiDelete("/api/profile/photo"); } catch {}
    addToast("Photo removed","success");
  };

  const save = () => {
    if (!validate()) return;
    setUser(u=>({...u, ...form}));
    setEditing(false);
    addToast("Profile updated successfully! ✓","success");
  };

  const cancel = () => {
    setForm({ name:user.name||"", dob:user.dob||"", phone:user.phone||"", gender:user.gender||"", bio:user.bio||"" });
    setErrors({});
    setEditing(false);
  };

  const inputStyle = (hasErr) => ({
    width:"100%", background:th.inp, border:`1.5px solid ${hasErr?"#EF4444":th.inpB}`,
    color:th.text, borderRadius:"10px", padding:"11px 14px", fontSize:"14px",
    fontFamily:"'Barlow',sans-serif", outline:"none", boxSizing:"border-box", transition:"border-color .2s",
  });

  const labelStyle = {
    color:th.sub, fontSize:"11px", fontFamily:"'Barlow',sans-serif",
    fontWeight:700, letterSpacing:"1px", textTransform:"uppercase",
    display:"block", marginBottom:"6px",
  };

  return (
    <div style={{ background:th.bg, minHeight:"calc(100vh - 108px)", padding:"32px 24px" }}>
      <div style={{ maxWidth:"680px", margin:"0 auto" }}>

        {/* Page header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"28px" }}>
          <div>
            <h2 style={{ color:th.text, fontFamily:"'Barlow Condensed',sans-serif", fontSize:"28px", fontWeight:800, textTransform:"uppercase", margin:0 }}>My Profile</h2>
            <p style={{ color:th.sub, fontFamily:"'Barlow',sans-serif", fontSize:"13px", marginTop:"4px" }}>Manage your personal information</p>
          </div>
          {!editing
            ? <Btn th={th} variant="outline" onClick={()=>setEditing(true)}>✏️ Edit Profile</Btn>
            : <div style={{ display:"flex", gap:"8px" }}>
                <Btn th={th} onClick={save}>💾 Save Changes</Btn>
                <Btn th={th} variant="ghost" onClick={cancel}>Cancel</Btn>
              </div>
          }
        </div>

        {/* ── Photo Card ── */}
        <div style={{ background:th.card, borderRadius:"18px", padding:"28px", border:`1px solid ${th.border}`, marginBottom:"16px", display:"flex", alignItems:"center", gap:"28px" }}>
          {/* Avatar */}
          <div style={{ position:"relative", flexShrink:0 }}>
            <div
              onMouseEnter={()=>setPhotoHover(true)}
              onMouseLeave={()=>setPhotoHover(false)}
              onClick={()=>imgRef.current.click()}
              style={{ width:"110px", height:"110px", borderRadius:"50%", overflow:"hidden", border:`3px solid ${th.accent}`, cursor:"pointer", position:"relative", background:th.accent, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s", boxShadow:`0 0 0 4px ${th.accent}22` }}
            >
              {user.photo
                ? <img src={user.photo} alt="profile" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                : <span style={{ fontSize:"46px", color:"#fff" }}>👤</span>
              }
              {/* Hover overlay */}
              <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.52)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", opacity:photoHover?1:0, transition:"opacity .2s", borderRadius:"50%" }}>
                <span style={{ fontSize:"22px" }}>📷</span>
                <span style={{ color:"#fff", fontSize:"10px", fontFamily:"'Barlow',sans-serif", fontWeight:700, marginTop:"3px" }}>CHANGE</span>
              </div>
            </div>
            <input ref={imgRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhoto}/>
          </div>

          {/* Info + photo actions */}
          <div style={{ flex:1 }}>
            <div style={{ color:th.text, fontFamily:"'Barlow Condensed',sans-serif", fontSize:"22px", fontWeight:800, marginBottom:"4px" }}>{user.name}</div>
            {age !== null && (
              <div style={{ color:th.sub, fontFamily:"'Barlow',sans-serif", fontSize:"13px", marginBottom:"4px" }}>
                🎂 {age} years old · {formatDOBDisplay(user.dob)}
              </div>
            )}
            <div style={{ color:th.sub, fontFamily:"'Barlow',sans-serif", fontSize:"12px", marginBottom:"10px" }}>{user.email}</div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:"5px", background:th.accentL, borderRadius:"20px", padding:"4px 12px", border:`1px solid ${th.accent}33` }}>
              <span style={{ color:th.accent, fontSize:"10px", fontFamily:"'Barlow',sans-serif", fontWeight:800 }}>⚡ VERTIX PRO</span>
            </div>
            <div style={{ display:"flex", gap:"8px", marginTop:"12px" }}>
              <button onClick={()=>imgRef.current.click()} style={{ background:th.accent, color:"#fff", border:"none", borderRadius:"8px", padding:"7px 14px", cursor:"pointer", fontFamily:"'Barlow',sans-serif", fontSize:"11px", fontWeight:700, display:"flex", alignItems:"center", gap:"5px" }}>📷 Upload Photo</button>
              {user.photo && <button onClick={removePhoto} style={{ background:"transparent", color:th.danger, border:`1px solid ${th.danger}`, borderRadius:"8px", padding:"7px 12px", cursor:"pointer", fontFamily:"'Barlow',sans-serif", fontSize:"11px", fontWeight:700 }}>Remove</button>}
            </div>
            <p style={{ color:th.muted, fontFamily:"'Barlow',sans-serif", fontSize:"10px", marginTop:"6px" }}>JPG, PNG or WEBP · Max 5MB</p>
          </div>
        </div>

        {/* ── Edit Form ── */}
        <div style={{ background:th.card, borderRadius:"18px", padding:"28px", border:`1px solid ${editing?th.accent:th.border}`, marginBottom:"16px", transition:"border-color .3s", boxShadow:editing?`0 0 0 3px ${th.accent}15`:"none" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"22px" }}>
            <h3 style={{ color:th.text, fontFamily:"'Barlow',sans-serif", fontWeight:700, fontSize:"15px", margin:0 }}>Personal Information</h3>
            {editing && <span style={{ background:"#10B98122", color:"#10B981", fontSize:"10px", fontWeight:800, padding:"3px 10px", borderRadius:"20px", fontFamily:"'Barlow',sans-serif" }}>EDITING</span>}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:"18px" }}>

            {/* Full Name */}
            <div>
              <label style={labelStyle}>Full Name *</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:"13px", top:"50%", transform:"translateY(-50%)", fontSize:"16px", pointerEvents:"none" }}>👤</span>
                <input
                  value={form.name} onChange={e=>set("name")(e.target.value)}
                  placeholder="Enter your full name" readOnly={!editing}
                  style={{ ...inputStyle(errors.name), paddingLeft:"40px", background:editing?th.inp:th.bg }}
                  onFocus={e=>{ if(editing) e.target.style.borderColor=th.accent; }}
                  onBlur={e=>e.target.style.borderColor=errors.name?"#EF4444":th.inpB}
                />
              </div>
              {errors.name && <p style={{ color:"#EF4444", fontSize:"11px", fontFamily:"'Barlow',sans-serif", marginTop:"4px" }}>⚠ {errors.name}</p>}
            </div>

            {/* DOB + Age row */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
              <div>
                <label style={labelStyle}>Date of Birth</label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:"13px", top:"50%", transform:"translateY(-50%)", fontSize:"16px", pointerEvents:"none" }}>🎂</span>
                  <input
                    type={editing ? "date" : "text"}
                    value={editing ? form.dob : formatDOBDisplay(form.dob)}
                    onChange={e=>set("dob")(e.target.value)}
                    readOnly={!editing}
                    max={new Date().toISOString().split("T")[0]}
                    style={{ ...inputStyle(errors.dob), paddingLeft:"40px", background:editing?th.inp:th.bg }}
                    onFocus={e=>{ if(editing) e.target.style.borderColor=th.accent; }}
                    onBlur={e=>e.target.style.borderColor=errors.dob?"#EF4444":th.inpB}
                  />
                </div>
                {errors.dob && <p style={{ color:"#EF4444", fontSize:"11px", fontFamily:"'Barlow',sans-serif", marginTop:"4px" }}>⚠ {errors.dob}</p>}
              </div>

              <div>
                <label style={labelStyle}>Age</label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:"13px", top:"50%", transform:"translateY(-50%)", fontSize:"16px", pointerEvents:"none" }}>🔢</span>
                  <input
                    value={age !== null ? `${age} years old` : "—"}
                    readOnly
                    style={{ ...inputStyle(false), paddingLeft:"40px", background:th.bg, color:age!==null?th.text:th.muted, cursor:"default" }}
                  />
                </div>
                <p style={{ color:th.muted, fontSize:"10px", fontFamily:"'Barlow',sans-serif", marginTop:"4px" }}>Auto-calculated from DOB</p>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label style={labelStyle}>Phone Number</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:"13px", top:"50%", transform:"translateY(-50%)", fontSize:"16px", pointerEvents:"none" }}>📱</span>
                <input
                  value={form.phone} onChange={e=>set("phone")(e.target.value)}
                  placeholder="+91 98765 43210" readOnly={!editing}
                  style={{ ...inputStyle(false), paddingLeft:"40px", background:editing?th.inp:th.bg }}
                  onFocus={e=>{ if(editing) e.target.style.borderColor=th.accent; }}
                  onBlur={e=>e.target.style.borderColor=th.inpB}
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label style={labelStyle}>Gender</label>
              {editing ? (
                <div style={{ display:"flex", gap:"8px" }}>
                  {["Male","Female","Other","Prefer not to say"].map(g=>(
                    <button key={g} onClick={()=>set("gender")(g)} style={{ flex:1, background:form.gender===g?th.accent:th.bg, color:form.gender===g?"#fff":th.sub, border:`1.5px solid ${form.gender===g?th.accent:th.border}`, borderRadius:"9px", padding:"9px 6px", cursor:"pointer", fontFamily:"'Barlow',sans-serif", fontSize:"11px", fontWeight:700, transition:"all .2s", whiteSpace:"nowrap" }}>{g}</button>
                  ))}
                </div>
              ) : (
                <div style={{ ...inputStyle(false), background:th.bg, color:form.gender?th.text:th.muted, cursor:"default", display:"flex", alignItems:"center", gap:"8px" }}>
                  <span>{form.gender==="Male"?"🙋‍♂️":form.gender==="Female"?"🙋‍♀️":form.gender?"🙋":""}</span>
                  {form.gender || "Not set"}
                </div>
              )}
            </div>

            {/* Bio */}
            <div>
              <label style={labelStyle}>Bio</label>
              <textarea
                value={form.bio} onChange={e=>set("bio")(e.target.value)}
                placeholder="Tell the community about yourself…" readOnly={!editing}
                style={{ ...inputStyle(false), padding:"12px 14px", resize:"vertical", minHeight:"80px", background:editing?th.inp:th.bg }}
                onFocus={e=>{ if(editing) e.target.style.borderColor=th.accent; }}
                onBlur={e=>e.target.style.borderColor=th.inpB}
              />
            </div>
          </div>

          {editing && (
            <div style={{ display:"flex", gap:"10px", marginTop:"22px", paddingTop:"20px", borderTop:`1px solid ${th.border}` }}>
              <Btn th={th} onClick={save}>💾 Save Changes</Btn>
              <Btn th={th} variant="ghost" onClick={cancel}>✕ Cancel</Btn>
            </div>
          )}
        </div>

        {/* ── Stats row ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px" }}>
          {[{ic:"📦",lb:"Orders Placed",val:"4"},{ic:"❤️",lb:"Saved Items",val:"2"},{ic:"⭐",lb:"Reviews Given",val:"7"}].map(s=>(
            <div key={s.lb} style={{ background:th.card, borderRadius:"14px", padding:"18px", border:`1px solid ${th.border}`, textAlign:"center" }}>
              <div style={{ fontSize:"28px", marginBottom:"6px" }}>{s.ic}</div>
              <div style={{ color:th.text, fontFamily:"'Barlow Condensed',sans-serif", fontSize:"24px", fontWeight:800 }}>{s.val}</div>
              <div style={{ color:th.sub, fontFamily:"'Barlow',sans-serif", fontSize:"11px" }}>{s.lb}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADDRESSES — full CRUD, receives state from App
// ═══════════════════════════════════════════════════════════════════════════════
function AddressesPage({ isDark, addresses, setAddresses, onSave, onDelete, onSetDefault, addToast }) {
  const th = isDark ? D : L;
  const blank = { label:"Home",name:"",phone:"",street:"",city:"",state:"",zip:"",country:"India" };
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(blank);
  const set = k => v => setForm(f=>({...f,[k]:v}));

  const openAdd  = () => { setForm(blank); setEditId(null); setShowForm(true); };
  const openEdit = (a) => { setForm({ label:a.label,name:a.name,phone:a.phone||"",street:a.street,city:a.city,state:a.state,zip:a.zip,country:a.country }); setEditId(a.id); setShowForm(true); };

  const save = async () => {
    if (!form.name||!form.street||!form.city) { addToast("Name, street and city are required","error"); return; }
    if (onSave) {
      const ok = await onSave(form, editId);
      if (ok) { setShowForm(false); setEditId(null); setForm(blank); }
    } else {
      if (editId) setAddresses(a=>a.map(x=>x.id===editId?{...x,...form}:x));
      else setAddresses(a=>[...a,{...form,id:Date.now(),is_default:a.length===0}]);
      addToast("Address saved!","success");
      setShowForm(false); setEditId(null); setForm(blank);
    }
  };
  const remove = (id) => { if(onDelete) onDelete(id); else { setAddresses(a=>a.filter(x=>x.id!==id)); addToast("Address removed","success"); } };
  const mkDefault = (id) => { if(onSetDefault) onSetDefault(id); else { setAddresses(a=>a.map(x=>({...x,is_default:x.id===id}))); addToast("Default address updated","success"); } };

  const IND_STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Other"];

  return (
    <div style={{ background:th.bg,minHeight:"calc(100vh - 108px)",padding:"28px" }}>
      <div style={{ maxWidth:"800px",margin:"0 auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"24px" }}>
          <div>
            <h2 style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"26px",fontWeight:800,textTransform:"uppercase",marginBottom:"3px" }}>📍 My Addresses</h2>
            <p style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"12px" }}>{addresses.length} saved address{addresses.length!==1?"es":""}</p>
          </div>
          {!showForm && <Btn th={th} onClick={openAdd}>+ Add Address</Btn>}
        </div>

        {addresses.length===0 && !showForm && (
          <div style={{ textAlign:"center",paddingTop:"60px" }}>
            <div style={{ fontSize:"54px",marginBottom:"12px" }}>📭</div>
            <div style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"20px",fontWeight:800,textTransform:"uppercase",marginBottom:"8px" }}>No Addresses Saved</div>
            <div style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"13px",marginBottom:"18px" }}>Add a delivery address to get started</div>
            <Btn th={th} onClick={openAdd}>+ Add Your First Address</Btn>
          </div>
        )}

        <div style={{ display:"flex",flexDirection:"column",gap:"12px",marginBottom:"22px" }}>
          {addresses.map(addr=>(
            <div key={addr.id} style={{ background:th.card,borderRadius:"16px",padding:"18px",border:`2px solid ${( addr.isDefault||addr.is_default)?th.accent:th.border}`,boxShadow:addr.isDefault?`0 0 0 4px ${th.accent}15`:"none",position:"relative",transition:"all .2s" }}>
              {(addr.isDefault||addr.is_default) && <div style={{ position:"absolute",top:"13px",right:"13px",background:th.accentL,color:th.accent,fontSize:"10px",fontWeight:800,padding:"3px 11px",borderRadius:"20px",fontFamily:"'Barlow',sans-serif",border:`1px solid ${th.accent}33` }}>✓ DEFAULT</div>}
              <div style={{ display:"flex",alignItems:"center",gap:"9px",marginBottom:"9px" }}>
                <span style={{ background:th.accent,color:"#fff",fontSize:"10px",fontWeight:800,padding:"3px 11px",borderRadius:"20px",fontFamily:"'Barlow',sans-serif" }}>{addr.label||"Address"}</span>
                <span style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"14px" }}>{addr.name}</span>
                {addr.phone && <span style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"12px" }}>· {addr.phone}</span>}
              </div>
              <div style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"13px",lineHeight:"1.8",marginBottom:"13px" }}>
                {addr.street}<br/>{addr.city}{addr.state?`, ${addr.state}`:""}{addr.zip?` — ${addr.zip}`:""}<br/>{addr.country}
              </div>
              <div style={{ display:"flex",gap:"7px",flexWrap:"wrap" }}>
                {!addr.isDefault && <Btn small th={th} onClick={()=>mkDefault(addr.id)}>⭐ Set Default</Btn>}
                <Btn small th={th} variant="ghost" onClick={()=>openEdit(addr)}>✏️ Edit</Btn>
                <Btn small th={th} variant="danger" onClick={()=>remove(addr.id)}>🗑 Delete</Btn>
              </div>
            </div>
          ))}
        </div>

        {showForm && (
          <div style={{ background:th.card,borderRadius:"16px",padding:"26px",border:`2px solid ${th.accent}`,boxShadow:`0 0 0 4px ${th.accent}13` }}>
            <h3 style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"18px",fontWeight:800,textTransform:"uppercase",marginBottom:"20px" }}>{editId?"✏️ Edit Address":"📍 New Address"}</h3>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"13px" }}>
              <div>
                <label style={{ color:th.sub,fontSize:"11px",fontFamily:"'Barlow',sans-serif",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",display:"block",marginBottom:"5px" }}>Label</label>
                <div style={{ display:"flex",gap:"6px" }}>
                  {["Home","Work","Other"].map(lb=><button key={lb} onClick={()=>set("label")(lb)} style={{ flex:1,background:form.label===lb?th.accent:th.bg,color:form.label===lb?"#fff":th.sub,border:`1.5px solid ${form.label===lb?th.accent:th.border}`,borderRadius:"8px",padding:"9px 6px",cursor:"pointer",fontFamily:"'Barlow',sans-serif",fontSize:"12px",fontWeight:700,transition:"all .2s" }}>{lb}</button>)}
                </div>
              </div>
              <Field label="Full Name *" value={form.name} onChange={set("name")} placeholder="Arjun Kumar" th={th} icon="👤"/>
              <div style={{ gridColumn:"1/-1" }}><Field label="Phone" value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" th={th} icon="📱"/></div>
              <div style={{ gridColumn:"1/-1" }}><Field label="Street Address *" value={form.street} onChange={set("street")} placeholder="Flat 4B, Sunrise Apartments, MG Road" th={th}/></div>
              <Field label="City *" value={form.city} onChange={set("city")} placeholder="Chennai" th={th}/>
              <div>
                <label style={{ color:th.sub,fontSize:"11px",fontFamily:"'Barlow',sans-serif",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",display:"block",marginBottom:"5px" }}>State</label>
                <select value={form.state} onChange={e=>set("state")(e.target.value)} style={{ width:"100%",background:th.inp,border:`1.5px solid ${th.inpB}`,color:th.text,borderRadius:"8px",padding:"10px 14px",fontSize:"13px",fontFamily:"'Barlow',sans-serif",outline:"none" }}>
                  <option value="">Select State</option>
                  {IND_STATES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <Field label="PIN Code" value={form.zip} onChange={set("zip")} placeholder="600001" th={th}/>
              <Field label="Country" value={form.country} onChange={set("country")} placeholder="India" th={th}/>
            </div>
            <div style={{ display:"flex",gap:"9px",marginTop:"20px" }}>
              <Btn th={th} onClick={save}>💾 {editId?"Update Address":"Save Address"}</Btn>
              <Btn th={th} variant="ghost" onClick={()=>{ setShowForm(false); setEditId(null); setForm(blank); }}>Cancel</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MY ORDERS
// ═══════════════════════════════════════════════════════════════════════════════
function OrdersPage({ isDark, orders }) {
  const th = isDark ? D : L;
  const [expanded, setExpanded] = useState(null);
  return (
    <div style={{ background:th.bg,minHeight:"calc(100vh - 108px)",padding:"28px" }}>
      <div style={{ maxWidth:"840px",margin:"0 auto" }}>
        <div style={{ marginBottom:"24px" }}>
          <h2 style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"26px",fontWeight:800,textTransform:"uppercase",marginBottom:"3px" }}>📦 My Orders</h2>
          <p style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"12px" }}>{orders.length} orders placed</p>
        </div>
        {orders.length===0 ? (
          <div style={{ textAlign:"center",paddingTop:"80px" }}>
            <div style={{ fontSize:"58px",marginBottom:"14px" }}>📭</div>
            <div style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"20px",fontWeight:800,textTransform:"uppercase",marginBottom:"8px" }}>No Orders Yet</div>
            <div style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"13px" }}>Your placed orders will appear here</div>
          </div>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:"13px" }}>
            {orders.map(order=>(
              <div key={order.id} style={{ background:th.card,borderRadius:"16px",border:`1px solid ${th.border}`,overflow:"hidden",boxShadow:`0 2px 8px ${th.sh}` }}>
                <div onClick={()=>setExpanded(e=>e===order.id?null:order.id)} style={{ padding:"16px 20px",display:"flex",alignItems:"center",gap:"14px",cursor:"pointer",transition:"background .15s" }} onMouseEnter={e=>e.currentTarget.style.background=isDark?"#ffffff08":"#F8FAFC"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ width:"44px",height:"44px",background:th.accentL,borderRadius:"12px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0 }}>📦</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:"9px",marginBottom:"3px" }}>
                      <span style={{ color:th.accent,fontFamily:"'Barlow',sans-serif",fontWeight:800,fontSize:"13px" }}>{order.id}</span>
                      <StatusBadge status={order.status}/>
                    </div>
                    <div style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"11px" }}>Placed {order.date} · {order.items.length} item{order.items.length>1?"s":""}</div>
                  </div>
                  <div style={{ textAlign:"right",flexShrink:0 }}>
                    <div style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"18px",fontWeight:800 }}>{fmt(order.total)}</div>
                    <div style={{ color:th.muted,fontSize:"10px",fontFamily:"'Barlow',sans-serif" }}>incl. GST</div>
                  </div>
                  <span style={{ color:th.muted,fontSize:"16px",userSelect:"none" }}>{expanded===order.id?"▲":"▼"}</span>
                </div>
                {expanded===order.id && (
                  <div style={{ borderTop:`1px solid ${th.border}`,padding:"16px 20px",background:isDark?"#ffffff05":"#FAFBFD" }}>
                    <div style={{ display:"flex",flexDirection:"column",gap:"9px",marginBottom:"14px" }}>
                      {order.items.map((item,i)=>(
                        <div key={i} style={{ display:"flex",gap:"11px",alignItems:"center",padding:"9px",background:th.card,borderRadius:"10px",border:`1px solid ${th.border}` }}>
                          <div style={{ width:"42px",height:"42px",background:isDark?th.bg:"#F8FAFC",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px",flexShrink:0 }}>{item.emoji}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:600,fontSize:"12px" }}>{item.name}</div>
                            <div style={{ color:th.muted,fontSize:"10px",fontFamily:"'Barlow',sans-serif" }}>Qty {item.qty} × {fmt(item.price)}</div>
                          </div>
                          <div style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"15px",fontWeight:800 }}>{fmt(item.price*item.qty)}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background:th.card,borderRadius:"10px",padding:"13px 15px",border:`1px solid ${th.border}`,marginBottom:"13px" }}>
                      {[["Subtotal",fmt(Math.round(order.total/1.18))],["GST (18%)",fmt(order.total-Math.round(order.total/1.18))],["Shipping","Free"],["Total",fmt(order.total)]].map(([l,v],i,arr)=>(
                        <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:i===arr.length-1?"9px 0 0":"7px 0",borderTop:i===arr.length-1?`1px solid ${th.border}`:"none" }}>
                          <span style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"12px" }}>{l}</span>
                          <span style={{ color:l==="Shipping"?"#10B981":l==="Total"?th.accent:th.text,fontFamily:l==="Total"?"'Barlow Condensed',sans-serif":"'Barlow',sans-serif",fontWeight:l==="Total"?800:600,fontSize:l==="Total"?"17px":"12px" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ background:th.card,borderRadius:"9px",padding:"10px 13px",border:`1px solid ${th.border}`,marginBottom:"12px",fontSize:"12px",fontFamily:"'Barlow',sans-serif",color:th.sub }}>
                      <span style={{ color:th.text,fontWeight:700 }}>📍 Delivery: </span>{order.address}
                    </div>
                    <div style={{ display:"flex",gap:"7px",flexWrap:"wrap" }}>
                      {order.status==="delivered"  && <Btn small th={th}>⭐ Rate & Review</Btn>}
                      {order.status==="shipped"     && <Btn small th={th} variant="outline">🚚 Track Order</Btn>}
                      {order.status==="processing"  && <Btn small th={th} variant="danger">✕ Cancel</Btn>}
                      <Btn small th={th} variant="ghost">📄 Invoice</Btn>
                      <Btn small th={th} variant="ghost">🔄 Reorder</Btn>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════
function NotificationsPage({ isDark, notifs, setNotifs, onRead, onReadAll }) {
  const th = isDark ? D : L;
  const [filter, setFilter] = useState("all");
  const unread = notifs.filter(n=>!n.is_read && !n.read).length;
  const tc = { order:"#3B82F6",deal:"#F59E0B",seller:"#10B981",system:"#8B5CF6" };
  const visible = filter==="all" ? notifs : notifs.filter(n=>n.type===filter);
  return (
    <div style={{ background:th.bg,minHeight:"calc(100vh - 108px)",padding:"28px" }}>
      <div style={{ maxWidth:"700px",margin:"0 auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px" }}>
          <div>
            <h2 style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"26px",fontWeight:800,textTransform:"uppercase",marginBottom:"3px" }}>🔔 Notifications</h2>
            <p style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"12px" }}>{unread} unread</p>
          </div>
          {unread>0 && <Btn small th={th} variant="ghost" onClick={()=>{ if(onReadAll) onReadAll(); else if(setNotifs) setNotifs(ns=>ns.map(x=>({...x,is_read:true,read:true}))); }}>Mark all read</Btn>}
        </div>
        <div style={{ display:"flex",gap:"6px",marginBottom:"16px" }}>
          {["all","order","deal","seller","system"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{ background:filter===f?th.accent:th.card,color:filter===f?"#fff":th.sub,border:`1px solid ${filter===f?th.accent:th.border}`,borderRadius:"20px",padding:"5px 13px",cursor:"pointer",fontFamily:"'Barlow',sans-serif",fontSize:"11px",fontWeight:600,textTransform:"capitalize",transition:"all .2s" }}>{f}</button>
          ))}
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:"9px" }}>
          {visible.map(n=>(
            <div key={n.id} onClick={()=>{ if(onRead) onRead(n.id); else if(setNotifs) setNotifs(ns=>ns.map(x=>x.id===n.id?{...x,is_read:true,read:true}:x)); }} style={{ background:n.read?th.card:isDark?"#0F1F3D":"#EFF6FF",borderRadius:"13px",padding:"14px",display:"flex",gap:"12px",border:`1px solid ${n.read?th.border:th.accent+"44"}`,cursor:"pointer",transition:"all .2s" }} onMouseEnter={e=>e.currentTarget.style.borderColor=tc[n.type]+"77"} onMouseLeave={e=>e.currentTarget.style.borderColor=n.read?th.border:th.accent+"44"}>
              <div style={{ width:"40px",height:"40px",background:tc[n.type]+"18",borderRadius:"11px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"19px",flexShrink:0 }}>{n.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"3px" }}>
                  <span style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"13px" }}>{n.title}</span>
                  <div style={{ display:"flex",alignItems:"center",gap:"6px" }}>
                    <span style={{ color:th.muted,fontSize:"10px",fontFamily:"'Barlow',sans-serif" }}>{n.time}</span>
                    {!n.read && <div style={{ width:"7px",height:"7px",background:th.accent,borderRadius:"50%",flexShrink:0 }}/>}
                  </div>
                </div>
                <div style={{ color:th.sub,fontSize:"12px",fontFamily:"'Barlow',sans-serif",lineHeight:"1.5" }}>{n.msg}</div>
                <div style={{ marginTop:"6px" }}><Pill text={n.type} color={tc[n.type]}/></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WISHLIST
// ═══════════════════════════════════════════════════════════════════════════════
function WishlistPage({ isDark, wishlist, onWishlist, onAddCart, onView, products: propProducts }) {
  const th = isDark ? D : L;
  const srcProds = propProducts || ALL_PRODUCTS;
  const items = srcProds.filter(p => wishlist.includes(p.id));
  return (
    <div style={{ background:th.bg,minHeight:"calc(100vh - 108px)",padding:"28px" }}>
      <div style={{ maxWidth:"1080px",margin:"0 auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"24px" }}>
          <div>
            <h2 style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"26px",fontWeight:800,textTransform:"uppercase",marginBottom:"3px" }}>❤️ Wishlist</h2>
            <p style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"12px" }}>{items.length} saved items</p>
          </div>
          {items.length>0 && <Btn th={th} onClick={()=>items.forEach(i=>onAddCart(i))}>Add All to Cart</Btn>}
        </div>
        {items.length===0 ? (
          <div style={{ textAlign:"center",paddingTop:"80px" }}>
            <div style={{ fontSize:"58px",marginBottom:"14px" }}>💔</div>
            <div style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"20px",fontWeight:800,textTransform:"uppercase",marginBottom:"7px" }}>Wishlist is Empty</div>
            <div style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"13px" }}>Tap ❤️ on any product to save it here</div>
          </div>
        ) : (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:"16px" }}>
            {items.map(p=>(
              <div key={p.id} style={{ background:th.card,borderRadius:"16px",overflow:"hidden",border:`1px solid ${th.border}`,transition:"all .2s" }} onMouseEnter={e=>{ e.currentTarget.style.boxShadow=`0 12px 36px ${th.sh}`; e.currentTarget.style.transform="translateY(-4px)"; }} onMouseLeave={e=>{ e.currentTarget.style.boxShadow="none"; e.currentTarget.style.transform="none"; }}>
                <div style={{ position:"relative",height:"148px",background:isDark?th.bg:"#F8FAFC",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }} onClick={()=>onView(p)}>
                  <div style={{ fontSize:"64px" }}>{p.emoji}</div>
                  <button onClick={e=>{ e.stopPropagation(); onWishlist(p.id); }} style={{ position:"absolute",top:"8px",right:"8px",background:"#FEE2E2",border:"none",borderRadius:"50%",width:"28px",height:"28px",cursor:"pointer",fontSize:"13px",display:"flex",alignItems:"center",justifyContent:"center" }}>❤️</button>
                </div>
                <div style={{ padding:"12px" }}>
                  <div style={{ color:th.muted,fontSize:"10px",letterSpacing:"2px",fontFamily:"'Barlow',sans-serif",fontWeight:700,textTransform:"uppercase",marginBottom:"2px" }}>{p.cat}</div>
                  <div style={{ color:th.text,fontSize:"13px",fontFamily:"'Barlow',sans-serif",fontWeight:700,marginBottom:"8px" }}>{p.name}</div>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <span style={{ color:th.accent,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"18px",fontWeight:800 }}>{fmt(p.price)}</span>
                    <Btn small th={th} onClick={()=>onAddCart(p)}>Add to Cart</Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CART
// ═══════════════════════════════════════════════════════════════════════════════
function CartPage({ cart, onQty, onRemove, isDark, onCheckout }) {
  const th = isDark ? D : L;
  const sub   = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const gst   = Math.round(sub*0.18);
  const total = sub+gst;
  if (!cart.length) return (
    <div style={{ background:th.bg,minHeight:"calc(100vh - 108px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"14px" }}>
      <div style={{ fontSize:"62px" }}>🛒</div>
      <div style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"22px",fontWeight:800,textTransform:"uppercase" }}>Your Cart is Empty</div>
      <div style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"13px" }}>Browse products and add them to your cart</div>
    </div>
  );
  return (
    <div style={{ background:th.bg,minHeight:"calc(100vh - 108px)",padding:"28px" }}>
      <div style={{ maxWidth:"1080px",margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 340px",gap:"24px",alignItems:"start" }}>
        <div>
          <h2 style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"22px",fontWeight:800,textTransform:"uppercase",marginBottom:"16px" }}>🛒 Cart ({cart.length})</h2>
          <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
            {cart.map(item=>(
              <div key={item.id} style={{ background:th.card,borderRadius:"13px",padding:"14px",display:"flex",gap:"13px",alignItems:"center",border:`1px solid ${th.border}` }}>
                <div style={{ width:"66px",height:"66px",background:isDark?th.bg:"#F8FAFC",borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"32px",flexShrink:0 }}>{item.emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"13px",marginBottom:"2px" }}>{item.name}</div>
                  <div style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"11px",marginBottom:"7px" }}>{item.cat}</div>
                  <div style={{ display:"flex",alignItems:"center",gap:"7px" }}>
                    <button onClick={()=>onQty(item.id,item.qty-1)} style={{ width:"25px",height:"25px",background:th.bg,border:`1px solid ${th.border}`,borderRadius:"6px",cursor:"pointer",color:th.text,fontSize:"14px",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center" }}>−</button>
                    <span style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,minWidth:"20px",textAlign:"center",fontSize:"13px" }}>{item.qty}</span>
                    <button onClick={()=>onQty(item.id,item.qty+1)} style={{ width:"25px",height:"25px",background:th.bg,border:`1px solid ${th.border}`,borderRadius:"6px",cursor:"pointer",color:th.text,fontSize:"14px",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
                    <button onClick={()=>onRemove(item.id)} style={{ marginLeft:"6px",background:"none",border:"none",color:th.danger,cursor:"pointer",fontSize:"11px",fontFamily:"'Barlow',sans-serif",fontWeight:700 }}>REMOVE</button>
                  </div>
                </div>
                <div style={{ textAlign:"right",flexShrink:0 }}>
                  <div style={{ color:th.accent,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"18px",fontWeight:800 }}>{fmt(item.price*item.qty)}</div>
                  <div style={{ color:th.muted,fontSize:"10px",fontFamily:"'Barlow',sans-serif" }}>{fmt(item.price)} each</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background:th.card,borderRadius:"16px",padding:"20px",border:`1px solid ${th.border}`,position:"sticky",top:"126px" }}>
          <h3 style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"17px",fontWeight:800,textTransform:"uppercase",marginBottom:"16px" }}>Order Summary</h3>
          {[["Subtotal",fmt(sub)],["GST (18%)",fmt(gst)],["Shipping","Free"]].map(([l,v])=>(
            <div key={l} style={{ display:"flex",justifyContent:"space-between",marginBottom:"9px" }}>
              <span style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"12px" }}>{l}</span>
              <span style={{ color:v==="Free"?"#10B981":th.text,fontFamily:"'Barlow',sans-serif",fontWeight:600,fontSize:"12px" }}>{v}</span>
            </div>
          ))}
          <div style={{ height:"1px",background:th.border,margin:"11px 0" }}/>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"16px" }}>
            <span style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"14px" }}>Total</span>
            <span style={{ color:th.accent,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"21px",fontWeight:800 }}>{fmt(total)}</span>
          </div>
          <Btn onClick={onCheckout} full th={th}>🛍️ Proceed to Checkout</Btn>
          <div style={{ display:"flex",justifyContent:"center",gap:"7px",marginTop:"10px",flexWrap:"wrap" }}>
            {["🔒 SSL","💳 Cards","🏦 UPI","📱 GPay"].map(b=><span key={b} style={{ color:th.muted,fontSize:"10px",fontFamily:"'Barlow',sans-serif" }}>{b}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKOUT
// ═══════════════════════════════════════════════════════════════════════════════
function CheckoutPage({ cart, isDark, onSuccess, addresses, onPlace }) {
  const th = isDark ? D : L;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [selAddr, setSelAddr] = useState(addresses.find(a=>a.isDefault)||addresses[0]||null);
  const [payment, setPayment] = useState("upi");
  const [card, setCard] = useState({ num:"",expiry:"",cvv:"" });
  const [upi, setUpi] = useState("");
  const sub   = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const total = Math.round(sub*1.18);
  const steps = ["Review","Delivery","Payment","Done"];

  const proceed = async () => {
    if (step<3) { setStep(s=>s+1); return; }
    setLoading(true);
    try {
      if (onPlace) {
        const order = await onPlace(selAddr?.id || null, payment);
        if (order) { setOrderId(order.id ? order.id.slice(0,8).toUpperCase() : "CONFIRMED"); setStep(4); }
      } else {
        await new Promise(r=>setTimeout(r,1800));
        setOrderId("VTX-"+Math.random().toString(36).substr(2,8).toUpperCase());
        setStep(4);
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div style={{ background:th.bg,minHeight:"calc(100vh - 108px)",padding:"26px" }}>
      <div style={{ maxWidth:"920px",margin:"0 auto" }}>
        {/* Stepper */}
        <div style={{ display:"flex",alignItems:"center",background:th.card,borderRadius:"13px",padding:"16px 20px",border:`1px solid ${th.border}`,marginBottom:"22px" }}>
          {steps.map((s,i)=>(
            <div key={s} style={{ display:"flex",alignItems:"center",flex:i<steps.length-1?1:"auto" }}>
              <div style={{ display:"flex",alignItems:"center",gap:"7px" }}>
                <div style={{ width:"28px",height:"28px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:step>i+1?th.accent:step===i+1?th.accentL:"transparent",border:`2px solid ${step>=i+1?th.accent:th.border}`,color:step>i+1?"#fff":step===i+1?th.accent:th.muted,fontFamily:"'Barlow',sans-serif",fontWeight:800,fontSize:"11px",transition:"all .3s" }}>{step>i+1?"✓":i+1}</div>
                <span style={{ color:step===i+1?th.accent:step>i+1?th.text:th.muted,fontFamily:"'Barlow',sans-serif",fontWeight:step===i+1?700:500,fontSize:"12px" }}>{s}</span>
              </div>
              {i<steps.length-1 && <div style={{ flex:1,height:"2px",background:step>i+1?th.accent:th.border,margin:"0 9px",transition:"background .3s" }}/>}
            </div>
          ))}
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 300px",gap:"20px",alignItems:"start" }}>
          <div style={{ background:th.card,borderRadius:"16px",padding:"24px",border:`1px solid ${th.border}` }}>
            {step===1 && <>
              <h3 style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"17px",fontWeight:800,textTransform:"uppercase",marginBottom:"16px" }}>🛒 Review Items</h3>
              {cart.map(i=>(
                <div key={i.id} style={{ display:"flex",gap:"10px",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${th.border}` }}>
                  <div style={{ fontSize:"24px" }}>{i.emoji}</div>
                  <div style={{ flex:1 }}><div style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:600,fontSize:"12px" }}>{i.name}</div><div style={{ color:th.muted,fontSize:"10px" }}>Qty {i.qty}</div></div>
                  <div style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"14px",fontWeight:800 }}>{fmt(i.price*i.qty)}</div>
                </div>
              ))}
            </>}
            {step===2 && <>
              <h3 style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"17px",fontWeight:800,textTransform:"uppercase",marginBottom:"16px" }}>📍 Delivery Address</h3>
              {addresses.length===0 ? (
                <div style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"13px",padding:"18px",textAlign:"center",background:th.bg,borderRadius:"10px" }}>
                  No saved addresses. Go to <strong>My Addresses</strong> and add one first.
                </div>
              ) : (
                <div style={{ display:"flex",flexDirection:"column",gap:"9px" }}>
                  {addresses.map(addr=>(
                    <div key={addr.id} onClick={()=>setSelAddr(addr)} style={{ padding:"13px 15px",border:`2px solid ${selAddr?.id===addr.id?th.accent:th.border}`,borderRadius:"12px",cursor:"pointer",background:selAddr?.id===addr.id?th.accentL:th.card,transition:"all .2s" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:"7px",marginBottom:"3px" }}>
                        <span style={{ background:th.accent,color:"#fff",fontSize:"9px",fontWeight:800,padding:"2px 8px",borderRadius:"20px",fontFamily:"'Barlow',sans-serif" }}>{addr.label}</span>
                        <span style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"12px" }}>{addr.name}</span>
                        {selAddr?.id===addr.id && <span style={{ marginLeft:"auto",color:th.accent,fontSize:"14px" }}>✓</span>}
                      </div>
                      <div style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"11px",lineHeight:"1.6" }}>{addr.street}, {addr.city} — {addr.zip}</div>
                    </div>
                  ))}
                </div>
              )}
            </>}
            {step===3 && <>
              <h3 style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"17px",fontWeight:800,textTransform:"uppercase",marginBottom:"14px" }}>💳 Payment</h3>
              <div style={{ background:isDark?"#0D2B1A":"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:"8px",padding:"8px 12px",fontSize:"11px",color:"#065F46",fontFamily:"'Barlow',sans-serif",fontWeight:600,marginBottom:"14px" }}>🔒 256-bit SSL encryption · Secure payment</div>
              <div style={{ display:"flex",gap:"7px",marginBottom:"14px" }}>
                {[{k:"upi",l:"UPI"},{k:"card",l:"Card"},{k:"netbanking",l:"Net Banking"},{k:"cod",l:"COD"}].map(pm=>(
                  <button key={pm.k} onClick={()=>setPayment(pm.k)} style={{ flex:1,background:payment===pm.k?th.accent:th.bg,color:payment===pm.k?"#fff":th.sub,border:`1.5px solid ${payment===pm.k?th.accent:th.border}`,borderRadius:"8px",padding:"8px 6px",cursor:"pointer",fontFamily:"'Barlow',sans-serif",fontSize:"11px",fontWeight:700,transition:"all .2s" }}>{pm.l}</button>
                ))}
              </div>
              {payment==="upi" && <Field label="UPI ID" value={upi} onChange={setUpi} placeholder="yourname@okaxis" th={th} icon="📱"/>}
              {payment==="card" && <div style={{ display:"flex",flexDirection:"column",gap:"11px" }}>
                <Field label="Card Number" value={card.num} onChange={v=>setCard(c=>({...c,num:v}))} placeholder="1234 5678 9012 3456" th={th} icon="💳"/>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"11px" }}>
                  <Field label="Expiry" value={card.expiry} onChange={v=>setCard(c=>({...c,expiry:v}))} placeholder="MM/YY" th={th}/>
                  <Field label="CVV" value={card.cvv} onChange={v=>setCard(c=>({...c,cvv:v}))} placeholder="•••" th={th}/>
                </div>
              </div>}
              {payment==="netbanking" && <div style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"13px",padding:"14px",background:th.bg,borderRadius:"9px",textAlign:"center" }}>You'll be redirected to your bank's secure page.</div>}
              {payment==="cod" && <div style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"13px",padding:"14px",background:th.bg,borderRadius:"9px" }}>💵 Pay {fmt(total)} in cash when your order arrives.</div>}
            </>}
            {step===4 && (
              <div style={{ textAlign:"center",padding:"26px 0" }}>
                <div style={{ width:"76px",height:"76px",borderRadius:"50%",background:"#ECFDF5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"34px",margin:"0 auto 16px" }}>🎉</div>
                <h3 style={{ color:"#10B981",fontFamily:"'Barlow Condensed',sans-serif",fontSize:"22px",fontWeight:800,textTransform:"uppercase",marginBottom:"7px" }}>Order Confirmed!</h3>
                <div style={{ color:th.muted,fontSize:"11px",fontFamily:"'Barlow',sans-serif",marginBottom:"3px" }}>Order ID</div>
                <div style={{ color:th.accent,fontFamily:"'Barlow',sans-serif",fontWeight:800,fontSize:"17px",marginBottom:"18px",letterSpacing:"1px" }}>{orderId}</div>
                {["📧 Confirmation email sent","🚚 Delivery in 2–5 business days","📱 Track via My Orders","🔄 7-day free returns"].map(s=>(
                  <div key={s} style={{ display:"flex",alignItems:"center",gap:"7px",marginBottom:"7px",color:th.sub,fontSize:"12px",fontFamily:"'Barlow',sans-serif",textAlign:"left" }}>{s}</div>
                ))}
                <Btn th={th} onClick={()=>{ if(onSuccess) onSuccess(); }} full style={{ marginTop:"14px" }}>🛍️ Continue Shopping</Btn>
              </div>
            )}
            {step<4 && (
              <div style={{ display:"flex",gap:"9px",marginTop:"20px" }}>
                {step>1 && <Btn th={th} variant="ghost" onClick={()=>setStep(s=>s-1)}>← Back</Btn>}
                <Btn th={th} full onClick={proceed} disabled={loading||(step===2&&addresses.length===0)}>
                  {loading?"Processing…":step===3?`Place Order — ${fmt(total)}`:step===2?"Continue to Payment →":"Continue →"}
                </Btn>
              </div>
            )}
          </div>

          {/* Summary sidebar */}
          <div style={{ background:th.card,borderRadius:"16px",padding:"20px",border:`1px solid ${th.border}`,position:"sticky",top:"126px" }}>
            <h4 style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"15px",fontWeight:800,textTransform:"uppercase",marginBottom:"13px" }}>Order Summary</h4>
            {cart.slice(0,3).map(i=><div key={i.id} style={{ display:"flex",justifyContent:"space-between",marginBottom:"6px",fontSize:"11px",fontFamily:"'Barlow',sans-serif" }}><span style={{ color:th.sub }}>{i.name} ×{i.qty}</span><span style={{ color:th.text,fontWeight:600 }}>{fmt(i.price*i.qty)}</span></div>)}
            {cart.length>3 && <div style={{ color:th.muted,fontSize:"10px",fontFamily:"'Barlow',sans-serif",marginBottom:"6px" }}>+{cart.length-3} more</div>}
            <div style={{ height:"1px",background:th.border,margin:"10px 0" }}/>
            {[["Subtotal",fmt(sub)],["GST 18%",fmt(total-sub)],["Shipping","Free"]].map(([l,v])=><div key={l} style={{ display:"flex",justifyContent:"space-between",marginBottom:"5px",fontSize:"11px",fontFamily:"'Barlow',sans-serif" }}><span style={{ color:th.sub }}>{l}</span><span style={{ color:v==="Free"?"#10B981":th.text,fontWeight:600 }}>{v}</span></div>)}
            <div style={{ height:"1px",background:th.border,margin:"10px 0" }}/>
            <div style={{ display:"flex",justifyContent:"space-between" }}>
              <span style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"13px" }}>Total</span>
              <span style={{ color:th.accent,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"19px",fontWeight:800 }}>{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELLER HUB — with product image upload
// ═══════════════════════════════════════════════════════════════════════════════
function SellerPage({ isDark, user, addToast }) {
  const th = isDark ? D : L;
  const [tab, setTab] = useState("dashboard");
  const [listings, setListings] = useState([
    { id:1,name:"Carbon Wallet",price:6600,cat:"Accessories",emoji:"👛",img:null,stock:47,sold:124,status:"active",revenue:818400 },
    { id:2,name:"Custom Backpack",price:2499,cat:"Accessories",emoji:"🎒",img:null,stock:12,sold:38,status:"active",revenue:94962 },
    { id:3,name:"Laptop Stand",price:1299,cat:"Computers",emoji:"🖥️",img:null,stock:0,sold:91,status:"out_of_stock",revenue:118209 },
  ]);
  const blank = { name:"",price:"",desc:"",cat:"Electronics",emoji:"📦",stock:"",imgPreview:null };
  const [form, setForm] = useState(blank);
  const set = k => v => setForm(f=>({...f,[k]:v}));
  const imgRef = useRef();

  const handleImg = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const r = new FileReader();
    r.onload = ev => setForm(f=>({...f,imgPreview:ev.target.result}));
    r.readAsDataURL(file);
  };

  const listProduct = () => {
    if(!form.name||!form.price) { addToast("Name and price are required","error"); return; }
    setListings(l=>[...l,{ id:Date.now(),name:form.name,price:parseFloat(form.price),cat:form.cat,emoji:form.emoji,img:form.imgPreview,stock:parseInt(form.stock)||0,sold:0,status:"active",revenue:0 }]);
    addToast(`"${form.name}" listed at ${fmt(form.price)}!`,"success");
    setForm(blank); setTab("listings");
  };

  const totalRev  = listings.reduce((s,l)=>s+l.revenue,0);
  const totalSold = listings.reduce((s,l)=>s+l.sold,0);
  const TABS = [{k:"dashboard",l:"Dashboard",ic:"📊"},{k:"listings",l:"My Listings",ic:"📋"},{k:"list",l:"List Product",ic:"➕"},{k:"earnings",l:"Earnings",ic:"💰"}];

  return (
    <div style={{ background:th.bg,minHeight:"calc(100vh - 108px)" }}>
      <div style={{ background:"linear-gradient(135deg,#060D1A 0%,#0F2A4A 100%)",padding:"26px 28px" }}>
        <div style={{ maxWidth:"1200px",margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"12px" }}>
          <div>
            <div style={{ color:"#60A5FA",fontSize:"10px",fontFamily:"'Barlow',sans-serif",fontWeight:700,letterSpacing:"3px",marginBottom:"6px" }}>🏪 SELLER HUB</div>
            <h2 style={{ color:"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontSize:"24px",fontWeight:800,textTransform:"uppercase",margin:0 }}>Seller Dashboard</h2>
            <div style={{ color:"#94A3B8",fontFamily:"'Barlow',sans-serif",fontSize:"11px",marginTop:"3px" }}>{user.name} · Verified Seller ✓</div>
          </div>
          <div style={{ display:"flex",gap:"7px",flexWrap:"wrap" }}>
            {TABS.map(t=>(
              <button key={t.k} onClick={()=>setTab(t.k)} style={{ background:tab===t.k?"rgba(255,255,255,0.16)":"rgba(255,255,255,0.06)",border:`1px solid ${tab===t.k?"rgba(255,255,255,0.32)":"rgba(255,255,255,0.1)"}`,color:tab===t.k?"#fff":"#94A3B8",borderRadius:"8px",padding:"7px 13px",cursor:"pointer",fontSize:"12px",fontFamily:"'Barlow',sans-serif",fontWeight:600,display:"flex",alignItems:"center",gap:"5px",transition:"all .2s" }}>
                {t.ic} {t.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:"24px 28px",maxWidth:"1200px",margin:"0 auto" }}>
        {tab==="dashboard" && <>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"13px",marginBottom:"24px" }}>
            {[{l:"Revenue",v:fmt(totalRev),ic:"💰",c:"#10B981",s:"+18% this month"},{l:"Items Sold",v:totalSold,ic:"📦",c:"#2563EB",s:"Total units"},{l:"Active Listings",v:listings.filter(l=>l.status==="active").length,ic:"🏪",c:"#8B5CF6",s:"Live products"},{l:"Pending",v:3,ic:"⏳",c:"#F59E0B",s:"Awaiting shipment"}].map(s=>(
              <div key={s.l} style={{ background:th.card,borderRadius:"13px",padding:"16px",border:`1px solid ${th.border}`,position:"relative",overflow:"hidden" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:"3px",background:s.c }}/>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"7px" }}>
                  <div style={{ color:th.sub,fontSize:"11px",fontFamily:"'Barlow',sans-serif",fontWeight:600 }}>{s.l}</div>
                  <div style={{ width:"32px",height:"32px",borderRadius:"9px",background:s.c+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px" }}>{s.ic}</div>
                </div>
                <div style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"24px",fontWeight:800,marginBottom:"3px" }}>{s.v}</div>
                <div style={{ color:s.c,fontSize:"10px",fontFamily:"'Barlow',sans-serif",fontWeight:600 }}>{s.s}</div>
              </div>
            ))}
          </div>
          <div style={{ background:th.card,borderRadius:"15px",padding:"20px",border:`1px solid ${th.border}` }}>
            <h3 style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"16px",fontWeight:800,textTransform:"uppercase",marginBottom:"13px" }}>Recent Orders</h3>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead><tr style={{ borderBottom:`1px solid ${th.border}` }}>{["Order ID","Product","Buyer","Amount","Status","Date"].map(h=><th key={h} style={{ color:th.muted,fontFamily:"'Barlow',sans-serif",fontSize:"10px",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",padding:"6px 10px",textAlign:"left" }}>{h}</th>)}</tr></thead>
                <tbody>
                  {[{id:"VTX-A8F2",p:"Carbon Wallet",b:"Priya K.",a:"₹6,600",st:"shipped",d:"Today"},{id:"VTX-B3K7",p:"Custom Backpack",b:"Rahul R.",a:"₹2,499",st:"pending",d:"Yesterday"},{id:"VTX-C9P1",p:"Carbon Wallet",b:"Ananya L.",a:"₹6,600",st:"delivered",d:"Mar 10"}].map(row=>(
                    <tr key={row.id} style={{ borderBottom:`1px solid ${th.border}` }}>
                      <td style={{ color:th.accent,fontFamily:"'Barlow',sans-serif",fontSize:"12px",fontWeight:700,padding:"10px" }}>{row.id}</td>
                      <td style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontSize:"12px",padding:"10px" }}>{row.p}</td>
                      <td style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontSize:"12px",padding:"10px" }}>{row.b}</td>
                      <td style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontSize:"12px",padding:"10px",fontWeight:600 }}>{row.a}</td>
                      <td style={{ padding:"10px" }}><StatusBadge status={row.st}/></td>
                      <td style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"11px",padding:"10px" }}>{row.d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>}

        {tab==="listings" && (
          <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px" }}>
              <h3 style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"19px",fontWeight:800,textTransform:"uppercase" }}>📋 My Listings</h3>
              <Btn th={th} onClick={()=>setTab("list")}>+ List New Product</Btn>
            </div>
            {listings.map(l=>(
              <div key={l.id} style={{ background:th.card,borderRadius:"13px",padding:"14px",display:"flex",gap:"13px",alignItems:"center",border:`1px solid ${th.border}` }}>
                <div style={{ width:"56px",height:"56px",borderRadius:"10px",overflow:"hidden",background:isDark?th.bg:"#F8FAFC",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"26px",flexShrink:0 }}>
                  {l.img ? <img src={l.img} alt={l.name} style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : l.emoji}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:"7px",marginBottom:"3px" }}>
                    <span style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"13px" }}>{l.name}</span>
                    <span style={{ background:l.status==="active"?"#10B98122":"#EF444422",color:l.status==="active"?"#10B981":"#EF4444",fontSize:"9px",fontWeight:800,padding:"2px 7px",borderRadius:"20px",fontFamily:"'Barlow',sans-serif",textTransform:"uppercase" }}>{l.status}</span>
                  </div>
                  <div style={{ color:th.muted,fontSize:"11px",fontFamily:"'Barlow',sans-serif" }}>{l.cat} · {l.stock} in stock · {l.sold} sold</div>
                </div>
                <div style={{ textAlign:"right",flexShrink:0 }}>
                  <div style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"17px",fontWeight:800 }}>{fmt(l.price)}</div>
                  <div style={{ color:"#10B981",fontSize:"10px",fontFamily:"'Barlow',sans-serif" }}>Revenue: {fmt(l.revenue)}</div>
                </div>
                <div style={{ display:"flex",gap:"5px" }}>
                  <Btn small th={th} variant="ghost">Edit</Btn>
                  <Btn small th={th} variant="danger" onClick={()=>setListings(ls=>ls.filter(x=>x.id!==l.id))}>Remove</Btn>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==="list" && (
          <div style={{ maxWidth:"600px" }}>
            <h3 style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"19px",fontWeight:800,textTransform:"uppercase",marginBottom:"20px" }}>➕ List a Product</h3>
            <div style={{ background:th.card,borderRadius:"16px",padding:"24px",border:`1px solid ${th.border}`,display:"flex",flexDirection:"column",gap:"14px" }}>
              <div>
                <label style={{ color:th.sub,fontSize:"11px",fontFamily:"'Barlow',sans-serif",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",display:"block",marginBottom:"7px" }}>Product Image</label>
                <input ref={imgRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleImg}/>
                <div onClick={()=>imgRef.current.click()} style={{ width:"100%",height:"170px",border:`2px dashed ${form.imgPreview?th.accent:th.border}`,borderRadius:"12px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",background:form.imgPreview?"transparent":th.bg,transition:"border-color .2s" }} onMouseEnter={e=>e.currentTarget.style.borderColor=th.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=form.imgPreview?th.accent:th.border}>
                  {form.imgPreview ? <img src={form.imgPreview} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : (
                    <><div style={{ fontSize:"38px",marginBottom:"8px" }}>📸</div>
                    <div style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"12px",fontWeight:600 }}>Click to upload product image</div>
                    <div style={{ color:th.muted,fontFamily:"'Barlow',sans-serif",fontSize:"10px",marginTop:"3px" }}>JPG, PNG, WEBP — max 5MB</div></>
                  )}
                </div>
                {form.imgPreview && <button onClick={()=>setForm(f=>({...f,imgPreview:null}))} style={{ marginTop:"5px",background:"none",border:"none",color:th.danger,cursor:"pointer",fontFamily:"'Barlow',sans-serif",fontSize:"11px",fontWeight:600 }}>✕ Remove image</button>}
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px" }}>
                <div style={{ gridColumn:"1/-1" }}><Field label="Product Name *" value={form.name} onChange={set("name")} placeholder="Enter product name" th={th} icon="📦"/></div>
                <Field label="Price (₹) *" value={form.price} onChange={set("price")} placeholder="0" th={th} icon="₹"/>
                <Field label="Stock Qty" value={form.stock} onChange={set("stock")} placeholder="0" th={th} icon="📊"/>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={{ color:th.sub,fontSize:"11px",fontFamily:"'Barlow',sans-serif",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",display:"block",marginBottom:"5px" }}>Category</label>
                  <select value={form.cat} onChange={e=>set("cat")(e.target.value)} style={{ width:"100%",background:th.inp,border:`1.5px solid ${th.inpB}`,color:th.text,borderRadius:"8px",padding:"10px 14px",fontSize:"13px",fontFamily:"'Barlow',sans-serif",outline:"none" }}>
                    {CATS.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn:"1/-1" }}><Field label="Description" value={form.desc} onChange={set("desc")} placeholder="Describe your product…" th={th} as="textarea"/></div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={{ color:th.sub,fontSize:"11px",fontFamily:"'Barlow',sans-serif",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",display:"block",marginBottom:"7px" }}>Emoji (if no image)</label>
                  <div style={{ display:"flex",gap:"6px",flexWrap:"wrap" }}>
                    {["📦","💻","🎧","⌚","🖱️","🎮","📱","🖥️","📷","🎵","👛","🎒","🔋","💡","🕹️"].map(e=>(
                      <button key={e} onClick={()=>set("emoji")(e)} style={{ width:"36px",height:"36px",background:form.emoji===e?th.accent:"transparent",border:`1.5px solid ${form.emoji===e?th.accent:th.border}`,borderRadius:"8px",cursor:"pointer",fontSize:"18px",display:"flex",alignItems:"center",justifyContent:"center" }}>{e}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ background:th.bg,borderRadius:"11px",padding:"13px",border:`1px solid ${th.border}`,display:"flex",gap:"11px",alignItems:"center" }}>
                <div style={{ width:"48px",height:"48px",borderRadius:"9px",overflow:"hidden",background:isDark?th.card:"#F8FAFC",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"26px",flexShrink:0 }}>
                  {form.imgPreview ? <img src={form.imgPreview} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : form.emoji}
                </div>
                <div>
                  <div style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"13px" }}>{form.name||"Product Name"}</div>
                  <div style={{ color:th.accent,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"16px",fontWeight:800 }}>{form.price?fmt(form.price):"₹0"}</div>
                  <div style={{ color:th.muted,fontSize:"10px",fontFamily:"'Barlow',sans-serif" }}>{form.cat} · Stock: {form.stock||0}</div>
                </div>
              </div>
              <Btn th={th} full onClick={listProduct}>🚀 List Now</Btn>
            </div>
          </div>
        )}

        {tab==="earnings" && (
          <div>
            <h3 style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"19px",fontWeight:800,textTransform:"uppercase",marginBottom:"20px" }}>💰 Earnings</h3>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"13px",marginBottom:"20px" }}>
              {[{l:"Total Revenue",v:fmt(totalRev),p:"All time"},{l:"This Month",v:"₹2,36,800",p:"Mar 2025"},{l:"Pending Payout",v:"₹53,400",p:"Est. Mar 20"}].map(s=>(
                <div key={s.l} style={{ background:th.card,borderRadius:"13px",padding:"17px",border:`1px solid ${th.border}` }}>
                  <div style={{ color:th.sub,fontSize:"11px",fontFamily:"'Barlow',sans-serif",marginBottom:"6px" }}>{s.l}</div>
                  <div style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"24px",fontWeight:800,marginBottom:"3px" }}>{s.v}</div>
                  <div style={{ color:th.muted,fontSize:"10px",fontFamily:"'Barlow',sans-serif" }}>{s.p}</div>
                </div>
              ))}
            </div>
            <div style={{ background:th.card,borderRadius:"15px",padding:"20px",border:`1px solid ${th.border}` }}>
              <h4 style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"13px",marginBottom:"16px" }}>Revenue — Last 7 Days</h4>
              <div style={{ display:"flex",alignItems:"flex-end",gap:"9px",height:"100px" }}>
                {[26600,40000,21700,58300,45000,68200,53400].map((v,i)=>(
                  <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px" }}>
                    <div style={{ fontSize:"8px",color:th.muted,fontFamily:"'Barlow',sans-serif" }}>{fmt(v)}</div>
                    <div style={{ width:"100%",background:i===6?th.accent:isDark?"#1E293B":"#E2E8F0",borderRadius:"3px 3px 0 0",height:`${(v/68200)*90}px`,transition:"height .3s" }}/>
                    <div style={{ color:th.muted,fontSize:"9px",fontFamily:"'Barlow',sans-serif" }}>{["M","T","W","T","F","S","S"][i]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════
function SettingsPage({ isDark, setDark, lang, setLang, user, setUser, addToast }) {
  const th = isDark ? D : L;
  const [notifP, setNotifP] = useState({ orders:true,deals:true,seller:true,security:true,newsletter:false });
  const [privacy, setPrivacy] = useState({ publicProfile:true,showOrders:false,marketing:false });
  const Toggle = ({ val, onChange }) => (
    <div onClick={onChange} style={{ width:"42px",height:"22px",background:val?th.accent:"#CBD5E1",borderRadius:"11px",padding:"2px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:val?"flex-end":"flex-start",transition:"all .25s",flexShrink:0 }}>
      <div style={{ width:"18px",height:"18px",background:"#fff",borderRadius:"50%",boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}/>
    </div>
  );
  const Row = ({ label, sub, val, onChange }) => (
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${th.border}` }}>
      <div><div style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:600,fontSize:"13px" }}>{label}</div>{sub&&<div style={{ color:th.muted,fontFamily:"'Barlow',sans-serif",fontSize:"11px" }}>{sub}</div>}</div>
      <Toggle val={val} onChange={onChange}/>
    </div>
  );

  return (
    <div style={{ background:th.bg,minHeight:"calc(100vh - 108px)",padding:"28px" }}>
      <div style={{ maxWidth:"700px",margin:"0 auto" }}>
        <h2 style={{ color:th.text,fontFamily:"'Barlow Condensed',sans-serif",fontSize:"26px",fontWeight:800,textTransform:"uppercase",marginBottom:"24px" }}>⚙️ Settings</h2>

        {/* Profile card */}
        <div style={{ background:th.card,borderRadius:"16px",padding:"20px",border:`1px solid ${th.border}`,marginBottom:"16px" }}>
          <h3 style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"14px",marginBottom:"14px" }}>👤 Account</h3>
          <div style={{ display:"flex",alignItems:"center",gap:"14px" }}>
            <div style={{ width:"54px",height:"54px",borderRadius:"50%",overflow:"hidden",background:th.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              {user.photo?<img src={user.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>:<span style={{ color:"#fff",fontSize:"22px" }}>👤</span>}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"14px" }}>{user.name}</div>
              <div style={{ color:th.sub,fontFamily:"'Barlow',sans-serif",fontSize:"12px" }}>{user.email}</div>
            </div>
            <Btn small th={th} variant="ghost">Edit Profile</Btn>
          </div>
        </div>

        {/* Language */}
        <div style={{ background:th.card,borderRadius:"16px",padding:"20px",border:`1px solid ${th.border}`,marginBottom:"16px" }}>
          <h3 style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"14px",marginBottom:"13px" }}>🌍 Language</h3>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"7px" }}>
            {Object.values(LANGS).map(l=>(
              <button key={l.code} onClick={()=>{ setLang(l.code); addToast(`Language changed to ${l.label}!`,"success"); }} style={{ background:lang===l.code?th.accent:th.bg,border:`1.5px solid ${lang===l.code?th.accent:th.border}`,color:lang===l.code?"#fff":th.text,borderRadius:"9px",padding:"9px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:"7px",fontFamily:"'Barlow',sans-serif",fontWeight:600,fontSize:"12px",transition:"all .2s" }}>
                <span style={{ fontSize:"18px" }}>{l.flag}</span>{l.label}{lang===l.code&&<span style={{ marginLeft:"auto" }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Appearance */}
        <div style={{ background:th.card,borderRadius:"16px",padding:"20px",border:`1px solid ${th.border}`,marginBottom:"16px" }}>
          <h3 style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"14px",marginBottom:"3px" }}>🎨 Appearance</h3>
          <Row label="Dark Mode" sub={`Currently: ${isDark?"Dark":"Light"} mode`} val={isDark} onChange={()=>setDark(d=>!d)}/>
        </div>

        {/* Notifications */}
        <div style={{ background:th.card,borderRadius:"16px",padding:"20px",border:`1px solid ${th.border}`,marginBottom:"16px" }}>
          <h3 style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"14px",marginBottom:"3px" }}>🔔 Notifications</h3>
          <Row label="Order Updates" sub="Shipments, deliveries, returns" val={notifP.orders} onChange={()=>setNotifP(p=>({...p,orders:!p.orders}))}/>
          <Row label="Deals & Promotions" sub="Flash sales, coupons" val={notifP.deals} onChange={()=>setNotifP(p=>({...p,deals:!p.deals}))}/>
          <Row label="Seller Activity" sub="Sales, reviews, payouts" val={notifP.seller} onChange={()=>setNotifP(p=>({...p,seller:!p.seller}))}/>
          <Row label="Security Alerts" sub="Sign-ins, password changes" val={notifP.security} onChange={()=>setNotifP(p=>({...p,security:!p.security}))}/>
          <Row label="Weekly Newsletter" sub="VERTIX digest" val={notifP.newsletter} onChange={()=>setNotifP(p=>({...p,newsletter:!p.newsletter}))}/>
        </div>

        {/* Privacy */}
        <div style={{ background:th.card,borderRadius:"16px",padding:"20px",border:`1px solid ${th.border}`,marginBottom:"16px" }}>
          <h3 style={{ color:th.text,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"14px",marginBottom:"3px" }}>🔒 Privacy</h3>
          <Row label="Public Profile" sub="Allow others to view your profile" val={privacy.publicProfile} onChange={()=>setPrivacy(p=>({...p,publicProfile:!p.publicProfile}))}/>
          <Row label="Show Order History" sub="Visible to sellers you buy from" val={privacy.showOrders} onChange={()=>setPrivacy(p=>({...p,showOrders:!p.showOrders}))}/>
          <Row label="Marketing Preferences" sub="Personalised ads and recommendations" val={privacy.marketing} onChange={()=>setPrivacy(p=>({...p,marketing:!p.marketing}))}/>
        </div>

        {/* Danger zone */}
        <div style={{ background:th.card,borderRadius:"16px",padding:"20px",border:`1px solid #EF444433` }}>
          <h3 style={{ color:"#EF4444",fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"14px",marginBottom:"13px" }}>⚠️ Danger Zone</h3>
          <div style={{ display:"flex",gap:"9px" }}>
            <Btn variant="danger" th={th} small>🗑 Delete Account</Btn>
            <Btn variant="danger" th={th} small>🧹 Clear All Data</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════════════════════
function Footer({ isDark }) {
  return (
    <footer style={{ background:"#060D1A",borderTop:"1px solid #1E293B",padding:"44px 28px 22px" }}>
      <div style={{ maxWidth:"1200px",margin:"0 auto" }}>
        <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:"36px",marginBottom:"36px" }}>
          <div>
            <Logo size={19} col="#FFFFFF"/>
            <p style={{ color:"#64748B",fontFamily:"'Barlow',sans-serif",fontSize:"12px",lineHeight:"1.8",marginTop:"12px",maxWidth:"260px" }}>India's premium electronics marketplace. Buy, sell, and discover the world's best tech — delivered pan-India.</p>
            <div style={{ display:"flex",gap:"8px",marginTop:"14px" }}>
              {["𝕏","in","f","▶"].map(s=><div key={s} style={{ width:"32px",height:"32px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"7px",display:"flex",alignItems:"center",justifyContent:"center",color:"#94A3B8",cursor:"pointer",fontSize:"12px",fontWeight:700 }}>{s}</div>)}
            </div>
          </div>
          {[["Shop",["Computers","Audio","Gaming","Wearables","Electronics","Accessories"]],["Account",["My Profile","My Orders","Wishlist","Addresses","Settings","Seller Hub"]],["Company",["About Us","Careers","Press","Blog","Contact Us"]]].map(([title,links])=>(
            <div key={title}>
              <div style={{ color:"#E2E8F0",fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:"12px",marginBottom:"12px",letterSpacing:"0.5px" }}>{title}</div>
              {links.map(l=><div key={l} style={{ color:"#64748B",fontFamily:"'Barlow',sans-serif",fontSize:"11px",marginBottom:"7px",cursor:"pointer",transition:"color .2s" }} onMouseEnter={e=>e.target.style.color="#94A3B8"} onMouseLeave={e=>e.target.style.color="#64748B"}>{l}</div>)}
            </div>
          ))}
        </div>
        <div style={{ borderTop:"1px solid #1E293B",paddingTop:"18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"9px" }}>
          <div style={{ color:"#475569",fontSize:"11px",fontFamily:"'Barlow',sans-serif" }}>© 2025 VERTIX Technologies Pvt. Ltd. All rights reserved. · Made with ❤️ in India</div>
          <div style={{ display:"flex",gap:"14px" }}>
            {["Privacy","Terms","Cookies","Sitemap"].map(l=><span key={l} style={{ color:"#475569",fontSize:"11px",fontFamily:"'Barlow',sans-serif",cursor:"pointer" }}>{l}</span>)}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [isDark, setDark]   = useState(false);
  const [lang, setLang]     = useState("en");
  const [page, setPage]     = useState("auth");
  const [user, setUser]     = useState(null);

  // ── Server-driven state ──────────────────────────────
  const [products, setProducts]   = useState(ALL_PRODUCTS);  // fallback to static
  const [cart, setCart]           = useState([]);
  const [wishlist, setWishlist]   = useState([]);
  const [notifs, setNotifs]       = useState([]);
  const [orders, setOrders]       = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading]     = useState({});

  const [viewProduct, setViewProduct] = useState(null);
  const [searchQ, setSearchQ]         = useState("");
  const [toasts, setToasts]           = useState([]);
  const th = isDark ? D : L;

  // ── Toast helper ─────────────────────────────────────
  const addToast = useCallback((msg, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts(ts => [...ts, { id, msg, type }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 3500);
  }, []);

  // ── Load state from API ───────────────────────────────
  const loadProducts = useCallback(async (params = {}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const data = await apiGet(`/api/products${qs ? "?" + qs : ""}`);
      setProducts(data.length ? data : ALL_PRODUCTS);
    } catch { setProducts(ALL_PRODUCTS); }
  }, []);

  const loadCart = useCallback(async () => {
    try { setCart(await apiGet("/api/cart")); } catch {}
  }, []);

  const loadWishlist = useCallback(async () => {
    try {
      const data = await apiGet("/api/wishlist");
      setWishlist(data.map(p => p.id));
    } catch {}
  }, []);

  const loadNotifs = useCallback(async () => {
    try { setNotifs(await apiGet("/api/notifications")); } catch {}
  }, []);

  const loadOrders = useCallback(async () => {
    try { setOrders(await apiGet("/api/orders")); } catch {}
  }, []);

  const loadAddresses = useCallback(async () => {
    try { setAddresses(await apiGet("/api/addresses")); } catch {}
  }, []);

  // Boot: check saved JWT, restore session
  useEffect(() => {
    const token = localStorage.getItem("vertix_token");
    const saved  = localStorage.getItem("vertix_user");
    if (token && saved) {
      const u = JSON.parse(saved);
      setUser(u);
      setPage("home");
      // Refresh profile from server
      apiGet("/api/auth/me").then(me => {
        setUser(me);
        localStorage.setItem("vertix_user", JSON.stringify(me));
      }).catch(() => {
        localStorage.removeItem("vertix_token");
        localStorage.removeItem("vertix_user");
        setUser(null); setPage("auth");
      });
    }
    loadProducts();
  }, []);  // eslint-disable-line

  // Load user-specific data after login
  useEffect(() => {
    if (!user) return;
    loadCart();
    loadWishlist();
    loadNotifs();
    loadOrders();
    loadAddresses();
  }, [user?.id]);  // eslint-disable-line

  // ── Auth ─────────────────────────────────────────────
  const handleAuth = async (credentials, mode) => {
    try {
      setLoading(l => ({ ...l, auth: true }));
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const data = await apiPost(endpoint, credentials);
      localStorage.setItem("vertix_token", data.token);
      localStorage.setItem("vertix_user",  JSON.stringify(data.user));
      setUser(data.user);
      setPage("home");
      addToast(`Welcome to VERTIX, ${data.user.name}! 👋`, "success");
    } catch (err) {
      addToast(err.message || "Login failed", "error");
    } finally {
      setLoading(l => ({ ...l, auth: false }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("vertix_token");
    localStorage.removeItem("vertix_user");
    setUser(null); setPage("auth");
    setCart([]); setWishlist([]); setNotifs([]); setOrders([]);
  };

  // ── Cart ──────────────────────────────────────────────
  const addToCart = useCallback(async (p) => {
    // Optimistic update
    setCart(c => {
      const ex = c.find(i => i.product_id === p.id || i.id === p.id);
      return ex
        ? c.map(i => (i.product_id === p.id || i.id === p.id) ? { ...i, qty: i.qty + 1 } : i)
        : [...c, { product_id: p.id, id: p.id, name: p.name, price: p.price, emoji: p.emoji, category: p.cat || p.category, qty: 1, image_url: p.image_url }];
    });
    addToast(`${p.name} added to cart ✓`, "success");
    try {
      await apiPost("/api/cart", { product_id: p.id, qty: 1 });
    } catch { loadCart(); }
  }, [addToast, loadCart]);

  const updateQty = useCallback(async (productId, qty) => {
    setCart(c => qty < 1 ? c.filter(i => i.product_id !== productId && i.id !== productId)
                         : c.map(i => (i.product_id === productId || i.id === productId) ? { ...i, qty } : i));
    try {
      await apiPut(`/api/cart/${productId}`, { qty });
    } catch { loadCart(); }
  }, [loadCart]);

  const removeFromCart = useCallback(async (productId) => {
    setCart(c => c.filter(i => i.product_id !== productId && i.id !== productId));
    try { await apiDelete(`/api/cart/${productId}`); } catch { loadCart(); }
  }, [loadCart]);

  // ── Wishlist ──────────────────────────────────────────
  const toggleWishlist = useCallback(async (id) => {
    const inW = wishlist.some(w=>String(w)===String(id));
    setWishlist(w => inW ? w.filter(x=>String(x)!==String(id)) : [...w, id]);
    const p = products.find(x => x.id === id);
    addToast(inW ? "Removed from Wishlist" : `${p?.name} saved ❤️`, "success");
    try {
      inW ? await apiDelete(`/api/wishlist/${id}`) : await apiPost(`/api/wishlist/${id}`);
    } catch { loadWishlist(); }
  }, [wishlist, products, addToast, loadWishlist]);

  // ── Notifications ─────────────────────────────────────
  const markNotifRead = useCallback(async (id) => {
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
    try { await apiPatch(`/api/notifications/${id}/read`); } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifs(ns => ns.map(n => ({ ...n, is_read: true })));
    try { await apiPatch("/api/notifications/read-all"); } catch {}
  }, []);

  // ── Addresses ─────────────────────────────────────────
  const saveAddress = useCallback(async (form, editId) => {
    try {
      if (editId) {
        const updated = await apiPut(`/api/addresses/${editId}`, form);
        setAddresses(a => a.map(x => x.id === editId ? updated : x));
      } else {
        const created = await apiPost("/api/addresses", form);
        setAddresses(a => [...a, created]);
      }
      addToast("Address saved ✓", "success");
      return true;
    } catch (err) {
      addToast(err.message || "Failed to save address", "error");
      return false;
    }
  }, [addToast]);

  const deleteAddress = useCallback(async (id) => {
    setAddresses(a => a.filter(x => x.id !== id));
    try { await apiDelete(`/api/addresses/${id}`); } catch { loadAddresses(); }
    addToast("Address removed", "success");
  }, [addToast, loadAddresses]);

  const setDefaultAddress = useCallback(async (id) => {
    setAddresses(a => a.map(x => ({ ...x, is_default: x.id === id })));
    try { await apiPatch(`/api/addresses/${id}/default`); } catch { loadAddresses(); }
  }, [loadAddresses]);

  // ── Orders ─────────────────────────────────────────────
  const placeOrder = useCallback(async (addressId, paymentMode) => {
    try {
      const order = await apiPost("/api/orders", { address_id: addressId, payment_mode: paymentMode });
      setCart([]);
      await loadOrders();
      addToast("Order placed successfully! 🎉", "success");
      return order;
    } catch (err) {
      addToast(err.message || "Failed to place order", "error");
      return null;
    }
  }, [addToast, loadOrders]);

  // ── Derived counts ────────────────────────────────────
  const cartCount  = cart.reduce((s, i) => s + (i.qty || 0), 0);
  const notifCount = notifs.filter(n => !n.is_read).length;

  // ── Navigation ────────────────────────────────────────
  const navigate = (p) => { setViewProduct(null); setSearchQ(""); setPage(p); };

  // ── Render pages ──────────────────────────────────────
  if (page === "auth") return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Barlow+Condensed:wght@600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Barlow',sans-serif;}::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:#060D1A;}::-webkit-scrollbar-thumb{background:#334155;border-radius:3px;}@keyframes toastSlide{from{opacity:0;transform:translateX(20px);}to{opacity:1;transform:translateX(0);}}`}</style>
      <Toasts items={toasts}/>
      <AuthPage onAuth={handleAuth} isDark={isDark} setDark={setDark} lang={lang} setLang={setLang} loading={loading.auth}/>
    </>
  );

  if (page === "logout") { handleLogout(); return null; }

  const renderPage = () => {
    if (viewProduct) return <ProductDetailPage product={viewProduct} isDark={isDark} onAddCart={addToCart} onWishlist={toggleWishlist} wishlist={wishlist} onBack={() => setViewProduct(null)}/>;
    switch (page) {
      case "home":          return <HomePage isDark={isDark} products={products} onAddCart={addToCart} onWishlist={toggleWishlist} wishlist={wishlist} onView={p => setViewProduct(p)} searchQ={searchQ} onSearch={q => { setSearchQ(q); loadProducts(q ? { search: q } : {}); }}/>;
      case "cart":          return <CartPage cart={cart} onQty={updateQty} onRemove={removeFromCart} isDark={isDark} onCheckout={() => setPage("checkout")}/>;
      case "checkout":      return <CheckoutPage cart={cart} isDark={isDark} addresses={addresses} onPlace={placeOrder} onSuccess={() => { setPage("home"); }}/>;
      case "wishlist":      return <WishlistPage isDark={isDark} wishlist={wishlist} onWishlist={toggleWishlist} onAddCart={addToCart} onView={p => setViewProduct(p)} products={products}/>;
      case "addresses":     return <AddressesPage isDark={isDark} addresses={addresses} onSave={saveAddress} onDelete={deleteAddress} onSetDefault={setDefaultAddress} addToast={addToast}/>;
      case "notifications": return <NotificationsPage isDark={isDark} notifs={notifs} onRead={markNotifRead} onReadAll={markAllRead}/>;
      case "orders":        return <OrdersPage isDark={isDark} orders={orders} onRefresh={loadOrders}/>;
      case "profile":       return <ProfilePage isDark={isDark} user={user} setUser={u => { setUser(u); localStorage.setItem("vertix_user", JSON.stringify(u)); }} addToast={addToast}/>;
      case "seller":        return <SellerPage isDark={isDark} user={user} addToast={addToast}/>;
      case "settings":      return <SettingsPage isDark={isDark} setDark={setDark} lang={lang} setLang={setLang} user={user} setUser={setUser} addToast={addToast}/>;
      default:              return <HomePage isDark={isDark} products={products} onAddCart={addToCart} onWishlist={toggleWishlist} wishlist={wishlist} onView={p => setViewProduct(p)} searchQ={searchQ} onSearch={q => { setSearchQ(q); loadProducts(q ? { search: q } : {}); }}/>;
    }
  };

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Barlow+Condensed:wght@600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Barlow',sans-serif;background:${th.bg};}::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:${isDark?"#060D1A":"#F1F5F9"};}::-webkit-scrollbar-thumb{background:${isDark?"#334155":"#CBD5E1"};border-radius:3px;}@keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}@keyframes toastSlide{from{opacity:0;transform:translateX(20px);}to{opacity:1;transform:translateX(0);}}input,textarea,select{font-family:'Barlow',sans-serif;}input::placeholder,textarea::placeholder{color:#94A3B8;}`}</style>
      <Toasts items={toasts}/>
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:th.bg }}>
        <Topbar user={user} page={page} setPage={navigate} isDark={isDark} setDark={setDark} lang={lang} setLang={setLang} cartCount={cartCount} notifCount={notifCount} wishCount={wishlist.length} searchQ={searchQ} setSearchQ={q => { setSearchQ(q); loadProducts(q ? { search: q } : {}); }}/>
        <main style={{ flex:1 }}>{renderPage()}</main>
        <Footer isDark={isDark}/>
      </div>
    </>
  );
}
