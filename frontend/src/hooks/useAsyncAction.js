import { useState, useCallback } from 'react';

/**
 * Hook reutilizable para prevenir envíos duplicados, manejar estados de carga/éxito/error
 * y conservar intactos los datos de los formularios cuando falla una solicitud.
 */
export function useAsyncAction() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  const limpiarMensajes = useCallback(() => {
    setError(null);
    setExito(null);
  }, []);

  const ejecutar = useCallback(
    async (fn, mensajeExito = null) => {
      if (cargando) return null;
      setCargando(true);
      setError(null);
      setExito(null);
      try {
        const res = await fn();
        if (mensajeExito) {
          setExito(mensajeExito);
        }
        return res;
      } catch (err) {
        setError(err.message || 'Ocurrió un error al procesar la solicitud.');
        throw err;
      } finally {
        setCargando(false);
      }
    },
    [cargando]
  );

  return {
    cargando,
    error,
    exito,
    setError,
    setExito,
    limpiarMensajes,
    ejecutar
  };
}
