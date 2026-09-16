# API Reference — mdw_sindcond_badiklat

> **Versi App:** mdw_sindcond_badiklat  
> **Runtime:** Node.js / Express  
> **Port:** `3001`  
> **ChirpStack:** v4.19.1 (gRPC `localhost:8080`)  
> **MQTT Broker:** `localhost:1883`

---

## Daftar Isi

- [Informasi Umum](#informasi-umum)
- [Format Response](#format-response)
- [Middleware API — Uplink](#middleware-api--uplink)
- [Middleware API — Downlink](#middleware-api--downlink)
  - [Valve](#post-apivalve)
  - [Brightness](#post-apibrightnessvaluedeveluitype)
  - [Top-up / Prepayment](#post-apitopup)
  - [Interval Laporan](#post-apiinterval)
  - [Set Meter](#post-apisetmeter)
  - [Set UTC](#post-apiutc)
  - [Set Pulse](#post-apipulse)
  - [Telemetry](#post-apitelemetry)
  - [Relay CL711K22 — Kontrol](#post-apirelay)
  - [Relay CL711K22 — Status](#post-apirelaystatus)
- [ChirpStack REST API](#chirpstack-rest-api)
  - [Application](#application)
  - [Gateway](#gateway)
  - [Device](#device)
  - [Device Queue (Downlink)](#device-queue-downlink)
- [Skenario Lengkap](#skenario-lengkap)
- [Arsitektur](#arsitektur)
- [Referensi Payload & FPort](#referensi-payload--fport)

---

## Informasi Umum

| Item | Nilai |
|---|---|
| **Base URL Middleware** | `http://localhost:3001/api` |
| **Base URL ChirpStack REST** | `http://localhost:3001/api/chirpstack` |
| **Content-Type** | `application/json` |
| **ChirpStack Tenant ID** | `74893f3e-19ab-4384-9d11-096feae38a2c` |
| **Application ID (EMS)** | `4360bdb1-6cdd-4d38-b92a-ea6020ebbea0` |
| **DevEUI KwH Meter** | `08000000410000e4` |

---

## Format Response

### Middleware API (Downlink/Uplink)

**Sukses:**
```json
{ "message": "...", "data": { ... } }
```

**Error:**
```json
{ "message": "Pesan error" }
```

HTTP status code dikontrol dari `headers.status` di service layer:

| Kode | Keterangan |
|---|---|
| `200` | Sukses |
| `400` | Request tidak valid |
| `404` | Timeout / tidak ditemukan |
| `500` | Error internal / MQTT gagal |

### ChirpStack REST API

**Sukses (200):**
```json
{ "success": true, "data": { ... } }
```

**Error:**
```json
{ "success": false, "error": "Pesan error" }
```

---

## Middleware API — Uplink

### POST `/api/nodes`

Ambil data uplink terbaru dari semua node yang terdaftar.

**Request Body:**
```json
{ "type": "...", "devEUI": "..." }
```

**Contoh Request:**
```bash
curl -X POST http://localhost:3001/api/nodes \
  -H "Content-Type: application/json" \
  -d '{"type": "EMS", "devEUI": "08000000410000e4"}'
```

---

### POST `/api/check`

Ambil uplink non-cron (manual trigger).

**Request Body:**
```json
{ "type": "...", "devEUI": "..." }
```

---

### POST `/api/gateway`

Ambil info gateway dari uplink.

**Request Body:**
```json
{ "type": "...", "devEUI": "..." }
```

---

## Middleware API — Downlink

Semua endpoint downlink bekerja via MQTT: middleware publish ke topic ChirpStack, lalu tunggu konfirmasi/uplink dari device.

> **Timeout default:** 15 detik (endpoint lama) / 30 detik (telemetry, relay)

---

### POST `/api/valve`

Kontrol valve (buka/tutup) via MQTT ChirpStack V3 topic.  
Pakai fPort 111, payload `AQ==` (ON) atau `AA==` (OFF).

**Request Body:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `devEUI` | `string` | ✅ | DevEUI perangkat |
| `type` | `string` | ✅ | Application ID / tipe (dipakai di MQTT topic V3) |
| `valve` | `number` | ✅ | `1` = buka, `0` = tutup |

**Contoh Request:**
```bash
curl -X POST http://localhost:3001/api/valve \
  -H "Content-Type: application/json" \
  -d '{"devEUI": "08000000410000e4", "type": "EMS", "valve": 1}'
```

**MQTT Topic:** `organization/DAS/application/{type}/node/{devEUI}/tx`  
**FPort:** `111` | **Payload:** `AQ==` (ON) / `AA==` (OFF)

---

### POST `/api/brightness/:value/:devEui/:type`

Set level brightness (0–100%) via MQTT.

**Path Parameter:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `value` | `number` | Level brightness 0–100 (diclamp otomatis) |
| `devEui` | `string` | DevEUI perangkat |
| `type` | `string` | Tipe / application ID |

**Contoh Request:**
```bash
curl -X POST http://localhost:3001/api/brightness/75/08000000410000e4/EMS
```

---

### POST `/api/topup`

Kirim kredit top-up / prepayment ke meter.  
Payload: nilai topup integer → hex UINT32 Big Endian → Base64.  
**FPort:** `112`

**Request Body:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `devEUI` | `string` | ✅ | DevEUI perangkat |
| `applicationId` | `string` | ✅ | Application ID (UUID) |
| `topup` | `number` | ✅ | Nilai kredit (integer positif) |
| `fPort` | `number` | — | FPort, default `112` |

**Contoh Request:**
```bash
curl -X POST http://localhost:3001/api/topup \
  -H "Content-Type: application/json" \
  -d '{
    "devEUI": "08000000410000e4",
    "applicationId": "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0",
    "topup": 50000
  }'
```

**MQTT Topic Down:** `application/{applicationId}/device/{devEUI}/command/down`  
**MQTT Topic Up:** `application/{applicationId}/device/{devEUI}/event/up`  
**Payload encoding:** `topup` → `hex UINT32 BE` → Base64

---

### POST `/api/interval`

Atur interval laporan perangkat (dalam detik).  
Payload: UINT32 Big Endian.  
**FPort:** `113`

**Request Body:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `devEUI` | `string` | ✅ | DevEUI perangkat |
| `type` | `string` | ✅ | Application ID / tipe |
| `interval` | `number` | ✅ | Interval dalam detik (integer positif) |

**Contoh Request:**
```bash
curl -X POST http://localhost:3001/api/interval \
  -H "Content-Type: application/json" \
  -d '{"devEUI": "08000000410000e4", "type": "EMS", "interval": 300}'
```

**Nilai umum interval:**

| Detik | Hex | Base64 |
|---|---|---|
| 300 (5 menit) | `0000012C` | `AAAS` |
| 600 (10 menit) | `00000258` | `AAAJY` |
| 1800 (30 menit) | `00000708` | `AAAHeA==` |
| 3600 (1 jam) | `00000E10` | `AAAOEA==` |

---

### POST `/api/setmeter`

Set nilai pembacaan meter (kalibrasi awal / reset meter).

**Request Body:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `devEUI` | `string` | ✅ | DevEUI perangkat |
| `type` | `string` | ✅ | Application ID / tipe |
| `set_meter` | `string/number` | ✅ | Nilai meter dalam angka (bisa desimal) |

**Contoh Request:**
```bash
curl -X POST http://localhost:3001/api/setmeter \
  -H "Content-Type: application/json" \
  -d '{"devEUI": "08000000410000e4", "type": "EMS", "set_meter": "1250.5"}'
```

---

### POST `/api/utc`

Sinkronisasi waktu RTC perangkat ke UTC sekarang.  
Payload: Unix timestamp saat ini → hex UINT32 → Base64.

**Request Body:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `devEUI` | `string` | ✅ | DevEUI perangkat |
| `type` | `string` | ✅ | Application ID / tipe |

**Contoh Request:**
```bash
curl -X POST http://localhost:3001/api/utc \
  -H "Content-Type: application/json" \
  -d '{"devEUI": "08000000410000e4", "type": "EMS"}'
```

> Timestamp UTC dihitung otomatis saat request diterima oleh middleware.

---

### POST `/api/pulse`

Konfigurasi pulse meter (rasio pulsa dan jumlah hitungan).

**Request Body:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `devEUI` | `string` | ✅ | DevEUI perangkat |
| `type` | `string` | ✅ | Application ID / tipe |
| `pulse` | `number` | ✅ | Nilai rasio pulsa (misal `0.001` atau `1`) |
| `pulse_count` | `number` | ✅ | Jumlah hitungan pulsa |

**Contoh Request:**
```bash
curl -X POST http://localhost:3001/api/pulse \
  -H "Content-Type: application/json" \
  -d '{"devEUI": "08000000410000e4", "type": "EMS", "pulse": 0.001, "pulse_count": 1}'
```

---

### POST `/api/telemetry`

Tarik data telemetry terkini dari perangkat secara manual.

**Flow:**
1. Subscribe topic uplink ChirpStack V4
2. Kirim downlink ping (fPort 102, confirmed) untuk memancing meter kirim uplink
3. Tunggu uplink → parse → return data telemetry lengkap
4. Timeout jika tidak ada uplink dalam waktu yang ditentukan

**Request Body:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `devEUI` | `string` | ✅ | DevEUI perangkat |
| `applicationId` | `string` | ✅ | Application ID (UUID) |
| `timeout` | `number` | — | Timeout dalam ms (default: `30000`) |

**Contoh Request:**
```bash
curl -X POST http://localhost:3001/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "devEUI": "08000000410000e4",
    "applicationId": "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0",
    "timeout": 30000
  }'
```

**Contoh Response:**
```json
{
  "message": "Telemetry berhasil ditarik",
  "devEUI": "08000000410000e4",
  "applicationId": "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0",
  "deviceName": "KwH Meter",
  "fPort": 2,
  "fCnt": 1234,
  "time": "2026-09-10T07:40:21.361Z",
  "dr": 3,
  "snr": 9.5,
  "gatewayId": "7276ff0045060ffb",
  "telemetry": {
    "relay": 1,
    "relay_state": "ON",
    "relay_status": null,
    "valve": "open",
    "alarm": 0,
    "battery": null,
    "voltage": 220.5,
    "current": 1500,
    "power_factor": 0.98,
    "meter_reading": 1250.5,
    "report_time": "2026-09-10T07:40:20Z"
  }
}
```

**MQTT Topic Down:** `application/{applicationId}/device/{devEUI}/command/down`  
**MQTT Topic Up:** `application/{applicationId}/device/{devEUI}/event/up`  
**FPort ping:** `102` | **Payload ping:** `e1e600ff` (hex)

---

### POST `/api/relay`

Kontrol relay KwH Meter CL711K22 (ON/OFF).

**Flow:**
1. Subscribe topic uplink ChirpStack V4
2. Publish downlink ke MQTT (fPort 111, payload ON/OFF)
3. Tunggu uplink berikutnya → verifikasi state `valve` di decoded object
4. Return status relay terkonfirmasi

**Request Body:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `devEUI` | `string` | ✅ | DevEUI perangkat (16 char hex) |
| `applicationId` | `string` | ✅ | Application ID (UUID) |
| `relay` | `number` | ✅ | `1` = ON (sambung), `0` = OFF (putus) |
| `fPort` | `number` | — | FPort, default `111` |
| `confirmed` | `boolean` | — | LoRaWAN confirmed downlink, default `false` |
| `timeout` | `number` | — | Timeout ms, default `30000` |

**Contoh Request — Relay ON:**
```bash
curl -X POST http://localhost:3001/api/relay \
  -H "Content-Type: application/json" \
  -d '{
    "devEUI": "08000000410000e4",
    "applicationId": "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0",
    "relay": 1
  }'
```

**Contoh Request — Relay OFF:**
```bash
curl -X POST http://localhost:3001/api/relay \
  -H "Content-Type: application/json" \
  -d '{
    "devEUI": "08000000410000e4",
    "applicationId": "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0",
    "relay": 0
  }'
```

**Contoh Response (Sukses):**
```json
{
  "success": true,
  "message": "Relay berhasil dikontrol",
  "data": {
    "devEUI": "08000000410000e4",
    "relay": 1,
    "label": "ON (connect)",
    "expectedValve": "open",
    "confirmedValve": "open",
    "relayConfirmed": true
  }
}
```

**MQTT Topic Down:** `application/{applicationId}/device/{devEUI}/command/down`  
**FPort:** `111`

| `relay` | Payload Hex | Payload Base64 | Keterangan |
|---|---|---|---|
| `1` | `01` | `AQ==` | Relay ON — sambung listrik |
| `0` | `00` | `AA==` | Relay OFF — putus listrik |

> ⚠️ State relay dikonfirmasi dari uplink berikutnya, bukan dari LoRaWAN ACK.

---

### POST `/api/relay/status`

Cek status relay terkini dari uplink CL711K22.  
Endpoint ini memancing uplink dengan mengirim downlink ping, lalu membaca state `valve` dari decoded object.

**Request Body:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `devEUI` | `string` | ✅ | DevEUI perangkat |
| `applicationId` | `string` | ✅ | Application ID (UUID) |
| `fPort` | `number` | — | FPort ping, default `102` |
| `timeout` | `number` | — | Timeout ms, default `30000` |

**Contoh Request:**
```bash
curl -X POST http://localhost:3001/api/relay/status \
  -H "Content-Type: application/json" \
  -d '{
    "devEUI": "08000000410000e4",
    "applicationId": "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0"
  }'
```

**Contoh Response:**
```json
{
  "success": true,
  "message": "Status relay berhasil dibaca",
  "data": {
    "devEUI": "08000000410000e4",
    "valve": "open",
    "relayState": "ON",
    "battery": null,
    "current": { "raw": 1500, "ampere": 1.5 },
    "uplink": { "fPort": 2, "fCnt": 1234, "time": "2026-09-10T07:40:21Z", "dr": 3 }
  }
}
```

---

### POST `/api/subscribe`

Subscribe node ke sistem monitoring.

**Request Body:**
```json
{ "devEUI": "...", "applicationId": "..." }
```

---

### POST `/api/check/node`

Cek status node tertentu apakah aktif.

**Request Body:**
```json
{ "devEUI": "...", "applicationId": "..." }
```

---

## ChirpStack REST API

> Endpoint ini adalah wrapper REST di atas gRPC ChirpStack V4.  
> Auth ditangani otomatis via `CHIRPSTACK_API_KEY` di `.env`.

**Base URL:** `http://localhost:3001/api/chirpstack`

---

### Application

#### GET `/chirpstack/applications`

List semua application dalam tenant.

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

#### GET `/chirpstack/applications/:applicationId`

Detail satu application.

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

### Gateway

#### GET `/chirpstack/gateways`

List semua gateway dalam tenant.

**Query Parameter:**

| Parameter | Tipe | Default | Keterangan |
|---|---|---|---|
| `limit` | `number` | `100` | Jumlah maksimum |
| `offset` | `number` | `0` | Offset paginasi |

**Contoh Request:**
```bash
curl http://localhost:3001/api/chirpstack/gateways
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

**Nilai `state`:** `0` = NEVER_SEEN, `1` = ONLINE, `2` = OFFLINE

---

#### GET `/chirpstack/gateways/:gatewayId`

Detail gateway beserta lokasi.

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

#### POST `/chirpstack/gateways`

Tambah gateway baru.

**Request Body:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `gatewayId` | `string` (16 char hex) | ✅ | EUI gateway — sesuai fisik perangkat |
| `name` | `string` | ✅ | Nama gateway |
| `description` | `string` | — | Deskripsi |
| `latitude` | `number` | — | Koordinat latitude |
| `longitude` | `number` | — | Koordinat longitude |
| `altitude` | `number` | — | Ketinggian (meter), default `0` |
| `statsInterval` | `number` | — | Interval stats (detik), default `30` |

**Contoh Request:**
```bash
curl -X POST http://localhost:3001/api/chirpstack/gateways \
  -H "Content-Type: application/json" \
  -d '{
    "gatewayId": "7276ff0045070001",
    "name": "Gateway-Lokasi-Baru",
    "description": "Gateway distribusi barat",
    "latitude": -6.9175,
    "longitude": 107.6191,
    "altitude": 800,
    "statsInterval": 30
  }'
```

**Contoh Response:**
```json
{
  "success": true,
  "data": {
    "gatewayId": "7276ff0045070001",
    "message": "Gateway created"
  }
}
```

---

#### PUT `/chirpstack/gateways/:gatewayId`

Update gateway.

**Request Body:** sama dengan POST (tanpa `gatewayId`)

**Contoh Request:**
```bash
curl -X PUT http://localhost:3001/api/chirpstack/gateways/7276ff0045070001 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gateway-Lokasi-Baru-v2",
    "description": "Update deskripsi",
    "latitude": -6.9180,
    "longitude": 107.6195,
    "altitude": 810,
    "statsInterval": 60
  }'
```

**Contoh Response:**
```json
{
  "success": true,
  "data": {
    "gatewayId": "7276ff0045070001",
    "message": "Gateway updated"
  }
}
```

---

#### DELETE `/chirpstack/gateways/:gatewayId`

Hapus gateway.

**Contoh Request:**
```bash
curl -X DELETE http://localhost:3001/api/chirpstack/gateways/7276ff0045070001
```

**Contoh Response:**
```json
{
  "success": true,
  "data": {
    "gatewayId": "7276ff0045070001",
    "message": "Gateway deleted"
  }
}
```

> ⚠️ Penghapusan bersifat permanen dan tidak dapat dibatalkan.

---

### Device

#### GET `/chirpstack/devices`

List device dalam satu application.

**Query Parameter:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `applicationId` | `string` (UUID) | ✅ | ID application |
| `limit` | `number` | — | Maks hasil (default: `100`) |

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

---

#### GET `/chirpstack/devices/:devEui`

Detail device.

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

### Device Queue (Downlink)

#### GET `/chirpstack/devices/:devEui/queue`

Lihat downlink yang antri di queue.

**Contoh Request:**
```bash
curl http://localhost:3001/api/chirpstack/devices/08000000410000e4/queue
```

**Contoh Response (ada item):**
```json
{
  "success": true,
  "data": {
    "totalCount": 1,
    "result": [
      {
        "id": "queue-item-id",
        "fPort": 111,
        "data": "AQ==",
        "confirmed": false
      }
    ]
  }
}
```

---

#### POST `/chirpstack/devices/:devEui/queue`

Enqueue downlink langsung ke ChirpStack (tanpa menunggu konfirmasi dari device).

**Request Body:**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `fPort` | `number` | ✅ | FPort LoRaWAN (1–223) |
| `data` | `string` (Base64) | ✅ | Payload dalam Base64 |
| `confirmed` | `boolean` | — | Minta ACK dari device (default: `false`) |

**Contoh Request — Relay ON langsung via ChirpStack queue:**
```bash
curl -X POST http://localhost:3001/api/chirpstack/devices/08000000410000e4/queue \
  -H "Content-Type: application/json" \
  -d '{"fPort": 111, "data": "AQ==", "confirmed": false}'
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

> **Perbedaan dengan `POST /api/relay`:**  
> `/api/relay` — kirim downlink + tunggu konfirmasi state dari uplink berikutnya  
> `/chirpstack/devices/:devEui/queue` — kirim downlink saja, tidak tunggu konfirmasi

**Konversi payload ke Base64:**
```bash
echo "01" | xxd -r -p | base64   # → AQ==  (relay ON, fPort 111)
echo "00" | xxd -r -p | base64   # → AA==  (relay OFF, fPort 111)
```

---

#### DELETE `/chirpstack/devices/:devEui/queue`

Hapus (flush) semua downlink yang belum terkirim.

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

## Skenario Lengkap

### Skenario 1: Kontrol dan Verifikasi Relay

```bash
# 1. Cek status relay sekarang
curl -s -X POST http://localhost:3001/api/relay/status \
  -H "Content-Type: application/json" \
  -d '{"devEUI":"08000000410000e4","applicationId":"4360bdb1-6cdd-4d38-b92a-ea6020ebbea0"}'

# 2. Relay OFF (putus listrik)
curl -s -X POST http://localhost:3001/api/relay \
  -H "Content-Type: application/json" \
  -d '{"devEUI":"08000000410000e4","applicationId":"4360bdb1-6cdd-4d38-b92a-ea6020ebbea0","relay":0}'

# 3. Verifikasi status setelah OFF
curl -s -X POST http://localhost:3001/api/relay/status \
  -H "Content-Type: application/json" \
  -d '{"devEUI":"08000000410000e4","applicationId":"4360bdb1-6cdd-4d38-b92a-ea6020ebbea0"}'
```

---

### Skenario 2: Tarik Telemetry + Cek Device

```bash
# 1. Cek device terdaftar di ChirpStack
curl http://localhost:3001/api/chirpstack/devices/08000000410000e4

# 2. Tarik telemetry lengkap
curl -X POST http://localhost:3001/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{"devEUI":"08000000410000e4","applicationId":"4360bdb1-6cdd-4d38-b92a-ea6020ebbea0","timeout":30000}'
```

---

### Skenario 3: Tambah Gateway + Verifikasi

```bash
# 1. Cek gateway yang sudah ada
curl http://localhost:3001/api/chirpstack/gateways

# 2. Tambah gateway baru
curl -X POST http://localhost:3001/api/chirpstack/gateways \
  -H "Content-Type: application/json" \
  -d '{"gatewayId":"7276ff0045070001","name":"Gateway-Baru","latitude":-6.9175,"longitude":107.6191}'

# 3. Verifikasi
curl http://localhost:3001/api/chirpstack/gateways/7276ff0045070001
```

---

### Skenario 4: Konfigurasi Awal Meter Baru

```bash
# 1. Set UTC (sinkron waktu)
curl -X POST http://localhost:3001/api/utc \
  -H "Content-Type: application/json" \
  -d '{"devEUI":"08000000410000e4","type":"EMS"}'

# 2. Set interval laporan 10 menit
curl -X POST http://localhost:3001/api/interval \
  -H "Content-Type: application/json" \
  -d '{"devEUI":"08000000410000e4","type":"EMS","interval":600}'

# 3. Set nilai awal meter
curl -X POST http://localhost:3001/api/setmeter \
  -H "Content-Type: application/json" \
  -d '{"devEUI":"08000000410000e4","type":"EMS","set_meter":"0"}'

# 4. Verifikasi dengan tarik telemetry
curl -X POST http://localhost:3001/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{"devEUI":"08000000410000e4","applicationId":"4360bdb1-6cdd-4d38-b92a-ea6020ebbea0"}'
```

---

## Arsitektur

```
Client / Aplikasi Eksternal
         │
         │  HTTP REST (port 3001)
         ▼
┌─────────────────────────────────────────────┐
│         mdw_sindcond_badiklat (Express)      │
│                                             │
│  routes/users.js                            │
│    ├── /api/* → controllerDownlinks.js      │
│    │            controllerUplinks.js        │
│    └── /api/chirpstack/* → controllerChirpstack.js │
│                                             │
│  services/                                  │
│    ├── modelRelayCL711K22.js  ─── MQTT ──► ChirpStack MQTT │
│    ├── modelTelemetry.js      ─── MQTT ──► ChirpStack MQTT │
│    ├── modelValve.js          ─── MQTT ──► ChirpStack MQTT │
│    ├── modelInterval.js       ─── MQTT ──► ChirpStack MQTT │
│    ├── modelPrepayment.js     ─── MQTT ──► ChirpStack MQTT │
│    ├── modelAdjust.js         ─── MQTT ──► ChirpStack MQTT │
│    └── chirpstackClient.js    ─── gRPC ──► ChirpStack API  │
└─────────────────────────────────────────────┘
         │                    │
         │ MQTT (1883)        │ gRPC (8080)
         ▼                    ▼
┌─────────────────────────────────────────────┐
│              ChirpStack V4.19.1             │
│                                             │
│  MQTT Topics:                               │
│  • application/{appId}/device/{devEui}/command/down  (downlink) │
│  • application/{appId}/device/{devEui}/event/up      (uplink)   │
│  • application/{appId}/device/{devEui}/event/ack     (ACK)      │
│                                             │
│  gRPC Services:                             │
│  • GatewayService                           │
│  • DeviceService                            │
│  • ApplicationService                       │
└─────────────────────────────────────────────┘
         │
         ▼
LoRaWAN Network → Kerlink Gateway (7276ff0045060ffb) → Device CL711K22
```

---

## Referensi Payload & FPort

### FPort Map — CL711K22 KwH Meter

| FPort | Arah | Fungsi | Payload |
|---|---|---|---|
| `2` | ↑ Uplink | Laporan telemetry periodik | Decoded by ChirpStack codec |
| `111` | ↓ Downlink | Kontrol relay | `01` = ON, `00` = OFF |
| `102` | ↓ Downlink | Query status relay (ping) | `e1e600ff` |
| `112` | ↓ Downlink | Top-up / prepayment | UINT32 BE hex |
| `113` | ↓ Downlink | Set interval laporan | UINT32 BE hex (detik) |

### Decoded Object Uplink (ChirpStack Codec)

Field yang tersedia setelah decode oleh ChirpStack:

| Field | Tipe | Keterangan |
|---|---|---|
| `relay` | `number` | `0` / `1` — status relay |
| `relay_state` | `string` | `"ON"` / `"OFF"` |
| `valve` | `string` | `"open"` / `"close"` |
| `alarm` | `number` | Status alarm |
| `voltage` | `number` | Tegangan (V) |
| `current` | `number` | Arus dalam mA (bagi 1000 = Ampere) |
| `current_a` | `number` | Arus dalam Ampere |
| `power_factor` | `number` | Power factor (0–1) |
| `meter_reading` | `number` | Pembacaan meter (kWh) |
| `battery` | `number` | Level baterai (jika ada) |
| `report_time` | `string` | Timestamp laporan dari perangkat |

### Konversi Payload Base64

```bash
# Hex ke Base64
echo "01" | xxd -r -p | base64          # → AQ==   (relay ON)
echo "00" | xxd -r -p | base64          # → AA==   (relay OFF)
echo "e1e600ff" | xxd -r -p | base64   # → 4eYA/w== (query status)
printf '%08x' 300 | xxd -r -p | base64 # → AAAS    (interval 300s)
printf '%08x' 50000 | xxd -r -p | base64 # → AADC0A== (topup 50000)

# Base64 ke Hex
echo "AQ==" | base64 -d | xxd -p        # → 01
echo "AA==" | base64 -d | xxd -p        # → 00
```

```javascript
// Node.js
Buffer.from("01", "hex").toString("base64")     // → "AQ=="
Buffer.from("AQ==", "base64").toString("hex")   // → "01"
Buffer.from("AA==", "base64").toString("hex")   // → "00"
```

---

## Konfigurasi Env

File: `mdw_sindcond_badiklat/.env`

```env
PORT=3001

# MQTT (ChirpStack broker)
MQTT_PORT=1883
MQTT_HOST=localhost
MQTT_PROTOCOL=mqtt
MQTT_USERNAME=das
MQTT_PASSWORD=<password>

# ChirpStack V4 gRPC API
CHIRPSTACK_HOST=localhost:8080
CHIRPSTACK_API_KEY=<api_key>
CHIRPSTACK_TENANT_ID=74893f3e-19ab-4384-9d11-096feae38a2c

# Database
USERNAME_PROD=root
PASSWORD_PROD=root
DATABASE_PROD=db_sm_prod
HOST_PROD=127.0.0.1
DIALECT_PROD=mysql
DBPORT_PROD=3306
```
