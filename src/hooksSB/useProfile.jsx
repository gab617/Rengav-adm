import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { getStoreUrl } from "../utils/storefront";

const ProfileContext = createContext({ profile: null, loadingProfile: true });

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoFit, setLogoFit] = useState("cover");
  const [logoZoom, setLogoZoom] = useState("1");
  const [logoPosition, setLogoPosition] = useState("center");
  const [storeUrl, setStoreUrl] = useState(null);
  const [loadingProfile, setLoading] = useState(true);
  const lastUserIdRef = useRef(undefined);

  useEffect(() => {
    let mounted = true;

    async function loadProfile(userId) {
      if (!userId) {
        if (mounted) {
          setProfile(null);
          setLogoUrl(null);
          setLogoFit("cover");
          setLogoZoom("1");
          setLogoPosition("center");
          setStoreUrl(null);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, name, tenant_id, parent_admin_id, slug")
        .eq("id", userId)
        .single();

      if (!error && mounted) {
        setProfile(data);
      }

      // Tienda online: URL de la sucursal (base de deploy + slug).
      if (!error && mounted) {
        setStoreUrl(getStoreUrl(data?.slug));
      }

      // Branding efectivo: logo de la sucursal, si no, el del negocio
      // (misma cascada que storefront_get_sucursal / useSucursalSettings),
      // con el encuadre del logo (fit/zoom/position) resuelto igual que el preview.
      if (data?.tenant_id) {
        const [suc, ten] = await Promise.all([
          supabase
            .from("sucursal_settings")
            .select("logo_url, theme")
            .eq("profile_id", userId)
            .maybeSingle(),
          supabase
            .from("tenant_settings")
            .select("logo_url, theme")
            .eq("tenant_id", data.tenant_id)
            .maybeSingle(),
        ]);
        const theme = {
          ...(ten?.data?.theme || {}),
          ...(suc?.data?.theme || {}),
        };
        const url = suc?.data?.logo_url ?? ten?.data?.logo_url ?? null;
        if (mounted) {
          setLogoUrl(url);
          if (url) {
            setLogoFit(theme["logo-fit"] || "cover");
            setLogoZoom(theme["logo-zoom"] || "1");
            setLogoPosition(theme["logo-position"] || "center");
          }
        }
      }

      if (mounted) setLoading(false);
    }

    async function handleSession(session) {
      const userId = session?.user?.id ?? null;
      // getSession() e INITIAL_SESSION llegan con la misma sesión al montar:
      // solo procesamos la primera para no duplicar la query a profiles.
      if (userId === lastUserIdRef.current) return;
      lastUserIdRef.current = userId;
      await loadProfile(userId);
    }

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (event === "TOKEN_REFRESHED") return;
        handleSession(session);
      }
    );

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      handleSession(data.session);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <ProfileContext.Provider
      value={{ profile, loadingProfile, logoUrl, logoFit, logoZoom, logoPosition, storeUrl }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
