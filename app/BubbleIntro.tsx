"use client";

import {useEffect,useRef} from "react";
import {mountBubbleIntro,type IntroRole} from "./bubble-intro";
import "./bubble-intro.css";

export default function BubbleIntro({name,onEnter}:{name:string;onEnter:(role:IntroRole)=>void}){
 const host=useRef<HTMLDivElement>(null),enter=useRef(onEnter);
 enter.current=onEnter;
 useEffect(()=>{if(!host.current)return;return mountBubbleIntro(host.current,{name,onEnter:role=>enter.current(role)})},[name]);
 return <div ref={host}/>;
}
