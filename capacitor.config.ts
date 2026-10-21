import type {CapacitorConfig} from "@capacitor/cli";
import type {KeyboardResize} from "@capacitor/keyboard";

const config:CapacitorConfig={
  // Bundle ID: change before the first TestFlight upload if you prefer another one.
  appId:"com.ld2000king.barbers",
  appName:"BARBERS",
  // Output of `npm run ios:build` (vite.ios.config.ts). Bundled inside the app,
  // so no remote server is needed.
  webDir:"dist-ios",
  ios:{
    contentInset:"never",
    backgroundColor:"#ffffff",
  },
  plugins:{
    Keyboard:{
      // Shrink the web view above the keyboard, so bottom sheets and forms stay visible.
      resize:"native" as KeyboardResize,
      resizeOnFullScreen:true,
    },
    StatusBar:{
      overlaysWebView:true,
    },
    SplashScreen:{
      launchShowDuration:600,
      launchAutoHide:true,
      backgroundColor:"#ffffff",
      showSpinner:false,
    },
  },
};

export default config;
