const ESTADOS = Object.freeze({
  ACEPTADA: 'ACEPTADA',
  RECHAZADA_SIN_STOCK: 'RECHAZADA_SIN_STOCK',
  RETIRADA_CONFIRMADA: 'RETIRADA_CONFIRMADA',
  NO_RETIRADA_FARMACIA: 'NO_RETIRADA_FARMACIA',
});

const DIAS_LIMITE_RETIRO = parseInt(process.env.DIAS_LIMITE_RETIRO || '3');
const PROBABILIDAD_RECHAZO = parseFloat(process.env.PROBABILIDAD_RECHAZO_STOCK || '0.1');

class RecetaExterna {
  constructor({ idRecetaFarmacia, referenciaDespacho, farmaciaCodigo, medicamento, dosis,
                cantidad, estado, referenciaInterna, motivoRechazo, fechaRecepcion, fechaLimiteRetiro }) {
    this.idRecetaFarmacia = idRecetaFarmacia;
    this.referenciaDespacho = referenciaDespacho;
    this.farmaciaCodigo = farmaciaCodigo;
    this.medicamento = medicamento;
    this.dosis = dosis;
    this.cantidad = cantidad;
    this.estado = estado || null;
    this.referenciaInterna = referenciaInterna || null;
    this.motivoRechazo = motivoRechazo || null;
    this.fechaRecepcion = fechaRecepcion || new Date();
    this.fechaLimiteRetiro = fechaLimiteRetiro || null;
  }

  static ESTADOS = ESTADOS;

  /**
   * Lógica de evaluación de stock: combina triggers DETERMINÍSTICOS
   * (para pruebas automatizadas repetibles) con una probabilidad
   * ALEATORIA configurable (para simular comportamiento realista).
   */
  static evaluarStock({ medicamento, cantidad }) {
    const medicamentoUpper = medicamento.toUpperCase();

    if (medicamentoUpper.includes('SIN-STOCK')) {
      return { hayStock: false, motivo: 'Sin stock disponible en la sucursal' };
    }
    if (cantidad > 100) {
      return { hayStock: false, motivo: 'Cantidad solicitada excede el límite de despacho por receta' };
    }
    if (Math.random() < PROBABILIDAD_RECHAZO) {
      return { hayStock: false, motivo: 'Sin stock disponible en la sucursal' };
    }
    return { hayStock: true, motivo: null };
  }

  aceptar() {
    this.estado = ESTADOS.ACEPTADA;
    this.referenciaInterna = `REF-FARMA-${Date.now()}`;
    const limite = new Date(this.fechaRecepcion);
    limite.setDate(limite.getDate() + DIAS_LIMITE_RETIRO);
    this.fechaLimiteRetiro = limite;
  }

  rechazarPorStock(motivo) {
    this.estado = ESTADOS.RECHAZADA_SIN_STOCK;
    this.motivoRechazo = motivo;
  }

  toRespuestaHTTP() {
    const estadosConsideradosAceptados = [ESTADOS.ACEPTADA, ESTADOS.RETIRADA_CONFIRMADA, ESTADOS.NO_RETIRADA_FARMACIA];
    if (estadosConsideradosAceptados.includes(this.estado)) {
      return { aceptada: true, referencia: this.referenciaInterna, motivo: null };
    }
    return { aceptada: false, referencia: null, motivo: this.motivoRechazo };
  }
}

module.exports = RecetaExterna;
