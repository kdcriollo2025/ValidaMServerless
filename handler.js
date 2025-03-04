"use strict";

const MARCA_API_URL = process.env.MARCA_API_URL || "http://localhost:8081/api/v1/procesador/tarjetas/validar";

module.exports.validarMarca = async (event) => {
  try {
    const request = JSON.parse(event.body || '{}');
    console.log("📥 Recibiendo solicitud:", request);

    // campos requerido
    const marcaRequest = {
      codigoUnicoTransaccion: request.codigoUnicoTransaccion,
      numeroTarjeta: request.numeroTarjeta,
      cvv: request.cvv ? request.cvv.toString() : null,
      fechaCaducidad: request.fechaExpiracion ? convertirFormatoFecha(request.fechaExpiracion) : null,
      monto: request.monto
    };

    if (!marcaRequest.codigoUnicoTransaccion || !marcaRequest.numeroTarjeta || !marcaRequest.cvv || !marcaRequest.fechaCaducidad || !marcaRequest.monto) {
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
    const response = await simulateMarcaAPICall(marcaRequest);
    return response;
  } catch (error) {
    throw new Error(`Error llamando a la API de la MARCA: ${error.message}`);
  }
}

async function simulateMarcaAPICall(request) {
  await new Promise(resolve => setTimeout(resolve, 300));

  if (!request.numeroTarjeta || !request.cvv || !request.fechaCaducidad) {
    throw new Error('Datos de tarjeta incompletos');
  }


  return {
    esValida: true,
    mensaje: "✅ La tarjeta es válida",
    swiftBanco: "PICHECU0001"
  };
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
