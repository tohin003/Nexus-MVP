import { useEffect } from "react";
import { useRoute } from "./routerStore";
import { Screen } from "./ui/Screen";
import { TabBar } from "./ui/TabBar";

export default function App() {
  const { route } = useRoute();
  useEffect(() => {
    document.getElementById("app-scroll")?.scrollTo(0, 0);
  }, [route.name, route.param]);

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
