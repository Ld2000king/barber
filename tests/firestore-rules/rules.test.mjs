// Firestore rules tests for keeping shops apart: one shop's bookings, slots and
// swap listings must never block, overwrite or take over another shop's.
// Run with `npm test` in this folder (starts the Firestore emulator).
import {after,before,beforeEach,describe,test} from "node:test";
import {readFileSync} from "node:fs";
import {assertFails,assertSucceeds,initializeTestEnvironment} from "@firebase/rules-unit-testing";
import {deleteDoc,doc,getDoc,serverTimestamp,setDoc,updateDoc,writeBatch} from "firebase/firestore";

const DATE="2030-01-15",TIME="10:00";
const slotId=(shopId,date,time)=>`${shopId}__${date}_${time.replace(":","")}`;

let env;
const as=uid=>env.authenticatedContext(uid,{email:`${uid}@test.dev`}).firestore();

before(async()=>{
 env=await initializeTestEnvironment({projectId:"demo-barber",firestore:{rules:readFileSync(new URL("../../firestore.rules",import.meta.url),"utf8")}});
});
after(async()=>{await env?.cleanup()});

beforeEach(async()=>{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore();
  const users={
   barberA:{role:"barber",shopId:"shop-a",status:"approved",phone:"0500000001"},
   barberB:{role:"barber",shopId:"shop-b",status:"approved",phone:"0500000002"},
   clientA:{role:"client",shopId:"shop-a",phone:"0500000011"},
   clientA2:{role:"client",shopId:"shop-a",phone:"0500000012"},
   clientB:{role:"client",shopId:"shop-b",phone:"0500000021"},
  };
  for(const [uid,data] of Object.entries(users))await setDoc(doc(db,"users",uid),data);
  await setDoc(doc(db,"businesses","shop-a"),{shopId:"shop-a"});
  await setDoc(doc(db,"businesses","shop-b"),{shopId:"shop-b"});
  await setDoc(doc(db,"barberCodes","CODEA"),{shopId:"shop-a"});
  // An existing confirmed booking in shop B.
  await setDoc(doc(db,"appointments","apptB"),{shopId:"shop-b",clientId:"clientB",clientPhone:"0500000021",date:DATE,time:TIME,slotId:slotId("shop-b",DATE,TIME),status:"confirmed"});
  await setDoc(doc(db,"availability",slotId("shop-b",DATE,TIME)),{shopId:"shop-b",date:DATE,time:TIME,status:"booked",appointmentId:"apptB"});
 });
});

