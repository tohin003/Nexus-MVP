import { useEffect } from 'react';
import type { Route } from '../routerStore';
import { navigate } from '../routerStore';
import { useNexus } from '../repo/store';
import { entryRoute } from '../domain/entry';
import { Welcome, Onboarding, Building } from '../screens/Onboarding';
import { People } from '../screens/People';
import { UserDetail } from '../screens/UserDetail';
import { Home } from '../screens/Home';
import { Discover } from '../screens/Discover';
import { Inbox } from '../screens/Inbox';
import { Chat } from '../screens/Chat';
import { Notifications } from '../screens/Notifications';
import { Me } from '../screens/Me';
import { Circles } from '../screens/Circles';
import { CircleDetail } from '../screens/CircleDetail';
import { Create } from '../screens/Create';
import { Settings, Blocked, Admin } from '../screens/Settings';
import { EditProfile } from '../screens/EditProfile';

export function Screen({ route }: { route: Route }) {
  const signedIn = useNexus(s => s.signedIn);
  const complete = useNexus(s => s.onboardingComplete);
  const destination = entryRoute(signedIn, complete, route.name);
  useEffect(() => { if (destination !== route.name) navigate(destination); }, [destination, route.name]);
  if (destination !== route.name) return <div className="p-8" role="status">Opening your NEXUS…</div>;
  switch (route.name) {
    case 'welcome': return <Welcome />;
    case 'onboarding': return <Onboarding />;
    case 'building': return <Building />;
    case 'first-matches': return <People />;
    case 'home': return <Home />;
    case 'discover': return <Discover />;
    case 'user': return <UserDetail />;
    case 'inbox': return <Inbox />;
    case 'chat': return <Chat />;
    case 'notifications': return <Notifications />;
    case 'me': return <Me />;
    case 'circles': return <Circles />;
    case 'circle': return <CircleDetail />;
    case 'create': return <Create />;
    case 'settings': return <Settings />;
    case 'blocked': return <Blocked />;
    case 'admin': return <Admin />;
    case 'edit-profile': return <EditProfile />;
  }
}
