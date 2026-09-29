// Firestore rules tests for the subscription gate: a shop without an active
// subscription (shopAccess/{shopId}.activeUntil, written by the Admin CRM) is
// closed to its barber and its clients until it is renewed. Nothing is deleted.
// Run with `npm test` in this folder (starts the Firestore emulator).
import {after,before,beforeEach,describe,test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {assertFails,assertSucceeds,initializeTestEnvironment} from "@firebase/rules-unit-testing";
import {collection,doc,getDoc,getDocs,query,setDoc,where} from "firebase/firestore";

const DAY=864e5;
let env;
const as=(uid,email=`${uid}@test.dev`)=>env.authenticatedContext(uid,{email}).firestore();
const setAccess=(shopId,until)=>env.withSecurityRulesDisabled(context=>setDoc(doc(context.firestore(),"shopAccess",shopId),{shopId,activeUntil:new Date(until)}));

before(async()=>{
 env=await initializeTestEnvironment({projectId:"demo-barber-subscription",firestore:{rules:readFileSync(new URL("../../firestore.rules",import.meta.url),"utf8")}});
});
after(async()=>{await env?.cleanup()});

beforeEach(async()=>{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore();
  // shop-a: active, shop-b: expired, shop-c: no subscription at all.
  for(const s of ["a","b","c"]){
   await setDoc(doc(db,"users",`barber${s.toUpperCase()}`),{role:"barber",shopId:`shop-${s}`,status:"approved",phone:`05000000${s}`});
   await setDoc(doc(db,"users",`client${s.toUpperCase()}`),{role:"client",shopId:`shop-${s}`,phone:`05000001${s}`});
   await setDoc(doc(db,"businesses",`shop-${s}`),{shopId:`shop-${s}`});
   await setDoc(doc(db,"appointments",`appt-${s}`),{shopId:`shop-${s}`,clientId:`client${s.toUpperCase()}`,date:"2030-01-15",time:"10:00",status:"confirmed"});
   await setDoc(doc(db,"services",`svc-${s}`),{shopId:`shop-${s}`,name:"cut"});
  }
 });
 await setAccess("shop-a",Date.now()+30*DAY);
 await setAccess("shop-b",Date.now()-DAY);
});

const barberReads=(uid,shopId)=>Promise.all([getDoc(doc(as(uid),"businesses",shopId)),getDocs(query(collection(as(uid),"appointments"),where("shopId","==",shopId)))]);
const clientReads=(uid,shopId)=>Promise.all([getDocs(query(collection(as(uid),"appointments"),where("clientId","==",uid),where("shopId","==",shopId))),getDocs(query(collection(as(uid),"services"),where("shopId","==",shopId)))]);
const barberWrites=(uid,shopId)=>setDoc(doc(as(uid),"services",`new-${shopId}`),{shopId,name:"x"});

describe("an active subscription keeps the shop open",()=>{
 test("barber and clients use the shop as before",async()=>{
  await assertSucceeds(barberReads("barberA","shop-a"));
  await assertSucceeds(barberWrites("barberA","shop-a"));
  await assertSucceeds(clientReads("clientA","shop-a"));
 });
});

describe("no active subscription closes the shop",()=>{
 for(const [label,s] of [["expired","b"],["never subscribed","c"]]){
  test(`${label}: barber is locked out of reads and writes`,async()=>{
   await assertFails(barberReads(`barber${s.toUpperCase()}`,`shop-${s}`));
   await assertFails(barberWrites(`barber${s.toUpperCase()}`,`shop-${s}`));
  });
  test(`${label}: clients are locked out`,async()=>{
   await assertFails(clientReads(`client${s.toUpperCase()}`,`shop-${s}`));
  });
  test(`${label}: own profile stays readable so the app can show the blocked screen`,async()=>{
   await assertSucceeds(getDoc(doc(as(`client${s.toUpperCase()}`),"users",`client${s.toUpperCase()}`)));
  });
 }
 test("shop data is kept while closed",async()=>{
  await env.withSecurityRulesDisabled(async context=>{
   assert.equal((await getDoc(doc(context.firestore(),"appointments","appt-b"))).exists(),true);
  });
 });
});

describe("shopAccess itself",()=>{
 test("a shop's members can read only their own shop's access",async()=>{
  await assertSucceeds(getDoc(doc(as("clientB"),"shopAccess","shop-b")));
  await assertFails(getDoc(doc(as("clientA"),"shopAccess","shop-b")));
 });
 test("nobody can extend access from the app",async()=>{
  await assertFails(setDoc(doc(as("barberA"),"shopAccess","shop-a"),{shopId:"shop-a",activeUntil:new Date(Date.now()+999*DAY)}));
  await assertFails(setDoc(doc(as("barberB"),"shopAccess","shop-b"),{shopId:"shop-b",activeUntil:new Date(Date.now()+999*DAY)}));
 });
 test("the platform admin still sees closed shops",async()=>{
  await assertSucceeds(getDocs(query(collection(as("admin","liavdimri12@gmail.com"),"appointments"),where("shopId","==","shop-b"))));
 });
});

describe("renewal reopens the shop at once",()=>{
 test("barber and clients are back in after activeUntil moves forward",async()=>{
  await assertFails(clientReads("clientB","shop-b"));
  await setAccess("shop-b",Date.now()+30*DAY);
  await assertSucceeds(barberReads("barberB","shop-b"));
  await assertSucceeds(clientReads("clientB","shop-b"));
 });
});
