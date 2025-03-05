"use strict";

const fetch = require("node-fetch");

const MARCA_API_URL = process.env.MARCA_API_URL || "https://0f1f-70-183-141-201.ngrok-free.app/api/v1/procesador/tarjetas/validar";

module.exports.validarMarca = async (event) => {
  try {
    const request = JSON.parse(event.body || '{}');
    console.log("📥 Recibiendo solicitud de procesatransaccion:", {
      ...request,
      numeroTarjeta: request.numeroTarjeta ? `****${request.numeroTarjeta.slice(-4)}` : null,
      codigoSeguridad: request.codigoSeguridad ? '***' : null
    });

    // ⚠️ Validación de campos requeridos
    const camposRequeridos = ['codigoUnicoTransaccion', 'numeroTarjeta', 'codigoSeguridad', 'fechaExpiracion', 'monto'];
    const camposFaltantes = camposRequeridos.filter(campo => !request[campo]);
    
    if (camposFaltantes.length > 0) {
      console.error("🚨 Error: Campos requeridos faltantes:", camposFaltantes);
      return formatResponse(400, {
        tarjetaValida: false,
        mensaje: `⚠️ Campos requeridos faltantes: ${camposFaltantes.join(', ')}`
      });
    }

    // ⚠️ Transformar los datos al formato que espera la marca
    const marcaRequest = {
      codigoUnicoTransaccion: request.codigoUnicoTransaccion,
      numeroTarjeta: request.numeroTarjeta,
      cvv: String(request.codigoSeguridad),  // Convertir a string
      fechaCaducidad: request.fechaExpiracion, // Mantener el formato MM/YY
      monto: request.monto
    };

    console.log("🔍 Enviando solicitud a la MARCA:", {
      codigoUnicoTransaccion: marcaRequest.codigoUnicoTransaccion,
      numeroTarjeta: `****${marcaRequest.numeroTarjeta.slice(-4)}`,
      cvv: "***",
      fechaCaducidad: marcaRequest.fechaCaducidad,
      monto: marcaRequest.monto
    });

    // 🔹 Llamar a la API de la Marca
    const marcaResponse = await callMarcaAPI(marcaRequest);

    console.log("✅ Respuesta exitosa de la MARCA:", {
      tarjetaValida: marcaResponse.esValida,
      mensaje: marcaResponse.mensaje,
      swiftBanco: marcaResponse.swiftBanco
    });

    return formatResponse(200, {
      tarjetaValida: marcaResponse.esValida,
      mensaje: marcaResponse.mensaje,
      swiftBanco: marcaResponse.swiftBanco
    });

  } catch (error) {
    console.error("❌ Error en validación:", error);
    return formatResponse(error.status || 500, {
      tarjetaValida: false,
      mensaje: error.message || "❌ Error en el proceso de validación",
      error: error.message
    });
  }
};

// 🔹 Llamada a la API de la Marca
async function callMarcaAPI(marcaRequest) {
  try {
    console.log("📤 Enviando request a la MARCA:", JSON.stringify({
      ...marcaRequest,
      numeroTarjeta: `****${marcaRequest.numeroTarjeta.slice(-4)}`,
      cvv: "***"
    }));

    const response = await fetch(MARCA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(marcaRequest)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Error en respuesta de la MARCA: ${response.status} ${response.statusText}`, errorData);
      throw {
        status: response.status,
        message: `Error en la API de la MARCA: ${response.status} ${response.statusText}`
      };
    }

    const responseData = await response.json();
    console.log("📥 Respuesta de la MARCA:", responseData);

    return responseData;
  } catch (error) {
    console.error("❌ Error detallado en llamada a MARCA:", error);
    throw {
      status: 500,
      message: `Error llamando a la API de la MARCA: ${error.message}`
    };
  }
}

// 🔹 Respuesta estandarizada
function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify(body)
  };
}
