// Native glue for the iOS (Capacitor) build only. Loaded by vite.ios.config.ts;
// never part of the web builds. It does not touch app logic or design.
import {Capacitor} from "@capacitor/core";
import {Keyboard,KeyboardStyle} from "@capacitor/keyboard";
import {StatusBar,Style} from "@capacitor/status-bar";

if(Capacitor.isNativePlatform()){
  // Keep the status bar and keyboard colors in sync with the app's own
  // light/dark theme (stored on <html data-theme="...">).
  const applyTheme=()=>{
    const dark=document.documentElement.dataset.theme==="dark";
    StatusBar.setStyle({style:dark?Style.Dark:Style.Light}).catch(()=>undefined);
    Keyboard.setStyle({style:dark?KeyboardStyle.Dark:KeyboardStyle.Light}).catch(()=>undefined);
  };
  applyTheme();
  new MutationObserver(applyTheme).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});

  // After the web view shrinks for the keyboard, keep the focused field in view.
  Keyboard.addListener("keyboardDidShow",()=>{
    const el=document.activeElement;
    if(el instanceof HTMLElement&&el.matches("input,textarea,select"))el.scrollIntoView({block:"center",behavior:"smooth"});
  }).catch(()=>undefined);
}
