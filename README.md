# Farmacia API

Este es un servicio independiente que simula a un **proveedor externo de farmacia** diseñado para interactuar de forma pasiva con otros sistemas (como un ecosistema de citas médicas o clínicas).

El servicio permite la recepción de recetas médicas, evalúa la disponibilidad de stock de los medicamentos mediante reglas de negocio (determinísticas para pruebas y estocásticas para la vida real) y devuelve inmediatamente una decisión: `Aceptada` o `Rechazada`.

## Arquitectura y Tecnologías

- **Node.js 22** con **Express**
- Arquitectura Hexagonal Simple (Adaptadores In/Out, Casos de Uso, Entidades de Dominio)
- **Base de Datos:** MySQL 8.0
- **Resiliencia & Rendimiento:** Middleware de *backpressure* (limita solicitudes simultáneas).
- **Seguridad:** Autenticación vía `Bearer Token`, y uso de Helmet.
- **Docker:** Listo para producción mediante contenedores (`Dockerfile` y `docker-compose.yml`).

## Iniciar el Servicio (Docker)

La forma más fácil de correr la API es mediante Docker Compose, lo cual levantará la base de datos MySQL, ejecutará las migraciones iniciales (schema y seed), y arrancará la API.

```bash
docker-compose up --build -d
```

### Variables de Entorno (.env)

El proyecto utiliza variables de entorno para su configuración. Puedes crear un archivo `.env` basado en `.env.example`:

```env
PORT=4002
FARMACIA_API_KEY=test_api_key_123
DB_HOST=mysql-farmacia
DB_PORT=3306
DB_USER=root
DB_PASSWORD=secret
DB_NAME=db_farmacia
DIAS_LIMITE_RETIRO=3
PROBABILIDAD_RECHAZO_STOCK=0.1
MAX_SOLICITUDES_CONCURRENTES=50
```

## Endpoints

### 1. Documentación Swagger / OpenAPI
- **Ruta:** `GET /api-docs`
- **Descripción:** Accede a la interfaz visual de Swagger para ver el contrato y probar la API de forma directa.

### 2. Healthcheck
- **Ruta:** `GET /health`
- **Descripción:** Devuelve `{ "status": "ok" }`. Usado por el contenedor Docker para verificar que el servicio está activo.

### 3. Recepción de Recetas
- **Ruta:** `POST /api/v1/farmacia/recepcionar-receta`
- **Headers:** `Authorization: Bearer <FARMACIA_API_KEY>`
- **Body:**
```json
{
  "referenciaDespacho": "TEST-001",
  "farmacia": "FARM-001",
  "medicamento": "Paracetamol",
  "dosis": "1g",
  "cantidad": 10
}
```
- **Respuesta (200 OK - Aceptada):**
```json
{
  "aceptada": true,
  "referencia": "REF-FARMA-123456789",
  "motivo": null
}
```
- **Respuesta (200 OK - Sin Stock):** Si incluyes la palabra `SIN-STOCK` en el nombre del medicamento, se rechazará garantizadamente.
```json
{
  "aceptada": false,
  "referencia": null,
  "motivo": "Sin stock disponible en la sucursal"
}
```

## Ciclo de Vida y Workers Internos

1. Cuando la API acepta la receta, guarda el registro en la base de datos MySQL con estado `ACEPTADA`.
2. Las recetas tienen una vigencia para retiro de `DIAS_LIMITE_RETIRO` (por defecto 3 días).
3. Existe un cron job (`node-cron`) en el propio servidor que se ejecuta a las 07:00 AM, buscando las recetas vencidas y cambiándolas al estado final `NO_RETIRADA_FARMACIA`.
4. El sistema mantiene la **idempotencia**. Si recibimos una petición repetida con el mismo `referenciaDespacho`, el sistema simplemente retorna la respuesta calculada originalmente.
