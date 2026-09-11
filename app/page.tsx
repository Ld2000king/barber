"use client";

import {ChangeEvent,FormEvent,useEffect,useMemo,useRef,useState} from "react";
import {createUserWithEmailAndPassword,onAuthStateChanged,signInWithEmailAndPassword,signOut as firebaseSignOut} from "firebase/auth";
import {Timestamp,collection,deleteDoc,doc,getDoc,onSnapshot,query,runTransaction,serverTimestamp,setDoc,updateDoc,where,writeBatch} from "firebase/firestore";
import emailjs from "@emailjs/browser";
import {auth,db} from "../lib/firebase";

type PriceItem={id:string;name:string;price:number;note:string};
type Product={id:string;name:string;price:number;description:string;image?:string};
type Business={name:string;tagline:string;phone:string;whatsapp:string;address:string;mapQuery:string;hours:string};
type Tab="home"|"prices"|"gallery"|"products"|"appointments"|"swap";
type Role="barber"|"client";
type ApprovalStatus="pending"|"approved"|"rejected";
type Session={uid:string;role:Role;phone:string;email:string;shopId:string;approvalStatus:ApprovalStatus;shopName?:string};
type ShopApproval={id:string;uid:string;shopName:string;email:string;phone:string;shopId:string;status:ApprovalStatus};
type AuthErrors={email?:string;password?:string;phone?:string;barberCode?:string;form?:string};
type Appointment={id:string;shopId?:string;clientId?:string;clientName?:string;clientPhone:string;service:string;date:string;time:string;slotId?:string;status:"pending"|"confirmed"|"cancelled"};
type WorkDay={enabled:boolean;start:string;end:string;slots:number};
type Schedule={days:Record<number,WorkDay>;minDuration:number};
type OccupiedSlot={id:string;shopId?:string;date:string;time:string;status:"booked"};
type SwapListingStatus="open"|"swapped";
type SwapOfferStatus="pending"|"accepted"|"declined"|"expired"|"cancelled";
type SwapListing={id:string;shopId:string;appointmentId:string;ownerId:string;ownerName:string;service:string;date:string;time:string;slotId:string;status:SwapListingStatus};
type SwapSide={UserId:string;Name:string;ListingId:string;AppointmentId:string;Date:string;Time:string;SlotId:string;Service:string};
type SwapOffer={id:string;shopId:string;status:SwapOfferStatus;expiresAt?:Timestamp}
 &{[K in keyof SwapSide as `from${K}`]:SwapSide[K]}
 &{[K in keyof SwapSide as `to${K}`]:SwapSide[K]};

