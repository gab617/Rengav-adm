import { useEffect, useState } from "react";
import { supabase } from "../../../../../../services/supabaseClient";

const SETTINGS_SELECT = "id, logo_url, hero_url, lema, descripcion, theme";

export function useSucursalSettings(profileId, tenantId) {
  const [sucursal, setSucursal] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [tenantNombre, setTenantNombre] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      const [suc, ten, negocio] = await Promise.all([
        supabase
          .from("sucursal_settings")
          .select(SETTINGS_SELECT)
          .eq("profile_id", profileId)
          .maybeSingle(),
        supabase
          .from("tenant_settings")
          .select(SETTINGS_SELECT)
          .eq("tenant_id", tenantId)
          .maybeSingle(),
        supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
      ]);

      if (!mounted) return;

      setSucursal(suc.error ? null : suc.data);
      setTenant(ten.error ? null : ten.data);
      setTenantNombre(negocio.error ? "" : negocio.data?.name || "");
      setLoading(false);
    }

    if (profileId && tenantId) load();

    return () => {
      mounted = false;
    };
  }, [profileId, tenantId]);

  // CASCADA: el valor efectivo es lo que la tienda muestra.
  // sucursal pisa a tenant (misma regla que el RPC storefront_get_sucursal).
  const effective = {
    logo_url: sucursal?.logo_url ?? tenant?.logo_url ?? null,
    hero_url: sucursal?.hero_url ?? tenant?.hero_url ?? null,
    lema: sucursal?.lema ?? tenant?.lema ?? "",
    descripcion: sucursal?.descripcion ?? tenant?.descripcion ?? "",
    theme: { ...(tenant?.theme || {}), ...(sucursal?.theme || {}) },
  };

  const save = async (form) => {
    setSaving(true);
    try {
      // Se guarda SOLO lo que difiere del negocio (cascada limpia):
      // un token sin valor o igual al del tenant => se hereda.
      const tenantTheme = tenant?.theme || {};
      const theme = {};
      for (const [key, value] of Object.entries(form.theme || {})) {
        if (
          value !== undefined &&
          value !== null &&
          String(value).trim() !== "" &&
          value !== tenantTheme[key]
        ) {
          theme[key] = value;
        }
      }

      const payload = {
        lema: form.lema?.trim() ? form.lema.trim() : null,
        descripcion: form.descripcion?.trim() ? form.descripcion.trim() : null,
        logo_url: form.logo_url || null,
        hero_url: form.hero_url || null,
        theme,
      };

      let result;
      if (sucursal?.id) {
        result = await supabase
          .from("sucursal_settings")
          .update(payload)
          .eq("id", sucursal.id)
          .select(SETTINGS_SELECT)
          .single();
      } else {
        result = await supabase
          .from("sucursal_settings")
          .insert({ profile_id: profileId, ...payload })
          .select(SETTINGS_SELECT)
          .single();
      }

      if (result.error) throw result.error;

      setSucursal(result.data);

      const newEffective = {
        logo_url: result.data.logo_url ?? tenant?.logo_url ?? null,
        hero_url: result.data.hero_url ?? tenant?.hero_url ?? null,
        lema: result.data.lema ?? tenant?.lema ?? "",
        descripcion: result.data.descripcion ?? tenant?.descripcion ?? "",
        theme: { ...(tenant?.theme || {}), ...(result.data.theme || {}) },
      };

      return { ok: true, effective: newEffective };
    } catch (err) {
      return { ok: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  return { sucursal, tenant, tenantNombre, effective, loading, saving, save };
}
