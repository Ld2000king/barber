import type {Metadata,Viewport} from "next";
import "./globals.css";
export const metadata:Metadata={title:"Barber App",description:"אפליקציית PWA למספרה — מחירון, גלריה, מוצרים ודרכי הגעה.",applicationName:"Barber App",manifest:"/manifest.webmanifest",appleWebApp:{capable:true,statusBarStyle:"black-translucent",title:"Barber App"},icons:{icon:"/icon.svg",apple:"/icon.svg"},openGraph:{title:"BARBERA",description:"הסטייל שלך. בדיוק שלך.",images:["/og.png"]},twitter:{card:"summary_large_image",title:"BARBERA",description:"הסטייל שלך. בדיוק שלך.",images:["/og.png"]}};
export const viewport:Viewport={themeColor:"#171713",colorScheme:"light"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="he" dir="rtl"><body>{children}</body></html>}
