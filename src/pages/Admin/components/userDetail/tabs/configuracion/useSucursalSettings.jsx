import { useEffect, useState } from "react";
import { supabase } from "../../../../../../services/supabaseClient";

const SETTINGS_SELECT =
  "id, logo_url, hero_url, lema, descripcion, theme, telefono_whatsapp, alias_transferencia, cbu_transferencia, facebook_url, instagram_url, x_url";

function computeEffective(sucursal, tenant) {
  return {
    logo_url: sucursal?.logo_url ?? tenant?.logo_url ?? null,
    hero_url: sucursal?.hero_url ?? tenant?.hero_url ?? null,
    lema: sucursal?.lema ?? tenant?.lema ?? "",
    descripcion: sucursal?.descripcion ?? tenant?.descripcion ?? "",
    theme: { ...(tenant?.theme || {}), ...(sucursal?.theme || {}) },
    telefono_whatsapp: sucursal?.telefono_whatsapp ?? tenant?.telefono_whatsapp ?? "",
    alias_transferencia: sucursal?.alias_transferencia ?? tenant?.alias_transferencia ?? "",
    cbu_transferencia: sucursal?.cbu_transferencia ?? tenant?.cbu_transferencia ?? "",
    facebook_url: sucursal?.facebook_url ?? tenant?.facebook_url ?? "",
    instagram_url: sucursal?.instagram_url ?? tenant?.instagram_url ?? "",
    x_url: sucursal?.x_url ?? tenant?.x_url ?? "",
  };
}

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
  const effective = computeEffective(sucursal, tenant);

  // Persiste SOLO los campos que vienen en el form. Asi cada seccion
  // guarda lo suyo sin pisar la otra (branding <-> contacto/pagos).
  const save = async (form) => {
    setSaving(true);
    try {
      const payload = {};

      if ("theme" in form) {
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
        payload.theme = theme;
      }

      if ("lema" in form)
        payload.lema = form.lema?.trim() ? form.lema.trim() : null;
      if ("descripcion" in form)
        payload.descripcion = form.descripcion?.trim()
          ? form.descripcion.trim()
          : null;
      if ("logo_url" in form) payload.logo_url = form.logo_url || null;
      if ("hero_url" in form) payload.hero_url = form.hero_url || null;

      if ("telefono_whatsapp" in form)
        payload.telefono_whatsapp = form.telefono_whatsapp?.trim()
          ? form.telefono_whatsapp.trim()
          : null;
      if ("alias_transferencia" in form)
        payload.alias_transferencia = form.alias_transferencia?.trim()
          ? form.alias_transferencia.trim()
          : null;
      if ("cbu_transferencia" in form)
        payload.cbu_transferencia = form.cbu_transferencia?.trim()
          ? form.cbu_transferencia.trim()
          : null;

      if ("facebook_url" in form)
        payload.facebook_url = form.facebook_url?.trim()
          ? form.facebook_url.trim()
          : null;
      if ("instagram_url" in form)
        payload.instagram_url = form.instagram_url?.trim()
          ? form.instagram_url.trim()
          : null;
      if ("x_url" in form)
        payload.x_url = form.x_url?.trim() ? form.x_url.trim() : null;

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

      const newEffective = computeEffective(result.data, tenant);

      return { ok: true, effective: newEffective };
    } catch (err) {
      return { ok: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  return { sucursal, tenant, tenantNombre, effective, loading, saving, save };
}
