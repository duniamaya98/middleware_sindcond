# ChirpStack REST API — Dokumentasi

> **Versi ChirpStack:** 4.19.1  
> **Middleware:** mdw_sindcond_badiklat (Express, port 3001)  
> **Arsitektur:** REST endpoint di middleware → gRPC call ke ChirpStack V4 (localhost:8080)

---

## Informasi Umum

| Item | Nilai |
|---|---|
| **Base URL** | `http://localhost:3001/api/chirpstack` |
| **Content-Type** | `application/json` |
| **Autentikasi** | Tidak diperlukan di sisi middleware (API key dikonfigurasi di `.env`) |
| **ChirpStack gRPC** | `localhost:8080` |
| **Tenant ID** | `74893f3e-19ab-4384-9d11-096feae38a2c` |

### Konfigurasi `.env`

```env
CHIRPSTACK_HOST=localhost:8080
CHIRPSTACK_API_KEY=<api_key_dari_chirpstack>
CHIRPSTACK_TENANT_ID=<tenant_id>
```

### Format Response

Semua endpoint return format seragam:

**Sukses (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error (400 / 404 / 500):**
```json
{
  "success": false,
  "error": "Pesan error"
}
```

### HTTP Status Code

| Kode | Keterangan |
|---|---|
| `200` | Sukses |
| `400` | Request tidak valid (field wajib kosong) |
| `404` | Resource tidak ditemukan |
| `500` | Error internal / gRPC gagal |

---

## Daftar Endpoint

| Metode | Path | Keterangan |
|---|---|---|
| `GET` | `/applications` | List semua application |
| `GET` | `/applications/:applicationId` | Detail application |
| `GET` | `/gateways` | List semua gateway |
| `GET` | `/gateways/:gatewayId` | Detail gateway |
| `POST` | `/gateways` | Tambah gateway baru |
| `PUT` | `/gateways/:gatewayId` | Update gateway |
| `DELETE` | `/gateways/:gatewayId` | Hapus gateway |
| `GET` | `/devices` | List device (wajib `?applicationId=`) |
| `GET` | `/devices/:devEui` | Detail device |
| `POST` | `/devices` | Tambah device baru |
| `PUT` | `/devices/:devEui` | Update device |
| `DELETE` | `/devices/:devEui` | Hapus device |
| `GET` | `/devices/:devEui/queue` | Lihat downlink queue |
| `POST` | `/devices/:devEui/queue` | Enqueue downlink ke device |
| `DELETE` | `/devices/:devEui/queue` | Flush seluruh queue device |

---

## Application

### GET `/applications`

List semua application dalam tenant.

**Query Parameter:** —

**Contoh Request:**
```bash
curl http://localhost:3001/api/chirpstack/applications
```

**Contoh Response:**
```json
{
  "success": true,
  "data": {
    "totalCount": 1,
    "result": [
      {
        "id": "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0",
        "name": "EMS",
        "description": ""
      }
    ]
  }
}
```

---

### GET `/applications/:applicationId`

Detail satu application.

**Path Parameter:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `applicationId` | `string` (UUID) | ID application |

**Contoh Request:**
```bash
curl http://localhost:3001/api/chirpstack/applications/4360bdb1-6cdd-4d38-b92a-ea6020ebbea0
```

**Contoh Response:**
```json
{
  "success": true,
  "data": {
    "id": "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0",
    "name": "EMS",
    "description": "",
    "tenantId": "74893f3e-19ab-4384-9d11-096feae38a2c"
  }
}
```

---

## Gateway

### GET `/gateways`

List semua gateway dalam tenant.

**Query Parameter:**

| Parameter | Tipe | Default | Keterangan |
|---|---|---|---|
| `limit` | `number` | `100` | Jumlah maksimum data |
| `offset` | `number` | `0` | Offset untuk paginasi |

**Contoh Request:**
```bash
curl "http://localhost:3001/api/chirpstack/gateways?limit=10&offset=0"
```

**Contoh Response:**
```json
{
  "success": true,
  "data": {
    "totalCount": 1,
    "result": [
      {
        "gatewayId": "7276ff0045060ffb",
        "name": "Kerlink",
        "description": "",
        "lastSeenAt": "2026-09-10T07:41:00.185Z",
        "state": 1
      }
    ]
  }
}
```

**Nilai `state`:**

| Nilai | Keterangan |
|---|---|
| `0` | NEVER_SEEN |
| `1` | ONLINE |
| `2` | OFFLINE |

---

### GET `/gateways/:gatewayId`

Detail satu gateway beserta informasi lokasi.

**Path Parameter:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `gatewayId` | `string` (16 char hex) | EUI gateway |

**Contoh Request:**
```bash
curl http://localhost:3001/api/chirpstack/gateways/7276ff0045060ffb
```

**Contoh Response:**
```json
{
  "success": true,
  "data": {
    "gatewayId": "7276ff0045060ffb",
    "name": "Kerlink",
    "description": "",
    "tenantId": "74893f3e-19ab-4384-9d11-096feae38a2c",
    "statsInterval": 30,
    "location": {
      "latitude": -6.2088,
      "longitude": 106.8456,
      "altitude": 10
    },
    "createdAt": "2026-09-08T06:00:00.000Z",
    "updatedAt": "2026-09-09T04:00:00.000Z",
    "lastSeenAt": "2026-09-10T07:41:00.185Z"
  }
}
```

---

### POST `/gateways`

Tambah gateway baru ke ChirpStack.

**Request Body:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `gatewayId` | `string` (16 char hex) | ✅ | EUI gateway (sesuai fisik perangkat) |
| `name` | `string` | ✅ | Nama gateway |
| `description` | `string` | — | Deskripsi (opsional) |
| `latitude` | `number` | — | Koordinat latitude |
| `longitude` | `number` | — | Koordinat longitude |
| `altitude` | `number` | — | Ketinggian dalam meter (default: 0) |
| `statsInterval` | `number` | — | Interval stats dalam detik (default: 30) |

**Contoh Request:**
```bash
curl -X POST http://localhost:3001/api/chirpstack/gateways \
  -H "Content-Type: application/json" \
  -d '{
    "gatewayId": "aabbccddeeff0011",
    "name": "Gateway-Gedung-A",
    "description": "Gateway lantai 3 gedung A",
    "latitude": -6.2088,
    "longitude": 106.8456,
    "altitude": 15,
    "statsInterval": 30
  }'
```

**Contoh Response (201):**
```json
{
  "success": true,
  "data": {
    "gatewayId": "aabbccddeeff0011",
    "message": "Gateway created"
  }
}
```

**Contoh Response Error (400):**
```json
{
  "success": false,
  "error": "gatewayId dan name wajib diisi"
}
```

> ⚠️ `gatewayId` harus sesuai EUI fisik gateway. Gateway yang tidak match EUI tidak akan bisa terkoneksi.

---

### PUT `/gateways/:gatewayId`

Update informasi gateway yang sudah ada.

**Path Parameter:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `gatewayId` | `string` (16 char hex) | EUI gateway |

**Request Body:** sama dengan POST `/gateways` (kecuali `gatewayId` tidak diperlukan di body)

**Contoh Request:**
```bash
curl -X PUT http://localhost:3001/api/chirpstack/gateways/aabbccddeeff0011 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gateway-Gedung-A-v2",
    "description": "Update nama gateway",
    "latitude": -6.2090,
    "longitude": 106.8460,
    "altitude": 20,
    "statsInterval": 60
  }'
```

**Contoh Response:**
```json
{
  "success": true,
  "data": {
    "gatewayId": "aabbccddeeff0011",
    "message": "Gateway updated"
  }
}
```

---

### DELETE `/gateways/:gatewayId`

Hapus gateway dari ChirpStack.

**Path Parameter:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `gatewayId` | `string` (16 char hex) | EUI gateway |

**Contoh Request:**
```bash
curl -X DELETE http://localhost:3001/api/chirpstack/gateways/aabbccddeeff0011
```

**Contoh Response:**
```json
{
  "success": true,
  "data": {
    "gatewayId": "aabbccddeeff0011",
    "message": "Gateway deleted"
  }
}
```

> ⚠️ Penghapusan gateway bersifat permanen. Pastikan tidak ada traffic aktif sebelum menghapus.

---

## Device

### GET `/devices`

List semua device dalam satu application.

**Query Parameter:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `applicationId` | `string` (UUID) | ✅ | ID application |
| `limit` | `number` | — | Jumlah maksimum (default: 100) |

**Contoh Request:**
```bash
curl "http://localhost:3001/api/chirpstack/devices?applicationId=4360bdb1-6cdd-4d38-b92a-ea6020ebbea0"
```

**Contoh Response:**
```json
{
  "success": true,
  "data": {
    "totalCount": 1,
    "result": [
      {
        "devEui": "08000000410000e4",
        "name": "KwH Meter",
        "deviceProfileId": "eca3da95-323f-48b3-a92f-5a3ab618a56a",
        "lastSeenAt": "2026-09-10T07:40:21.361Z"
      }
    ]
  }
}
```

**Contoh Response Error (400 — applicationId tidak ada):**
```json
{
  "success": false,
  "error": "applicationId wajib diisi"
}
```

---

### GET `/devices/:devEui`

Detail satu device.

**Path Parameter:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `devEui` | `string` (16 char hex) | DevEUI device |

**Contoh Request:**
```bash
curl http://localhost:3001/api/chirpstack/devices/08000000410000e4
```

**Contoh Response:**
```json
{
  "success": true,
  "data": {
    "devEui": "08000000410000e4",
    "name": "KwH Meter",
    "description": "",
    "applicationId": "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0",
    "deviceProfileId": "eca3da95-323f-48b3-a92f-5a3ab618a56a",
    "isDisabled": false,
    "createdAt": "2026-09-08T06:15:13.010Z",
    "updatedAt": "2026-09-09T04:58:56.524Z",
    "lastSeenAt": "2026-09-10T07:40:21.361Z"
  }
}
```

---

### POST `/devices`

Tambah device baru ke ChirpStack.

> **Catatan:** Device profile harus sudah ada di ChirpStack sebelum menambah device. Gunakan ChirpStack web UI di `http://localhost:8080` untuk membuat device profile.

**Request Body:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `devEui` | `string` (16 char hex) | ✅ | DevEUI device — sesuai label fisik perangkat |
| `name` | `string` | ✅ | Nama device |
| `applicationId` | `string` (UUID) | ✅ | ID application tempat device didaftarkan |
| `deviceProfileId` | `string` (UUID) | ✅ | ID device profile yang akan digunakan |
| `description` | `string` | — | Deskripsi device (opsional) |
| `isDisabled` | `boolean` | — | Nonaktifkan device (default: `false`) |

**Contoh Request:**
```bash
curl -X POST http://localhost:3001/api/chirpstack/devices \
  -H "Content-Type: application/json" \
  -d '{
    "devEui": "08000000410000ff",
    "name": "KwH Meter Gedung B",
    "applicationId": "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0",
    "deviceProfileId": "eca3da95-323f-48b3-a92f-5a3ab618a56a",
    "description": "Meter lantai 2 gedung B",
    "isDisabled": false
  }'
```

**Contoh Response:**
```json
{
  "success": true,
  "data": {
    "devEui": "08000000410000ff",
    "message": "Device created"
  }
}
```

**Contoh Response Error (400):**
```json
{
  "success": false,
  "error": "devEui, name, applicationId, dan deviceProfileId wajib diisi"
}
```

> ⚠️ `devEui` harus sesuai dengan DevEUI fisik di label perangkat. DevEUI yang salah akan menyebabkan device tidak bisa join network.

---

### PUT `/devices/:devEui`

Update informasi device yang sudah ada.  
Field yang tidak dikirim akan mempertahankan nilai lama.

**Path Parameter:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `devEui` | `string` (16 char hex) | DevEUI device |

**Request Body:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `name` | `string` | — | Nama baru device |
| `description` | `string` | — | Deskripsi baru |
| `deviceProfileId` | `string` (UUID) | — | Ganti device profile |
| `isDisabled` | `boolean` | — | Aktifkan / nonaktifkan device |

**Contoh Request — ganti nama:**
```bash
curl -X PUT http://localhost:3001/api/chirpstack/devices/08000000410000ff \
  -H "Content-Type: application/json" \
  -d '{
    "name": "KwH Meter Gedung B — Lt.2",
    "description": "Update lokasi perangkat"
  }'
```

**Contoh Request — nonaktifkan device:**
```bash
curl -X PUT http://localhost:3001/api/chirpstack/devices/08000000410000ff \
  -H "Content-Type: application/json" \
  -d '{"isDisabled": true}'
```

**Contoh Response:**
```json
{
  "success": true,
  "data": {
    "devEui": "08000000410000ff",
    "message": "Device updated"
  }
}
```

**Contoh Response Error (404):**
```json
{
  "success": false,
  "error": "object does not exist"
}
```

---

### DELETE `/devices/:devEui`

Hapus device dari ChirpStack.

**Path Parameter:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `devEui` | `string` (16 char hex) | DevEUI device |

**Contoh Request:**
```bash
curl -X DELETE http://localhost:3001/api/chirpstack/devices/08000000410000ff
```

**Contoh Response:**
```json
{
  "success": true,
  "data": {
    "devEui": "08000000410000ff",
    "message": "Device deleted"
  }
}
```

> ⚠️ Penghapusan device bersifat permanen. Semua data session (OTAA keys, FCnt, downlink queue) ikut terhapus.

---

### GET `/devices/:devEui/queue`

Lihat downlink queue yang menunggu dikirim ke device.

**Path Parameter:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `devEui` | `string` (16 char hex) | DevEUI device |

**Contoh Request:**
```bash
curl http://localhost:3001/api/chirpstack/devices/08000000410000e4/queue
```

**Contoh Response (queue kosong):**
```json
{
  "success": true,
  "data": {
    "totalCount": 0,
    "result": []
  }
}
```

**Contoh Response (ada item di queue):**
```json
{
  "success": true,
  "data": {
    "totalCount": 1,
    "result": [
      {
        "id": "abc123",
        "fPort": 2,
        "data": "AQ==",
        "confirmed": false
      }
    ]
  }
}
```

**Field `data`:** payload dalam format Base64.

---

### POST `/devices/:devEui/queue`

Kirim downlink command ke device (enqueue).  
Downlink dikirim ChirpStack ke device pada uplink berikutnya.

**Path Parameter:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `devEui` | `string` (16 char hex) | DevEUI device |

**Request Body:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `fPort` | `number` | ✅ | FPort LoRaWAN (1–223) |
| `data` | `string` (Base64) | ✅ | Payload downlink dalam format Base64 |
| `confirmed` | `boolean` | — | Minta konfirmasi ACK dari device (default: `false`) |

**Contoh Request — relay ON (CL711K22, fPort 111, payload `0x01`):**
```bash
curl -X POST http://localhost:3001/api/chirpstack/devices/08000000410000e4/queue \
  -H "Content-Type: application/json" \
  -d '{
    "fPort": 111,
    "data": "AQ==",
    "confirmed": false
  }'
```

**Contoh Request — relay OFF (fPort 111, payload `0x00`):**
```bash
curl -X POST http://localhost:3001/api/chirpstack/devices/08000000410000e4/queue \
  -H "Content-Type: application/json" \
  -d '{
    "fPort": 111,
    "data": "AA==",
    "confirmed": false
  }'
```

**Contoh Response:**
```json
{
  "success": true,
  "data": {
    "id": "queue-item-id-xxx",
    "message": "Downlink enqueued"
  }
}
```

**Contoh Response Error (400):**
```json
{
  "success": false,
  "error": "fPort dan data (base64) wajib diisi"
}
```

**Konversi payload ke Base64:**

```bash
# Hex ke Base64
echo "01" | xxd -r -p | base64        # → AQ==  (relay ON)
echo "00" | xxd -r -p | base64        # → AA==  (relay OFF)
echo "6601" | xxd -r -p | base64      # → ZgE=  (contoh 2 byte)
```

```javascript
// Node.js
Buffer.from("01", "hex").toString("base64")  // → "AQ=="
Buffer.from("AQ==", "base64").toString("hex") // → "01"
```

---

### DELETE `/devices/:devEui/queue`

Hapus (flush) seluruh item downlink yang ada di queue device.  
Berguna untuk membatalkan semua perintah yang belum terkirim.

**Path Parameter:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `devEui` | `string` (16 char hex) | DevEUI device |

**Contoh Request:**
```bash
curl -X DELETE http://localhost:3001/api/chirpstack/devices/08000000410000e4/queue
```

**Contoh Response:**
```json
{
  "success": true,
  "data": {
    "devEui": "08000000410000e4",
    "message": "Queue flushed"
  }
}
```

---

## Contoh Skenario Lengkap

### Skenario 1: Tambah Gateway Baru

```bash
# 1. Cek gateway yang sudah ada
curl http://localhost:3001/api/chirpstack/gateways

# 2. Tambah gateway
curl -X POST http://localhost:3001/api/chirpstack/gateways \
  -H "Content-Type: application/json" \
  -d '{
    "gatewayId": "7276ff0045070001",
    "name": "Gateway-Lokasi-Baru",
    "description": "Gateway di titik distribusi baru",
    "latitude": -6.9175,
    "longitude": 107.6191,
    "altitude": 800,
    "statsInterval": 30
  }'

# 3. Verifikasi
curl http://localhost:3001/api/chirpstack/gateways/7276ff0045070001
```

---

### Skenario 2: Kirim Downlink ke Device

```bash
# 1. Cek device aktif
curl http://localhost:3001/api/chirpstack/devices/08000000410000e4

# 2. Pastikan queue kosong
curl http://localhost:3001/api/chirpstack/devices/08000000410000e4/queue

# 3. Kirim relay ON (via ChirpStack queue langsung)
curl -X POST http://localhost:3001/api/chirpstack/devices/08000000410000e4/queue \
  -H "Content-Type: application/json" \
  -d '{"fPort": 111, "data": "AQ==", "confirmed": false}'

# 4. Cek queue (item harusnya muncul sampai device uplink berikutnya)
curl http://localhost:3001/api/chirpstack/devices/08000000410000e4/queue

# 5. Batalkan jika perlu
curl -X DELETE http://localhost:3001/api/chirpstack/devices/08000000410000e4/queue
```

---

### Skenario 3: Kontrol Relay KWH Meter CL711K22 via Middleware MQTT

> Endpoint ini menggunakan MQTT langsung (bukan ChirpStack REST queue).
> Mendukung konfirmasi state dari uplink device.

#### 3a. Relay ON/OFF Standar

```bash
# Relay ON
curl -X POST http://localhost:3001/api/relay \
  -H "Content-Type: application/json" \
  -d '{
    "devEUI": "08000000410000e4",
    "applicationId": "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0",
    "relay": 1
  }'

# Relay OFF
curl -X POST http://localhost:3001/api/relay \
  -H "Content-Type: application/json" \
  -d '{
    "devEUI": "08000000410000e4",
    "applicationId": "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0",
    "relay": 0
  }'
```

**Response sukses (relay terkonfirmasi):**
```json
{
  "success": true,
  "message": "Relay ON (connect) confirmed by device state.",
  "data": {
    "devEUI": "08000000410000e4",
    "relay": 1,
    "relayState": "ON",
    "valve": "open",
    "stateConfirmed": true,
    "fPort": 111,
    "payloadHex": "01",
    "payloadBase64": "AQ==",
    "alarm": 0,
    "battery": 100
  }
}
```

#### 3b. Cek Status Relay (tanpa mengubah state)

```bash
curl -X POST http://localhost:3001/api/relay/status \
  -H "Content-Type: application/json" \
  -d '{
    "devEUI": "08000000410000e4",
    "applicationId": "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0"
  }'
```

#### 3c. Wake + Relay (Gabungan Telemetry Wake-up + Relay Command)

> Digunakan jika meter sedang sleep atau tidak merespons.
> Phase 1: kirim wake payload untuk membangunkan meter.
> Phase 2: setelah uplink wake diterima, langsung kirim relay command.

```bash
# Wake + Relay ON
curl -X POST http://localhost:3001/api/relay/wake \
  -H "Content-Type: application/json" \
  -d '{
    "devEUI": "08000000410000e4",
    "applicationId": "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0",
    "relay": 1,
    "wakeTimeout": 30000,
    "relayTimeout": 30000
  }'

# Wake + Relay OFF
curl -X POST http://localhost:3001/api/relay/wake \
  -H "Content-Type: application/json" \
  -d '{
    "devEUI": "08000000410000e4",
    "applicationId": "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0",
    "relay": 0,
    "wakeTimeout": 30000,
    "relayTimeout": 30000
  }'
```

**Parameter `relay/wake`:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `devEUI` | `string` | ✅ | DevEUI device (16 char hex) |
| `applicationId` | `string` | ✅ | UUID application ChirpStack |
| `relay` | `number` | ✅ | `1` = ON (connect), `0` = OFF (disconnect) |
| `wakeTimeout` | `number` | — | Timeout wake phase ms (default: 30000) |
| `relayTimeout` | `number` | — | Timeout relay confirm phase ms (default: 30000) |

**Flow internal `relay/wake`:**
```
POST /api/relay/wake
       │
       ▼
Phase 1 — WAKE UP
  Subscribe event/up + event/txack
  Kirim wake payload (fPort 111)
  Tunggu uplink dari meter (max wakeTimeout)
       │
       ▼  uplink masuk
Phase 2 — RELAY COMMAND
  Kirim relay ON/OFF (fPort 111) di koneksi MQTT sama
  Tunggu konfirmasi valve state (max relayTimeout)
       │
       ▼
  stateConfirmed: true + telemetry lengkap
```

---

### Skenario 4: Discovery — Temukan Application dan Device

```bash
# 1. List semua application
curl http://localhost:3001/api/chirpstack/applications

# 2. List device di application EMS
curl "http://localhost:3001/api/chirpstack/devices?applicationId=4360bdb1-6cdd-4d38-b92a-ea6020ebbea0"

# 3. Detail device spesifik
curl http://localhost:3001/api/chirpstack/devices/08000000410000e4
```

---

## Arsitektur Teknis

```
Client / Aplikasi Lain
        │
        │  HTTP REST (port 3001)
        ▼
mdw_sindcond_badiklat (Express)
  routes/users.js
  controllers/controllerChirpstack.js
  services/chirpstackClient.js
        │
        │  gRPC (port 8080, HTTP/2, insecure)
        │  Header: authorization: Bearer <API_KEY>
        ▼
ChirpStack V4 (localhost:8080)
  GatewayService
  DeviceService
  ApplicationService
        │
        ▼
PostgreSQL (database chirpstack)
MQTT Broker (localhost:1883)
```

### File Terkait

| File | Keterangan |
|---|---|
| `services/chirpstackClient.js` | gRPC client wrapper, fungsi async |
| `controllers/controllerChirpstack.js` | HTTP handler, validasi input, format response |
| `routes/users.js` | Routing semua endpoint `/api/chirpstack/*` |
| `.env` | Konfigurasi host, API key, tenant ID |

---

## Referensi

- [ChirpStack V4 API Docs (gRPC)](https://www.chirpstack.io/docs/chirpstack/api/api.html)
- [ChirpStack Node.js API Package](https://www.npmjs.com/package/@chirpstack/chirpstack-api)
- ChirpStack gRPC Swagger UI: `http://localhost:8080` (web UI)
