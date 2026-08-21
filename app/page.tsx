"use client";

import {ChangeEvent,FormEvent,useEffect,useMemo,useRef,useState} from "react";

type PriceItem={id:string;name:string;price:number;note:string};
type Product={id:string;name:string;price:number;description:string};
type Business={name:string;tagline:string;phone:string;whatsapp:string;address:string;mapQuery:string;hours:string};
type Tab="home"|"prices"|"gallery"|"products";

const defaultBusiness:Business={name:"BARBERA",tagline:"היי, טוב שבאת 👋🏻",phone:"050-555-0198",whatsapp:"972505550198",address:"רחוב הרצל 24, ראשון לציון",mapQuery:"הרצל 24 ראשון לציון",hours:"א׳–ה׳ 09:00–20:00 · ו׳ 08:00–14:00"};
const defaultPrices:PriceItem[]=[{id:"p1",name:"תספורת גבר",price:70,note:"כולל עיצוב וגימור"},{id:"p2",name:"תספורת + זקן",price:95,note:"החבילה המלאה"},{id:"p3",name:"סידור זקן",price:45,note:"עיצוב, דירוג וגימור"},{id:"p4",name:"תספורת ילד",price:60,note:"עד גיל 12"}];
const defaultProducts:Product[]=[{id:"s1",name:"ווקס מט",price:55,description:"אחיזה חזקה ללא ברק"},{id:"s2",name:"שמן לזקן",price:65,description:"ריכוך, הזנה וריח נקי"},{id:"s3",name:"ספריי מלח",price:60,description:"נפח ומרקם טבעי"}];
const uid=()=>Math.random().toString(36).slice(2,9);
const money=(value:number)=>`${value.toLocaleString("he-IL")} ₪`;
const icons={home:"⌂",prices:"₪",gallery:"▦",products:"◈",pin:"⌖",clock:"◷",phone:"⌕",back:"‹"};

