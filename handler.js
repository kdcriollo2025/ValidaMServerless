"use strict";

const fetch = require("node-fetch");

const MARCA_API_URL = process.env.MARCA_API_URL || "https://0f1f-70-183-141-201.ngrok-free.app/api/v1/procesador/tarjetas/validar";

module.exports.validarMarca = async (event) => {
  try {
    const request = JSON.parse(event.body || '{}');
    console.log("📥 Recibiendo solicitud:", request);

    // ⚠️ Transformar los datos correctamente antes de enviarlos
    const marcaRequest = {
      codigoUnicoTransaccion: request.codigoUnicoTransaccion,
      numeroTarjeta: request.numeroTarjeta,
      cvv: request.codigoSeguridad ? String(request.codigoSeguridad) : null,  // Convertir a string
      fechaCaducidad: request.fechaExpiracion ? convertirFormatoFecha(request.fechaExpiracion) : null,
      monto: request.monto
    };

    // ❌ Validación: Verificar si falta algún campo
    if (!marcaRequest.codigoUnicoTransaccion || !marcaRequest.numeroTarjeta || !marcaRequest.cvv || !marcaRequest.fechaCaducidad || !marcaRequest.monto) {
      console.error("🚨 Error: Datos insuficientes para la validación", marcaRequest);
      return formatResponse(400, {
        tarjetaValida: false,
        mensaje: "⚠️ Datos insuficientes para la validación"
      });
    }

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
      tarjetaValida: marcaResponse.esValida,
      mensaje: marcaResponse.mensaje,
      swiftBanco: marcaResponse.swiftBanco
    });

  } catch (error) {
    console.error("❌ Error en validación:", error);
    return formatResponse(500, {
      tarjetaValida: false,
      mensaje: "❌ Error en el proceso de validación",
      error: error.message
    });
  }
};

// 🔹 Transformar fecha "MM/YY" a "YYYY-MM-DD"
function convertirFormatoFecha(fechaExpiracion) {
  try {
    const [mes, anio] = fechaExpiracion.split("/");
    const anioCompleto = `20${anio}`;
    return `${anioCompleto}-${mes.padStart(2, "0")}-01`; // YYYY-MM-DD
  } catch (error) {
    throw new Error("⚠️ Formato de fecha inválido");
  }
}

// 🔹 Llamada real a la API de la Marca
async function callMarcaAPI(marcaRequest) {
  try {
    console.log("📤 Enviando request a la MARCA:", JSON.stringify(marcaRequest));

    const response = await fetch(MARCA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(marcaRequest)
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const errorText = await response.text();
      throw new Error(`La API de la MARCA devolvió una respuesta inválida: ${errorText}`);
    }

    const responseData = await response.json();
    console.log("📥 Respuesta de la MARCA:", responseData);

    if (!response.ok) {
      throw new Error(`Error en la API de la MARCA: ${response.status} ${response.statusText} - ${JSON.stringify(responseData)}`);
    }

    return responseData;
  } catch (error) {
    console.error("❌ Error detallado en llamada a MARCA:", error);
    throw new Error(`Error llamando a la API de la MARCA: ${error.message}`);
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