const DEFAULT_SHOP_ID="ari-cohen";
const ADMIN_EMAIL="liavdimri12@gmail.com";
const EMAILJS_SERVICE_ID=import.meta.env.VITE_EMAILJS_SERVICE_ID as string|undefined;
const EMAILJS_TEMPLATE_ID=import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string|undefined;
const EMAILJS_PUBLIC_KEY=import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string|undefined;
const resolveApprovalStatus=(role:Role,data:Record<string,unknown>):ApprovalStatus=>{if(role!=="barber")return"approved";const status=String(data.status||"");return status==="pending"?"pending":status==="rejected"?"rejected":"approved"};
function notifyAdminOfShopRequest(shopName:string,email:string,phone:string){
 if(!EMAILJS_SERVICE_ID||!EMAILJS_TEMPLATE_ID||!EMAILJS_PUBLIC_KEY)return Promise.resolve();
 return emailjs.send(EMAILJS_SERVICE_ID,EMAILJS_TEMPLATE_ID,{to_email:ADMIN_EMAIL,shop_name:shopName,barber_email:email,barber_phone:phone},{publicKey:EMAILJS_PUBLIC_KEY}).catch(()=>undefined);
}
const cleanShopId=(value:string)=>value.toLowerCase().trim().replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")||DEFAULT_SHOP_ID;
const cleanBarberCode=(value:string)=>value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,10);
const makeBarberCode=()=>{const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";return Array.from({length:8},()=>chars[Math.floor(Math.random()*chars.length)]).join("")};
const requestedShopId=()=>{if(typeof window==="undefined")return DEFAULT_SHOP_ID;return cleanShopId(new URLSearchParams(window.location.search).get("shop")||DEFAULT_SHOP_ID)};
const defaultBusiness:Business={name:"ARI COHEN",tagline:"אהלן, ארי כאן 👋🏻",phone:"",whatsapp:"",address:"שדרות רוטשילד 74, תל אביב",mapQuery:"שדרות רוטשילד 74 תל אביב",hours:"א׳–ה׳ 09:00–20:00 · ו׳ 08:00–14:00"};
const defaultPrices:PriceItem[]=[{id:"p1",name:"תספורת גבר",price:70,note:"כולל עיצוב וגימור"},{id:"p2",name:"תספורת + זקן",price:95,note:"החבילה המלאה"},{id:"p3",name:"סידור זקן",price:45,note:"עיצוב, דירוג וגימור"},{id:"p4",name:"תספורת ילד",price:60,note:"עד גיל 12"}];
const defaultProducts:Product[]=[{id:"s1",name:"ווקס מט",price:55,description:"אחיזה חזקה ללא ברק"},{id:"s2",name:"שמן לזקן",price:65,description:"ריכוך, הזנה וריח נקי"},{id:"s3",name:"ספריי מלח",price:60,description:"נפח ומרקם טבעי"}];
const assetUrl=(path:string)=>`${import.meta.env.BASE_URL}${path.replace(/^\//,"")}`;
const demoPhoto=assetUrl("barber-gallery-v1.png");
const defaultGallery=[demoPhoto,demoPhoto,demoPhoto,demoPhoto];
const marketingWhatsAppUrl=`https://wa.me/972528856539?text=${encodeURIComponent("מה נשמע אח בנוגע לאפליקציה אשמח לשמוע פרטים")}`;
const defaultSchedule:Schedule={minDuration:30,days:{0:{enabled:true,start:"09:00",end:"20:00",slots:12},1:{enabled:true,start:"09:00",end:"20:00",slots:12},2:{enabled:true,start:"09:00",end:"20:00",slots:12},3:{enabled:true,start:"09:00",end:"20:00",slots:12},4:{enabled:true,start:"09:00",end:"20:00",slots:12},5:{enabled:true,start:"08:00",end:"14:00",slots:8},6:{enabled:false,start:"09:00",end:"20:00",slots:0}}};
const dayNames=["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","שבת"];
const uid=()=>Math.random().toString(36).slice(2,9);
const money=(value:number)=>`${value.toLocaleString("he-IL")} ₪`;
const icons={home:"⌂",prices:"₪",gallery:"▦",products:"◈",appointments:"◷",swap:"⇄",pin:"⌖",clock:"◷",phone:"⌕",back:"‹"};
const SWAP_ANSWER_WINDOW_MS=3*60*60*1000;
const appointmentStart=(date:string,time:string)=>new Date(`${date}T${time||"00:00"}`).getTime();
const offerDeadline=(offer:SwapOffer)=>offer.expiresAt?offer.expiresAt.toMillis():0;
const offerIsLive=(offer:SwapOffer,now:number)=>offer.status==="pending"&&offerDeadline(offer)>now;
const offerRanOut=(offer:SwapOffer,now:number)=>offer.status==="pending"&&offerDeadline(offer)<=now;
const countdownLabel=(offer:SwapOffer,now:number)=>{const left=offerDeadline(offer)-now;if(left<=0)return"נגמר הזמן";const hours=Math.floor(left/3600000),minutes=Math.max(1,Math.round(left%3600000/60000));return hours?`נותרו ${hours}ש׳ ${minutes}ד׳`:`נותרו ${minutes} דקות`};
const swapWhen=(date:string,time:string)=>{const parsed=new Date(`${date}T${time||"00:00"}`);return Number.isNaN(parsed.getTime())?`${date} ${time}`:`יום ${dayNames[parsed.getDay()]} ${parsed.getDate()}/${parsed.getMonth()+1} · ${time}`};
const dateKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const timeToMinutes=(time:string)=>{const [hours,minutes]=time.split(":").map(Number);return hours*60+minutes};
const minutesToTime=(value:number)=>`${String(Math.floor(value/60)).padStart(2,"0")}:${String(value%60).padStart(2,"0")}`;
const slotId=(shopId:string,date:string,time:string)=>`${shopId}__${date}_${time.replace(":","")}`;
async function reserveBarberCode(shopId:string){for(let attempt=0;attempt<12;attempt++){const code=makeBarberCode(),codeRef=doc(db,"barberCodes",code);try{await runTransaction(db,async transaction=>{const existing=await transaction.get(codeRef);if(existing.exists())throw new Error("shop-code-taken");transaction.set(codeRef,{shopId,createdAt:serverTimestamp()})});return code}catch(error){if(String((error as Error).message).includes("shop-code-taken"))continue;throw error}}throw new Error("shop-code-generation-failed")}
function generateSlots(day:WorkDay){if(!day?.enabled||day.slots<1)return[];const start=timeToMinutes(day.start),end=timeToMinutes(day.end),duration=end-start,maxSlots=Math.max(0,Math.floor(duration/30)),count=Math.min(Math.max(1,day.slots),maxSlots);if(!count)return[];if(count===1)return[minutesToTime(start)];const rawStep=(duration-30)/(count-1),result:string[]=[];for(let index=0;index<count;index++){const rounded=Math.round((start+index*rawStep)/5)*5,value=Math.min(rounded,end-30),time=minutesToTime(value);if(!result.includes(time))result.push(time)}return result}
function compressImage(file:File,max=720,quality=.68){return new Promise<string>((resolve,reject)=>{const image=new Image(),reader=new FileReader();reader.onload=()=>{image.onload=()=>{const scale=Math.min(1,max/Math.max(image.width,image.height)),canvas=document.createElement("canvas");canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext("2d")?.drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",quality))};image.onerror=reject;image.src=String(reader.result)};reader.onerror=reject;reader.readAsDataURL(file)})}

export default function Home(){
 const [shopId,setShopId]=useState(requestedShopId),[barberCode,setBarberCode]=useState("");
 const [business,setBusiness]=useState(defaultBusiness),[prices,setPrices]=useState(defaultPrices),[products,setProducts]=useState(defaultProducts),[gallery,setGallery]=useState<string[]>(defaultGallery),[schedule,setSchedule]=useState<Schedule>(defaultSchedule);
 const [tab,setTab]=useState<Tab>("home"),[adminOpen,setAdminOpen]=useState(false),[bookingOpen,setBookingOpen]=useState(false),[toast,setToast]=useState("");
 const [session,setSession]=useState<Session|null>(null),[isAdmin,setIsAdmin]=useState(false),[roleChoice,setRoleChoice]=useState<Role|null>(null),[appointments,setAppointments]=useState<Appointment[]>([]),[occupiedSlots,setOccupiedSlots]=useState<OccupiedSlot[]>([]);
 const [bookingDate,setBookingDate]=useState(""),[bookingTime,setBookingTime]=useState("");
 const [authMode,setAuthMode]=useState<"login"|"register">("register"),[authBusy,setAuthBusy]=useState(true),[authErrors,setAuthErrors]=useState<AuthErrors>({});
 const [adminTab,setAdminTab]=useState<"details"|"schedule"|"prices"|"products"|"gallery"|"broadcast">("details");
 const [swapListings,setSwapListings]=useState<SwapListing[]>([]),[offersIn,setOffersIn]=useState<SwapOffer[]>([]),[offersOut,setOffersOut]=useState<SwapOffer[]>([]);
 const [swapTarget,setSwapTarget]=useState<SwapListing|null>(null),[swapBusy,setSwapBusy]=useState(false),[now,setNow]=useState(()=>Date.now());
 const fileInput=useRef<HTMLInputElement>(null),announcedExpiry=useRef<Set<string>>(new Set());

 useEffect(()=>{const key=`barbera-content-v3:${shopId}`,stored=localStorage.getItem(key);if(stored){try{const p=JSON.parse(stored);if(p.business)setBusiness(p.business);if(p.prices)setPrices(p.prices);if(p.products)setProducts(p.products);if(Array.isArray(p.gallery))setGallery(p.gallery);if(p.schedule)setSchedule(p.schedule)}catch{}}if("serviceWorker" in navigator)navigator.serviceWorker.register(assetUrl("sw.js")).catch(()=>undefined);return onAuthStateChanged(auth,async user=>{if(!user){setSession(null);setIsAdmin(false);setAuthBusy(false);return}if(user.email===ADMIN_EMAIL){setIsAdmin(true);setSession(null);setAuthBusy(false);return}setIsAdmin(false);try{const profile=await getDoc(doc(db,"users",user.uid));if(profile.exists()){const data=profile.data(),role:Role=data.role==="barber"?"barber":"client",profileShop=cleanShopId(String(data.shopId||DEFAULT_SHOP_ID)),approvalStatus=resolveApprovalStatus(role,data);setShopId(profileShop);if(role==="barber"&&data.barberCode)setBarberCode(cleanBarberCode(String(data.barberCode)));setSession({uid:user.uid,email:user.email??"",phone:String(data.phone??""),role,shopId:profileShop,approvalStatus,shopName:role==="barber"?String(data.shopName||""):undefined})}}catch{setToast("לא הצלחנו לטעון את החשבון")}finally{setAuthBusy(false)}})},[]);

 useEffect(()=>{if(!session||session.role!=="barber")return;return onSnapshot(doc(db,"users",session.uid),snapshot=>{if(!snapshot.exists())return;const data=snapshot.data(),status=resolveApprovalStatus("barber",data);setSession(current=>current&&current.uid===session.uid?{...current,approvalStatus:status,shopName:String(data.shopName||current.shopName||"")}:current)},()=>undefined)},[session?.uid,session?.role]);

 useEffect(()=>{if(!session)return;setBusiness(defaultBusiness);setPrices(defaultPrices);setProducts(defaultProducts);setGallery(defaultGallery);setSchedule(defaultSchedule);return onSnapshot(doc(db,"businesses",shopId),snapshot=>{if(!snapshot.exists()){if(session.role==="barber"&&session.approvalStatus==="approved"){const newBusiness={...defaultBusiness,name:session.shopName||defaultBusiness.name,tagline:"ברוכים הבאים למספרה 👋🏻"};reserveBarberCode(shopId).then(generated=>setDoc(doc(db,"businesses",shopId),{shopId,barberCode:generated,business:newBusiness,prices:defaultPrices,products:defaultProducts,gallery:defaultGallery,schedule:defaultSchedule,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}).then(()=>setDoc(doc(db,"users",session.uid),{barberCode:generated,updatedAt:serverTimestamp()},{merge:true})).then(()=>setBarberCode(generated))).catch(()=>setToast("לא הצלחנו ליצור את המספרה"))}return}const data=snapshot.data();if(data.business)setBusiness(data.business);if(data.prices)setPrices(data.prices);if(data.products)setProducts(data.products);if(Array.isArray(data.gallery))setGallery(data.gallery);if(data.schedule)setSchedule(data.schedule);if(data.barberCode)setBarberCode(cleanBarberCode(String(data.barberCode)));else if(session.role==="barber"&&session.approvalStatus==="approved"){reserveBarberCode(shopId).then(generated=>setDoc(doc(db,"businesses",shopId),{barberCode:generated,updatedAt:serverTimestamp()},{merge:true}).then(()=>setDoc(doc(db,"users",session.uid),{barberCode:generated,updatedAt:serverTimestamp()},{merge:true})).then(()=>setBarberCode(generated))).catch(()=>setToast("לא הצלחנו ליצור קוד מספרה"))}},()=>setToast("לא הצלחנו לטעון את פרטי המספרה"))},[session?.uid,session?.role,session?.approvalStatus,shopId]);

 useEffect(()=>{if(!session)return;const base=collection(db,"appointments"),appointmentsQuery=session.role==="barber"?query(base,where("shopId","==",shopId)):query(base,where("clientId","==",session.uid),where("shopId","==",shopId));return onSnapshot(appointmentsQuery,snapshot=>{const list=snapshot.docs.map(item=>({id:item.id,...item.data()} as Appointment)).filter(item=>item.shopId===shopId||(!item.shopId&&shopId===DEFAULT_SHOP_ID));list.sort((a,b)=>`${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));setAppointments(list)},()=>setToast("לא הצלחנו לטעון את התורים"))},[session,shopId]);

 useEffect(()=>{if(!session)return;const availabilityQuery=query(collection(db,"availability"),where("shopId","==",shopId));return onSnapshot(availabilityQuery,snapshot=>setOccupiedSlots(snapshot.docs.map(item=>({id:item.id,...item.data()} as OccupiedSlot))),()=>setToast("לא הצלחנו לטעון את זמינות התורים"))},[session?.uid,shopId]);

 useEffect(()=>{if(!session)return;const listingsQuery=query(collection(db,"swapListings"),where("shopId","==",shopId));return onSnapshot(listingsQuery,snapshot=>setSwapListings(snapshot.docs.map(item=>({id:item.id,...item.data()} as SwapListing))),()=>setToast("לא הצלחנו לטעון את מכרז ההחלפות"))},[session?.uid,shopId]);

 useEffect(()=>{if(!session)return;const base=collection(db,"swapOffers");
  if(session.role==="barber"){const shopOffers=query(base,where("shopId","==",shopId));return onSnapshot(shopOffers,snapshot=>{const list=snapshot.docs.map(item=>({id:item.id,...item.data()} as SwapOffer));setOffersIn(list.filter(offer=>offer.toUserId===session.uid));setOffersOut(list.filter(offer=>offer.fromUserId===session.uid))},()=>setToast("לא הצלחנו לטעון את הצעות ההחלפה"))}
  const stopIncoming=onSnapshot(query(base,where("toUserId","==",session.uid)),snapshot=>setOffersIn(snapshot.docs.map(item=>({id:item.id,...item.data()} as SwapOffer))),()=>setToast("לא הצלחנו לטעון את הצעות ההחלפה"));
  const stopOutgoing=onSnapshot(query(base,where("fromUserId","==",session.uid)),snapshot=>setOffersOut(snapshot.docs.map(item=>({id:item.id,...item.data()} as SwapOffer))),()=>undefined);
  return()=>{stopIncoming();stopOutgoing()}},[session?.uid,session?.role,shopId]);

 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer)},[]);

 useEffect(()=>{const ranOut=offersOut.filter(offer=>offerRanOut(offer,now)&&!announcedExpiry.current.has(offer.id));if(!ranOut.length)return;ranOut.forEach(offer=>{announcedExpiry.current.add(offer.id);updateDoc(doc(db,"swapOffers",offer.id),{status:"expired",resolvedAt:serverTimestamp()}).catch(()=>undefined)});setToast(ranOut.length>1?`נגמר זמן ההמתנה ל-${ranOut.length} הצעות החלפה. אפשר להציע מחדש`:"נגמר זמן ההמתנה להצעת ההחלפה. אפשר להציע מחדש")},[offersOut,now]);

 useEffect(()=>{try{localStorage.setItem(`barbera-content-v3:${shopId}`,JSON.stringify({business,prices,products,gallery,schedule}))}catch{setToast("אין מספיק מקום לשמירת תמונות נוספות")}},[business,prices,products,gallery,schedule,shopId]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(""),2300);return()=>clearTimeout(timer)},[toast]);

 const mapUrl=useMemo(()=>`https://waze.com/ul?q=${encodeURIComponent(business.mapQuery)}&navigate=yes`,[business.mapQuery]);
 const bookingDays=useMemo(()=>Array.from({length:14},(_,index)=>{const date=new Date();date.setHours(12,0,0,0);date.setDate(date.getDate()+index);return{key:dateKey(date),dayIndex:date.getDay(),dayName:dayNames[date.getDay()],dateLabel:`${date.getDate()}/${date.getMonth()+1}`,enabled:Boolean(schedule.days[date.getDay()]?.enabled)}}).filter(day=>day.enabled),[schedule]);
 const selectedDay=bookingDays.find(day=>day.key===bookingDate),daySlots=selectedDay?generateSlots(schedule.days[selectedDay.dayIndex]):[];
 const busySlotIds=useMemo(()=>new Set([...occupiedSlots.filter(slot=>slot.shopId===shopId).map(slot=>slot.id),...appointments.filter(item=>item.status!=="cancelled"&&item.shopId===shopId).map(item=>slotId(shopId,item.date,item.time))]),[occupiedSlots,appointments,shopId]);
 useEffect(()=>{if(!bookingOpen)return;const next=bookingDays.find(day=>day.key===bookingDate)??bookingDays[0];setBookingDate(next?.key??"");setBookingTime("")},[bookingOpen,bookingDays,bookingDate]);

 const openListings=useMemo(()=>swapListings.filter(listing=>listing.status==="open"&&listing.shopId===shopId&&appointmentStart(listing.date,listing.time)>now).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),[swapListings,shopId,now]);
 const myListings=useMemo(()=>openListings.filter(listing=>listing.ownerId===session?.uid),[openListings,session?.uid]);
 const marketListings=useMemo(()=>openListings.filter(listing=>listing.ownerId!==session?.uid),[openListings,session?.uid]);
 const listingOfAppointment=useMemo(()=>new Map(openListings.map(listing=>[listing.appointmentId,listing])),[openListings]);
 const listingIsOpen=useMemo(()=>{const open=new Set(openListings.map(listing=>listing.id));return(id:string)=>open.has(id)},[openListings]);
 const swappableAppointments=useMemo(()=>appointments.filter(item=>item.status!=="cancelled"&&appointmentStart(item.date,item.time)>now).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),[appointments,now]);
 const incomingOffers=useMemo(()=>offersIn.filter(offer=>offerIsLive(offer,now)&&listingIsOpen(offer.fromListingId)&&listingIsOpen(offer.toListingId)).sort((a,b)=>offerDeadline(a)-offerDeadline(b)),[offersIn,now,listingIsOpen]);
 const outgoingOffers=useMemo(()=>offersOut.filter(offer=>offer.status==="pending"||offer.status==="expired").sort((a,b)=>offerDeadline(b)-offerDeadline(a)),[offersOut]);
 const offeredListingIds=useMemo(()=>new Set(offersOut.filter(offer=>offerIsLive(offer,now)).map(offer=>offer.toListingId)),[offersOut,now]);

 function openTab(next:Tab){setTab(next);window.scrollTo({top:0,behavior:"smooth"})}
 function handleImages(e:ChangeEvent<HTMLInputElement>){if(session?.role!=="barber"){e.target.value="";return}const files=Array.from(e.target.files??[]).slice(0,Math.max(0,8-gallery.length));Promise.all(files.map(file=>compressImage(file))).then(images=>{setGallery(current=>{const next=[...current,...images].slice(0,8);saveCloudContent({gallery:next}).then(()=>setToast("התמונות עלו לגלריה")).catch(()=>setToast("לא הצלחנו לשמור את התמונות בענן"));return next})}).catch(()=>setToast("לא הצלחנו לקרוא את התמונה"));e.target.value=""}
 function removeGalleryImage(index:number){if(session?.role!=="barber")return;setGallery(current=>{const next=current.filter((_,itemIndex)=>itemIndex!==index);saveCloudContent({gallery:next}).then(()=>setToast("התמונה הוסרה מהגלריה")).catch(()=>setToast("לא הצלחנו לעדכן את הגלריה"));return next})}
 async function saveCloudContent(next:Record<string,unknown>){if(session?.role!=="barber"||session.shopId!==shopId)return;await setDoc(doc(db,"businesses",shopId),{...next,shopId,updatedAt:serverTimestamp()},{merge:true})}
 function saveDetails(e:FormEvent<HTMLFormElement>){e.preventDefault();if(session?.role!=="barber")return;const v=new FormData(e.currentTarget),next={name:String(v.get("name")),tagline:String(v.get("tagline")),phone:String(v.get("phone")),whatsapp:String(v.get("whatsapp")),address:String(v.get("address")),mapQuery:String(v.get("mapQuery")),hours:String(v.get("hours"))};setBusiness(next);saveCloudContent({business:next}).then(()=>setToast("פרטי העסק נשמרו בענן")).catch(()=>setToast("לא הצלחנו לשמור את הפרטים"))}
 function saveSchedule(){if(session?.role!=="barber")return;if(Object.values(schedule.days).some(day=>day.enabled&&timeToMinutes(day.end)-timeToMinutes(day.start)<30)){setToast("בכל יום פעיל חייבות להיות לפחות 30 דקות עבודה");return}saveCloudContent({schedule}).then(()=>setToast("לוח העבודה נשמר והתורים עודכנו")).catch(()=>setToast("לא הצלחנו לשמור את לוח העבודה"))}

 async function identify(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!roleChoice)return;
  const v=new FormData(e.currentTarget),email=String(v.get("email")??"").trim().toLowerCase(),password=String(v.get("password")??""),phone=String(v.get("phone")??"").replace(/\D/g,""),shopName=String(v.get("shopName")??"").trim(),enteredBarberCode=cleanBarberCode(String(v.get("barberCode")??"")),isAdminEmail=email===ADMIN_EMAIL,errors:AuthErrors={};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))errors.email="יש להזין כתובת אימייל תקינה";
  if(password.length<6)errors.password="הסיסמה חייבת להכיל לפחות 6 תווים";
  if(!isAdminEmail){
   if(!/^(05\d{8}|9725\d{8})$/.test(phone))errors.phone="יש להזין מספר ישראלי תקין, לדוגמה 0501234567";
   if(roleChoice==="barber"&&authMode==="register"&&shopName.length<2)errors.form="יש להזין שם למספרה";
   if(roleChoice==="client"&&authMode==="register"&&enteredBarberCode.length<4)errors.barberCode="יש להזין את קוד המספרה שקיבלת";
  }
  if(Object.keys(errors).length){setAuthErrors(errors);return}
  setAuthErrors({});setAuthBusy(true);
  try{
   if(isAdminEmail){
    if(authMode==="register")await createUserWithEmailAndPassword(auth,email,password);
    else await signInWithEmailAndPassword(auth,email,password);
    setIsAdmin(true);return;
   }
   if(authMode==="register"){
    if(roleChoice==="client"){
     const codeSnapshot=await getDoc(doc(db,"barberCodes",enteredBarberCode));
     if(!codeSnapshot.exists()){setAuthErrors({barberCode:"קוד המספרה לא נמצא. בדקו את הקוד ונסו שוב"});return}
     const clientShopId=cleanShopId(String(codeSnapshot.data().shopId||""));
     const credential=await createUserWithEmailAndPassword(auth,email,password);
     await setDoc(doc(db,"users",credential.user.uid),{email,phone,role:"client",shopId:clientShopId,barberCode:enteredBarberCode,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
     setShopId(clientShopId);setSession({uid:credential.user.uid,email,phone,role:"client",shopId:clientShopId,approvalStatus:"approved"});
    }else{
     const credential=await createUserWithEmailAndPassword(auth,email,password),newShopId=cleanShopId(`${shopName}-${credential.user.uid.slice(0,6)}`);
     await setDoc(doc(db,"users",credential.user.uid),{email,phone,role:"barber",shopId:newShopId,shopName,status:"pending",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
     await setDoc(doc(db,"shopApprovals",credential.user.uid),{uid:credential.user.uid,email,phone,shopId:newShopId,shopName,status:"pending",createdAt:serverTimestamp()});
     await notifyAdminOfShopRequest(shopName,email,phone);
     setShopId(newShopId);setSession({uid:credential.user.uid,email,phone,role:"barber",shopId:newShopId,approvalStatus:"pending",shopName});setToast("הבקשה נשלחה לאישור. תקבלו גישה למספרה לאחר האישור");
    }
   }else{
    const credential=await signInWithEmailAndPassword(auth,email,password);const profile=await getDoc(doc(db,"users",credential.user.uid));
    if(!profile.exists()){await firebaseSignOut(auth);setAuthErrors({form:"החשבון לא הוגדר במערכת"});return}
    const data=profile.data(),actualRole:Role=data.role==="barber"?"barber":"client",savedPhone=String(data.phone??"").replace(/\D/g,"");
    if(savedPhone&&savedPhone!==phone){await firebaseSignOut(auth);setAuthErrors({phone:"מספר הטלפון אינו תואם לחשבון"});return}
    if(actualRole!==roleChoice){await firebaseSignOut(auth);setAuthErrors({form:roleChoice==="barber"?"החשבון הזה אינו מוגדר כחשבון ספר":"יש להיכנס דרך כניסת הספר"});return}
    const activeShop=cleanShopId(String(data.shopId||DEFAULT_SHOP_ID)),approvalStatus=resolveApprovalStatus(actualRole,data);setShopId(activeShop);if(actualRole==="barber"&&data.barberCode)setBarberCode(cleanBarberCode(String(data.barberCode)));setSession({uid:credential.user.uid,email,phone:savedPhone||phone,role:actualRole,shopId:activeShop,approvalStatus,shopName:actualRole==="barber"?String(data.shopName||""):undefined});
   }
  }catch(error){const code=String((error as {code?:string;message?:string}).code??(error as {message?:string}).message??"");if(code.includes("email-already-in-use"))setAuthErrors({email:"האימייל כבר רשום — עברו לכניסה לחשבון"});else if(code.includes("invalid-email"))setAuthErrors({email:"כתובת האימייל אינה תקינה"});else if(code.includes("weak-password")||code.includes("missing-password"))setAuthErrors({password:"הסיסמה חייבת להכיל לפחות 6 תווים"});else if(code.includes("invalid-credential")||code.includes("user-not-found")||code.includes("wrong-password"))setAuthErrors({form:"האימייל או הסיסמה אינם נכונים"});else if(code.includes("too-many-requests"))setAuthErrors({form:"בוצעו יותר מדי ניסיונות. נסו שוב בעוד כמה דקות"});else if(code.includes("network-request-failed"))setAuthErrors({form:"אין חיבור לרשת. בדקו את האינטרנט ונסו שוב"});else if(code.includes("permission-denied"))setAuthErrors({form:"אין הרשאה לפעולה. יש לוודא שכללי Firestore המעודכנים פורסמו"});else setAuthErrors({form:"לא הצלחנו להשלים את ההתחברות. נסו שוב"})}finally{setAuthBusy(false)}
 }
 async function signOut(){await firebaseSignOut(auth);setSession(null);setIsAdmin(false);setRoleChoice(null);setBarberCode("");setTab("home")}

 async function sendBooking(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!session||!bookingDate||!bookingTime){setToast("בחרו יום ושעה פנויה");return}const v=new FormData(e.currentTarget),service=prices.find(item=>item.id===v.get("service")),appointmentRef=doc(collection(db,"appointments")),currentSlotId=slotId(shopId,bookingDate,bookingTime),availabilityRef=doc(db,"availability",currentSlotId),barberPhone=String(v.get("clientPhone")??"").replace(/\D/g,""),barberName=String(v.get("clientName")??"").trim();if(session.role==="barber"&&(!barberName||!/^(05\d{8}|9725\d{8})$/.test(barberPhone))){setToast("יש להזין שם ומספר טלפון תקין של הלקוח");return}try{const batch=writeBatch(db);batch.set(appointmentRef,{shopId,clientId:session.role==="client"?session.uid:"",clientName:session.role==="barber"?barberName:"",clientPhone:session.role==="barber"?barberPhone:session.phone,clientEmail:session.role==="client"?session.email:"",createdBy:session.role,service:service?.name??"",date:bookingDate,time:bookingTime,slotId:currentSlotId,status:"confirmed",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});batch.set(availabilityRef,{shopId,date:bookingDate,time:bookingTime,status:"booked",appointmentId:appointmentRef.id,updatedAt:serverTimestamp()});await batch.commit();setBookingOpen(false);setBookingTime("");setToast(session.role==="barber"?"התור נקבע ללקוח ונשמר ביומן":"התור נקבע בהצלחה ונשמר ביומן")}catch(error){const message=String((error as {code?:string;message?:string}).code??(error as Error).message??"");setToast(message.includes("already-exists")||message.includes("permission-denied")?"התור נתפס כרגע — בחרו שעה ירוקה אחרת":"לא הצלחנו לשמור את התור")}}
 async function cancelAppointment(item:Appointment){if(!session||item.status==="cancelled")return;if(session.role==="client"&&item.clientId!==session.uid)return;try{await runTransaction(db,async transaction=>{const availabilityRef=doc(db,"availability",slotId(shopId,item.date,item.time)),availability=await transaction.get(availabilityRef);transaction.update(doc(db,"appointments",item.id),{status:"cancelled",updatedAt:serverTimestamp()});if(availability.exists())transaction.delete(availabilityRef)});if(listingOfAppointment.has(item.id))await deleteDoc(doc(db,"swapListings",item.id)).catch(()=>undefined);setToast("התור בוטל והשעה חזרה להיות פנויה")}catch{setToast("לא הצלחנו לבטל את התור")}}

 async function listForSwap(item:Appointment){if(!session)return;setSwapBusy(true);try{await setDoc(doc(db,"swapListings",item.id),{shopId,appointmentId:item.id,ownerId:session.uid,ownerName:item.clientName?.trim()||"לקוח המספרה",service:item.service||"תור",date:item.date,time:item.time,slotId:item.slotId||slotId(shopId,item.date,item.time),status:"open",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});setToast("התור עלה למכרז ההחלפות")}catch{setToast("לא הצלחנו להעלות את התור להחלפה")}finally{setSwapBusy(false)}}
 async function unlistSwap(listing:SwapListing){setSwapBusy(true);try{await deleteDoc(doc(db,"swapListings",listing.id));setToast("התור הוסר ממכרז ההחלפות")}catch{setToast("לא הצלחנו להסיר את התור")}finally{setSwapBusy(false)}}
 async function sendSwapOffer(target:SwapListing,mine:SwapListing){if(!session)return;setSwapBusy(true);try{await setDoc(doc(collection(db,"swapOffers")),{shopId,status:"pending",expiresAt:Timestamp.fromMillis(Date.now()+SWAP_ANSWER_WINDOW_MS),fromUserId:session.uid,fromName:mine.ownerName,fromListingId:mine.id,fromAppointmentId:mine.appointmentId,fromDate:mine.date,fromTime:mine.time,fromSlotId:mine.slotId,fromService:mine.service,toUserId:target.ownerId,toName:target.ownerName,toListingId:target.id,toAppointmentId:target.appointmentId,toDate:target.date,toTime:target.time,toSlotId:target.slotId,toService:target.service,createdAt:serverTimestamp()});setSwapTarget(null);setToast("ההצעה נשלחה. יש שלוש שעות לתשובה")}catch{setToast("לא הצלחנו לשלוח את ההצעה")}finally{setSwapBusy(false)}}
 function resendSwapOffer(offer:SwapOffer){const mine=openListings.find(listing=>listing.id===offer.fromListingId),target=openListings.find(listing=>listing.id===offer.toListingId);if(!mine||!target){setToast("אחד התורים כבר לא זמין להחלפה");return}return sendSwapOffer(target,mine)}
 async function withdrawSwapOffer(offer:SwapOffer){setSwapBusy(true);try{await updateDoc(doc(db,"swapOffers",offer.id),{status:"cancelled",resolvedAt:serverTimestamp()});setToast("ההצעה בוטלה")}catch{setToast("לא הצלחנו לבטל את ההצעה")}finally{setSwapBusy(false)}}
 async function declineSwapOffer(offer:SwapOffer){setSwapBusy(true);try{await updateDoc(doc(db,"swapOffers",offer.id),{status:"declined",resolvedAt:serverTimestamp()});setToast("ההצעה נדחתה. שני התורים נשארים במכרז")}catch{setToast("לא הצלחנו לעדכן את ההצעה")}finally{setSwapBusy(false)}}
 async function acceptSwapOffer(offer:SwapOffer){
  setSwapBusy(true);
  try{
   await runTransaction(db,async transaction=>{
    const offerRef=doc(db,"swapOffers",offer.id),fromListingRef=doc(db,"swapListings",offer.fromListingId),toListingRef=doc(db,"swapListings",offer.toListingId);
    const current=await transaction.get(offerRef),fromListing=await transaction.get(fromListingRef),toListing=await transaction.get(toListingRef);
    if(!current.exists()||current.data().status!=="pending")throw new Error("swap-closed");
    const deadline=current.data().expiresAt as Timestamp|undefined;
    if(!deadline||deadline.toMillis()<=Date.now())throw new Error("swap-expired");
    if(!fromListing.exists()||fromListing.data().status!=="open"||!toListing.exists()||toListing.data().status!=="open")throw new Error("swap-closed");
    transaction.update(offerRef,{status:"accepted",resolvedAt:serverTimestamp()});
    transaction.update(doc(db,"appointments",offer.fromAppointmentId),{date:offer.toDate,time:offer.toTime,slotId:offer.toSlotId,swapOfferId:offer.id,updatedAt:serverTimestamp()});
    transaction.update(doc(db,"appointments",offer.toAppointmentId),{date:offer.fromDate,time:offer.fromTime,slotId:offer.fromSlotId,swapOfferId:offer.id,updatedAt:serverTimestamp()});
    transaction.update(doc(db,"availability",offer.fromSlotId),{appointmentId:offer.toAppointmentId,swapOfferId:offer.id,updatedAt:serverTimestamp()});
    transaction.update(doc(db,"availability",offer.toSlotId),{appointmentId:offer.fromAppointmentId,swapOfferId:offer.id,updatedAt:serverTimestamp()});
    transaction.update(fromListingRef,{status:"swapped",swapOfferId:offer.id,updatedAt:serverTimestamp()});
    transaction.update(toListingRef,{status:"swapped",swapOfferId:offer.id,updatedAt:serverTimestamp()});
   });
   setToast(`ההחלפה בוצעה! התור שלך עבר ל${swapWhen(offer.fromDate,offer.fromTime)}`);
  }catch(error){const reason=String((error as Error).message||"");setToast(reason.includes("expired")?"נגמר זמן ההמתנה להצעה הזו":reason.includes("closed")?"ההצעה כבר לא רלוונטית":"לא הצלחנו לבצע את ההחלפה")}finally{setSwapBusy(false)}
 }

 const setPricesSynced:React.Dispatch<React.SetStateAction<PriceItem[]>>=update=>setPrices(current=>{const next=typeof update==="function"?update(current):update;saveCloudContent({prices:next}).catch(()=>setToast("לא הצלחנו לשמור את המחירון"));return next});
 const setProductsSynced:React.Dispatch<React.SetStateAction<Product[]>>=update=>setProducts(current=>{const next=typeof update==="function"?update(current):update;saveCloudContent({products:next}).catch(()=>setToast("לא הצלחנו לשמור את המוצרים"));return next});

 if(authBusy&&!roleChoice)return <main className="auth-shell"><div className="auth-brand"><img src="/barbers-logo.png" alt="BARBERS"/><strong>{business.name}</strong><small>מתחברים למספרה...</small></div></main>;
 if(isAdmin)return <AdminDashboard onSignOut={signOut}/>;
 if(!session)return <main className="auth-shell">{toast&&<div className="toast">{toast}</div>}<div className="auth-brand"><img src="/barbers-logo.png" alt="לוגו BARBERS"/><strong>{business.name}</strong><small>BARBER STUDIO</small></div>{!roleChoice?<section className="role-card"><small>ברוכים הבאים</small><h1>איך תרצו להיכנס?</h1><p>בחרו את סוג החשבון כדי שנציג לכם רק את הכלים המתאימים.</p><button onClick={()=>{setRoleChoice("client");setAuthMode("register");setAuthErrors({})}}><i>♙</i><div><strong>כניסה כלקוח</strong><small>תורים, גלריה, מחירון ודרכי הגעה</small></div><b>‹</b></button><button onClick={()=>{setRoleChoice("barber");setAuthMode("login");setAuthErrors({})}}><i>✂</i><div><strong>כניסה כספר</strong><small>כניסה קיימת או הרשמה כספר חדש</small></div><b>‹</b></button></section>:<section className="phone-card"><button className="auth-back" onClick={()=>{setRoleChoice(null);setAuthErrors({})}}>→</button><small>{roleChoice==="barber"?(authMode==="register"?"הרשמת ספר חדש":"כניסת ספר"):(authMode==="register"?"הרשמת לקוח":"כניסת לקוח")}</small><h1>{authMode==="register"?(roleChoice==="barber"?"פתיחת מספרה חדשה":"פתיחת חשבון"):"כניסה לחשבון"}</h1><p>{authMode==="register"?(roleChoice==="barber"?"ניצור חשבון ספר ומספרה נפרדת עם יומן, תורים ותוכן משלה.":"הזינו את קוד המספרה שקיבלתם. החשבון ישויך אליה באופן קבוע."):"הזינו את פרטי החשבון שאיתם נרשמתם."}</p><form onSubmit={identify} noValidate>{authErrors.form&&<div className="auth-form-error" role="alert">{authErrors.form}</div>}{roleChoice==="barber"&&authMode==="register"&&<label>שם המספרה<input name="shopName" type="text" placeholder="לדוגמה: Liav Barber" autoFocus required/></label>}{roleChoice==="client"&&authMode==="register"&&<label>קוד מספרה<input name="barberCode" type="text" inputMode="text" placeholder="לדוגמה: A7K9Q2M4" autoCapitalize="characters" autoFocus aria-invalid={Boolean(authErrors.barberCode)} onChange={e=>{e.currentTarget.value=cleanBarberCode(e.currentTarget.value);authErrors.barberCode&&setAuthErrors(current=>({...current,barberCode:undefined}))}} required/>{authErrors.barberCode&&<small className="field-error">{authErrors.barberCode}</small>}</label>}<label>אימייל<input name="email" type="email" inputMode="email" placeholder="name@example.com" autoFocus={authMode!=="register"} aria-invalid={Boolean(authErrors.email)}/>{authErrors.email&&<small className="field-error">{authErrors.email}</small>}</label><label>סיסמה<input name="password" type="password" placeholder="לפחות 6 תווים" aria-invalid={Boolean(authErrors.password)}/>{authErrors.password&&<small className="field-error">{authErrors.password}</small>}</label><label>מספר טלפון<input name="phone" type="tel" inputMode="tel" placeholder="05X-XXXXXXX" aria-invalid={Boolean(authErrors.phone)}/>{authErrors.phone&&<small className="field-error">{authErrors.phone}</small>}</label><button className="black-button wide" type="submit" disabled={authBusy}>{authBusy?"בודקים את הפרטים...":authMode==="register"?(roleChoice==="barber"?"פתיחת חשבון ספר":"פתיחת חשבון לקוח"):"כניסה"}</button></form><button className="auth-switch" onClick={()=>{setAuthMode(mode=>mode==="login"?"register":"login");setAuthErrors({})}}>{authMode==="register"?(roleChoice==="barber"?"כבר יש לך חשבון ספר? כניסה":"כבר נרשמת? כניסה לחשבון"):(roleChoice==="barber"?"ספר חדש? הרשמה כספר חדש":"לקוח חדש? פתיחת חשבון")}</button><em>{roleChoice==="barber"&&authMode==="register"?"הרשמת ספר חדש כפופה לאישור הנהלת האפליקציה":roleChoice==="client"&&authMode==="register"?"את קוד המספרה מקבלים מהמספרה":"השיוך למספרה נשמר בחשבון"}</em></section>}</main>;

 if(session.role==="barber"&&session.approvalStatus!=="approved")return <main className="auth-shell">{toast&&<div className="toast">{toast}</div>}<div className="auth-brand"><img src="/barbers-logo.png" alt="לוגו BARBERS"/><strong>{session.shopName||business.name}</strong><small>BARBER STUDIO</small></div><section className="role-card">{session.approvalStatus==="rejected"?<><small>סטטוס בקשה</small><h1>הבקשה נדחתה</h1><p>הבקשה שלכם להצטרפות כספר לאפליקציה לא אושרה. לפרטים נוספים אפשר לפנות אלינו בוואטסאפ.</p></>:<><small>סטטוס בקשה</small><h1>הבקשה ממתינה לאישור</h1><p>קיבלנו את הבקשה לפתיחת מספרה חדשה. ברגע שהבקשה תאושר תקבלו גישה מלאה למספרה — אין צורך לעשות דבר בינתיים.</p></>}<button className="black-button wide" onClick={signOut}>יציאה</button></section></main>;

 return <main className="app-shell">
  <header className="app-header"><button className="mini-logo" onClick={()=>openTab("home")} aria-label="חזרה לדף הבית"><img src="/barbers-logo.png" alt=""/></button><strong>{business.name}</strong><button className="manage-link" onClick={session.role==="barber"?()=>setAdminOpen(true):signOut}>{session.role==="barber"?"ניהול":"יציאה"}</button></header>

  {tab==="home"&&<div className="screen home-screen"><section className={`cover ${gallery[0]?"has-photo":"default-cover"} ${gallery[0]===demoPhoto?"preset-cover":""}`} style={gallery[0]?{backgroundImage:`linear-gradient(180deg,transparent 40%,rgba(0,0,0,.45)),url(${gallery[0]})`}:{backgroundImage:"linear-gradient(180deg,transparent 45%,rgba(0,0,0,.5)),url(/og.jpg)"}}/><section className="quick-actions"><a href={mapUrl} target="_blank" rel="noreferrer"><i>{icons.pin}</i><span>איך מגיעים</span></a><button onClick={()=>setToast(business.hours)}><i>{icons.clock}</i><span>שעות פעילות</span></button>{business.phone?<a href={`tel:${business.phone}`}><i>{icons.phone}</i><span>דברו איתנו</span></a>:<button onClick={()=>setToast("מספר הטלפון יעודכן בקרוב")}><i>{icons.phone}</i><span>דברו איתנו</span></button>}</section><section className="welcome-card"><h1>{session.role==="barber"?"בוקר טוב, המספרה שלך מוכנה":business.tagline}</h1><p>{session.role==="barber"?`${appointments.filter(a=>a.status!=="cancelled").length} תורים במערכת · אפשר לנהל הכל מכאן.`:"הגיע הזמן להתחדש. בחרו שירות, תאריך ושעה פנויה."}</p><button className="black-button" onClick={session.role==="barber"?()=>openTab("appointments"):()=>setBookingOpen(true)}>{session.role==="barber"?"פתיחת מערכת התורים":"קביעת תור"}</button></section><section className="feature-card" onClick={()=>openTab("gallery")} role="button" tabIndex={0}>{gallery[1]?<div className={`feature-photo ${gallery[1]===demoPhoto?"preset-photo preset-2":""}`} style={{backgroundImage:`url(${gallery[1]})`}} role="img" aria-label="עבודה מהמספרה"/>:<div className="feature-placeholder"><span>✂</span></div>}<div><span>העבודות שלנו</span><h2>קצת עלינו</h2><p>הציצו בגלריה והכירו את הסגנון שלנו.</p></div></section><section className="home-price-preview"><div className="section-title"><div><span>השירותים שלנו</span><h2>מה מתאים לך?</h2></div><button onClick={()=>openTab("prices")}>לכל המחירון</button></div>{prices.slice(0,3).map(item=><div className="service-row" key={item.id}><div><strong>{item.name}</strong><small>{item.note}</small></div><b>{money(item.price)}</b></div>)}</section>{gallery.length>0&&<section className="home-stories"><div className="section-title"><div><span>ישר מהכיסא</span><h2>העבודות האחרונות</h2></div><button onClick={()=>openTab("gallery")}>לכל הגלריה</button></div><div className="stories-strip">{gallery.slice(0,8).map((image,index)=><button key={`${image.slice(0,24)}-${index}`} className={`story-card ${image===demoPhoto?`preset-photo preset-${index%4+1}`:""}`} style={{backgroundImage:`url(${image})`}} onClick={()=>openTab("gallery")} aria-label={`פתיחת תמונה ${index+1}`}/>)}</div><div className="app-promo"><small>אהבתם את החוויה?</small><h3>רוצים גם אפליקציה מגניבה כזאת?</h3><a href={marketingWhatsAppUrl} target="_blank" rel="noreferrer">צרו קשר</a></div></section>}</div>}

  {tab==="prices"&&<div className="screen"><PageTitle title="מחירון" subtitle="כל השירותים, בלי הפתעות" onBack={()=>openTab("home")}/><section className="list-section">{prices.map((item,index)=><article className="list-card" key={item.id}><span className="number">{String(index+1).padStart(2,"0")}</span><div><h3>{item.name}</h3><p>{item.note}</p></div><strong>{money(item.price)}</strong></article>)}<button className="black-button wide" onClick={()=>setBookingOpen(true)}>קביעת תור</button></section></div>}
  {tab==="gallery"&&<div className="screen"><PageTitle title="הגלריה" subtitle={`תיק העבודות של ${business.name}`} onBack={()=>openTab("home")}/>{gallery.length?<section className="photo-grid">{gallery.map((image,index)=><div key={index} className={`gallery-photo ${image===demoPhoto?`preset-photo preset-${index%4+1}`:""}`} style={{backgroundImage:`url(${image})`}} role="img" aria-label={`עבודה ${index+1}`}/>)}</section>:<section className="empty-state"><span>▦</span><h2>עוד אין כאן תמונות</h2></section>}</div>}
  {tab==="products"&&<div className="screen"><PageTitle title="המוצרים שלנו" subtitle="להמשיך את הלוק גם בבית" onBack={()=>openTab("home")}/><section className="products-grid">{products.map((product,index)=><article className="product-card" key={product.id}>{product.image?<img className="product-image" src={product.image} alt={product.name}/>:<div className={`product-art tone-${index%3+1}`}><span>{product.name.slice(0,1)}</span></div>}<div><h3>{product.name}</h3><p>{product.description}</p><strong>{money(product.price)}</strong></div></article>)}</section></div>}
  {tab==="appointments"&&<div className="screen"><PageTitle title={session.role==="barber"?"יומן התורים":"התורים שלי"} subtitle={session.role==="barber"?"קביעה וביטול של כל תור ביומן":"צפייה וביטול תורים"} onBack={()=>openTab("home")}/><section className="appointments-list">{session.role==="barber"&&<button className="black-button wide barber-booking-button" onClick={()=>setBookingOpen(true)}>＋ קביעת תור עבור לקוח</button>}{appointments.length?appointments.map(item=><article className={`appointment-card ${item.status}`} key={item.id}><div className="appointment-date"><b>{item.time}</b><small>{item.date}</small></div><div><h3>{item.service}</h3><p>{session.role==="barber"?`${item.clientName||"לקוח"} · ${item.clientPhone}`:item.status==="cancelled"?"התור בוטל":"התור נקבע ביומן"}</p></div><div className="appointment-actions"><button onClick={()=>cancelAppointment(item)} disabled={item.status==="cancelled"}>ביטול</button></div></article>):<div className="empty-state"><span>◷</span><h2>אין תורים כרגע</h2><button className="black-button" onClick={()=>setBookingOpen(true)}>קביעת תור</button></div>}</section></div>}

  {tab==="swap"&&<div className="screen"><PageTitle title="החלפת תורים" subtitle="מכרז ההחלפות של המספרה" onBack={()=>openTab("home")}/><section className="swap-screen">
   <article className="swap-block">
    <div className="section-title"><div><span>שלב ראשון</span><h2>{session.role==="barber"?"תורים במספרה":"התורים שלי"}</h2></div></div>
    <p className="swap-hint">תור שמועמד להחלפה נשאר שלכם עד שתאשרו הצעה. אפשר להסיר אותו מהמכרז בכל רגע.</p>
    {swappableAppointments.length?swappableAppointments.map(item=>{const listing=listingOfAppointment.get(item.id),canRemove=Boolean(listing)&&(listing?.ownerId===session.uid||session.role==="barber");return <div className="swap-row" key={item.id}>
     <div className="swap-when"><b>{item.time}</b><small>{item.date}</small></div>
     <div className="swap-info"><h3>{item.service||"תור"}</h3><p>{listing?"מוצג עכשיו במכרז ההחלפות":session.role==="barber"?item.clientName||"לקוח":"לא מוצג במכרז"}</p></div>
     <button className={`swap-chip${listing?" on":""}`} disabled={swapBusy||(Boolean(listing)&&!canRemove)} onClick={()=>listing?(canRemove?unlistSwap(listing):undefined):listForSwap(item)}>{listing?(canRemove?"הסרה":"במכרז"):"להחלפה"}</button>
    </div>}):<p className="swap-empty">אין תורים עתידיים שאפשר להעמיד להחלפה.</p>}
   </article>

   {incomingOffers.length>0&&<article className="swap-block">
    <div className="section-title"><div><span>מחכה לתשובה שלך</span><h2>הצעות שקיבלתי</h2></div></div>
    {incomingOffers.map(offer=><div className="swap-offer" key={offer.id}>
     <div className="swap-trade"><div><small>מוותרים על</small><b>{swapWhen(offer.toDate,offer.toTime)}</b></div><i>⇄</i><div><small>מקבלים</small><b>{swapWhen(offer.fromDate,offer.fromTime)}</b></div></div>
     <p>{offer.fromName} מציע לכם החלפה · {countdownLabel(offer,now)}</p>
     <div className="swap-actions"><button className="black-button" disabled={swapBusy} onClick={()=>acceptSwapOffer(offer)}>אישור החלפה</button><button className="outline-button" disabled={swapBusy} onClick={()=>declineSwapOffer(offer)}>דחייה</button></div>
    </div>)}
   </article>}

   {outgoingOffers.length>0&&<article className="swap-block">
    <div className="section-title"><div><span>בדרך אליהם</span><h2>ההצעות ששלחתי</h2></div></div>
    {outgoingOffers.map(offer=>{const ranOut=offer.status==="expired"||offerRanOut(offer,now);return <div className={`swap-offer${ranOut?" stale":""}`} key={offer.id}>
     <div className="swap-trade"><div><small>מציעים</small><b>{swapWhen(offer.fromDate,offer.fromTime)}</b></div><i>⇄</i><div><small>מבקשים</small><b>{swapWhen(offer.toDate,offer.toTime)}</b></div></div>
     <p>{ranOut?"נגמר זמן ההמתנה ולא התקבלה תשובה. אפשר להציע מחדש":`ממתינים לתשובה של ${offer.toName} · ${countdownLabel(offer,now)}`}</p>
     <div className="swap-actions">{ranOut?<button className="black-button" disabled={swapBusy} onClick={()=>resendSwapOffer(offer)}>הצעה מחדש</button>:<button className="outline-button" disabled={swapBusy} onClick={()=>withdrawSwapOffer(offer)}>ביטול ההצעה</button>}</div>
    </div>})}
   </article>}

   <article className="swap-block">
    <div className="section-title"><div><span>שלב שני</span><h2>תורים שמחפשים החלפה</h2></div></div>
    {marketListings.length?marketListings.map(listing=><div className="swap-row" key={listing.id}>
     <div className="swap-when"><b>{listing.time}</b><small>{listing.date}</small></div>
     <div className="swap-info"><h3>{listing.service}</h3><p>{listing.ownerName}</p></div>
     <button className="swap-chip" disabled={swapBusy||offeredListingIds.has(listing.id)} onClick={()=>setSwapTarget(listing)}>{offeredListingIds.has(listing.id)?"נשלחה הצעה":"הצעת החלפה"}</button>
    </div>):<p className="swap-empty">אין כרגע תורים במכרז. ברגע שמישהו יעמיד תור להחלפה הוא יופיע כאן.</p>}
   </article>
  </section></div>}

  <nav className="bottom-nav" aria-label="ניווט ראשי">{((session.role==="barber"?[['home','בית'],['appointments','תורים'],['swap','החלפות'],['gallery','גלריה'],['products','מוצרים']]:[['home','בית'],['prices','מחירון'],['appointments','התורים שלי'],['swap','החלפות'],['gallery','גלריה']]) as [Tab,string][]).map(([key,label])=><button key={key} className={tab===key?"active":""} onClick={()=>openTab(key)}><i>{icons[key]}</i><span>{key==="swap"&&incomingOffers.length?`${label} (${incomingOffers.length})`:label}</span></button>)}</nav>

  {bookingOpen&&<div className="sheet-backdrop" onMouseDown={()=>setBookingOpen(false)}><section className="bottom-sheet booking-calendar" onMouseDown={e=>e.stopPropagation()}><div className="sheet-handle"/><header><div><small>{session.role==="barber"?"קביעת תור בשם לקוח":"בוחרים ונכנסים ליומן"}</small><h2>קביעת תור</h2></div><button onClick={()=>setBookingOpen(false)}>×</button></header><form className="booking-form" onSubmit={sendBooking}>{session.role==="barber"&&<div className="barber-client-fields"><label>שם הלקוח<input name="clientName" placeholder="שם מלא" required/></label><label>טלפון הלקוח<input name="clientPhone" type="tel" inputMode="tel" placeholder="05X-XXXXXXX" required/></label></div>}<label>בחרו שירות<select name="service" required>{prices.map(item=><option key={item.id} value={item.id}>{item.name} · {money(item.price)}</option>)}</select></label><div className="date-strip">{bookingDays.map(day=><button type="button" key={day.key} className={bookingDate===day.key?"selected":""} onClick={()=>{setBookingDate(day.key);setBookingTime("")}}><small>{day.dayName}</small><strong>{day.dateLabel}</strong></button>)}</div><div className="time-grid">{daySlots.map(time=>{const busy=busySlotIds.has(slotId(shopId,bookingDate,time));return <button type="button" key={time} className={`${busy?"busy":"free"} ${bookingTime===time?"selected":""}`} disabled={busy} onClick={()=>setBookingTime(time)}><i/><span>{time}</span><small>{busy?"תפוס":"פנוי"}</small></button>})}</div><button className="black-button wide" type="submit" disabled={!bookingTime}>קביעת התור ביומן</button></form></section></div>}

  {swapTarget&&<div className="sheet-backdrop" onMouseDown={()=>setSwapTarget(null)}><section className="bottom-sheet" onMouseDown={e=>e.stopPropagation()}><div className="sheet-handle"/><header><div><small>{swapTarget.ownerName} · {swapWhen(swapTarget.date,swapTarget.time)}</small><h2>איזה תור להציע?</h2></div><button onClick={()=>setSwapTarget(null)}>×</button></header>
   {myListings.length?<div className="swap-picker"><p className="swap-hint">בוחרים תור משלכם. ההצעה תמתין לתשובה עד שלוש שעות, ואם לא תתקבל תשובה אפשר להציע מחדש.</p>{myListings.map(mine=><button key={mine.id} className="swap-pick" disabled={swapBusy} onClick={()=>sendSwapOffer(swapTarget,mine)}><div><strong>{swapWhen(mine.date,mine.time)}</strong><small>{mine.service}</small></div><b>⇄</b></button>)}</div>
   :<div className="swap-picker"><p className="swap-hint">כדי להציע החלפה צריך קודם להעמיד תור משלכם במכרז — בחרו תור ברשימה למעלה ולחצו “להחלפה”.</p><button className="outline-button wide" onClick={()=>setSwapTarget(null)}>הבנתי</button></div>}
  </section></div>}

  {session.role==="barber"&&adminOpen&&<div className="sheet-backdrop admin-backdrop" onMouseDown={()=>setAdminOpen(false)}><section className="admin-panel" onMouseDown={e=>e.stopPropagation()}><header><div><small>אזור ספר · {shopId}</small><h2>ניהול האפליקציה</h2></div><button onClick={()=>setAdminOpen(false)}>×</button></header><nav className="admin-tabs">{([['details','פרטים'],['schedule','שעות'],['prices','מחירון'],['products','מוצרים'],['gallery','תמונות'],['broadcast','תפוצה']] as const).map(([key,label])=><button key={key} className={adminTab===key?"active":""} onClick={()=>setAdminTab(key)}>{label}</button>)}</nav>{adminTab==="details"&&<form className="admin-form" onSubmit={saveDetails}><div className="schedule-note"><strong>קוד המספרה שלך: {barberCode||"יוצר קוד..."}</strong><p>שלח את הקוד הזה ללקוחות חדשים. הם מזינים אותו פעם אחת בהרשמה ונשארים משויכים רק למספרה שלך.</p></div><label>שם העסק<input name="name" defaultValue={business.name} required/></label><label>משפט פתיחה<input name="tagline" defaultValue={business.tagline} required/></label><label>טלפון<input name="phone" defaultValue={business.phone} required/></label><label>מספר WhatsApp עם 972<input name="whatsapp" defaultValue={business.whatsapp} required/></label><label>כתובת לתצוגה<input name="address" defaultValue={business.address} required/></label><label>כתובת לניווט<input name="mapQuery" defaultValue={business.mapQuery} required/></label><label>שעות פעילות<input name="hours" defaultValue={business.hours} required/></label><button className="black-button wide" type="submit">שמירת פרטים</button></form>}{adminTab==="schedule"&&<ScheduleEditor schedule={schedule} setSchedule={setSchedule} onSave={saveSchedule}/>} {adminTab==="prices"&&<EditorList items={prices} setItems={setPricesSynced} kind="price"/>}{adminTab==="products"&&<EditorList items={products} setItems={setProductsSynced} kind="product"/>}{adminTab==="gallery"&&<div className="gallery-editor"><input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={handleImages}/><button className="upload-zone" onClick={()=>fileInput.current?.click()} disabled={gallery.length>=8}><span>＋</span><strong>{gallery.length>=8?"הגלריה מלאה":"בחירת תמונות מהמכשיר"}</strong></button><div className="gallery-thumbs">{gallery.map((image,index)=><div key={index}><img src={image} alt=""/><button onClick={()=>removeGalleryImage(index)}>×</button></div>)}</div></div>}{adminTab==="broadcast"&&<form className="broadcast-form" onSubmit={e=>{e.preventDefault();setToast(`הודעת הדמו הוכנה עבור ${new Set(appointments.map(a=>a.clientPhone)).size} לקוחות`)}}><div className="broadcast-stat"><strong>{new Set(appointments.map(a=>a.clientPhone)).size}</strong><span>לקוחות במספרה הזו</span></div><label>הודעה ללקוחות<textarea name="message" rows={5} required/></label><button className="black-button wide" type="submit">הכנת הודעת תפוצה</button><button className="outline-button wide" type="button" onClick={signOut}>יציאה מחשבון הספר</button></form>}</section></div>}
  {toast&&<div className="toast">{toast}</div>}
 </main>
}

function AdminDashboard({onSignOut}:{onSignOut:()=>void}){
 const [pending,setPending]=useState<ShopApproval[]>([]),[busyId,setBusyId]=useState<string|null>(null),[toast,setToast]=useState("");
 useEffect(()=>{const pendingQuery=query(collection(db,"shopApprovals"),where("status","==","pending"));return onSnapshot(pendingQuery,snapshot=>setPending(snapshot.docs.map(item=>({id:item.id,...item.data()} as ShopApproval))),()=>setToast("לא הצלחנו לטעון את הבקשות"))},[]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(""),2300);return()=>clearTimeout(timer)},[toast]);
 async function decide(item:ShopApproval,decision:"approved"|"rejected"){
  setBusyId(item.id);
  try{
   const batch=writeBatch(db);
   batch.update(doc(db,"shopApprovals",item.id),{status:decision,reviewedAt:serverTimestamp()});
   batch.update(doc(db,"users",item.uid),{status:decision,updatedAt:serverTimestamp()});
   await batch.commit();
   setToast(decision==="approved"?"המספרה אושרה ותיכנס לשרת":"הבקשה נדחתה");
  }catch{setToast("הפעולה נכשלה, נסו שוב")}finally{setBusyId(null)}
 }
 return <main className="app-shell">
  <header className="app-header"><strong>פאנל ניהול</strong><button className="manage-link" onClick={onSignOut}>יציאה</button></header>
  <div className="screen">
   <PageTitle title="בקשות הצטרפות" subtitle="אישור או דחייה של מספרות חדשות" onBack={onSignOut}/>
   <section className="list-section">
    {pending.length?pending.map(item=><article className="list-card" key={item.id}><div><h3>{item.shopName}</h3><p>{item.email} · {item.phone}</p></div><div className="appointment-actions"><button className="black-button" disabled={busyId===item.id} onClick={()=>decide(item,"approved")}>אישור</button><button onClick={()=>decide(item,"rejected")} disabled={busyId===item.id}>דחייה</button></div></article>):<div className="empty-state"><span>◷</span><h2>אין בקשות ממתינות</h2></div>}
   </section>
  </div>
  {toast&&<div className="toast">{toast}</div>}
 </main>
}
function PageTitle({title,subtitle,onBack}:{title:string;subtitle:string;onBack:()=>void}){return <header className="page-title"><button onClick={onBack} aria-label="חזרה">‹</button><div><small>{subtitle}</small><h1>{title}</h1></div><span/></header>}
function ScheduleEditor({schedule,setSchedule,onSave}:{schedule:Schedule;setSchedule:React.Dispatch<React.SetStateAction<Schedule>>;onSave:()=>void}){const updateDay=(index:number,next:Partial<WorkDay>)=>setSchedule(current=>({...current,days:{...current.days,[index]:{...current.days[index],...next}}}));return <section className="schedule-editor">{dayNames.map((name,index)=>{const day=schedule.days[index],maxSlots=Math.max(1,Math.floor((timeToMinutes(day.end)-timeToMinutes(day.start))/30));return <article className={`workday-row ${day.enabled?"enabled":""}`} key={index}><label className="day-toggle"><input type="checkbox" checked={day.enabled} onChange={event=>updateDay(index,{enabled:event.target.checked,slots:event.target.checked?Math.max(1,day.slots):0})}/><span>{name}</span></label><div className="workday-times"><label>פתיחה<input type="time" step="300" value={day.start} disabled={!day.enabled} onChange={event=>updateDay(index,{start:event.target.value})}/></label><label>סיום<input type="time" step="300" value={day.end} disabled={!day.enabled} onChange={event=>updateDay(index,{end:event.target.value})}/></label><label>תורים<input type="number" min="1" max={maxSlots} value={day.enabled?day.slots:0} disabled={!day.enabled} onChange={event=>updateDay(index,{slots:Math.min(maxSlots,Math.max(1,Number(event.target.value)))})}/></label></div></article>})}<button className="black-button wide" type="button" onClick={onSave}>שמירת שעות העבודה</button></section>}
function EditorList({items,setItems,kind}:{items:(PriceItem|Product)[];setItems:React.Dispatch<React.SetStateAction<any[]>>;kind:"price"|"product"}){const [uploading,setUploading]=useState<string|null>(null);async function uploadProductImage(id:string,event:ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];event.target.value="";if(!file)return;setUploading(id);try{const image=await compressImage(file,640,.66);setItems(list=>list.map(item=>item.id===id?{...item,image}:item))}finally{setUploading(null)}}return <div className="editor-list">{items.map(item=>{const product=item as Product;return <div className={`editor-row ${kind==="product"?"product-editor-row":""}`} key={item.id}>{kind==="product"&&<div className="product-image-editor">{product.image?<img src={product.image} alt={product.name}/>:<span>{product.name.slice(0,1)||"◈"}</span>}<label className="product-image-button">{uploading===item.id?"מעלה...":product.image?"החלפת תמונה":"הוספת תמונה"}<input type="file" accept="image/*" hidden disabled={uploading===item.id} onChange={event=>uploadProductImage(item.id,event)}/></label></div>}<div className="editor-copy"><input value={item.name} onChange={e=>setItems(list=>list.map(x=>x.id===item.id?{...x,name:e.target.value}:x))}/><input value={kind==="price"?(item as PriceItem).note:product.description} onChange={e=>setItems(list=>list.map(x=>x.id===item.id?{...x,[kind==="price"?"note":"description"]:e.target.value}:x))}/></div><input className="price-input" type="number" value={item.price} onChange={e=>setItems(list=>list.map(x=>x.id===item.id?{...x,price:Number(e.target.value)}:x))}/><button type="button" className="remove" onClick={()=>setItems(list=>list.filter(x=>x.id!==item.id))}>×</button></div>})}<button type="button" className="add-row" onClick={()=>setItems(list=>[...list,kind==="price"?{id:uid(),name:"שירות חדש",price:0,note:"תיאור קצר"}:{id:uid(),name:"מוצר חדש",price:0,description:"תיאור קצר"}])}>+ הוספה חדשה</button></div>}
