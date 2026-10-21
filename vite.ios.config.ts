import react from "@vitejs/plugin-react";
import {defineConfig,Plugin} from "vite";

// iOS (Capacitor) build. Same client app as the GitHub Pages build, but served
// from the app bundle root ("/") instead of "/barber/", plus a small native glue
// script. The web builds (vinext + vite.pages.config.ts) are not affected.
const iosNativeGlue:Plugin={
  name:"ios-native-glue",
  transformIndexHtml:{
    order:"pre",
    handler:html=>html.replace("</body>",'  <script type="module" src="/native/ios-bridge.ts"></script>\n  </body>'),
  },
};

export default defineConfig({
  base:"/",
  plugins:[iosNativeGlue,react()],
  publicDir:"public",
  build:{outDir:"dist-ios",emptyOutDir:true},
});