function compressImage(file:File){return new Promise<string>((resolve,reject)=>{const image=new Image(),reader=new FileReader();reader.onload=()=>{image.onload=()=>{const max=960,scale=Math.min(1,max/Math.max(image.width,image.height)),canvas=document.createElement("canvas");canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext("2d")?.drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",.72))};image.onerror=reject;image.src=String(reader.result)};reader.onerror=reject;reader.readAsDataURL(file)})}

export default function Home(){
 const [business,setBusiness]=useState(defaultBusiness),[prices,setPrices]=useState(defaultPrices),[products,setProducts]=useState(defaultProducts),[gallery,setGallery]=useState<string[]>([]);
 const [tab,setTab]=useState<Tab>("home"),[adminOpen,setAdminOpen]=useState(false),[bookingOpen,setBookingOpen]=useState(false),[toast,setToast]=useState("");
 const [adminTab,setAdminTab]=useState<"details"|"prices"|"products"|"gallery">("details");
 const fileInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{const stored=localStorage.getItem("barbera-content-v2")??localStorage.getItem("barbera-content-v1");if(stored){try{const p=JSON.parse(stored);if(p.business)setBusiness(p.business);if(p.prices)setPrices(p.prices);if(p.products)setProducts(p.products);if(p.gallery)setGallery(p.gallery)}catch{}}if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>undefined)},[]);
 useEffect(()=>{try{localStorage.setItem("barbera-content-v2",JSON.stringify({business,prices,products,gallery}))}catch{setToast("אין מספיק מקום לשמירת תמונות נוספות")}},[business,prices,products,gallery]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(""),2300);return()=>clearTimeout(timer)},[toast]);
 const mapUrl=useMemo(()=>`https://waze.com/ul?q=${encodeURIComponent(business.mapQuery)}&navigate=yes`,[business.mapQuery]);

 function openTab(next:Tab){setTab(next);window.scrollTo({top:0,behavior:"smooth"})}
 function handleImages(e:ChangeEvent<HTMLInputElement>){const files=Array.from(e.target.files??[]).slice(0,Math.max(0,8-gallery.length));Promise.all(files.map(compressImage)).then(images=>{setGallery(current=>[...current,...images].slice(0,8));setToast("התמונות נשמרו במכשיר")}).catch(()=>setToast("לא הצלחנו לקרוא את התמונה"));e.target.value=""}
 function saveDetails(e:FormEvent<HTMLFormElement>){e.preventDefault();const v=new FormData(e.currentTarget);setBusiness({name:String(v.get("name")),tagline:String(v.get("tagline")),phone:String(v.get("phone")),whatsapp:String(v.get("whatsapp")),address:String(v.get("address")),mapQuery:String(v.get("mapQuery")),hours:String(v.get("hours"))});setToast("פרטי העסק נשמרו")}
 function sendBooking(e:FormEvent<HTMLFormElement>){e.preventDefault();const v=new FormData(e.currentTarget),service=prices.find(item=>item.id===v.get("service"));const message=`היי ${business.name}, אשמח לקבוע תור\nשירות: ${service?.name??""}\nתאריך: ${v.get("date")}\nשעה מועדפת: ${v.get("time")}`;window.open(`https://wa.me/${business.whatsapp}?text=${encodeURIComponent(message)}`,"_blank")}

 return <main className="app-shell">
  <header className="app-header"><button className="mini-logo" onClick={()=>openTab("home")}>B</button><strong>{business.name}</strong><button className="manage-link" onClick={()=>setAdminOpen(true)}>ניהול</button></header>

  {tab==="home"&&<div className="screen home-screen">
   <section className={`cover ${gallery[0]?"has-photo":"default-cover"}`} style={gallery[0]?{backgroundImage:`linear-gradient(180deg,transparent 40%,rgba(0,0,0,.45)),url(${gallery[0]})`}:{backgroundImage:"linear-gradient(180deg,transparent 45%,rgba(0,0,0,.5)),url(/og.png)"}}/>
   <section className="quick-actions">
    <a href={mapUrl} target="_blank" rel="noreferrer"><i>{icons.pin}</i><span>איך מגיעים</span></a>
    <button onClick={()=>{setToast(business.hours)}}><i>{icons.clock}</i><span>שעות פעילות</span></button>
    <a href={`tel:${business.phone}`}><i>{icons.phone}</i><span>דברו איתנו</span></a>
   </section>
   <section className="welcome-card"><h1>{business.tagline}</h1><p>הגיע הזמן להתחדש. בחרו שירות ותאריך, ואנחנו נאשר לכם את התור ב‑WhatsApp.</p><button className="black-button" onClick={()=>setBookingOpen(true)}>קביעת תור</button></section>
   <section className="feature-card" onClick={()=>openTab("gallery")} role="button" tabIndex={0}>
    {gallery[1]?<img src={gallery[1]} alt="עבודה מהמספרה"/>:<div className="feature-placeholder"><span>✂</span></div>}
    <div><span>העבודות שלנו</span><h2>קצת עלינו</h2><p>הציצו בגלריה והכירו את הסגנון שלנו.</p></div>
   </section>
   <section className="home-price-preview"><div className="section-title"><div><span>השירותים שלנו</span><h2>מה מתאים לך?</h2></div><button onClick={()=>openTab("prices")}>לכל המחירון</button></div>{prices.slice(0,3).map(item=><div className="service-row" key={item.id}><div><strong>{item.name}</strong><small>{item.note}</small></div><b>{money(item.price)}</b></div>)}</section>
  </div>}

  {tab==="prices"&&<div className="screen"><PageTitle title="מחירון" subtitle="כל השירותים, בלי הפתעות" onBack={()=>openTab("home")}/><section className="list-section">{prices.map((item,index)=><article className="list-card" key={item.id}><span className="number">{String(index+1).padStart(2,"0")}</span><div><h3>{item.name}</h3><p>{item.note}</p></div><strong>{money(item.price)}</strong></article>)}<button className="black-button wide" onClick={()=>setBookingOpen(true)}>קביעת תור</button></section></div>}
  {tab==="gallery"&&<div className="screen"><PageTitle title="הגלריה" subtitle="תוצאות שמדברות בעד עצמן" onBack={()=>openTab("home")}/>{gallery.length?<section className="photo-grid">{gallery.map((image,index)=><img key={index} src={image} alt={`עבודה ${index+1}`}/>)}</section>:<section className="empty-state"><span>▦</span><h2>עוד אין כאן תמונות</h2><p>הוסיפו עבודות דרך אזור הניהול והן יופיעו כאן.</p><button className="outline-button" onClick={()=>{setAdminTab("gallery");setAdminOpen(true)}}>הוספת תמונות</button></section>}</div>}
  {tab==="products"&&<div className="screen"><PageTitle title="המוצרים שלנו" subtitle="להמשיך את הלוק גם בבית" onBack={()=>openTab("home")}/><section className="products-grid">{products.map((product,index)=><article className="product-card" key={product.id}><div className={`product-art tone-${index%3+1}`}><span>{product.name.slice(0,1)}</span></div><div><h3>{product.name}</h3><p>{product.description}</p><strong>{money(product.price)}</strong></div></article>)}</section></div>}

  <nav className="bottom-nav" aria-label="ניווט ראשי">{([['home','בית'],['prices','מחירון'],['gallery','גלריה'],['products','מוצרים']] as const).map(([key,label])=><button key={key} className={tab===key?"active":""} onClick={()=>openTab(key)}><i>{icons[key]}</i><span>{label}</span></button>)}</nav>

  {bookingOpen&&<div className="sheet-backdrop" onMouseDown={()=>setBookingOpen(false)}><section className="bottom-sheet" onMouseDown={e=>e.stopPropagation()}><div className="sheet-handle"/><header><div><small>מתחדשים?</small><h2>קביעת תור</h2></div><button onClick={()=>setBookingOpen(false)}>×</button></header><form className="booking-form" onSubmit={sendBooking}><label>בחרו שירות<select name="service" required>{prices.map(item=><option key={item.id} value={item.id}>{item.name} · {money(item.price)}</option>)}</select></label><div className="form-row"><label>תאריך<input name="date" type="date" min={new Date().toISOString().slice(0,10)} required/></label><label>שעה מועדפת<input name="time" type="time" required/></label></div><p>הבקשה תישלח ל‑WhatsApp והמספרה תאשר את השעה.</p><button className="black-button wide" type="submit">שליחת בקשה ב‑WhatsApp</button></form></section></div>}

  {adminOpen&&<div className="sheet-backdrop admin-backdrop" onMouseDown={()=>setAdminOpen(false)}><section className="admin-panel" onMouseDown={e=>e.stopPropagation()}><header><div><small>עריכת תוכן</small><h2>ניהול האפליקציה</h2></div><button onClick={()=>setAdminOpen(false)}>×</button></header><nav className="admin-tabs">{([['details','פרטים'],['prices','מחירון'],['products','מוצרים'],['gallery','תמונות']] as const).map(([key,label])=><button key={key} className={adminTab===key?"active":""} onClick={()=>setAdminTab(key)}>{label}</button>)}</nav>
   {adminTab==="details"&&<form className="admin-form" onSubmit={saveDetails}><label>שם העסק<input name="name" defaultValue={business.name} required/></label><label>משפט פתיחה<input name="tagline" defaultValue={business.tagline} required/></label><label>טלפון<input name="phone" defaultValue={business.phone} required/></label><label>מספר WhatsApp עם 972<input name="whatsapp" defaultValue={business.whatsapp} required/></label><label>כתובת לתצוגה<input name="address" defaultValue={business.address} required/></label><label>כתובת לניווט<input name="mapQuery" defaultValue={business.mapQuery} required/></label><label>שעות פעילות<input name="hours" defaultValue={business.hours} required/></label><button className="black-button wide" type="submit">שמירת פרטים</button></form>}
   {adminTab==="prices"&&<EditorList items={prices} setItems={setPrices} kind="price"/>}
   {adminTab==="products"&&<EditorList items={products} setItems={setProducts} kind="product"/>}
   {adminTab==="gallery"&&<div className="gallery-editor"><input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={handleImages}/><button className="upload-zone" onClick={()=>fileInput.current?.click()} disabled={gallery.length>=8}><span>＋</span><strong>{gallery.length>=8?"הגלריה מלאה":"בחירת תמונות מהמכשיר"}</strong><small>{gallery.length}/8 תמונות · התמונה הראשונה היא תמונת השער</small></button><div className="gallery-thumbs">{gallery.map((image,index)=><div key={index}><img src={image} alt=""/><button onClick={()=>setGallery(list=>list.filter((_,i)=>i!==index))}>×</button></div>)}</div></div>}
  </section></div>}
  {toast&&<div className="toast">{toast}</div>}
 </main>
}

function PageTitle({title,subtitle,onBack}:{title:string;subtitle:string;onBack:()=>void}){return <header className="page-title"><button onClick={onBack} aria-label="חזרה">‹</button><div><small>{subtitle}</small><h1>{title}</h1></div><span/></header>}

function EditorList({items,setItems,kind}:{items:(PriceItem|Product)[];setItems:React.Dispatch<React.SetStateAction<any[]>>;kind:"price"|"product"}){return <div className="editor-list">{items.map(item=><div className="editor-row" key={item.id}><div><input value={item.name} onChange={e=>setItems(list=>list.map(x=>x.id===item.id?{...x,name:e.target.value}:x))}/><input value={kind==="price"?(item as PriceItem).note:(item as Product).description} onChange={e=>setItems(list=>list.map(x=>x.id===item.id?{...x,[kind==="price"?"note":"description"]:e.target.value}:x))}/></div><input className="price-input" type="number" value={item.price} onChange={e=>setItems(list=>list.map(x=>x.id===item.id?{...x,price:Number(e.target.value)}:x))}/><button className="remove" onClick={()=>setItems(list=>list.filter(x=>x.id!==item.id))}>×</button></div>)}<button className="add-row" onClick={()=>setItems(list=>[...list,kind==="price"?{id:uid(),name:"שירות חדש",price:0,note:"תיאור קצר"}:{id:uid(),name:"מוצר חדש",price:0,description:"תיאור קצר"}])}>+ הוספה חדשה</button></div>}
