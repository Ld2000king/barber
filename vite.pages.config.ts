import react from "@vitejs/plugin-react";
import {defineConfig,Plugin} from "vite";

const pagesAssetPaths:Plugin={
  name:"pages-asset-paths",
  enforce:"pre",
  transform(code,id){
    if(!id.replaceAll("\\","/").endsWith("/app/page.tsx"))return;
    return code
      .replaceAll('src="/barbers-logo.png"','src={assetUrl("barbers-logo.png")}')
      .replace('backgroundImage:"linear-gradient(180deg,transparent 45%,rgba(0,0,0,.5)),url(/og.jpg)"','backgroundImage:`linear-gradient(180deg,transparent 45%,rgba(0,0,0,.5)),url(${assetUrl("og.jpg")})`');
  },
};

export default defineConfig({
  base:"/barber/",
  plugins:[pagesAssetPaths,react()],
  publicDir:"public",
  build:{outDir:"dist-pages",emptyOutDir:true},
});
