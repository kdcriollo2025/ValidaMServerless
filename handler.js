"use strict";

const fetch = require("node-fetch");

const MARCA_API_URL = process.env.MARCA_API_URL || "http://localhost:8081/api/v1/procesador/tarjetas/validar";

module.exports.validarMarca = async (event) => {
  try {
    const request = JSON.parse(event.body || '{}');
    console.log("📥 Recibiendo solicitud:", request);

   
    if (!request.codigoUnicoTransaccion || !request.numeroTarjeta || !request.cvv || !request.fechaExpiracion || !request.monto) {
      return formatResponse(400, {
        tarjetaValida: false,
        mensaje: "⚠️ Datos insuficientes para la validación"
      });
    }

   
    const marcaRequest = {
      codigoUnicoTransaccion: request.codigoUnicoTransaccion,
      numeroTarjeta: request.numeroTarjeta,
      cvv: request.cvv.toString(),
      fechaCaducidad: convertirFormatoFecha(request.fechaExpiracion),
      monto: request.monto
    };

    console.log("🔍 Enviando solicitud a la MARCA:", {
      codigoUnicoTransaccion: marcaRequest.codigoUnicoTransaccion,
      numeroTarjeta: `****${marcaRequest.numeroTarjeta.slice(-4)}`,
      cvv: "***",
      fechaCaducidad: marcaRequest.fechaCaducidad,
      monto: marcaRequest.monto
    });

   
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


function convertirFormatoFecha(fechaExpiracion) {
  try {
    const [mes, anio] = fechaExpiracion.split("/");
    const anioCompleto = `20${anio}`;
    return `${anioCompleto}-${mes.padStart(2, "0")}-01`;
  } catch (error) {
    throw new Error("⚠️ Formato de fecha inválido");
  }
}


async function callMarcaAPI(marcaRequest) {
  try {
    const response = await fetch(MARCA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(marcaRequest)
    });

    if (!response.ok) {
      throw new Error(`Error en la API de la MARCA: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Error llamando a la API de la MARCA: ${error.message}`);
  }
}


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
