import { useState, useEffect, useCallback } from "react";
import { fetchData, insertData, updateData, deleteData } from "../services/supabaseClient";

export function useSupabase(tabla, options = {}) {
  const {
    initialData = [],
    filters = [],
    order,
    limit,
    dependOn = [],
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchData(tabla, { filters, order, limit });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tabla, JSON.stringify(filters), order?.column, order?.ascending, limit, ...dependOn]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const refresh = useCallback(() => fetch(), [fetch]);

  const create = useCallback(async (payload) => {
    const newItem = await insertData(tabla, payload);
    if (Array.isArray(newItem)) {
      setData((prev) => [...prev, ...newItem]);
    } else {
      setData((prev) => [...prev, newItem]);
    }
    return newItem;
  }, [tabla]);

  const update = useCallback(async (id, payload) => {
    const updated = await updateData(tabla, id, payload);
    setData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updated } : item))
    );
    return updated;
  }, [tabla]);

  const remove = useCallback(async (id) => {
    await deleteData(tabla, id);
    setData((prev) => prev.filter((item) => item.id !== id));
  }, [tabla]);

  return { data, loading, error, refresh, create, update, remove };
}

export function useSupabaseSingle(tabla, id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const result = await fetchData(tabla, { filters: [{ column: "id", value: id }], single: true });
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [tabla, id]);

  return { data, loading, error };
}
