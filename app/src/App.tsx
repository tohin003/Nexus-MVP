import { useEffect } from "react";
import { useRoute } from "./routerStore";
import { Screen } from "./ui/Screen";
import { TabBar } from "./ui/TabBar";
import { db } from "./repo/db";
import { api } from "./services/api";
import { activateAccount } from "./services/account";

export default function App() {
  const { route } = useRoute();
  useEffect(() => {
    document.getElementById("app-scroll")?.scrollTo(0, 0);
  }, [route.name, route.param]);
  useEffect(() => {
    // Returning real-account user (valid session cookie) gets their snapshot back.
    // Demo snapshots are never replaced by a cookie: the demo is device-local.
    if (db.getState().signedIn) return;
    const mode = db.getState().authMode;
    if (mode === 'demo') return;
    api.me().then(user => { if (user && db.getState().authMode !== 'demo') activateAccount(user); }).catch(() => undefined);
  }, []);

  return (
    <div className="stage">
      <div className="phone">
        <div className="app-scroll" id="app-scroll">
          <Screen key={`${route.name}/${route.param ?? ''}`} route={route} />
        </div>
        <TabBar />
      </div>
    </div>
  );
}
