// Holds the current session. Exactly one session is active at a time:
//   { kind: 'staff',  user }  -> ERP staff (token / user)
//   { kind: 'portal', user }  -> external portal (portalToken / portalUser)
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadTokens, getItem, getJSON, setUnauthorizedHandler } from '../storage/tokenStore';
import { staffLogin, staffLogout } from '../api/auth';
import { portalLogin, portalLogout } from '../portal/api/portalAuth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    (async () => {
      await loadTokens();
      if (getItem('token') && getJSON('user')) setSession({ kind: 'staff', user: getJSON('user') });
      else if (getItem('portalToken') && getJSON('portalUser')) setSession({ kind: 'portal', user: getJSON('portalUser') });
      setReady(true);
    })();
    // A 401 from either API drops the session (like the web interceptors redirecting to login).
    setUnauthorizedHandler(() => setSession(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const loginStaff = useCallback(async (email, password) => {
    await portalLogout();
    const user = await staffLogin(email, password);
    setSession({ kind: 'staff', user });
    return user;
  }, []);

  const loginPortal = useCallback(async (email, password) => {
    await staffLogout();
    const user = await portalLogin(email, password);
    setSession({ kind: 'portal', user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    await staffLogout();
    await portalLogout();
    setSession(null);
  }, []);

  const value = useMemo(() => ({ ready, session, loginStaff, loginPortal, logout }), [ready, session, loginStaff, loginPortal, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