// Mirrors sendBooking() in app/page.tsx.
function book(db,{uid,role,shopId,date=DATE,time=TIME,id,slot=slotId(shopId,date,time),availabilityData}){
 const batch=writeBatch(db),appointmentRef=doc(db,"appointments",id);
 batch.set(appointmentRef,{shopId,clientId:role==="client"?uid:"",clientName:role==="barber"?"Walk in":"",clientPhone:"0501234567",clientEmail:"",createdBy:role,service:"x",date,time,slotId:slot,status:"confirmed",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
 batch.set(doc(db,"availability",slot),availabilityData??{shopId,date,time,status:"booked",appointmentId:id,updatedAt:serverTimestamp()});
 return batch.commit();
}

describe("booking the same date and time in two shops",()=>{
 test("a client of shop A can book the hour shop B already has booked",async()=>{
  await assertSucceeds(book(as("clientA"),{uid:"clientA",role:"client",shopId:"shop-a",id:"apptA"}));
 });
 test("the barber of shop A can book the hour shop B already has booked",async()=>{
  await assertSucceeds(book(as("barberA"),{uid:"barberA",role:"barber",shopId:"shop-a",id:"apptA"}));
 });
 test("a client cannot book in another shop",async()=>{
  await assertFails(book(as("clientA"),{uid:"clientA",role:"client",shopId:"shop-b",id:"apptX",date:"2030-01-16"}));
 });
});

describe("a slot id belongs to the shop it names",()=>{
 const victim=slotId("shop-b","2030-01-16",TIME);
 test("a client of shop A cannot occupy shop B's slot id",async()=>{
  await assertFails(book(as("clientA"),{uid:"clientA",role:"client",shopId:"shop-a",id:"apptX",date:"2030-01-16",slot:victim}));
 });
 test("the barber of shop A cannot occupy shop B's slot id",async()=>{
  await assertFails(book(as("barberA"),{uid:"barberA",role:"barber",shopId:"shop-a",id:"apptX",date:"2030-01-16",slot:victim}));
 });
 test("the barber of shop A cannot create a bare availability doc under shop B's slot id",async()=>{
  await assertFails(setDoc(doc(as("barberA"),"availability",victim),{shopId:"shop-a",date:"2030-01-16",time:TIME,status:"booked",appointmentId:"nothing"}));
 });
 test("a slot id must match the appointment's date and time",async()=>{
  await assertFails(book(as("clientA"),{uid:"clientA",role:"client",shopId:"shop-a",id:"apptX",slot:slotId("shop-a","2030-01-20","12:00")}));
 });
 test("shop B can still book its own free hour",async()=>{
  await assertSucceeds(book(as("clientB"),{uid:"clientB",role:"client",shopId:"shop-b",id:"apptB2",date:"2030-01-16"}));
 });
});

describe("a booked slot is never handed to a second appointment",()=>{
 test("a client cannot book an hour that is already taken in their shop",async()=>{
  await assertFails(book(as("clientB"),{uid:"clientB",role:"client",shopId:"shop-b",id:"apptB2"}));
 });
 test("the barber cannot overwrite an hour that is already taken",async()=>{
  await assertFails(book(as("barberB"),{uid:"barberB",role:"barber",shopId:"shop-b",id:"apptB2"}));
 });
 test("the barber of shop A cannot touch shop B's booked slot",async()=>{
  const db=as("barberA");
  await assertFails(updateDoc(doc(db,"availability",slotId("shop-b",DATE,TIME)),{shopId:"shop-a"}));
  await assertFails(deleteDoc(doc(db,"availability",slotId("shop-b",DATE,TIME))));
 });
 test("after a cancellation the hour can be booked again",async()=>{
  const db=as("clientB"),slot=slotId("shop-b",DATE,TIME),batch=writeBatch(db);
  batch.update(doc(db,"appointments","apptB"),{status:"cancelled",updatedAt:serverTimestamp()});
  batch.delete(doc(db,"availability",slot));
  await assertSucceeds(batch.commit());
  await assertSucceeds(book(as("barberB"),{uid:"barberB",role:"barber",shopId:"shop-b",id:"apptB2"}));
 });
});

describe("reading across shops",()=>{
 test("shop A cannot read shop B's appointments or slots",async()=>{
  for(const uid of ["clientA","barberA"]){
   const db=as(uid);
   await assertFails(getDoc(doc(db,"appointments","apptB")));
   await assertFails(getDoc(doc(db,"availability",slotId("shop-b",DATE,TIME))));
  }
 });
});

describe("swap board stays inside the shop",()=>{
 const listing=(shopId,postedBy)=>({shopId,appointmentId:"apptB",ownerId:"clientB",ownerPhone:"0500000021",service:"x",date:DATE,time:TIME,status:"open",postedBy,createdAt:serverTimestamp()});
 test("the barber of shop A cannot list shop B's appointment",async()=>{
  await assertFails(setDoc(doc(as("barberA"),"swaps","apptB"),listing("shop-a","barber")));
 });
 test("the holder in shop B can list it, and only shop B clients can ask for it",async()=>{
  await assertSucceeds(setDoc(doc(as("clientB"),"swaps","apptB"),listing("shop-b","client")));
  await assertFails(updateDoc(doc(as("clientA"),"swaps","apptB"),{status:"requested",requestedBy:"clientA",requestedByPhone:"",requestedByEmail:"",requestedAt:serverTimestamp()}));
 });
 test("a swap within shop A still goes through end to end",async()=>{
  await assertSucceeds(book(as("clientA"),{uid:"clientA",role:"client",shopId:"shop-a",id:"apptA"}));
  await assertSucceeds(setDoc(doc(as("clientA"),"swaps","apptA"),{shopId:"shop-a",appointmentId:"apptA",ownerId:"clientA",ownerPhone:"0500000011",service:"x",date:DATE,time:TIME,status:"open",postedBy:"client",createdAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(doc(as("clientA2"),"swaps","apptA"),{status:"requested",requestedBy:"clientA2",requestedByPhone:"0500000012",requestedByEmail:"",requestedAt:serverTimestamp()}));
  const db=as("clientA"),batch=writeBatch(db);
  batch.update(doc(db,"appointments","apptA"),{clientId:"clientA2",clientName:"",clientPhone:"0500000012",clientEmail:"",updatedAt:serverTimestamp()});
  batch.update(doc(db,"swaps","apptA"),{status:"taken",takenBy:"clientA2",takenByPhone:"0500000012",takenAt:serverTimestamp()});
  await assertSucceeds(batch.commit());
 });
});

describe("every shop has its own id",()=>{
 const barber=shopId=>({email:"new@test.dev",phone:"0500000099",role:"barber",shopId,shopName:"New",status:"pending"});
 test("a new barber cannot sign up into an existing shop's id",async()=>{
  await assertFails(setDoc(doc(as("newBarber1"),"users","newBarber1"),barber("shop-a")));
 });
 test("a new barber cannot pick an arbitrary shop id",async()=>{
  await assertFails(setDoc(doc(as("newBarber1"),"users","newBarber1"),barber("shop-c")));
 });
 test("a new barber gets the id the app generates from their account",async()=>{
  // cleanShopId(`${shopName}-${uid.slice(0,6)}`)
  await assertSucceeds(setDoc(doc(as("XyZ12345rest"),"users","XyZ12345rest"),barber("new-xyz123")));
  await assertSucceeds(setDoc(doc(as("Qw9876rest"),"users","Qw9876rest"),barber("qw9876")));
 });
});
