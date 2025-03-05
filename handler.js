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
    // La marca espera: codigoUnicoTransaccion, numeroTarjeta, cvv, fechaCaducidad, monto
    const marcaRequest = {
      codigoUnicoTransaccion: request.codigoUnicoTransaccion,
      numeroTarjeta: request.numeroTarjeta,
      cvv: String(request.codigoSeguridad),  // De codigoSeguridad a cvv
      fechaCaducidad: request.fechaExpiracion, // De fechaExpiracion a fechaCaducidad
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

    return formatResponse(200, {
      tarjetaValida: marcaResponse.esValida || false,
      mensaje: marcaResponse.mensaje || "Validación completada",
      swiftBanco: marcaResponse.swiftBanco || ""
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
    // Asegurar que los nombres de campos son los correctos para la API externa
    const requestToMarca = {
      codigoUnicoTransaccion: marcaRequest.codigoUnicoTransaccion,
      numeroTarjeta: marcaRequest.numeroTarjeta,
      cvv: marcaRequest.cvv,
      fechaCaducidad: marcaRequest.fechaCaducidad,
      monto: marcaRequest.monto
    };

    console.log("📤 Enviando request a la MARCA:", JSON.stringify({
      ...requestToMarca,
      numeroTarjeta: `****${requestToMarca.numeroTarjeta.slice(-4)}`,
      cvv: "***"
    }));

    const response = await fetch(MARCA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestToMarca)
    });

    const responseText = await response.text();
    console.log(`Respuesta de la MARCA (status ${response.status}):`, responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error("Error al parsear respuesta JSON:", e);
      responseData = { 
        esValida: false, 
        mensaje: `Error en formato de respuesta: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}` 
      };
    }

    if (!response.ok) {
      throw {
        status: response.status,
        message: `Error en la API de la MARCA: ${response.status} ${response.statusText} - ${JSON.stringify(responseData)}`
      };
    }

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
