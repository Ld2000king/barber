import type {Metadata,Viewport} from "next";
import "./globals.css";
export const metadata:Metadata={title:"ARI COHEN | BARBERS",description:"אפליקציית PWA למספרה — קביעת תורים, מחירון, גלריה ודרכי הגעה.",applicationName:"BARBERS",manifest:"/manifest.webmanifest",appleWebApp:{capable:true,statusBarStyle:"black-translucent",title:"BARBERS"},icons:{icon:"/barbers-logo.png",apple:"/barbers-logo.png"},openGraph:{title:"ARI COHEN",description:"BARBER STUDIO · TEL AVIV",images:["https://barber-app-liav.l2pro4u.chatgpt.site/og.png"]},twitter:{card:"summary_large_image",title:"ARI COHEN",description:"BARBER STUDIO · TEL AVIV",images:["https://barber-app-liav.l2pro4u.chatgpt.site/og.png"]}};
export const viewport:Viewport={themeColor:"#17232a",colorScheme:"light"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="he" dir="rtl"><body>{children}</body></html>}
