# Panduan Penggunaan REST API EMS

Dokumen ini menjelaskan penggunaan REST API EMS untuk mengelola resource ChirpStack dan mengendalikan perangkat kWh Meter.

## 1. Informasi Dasar

| Item | Nilai |
|---|---|
| Base URL | `http://192.168.100.204:3001` |
| Format request body | JSON |
| Header body JSON | `Content-Type: application/json` |
| Application ID contoh | `4360bdb1-6cdd-4d38-b92a-ea6020ebbea0` |
| Device profile ID contoh | `eca3da95-323f-48b3-a92f-5a3ab618a56a` |
| DevEUI perangkat aktif | `08000000410000e4` |
| Gateway ID aktif | `7276ff0045060ffb` |

> API memakai alamat jaringan lokal. Komputer pemanggil harus dapat mengakses jaringan `192.168.100.0/24` dan port `3001`.

## 2. Konvensi Respons

Respons sukses umumnya menggunakan bentuk berikut:

```json
{
  "success": true,
  "data": {}
}
```

Beberapa endpoint middleware mengembalikan `message` dan data perangkat langsung tanpa wrapper `success`.

Respons resource yang tidak ditemukan:

```json
{
  "success": false,
  "error": "Resource not found"
}
```

Status HTTP yang umum:

| Status | Arti |
|---:|---|
| `200 OK` | Request berhasil diproses |
| `400 Bad Request` | JSON atau parameter request tidak valid |
| `404 Not Found` | Endpoint atau resource tidak ditemukan |
| `408 Request Timeout` | Perangkat tidak memberi konfirmasi dalam batas waktu |
| `500 Internal Server Error` | Gangguan middleware atau layanan ChirpStack |

## 3. Catatan Penggunaan cURL

Contoh dalam dokumen memakai sintaks Bash/Linux. Karakter `\` meneruskan perintah ke baris berikutnya.

Pada Windows PowerShell, gunakan `curl.exe` agar perintah tidak diproses sebagai alias PowerShell. Untuk JSON multiline, `Invoke-RestMethod` lebih aman dari masalah quoting.

Contoh PowerShell:

```powershell
$body = @{
  devEUI       = "08000000410000e4"
  applicationId = "90b6e803-efee-4ac5-ae90-6ae7f6eee950
  timeout       = 120000
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://192.168.100.204:3001/api/telemetry" `
  -ContentType "application/json" `
  -Body $body
```

---

# Bagian I — API ChirpStack

## 4. Gateway

### 4.1 List Gateway

Mengambil daftar gateway dengan pagination.

**Endpoint**

```http
GET /api/chirpstack/gateways
```

**Query parameter**

| Parameter | Tipe | Wajib | Contoh | Keterangan |
|---|---|---|---|---|
| `limit` | integer | Tidak | `10` | Jumlah maksimum data |
| `offset` | integer | Tidak | `0` | Posisi awal data |

**Contoh request**

```bash
curl "http://192.168.100.204:3001/api/chirpstack/gateways?limit=10&offset=0"
```

**Contoh respons sukses**

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
        "lastSeenAt": "2026-09-11T04:04:40.276Z",
        "state": 1
      }
    ]
  }
}
```

### 4.2 Detail Gateway

Mengambil detail satu gateway berdasarkan `gatewayId`.

**Endpoint**

```http
GET /api/chirpstack/gateways/{gatewayId}
```

**Path parameter**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `gatewayId` | string | ID gateway 16 karakter heksadesimal |

**Contoh request**

```bash
curl http://192.168.100.204:3001/api/chirpstack/gateways/7276ff0045060ffb
```

**Contoh respons sukses**

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
      "latitude": -6.271618064314864,
      "longitude": 106.83105468750001,
      "altitude": 0
    },
    "lastSeenAt": "2026-09-11T04:04:40.276Z"
  }
}
```

### 4.3 Create Gateway

Mendaftarkan gateway baru ke ChirpStack.

**Endpoint**

```http
POST /api/chirpstack/gateways
```

**Request body**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `gatewayId` | string | Ya | ID unik gateway, biasanya 16 karakter heksadesimal |
| `name` | string | Ya | Nama gateway |
| `description` | string | Tidak | Deskripsi atau lokasi gateway |
| `latitude` | number | Tidak | Koordinat lintang |
| `longitude` | number | Tidak | Koordinat bujur |
| `altitude` | number | Tidak | Ketinggian dalam meter |
| `statsInterval` | integer | Tidak | Interval statistik dalam detik |

**Contoh request**

```bash
curl -X POST http://192.168.100.204:3001/api/chirpstack/gateways \
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

**Contoh respons sukses**

```json
{
  "success": true,
  "data": {
    "gatewayId": "aabbccddeeff0011",
    "message": "Gateway created"
  }
}
```

### 4.4 Update Gateway

Memperbarui gateway berdasarkan `gatewayId`.

**Endpoint**

```http
PUT /api/chirpstack/gateways/{gatewayId}
```

`gatewayId` tidak perlu dikirim ulang dalam body.

**Contoh request**

```bash
curl -X PUT http://192.168.100.204:3001/api/chirpstack/gateways/aabbccddeeff0011 \
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

**Contoh respons sukses**

```json
{
  "success": true,
  "data": {
    "gatewayId": "aabbccddeeff0011",
    "message": "Gateway updated"
  }
}
```

### 4.5 Delete Gateway

Menghapus gateway berdasarkan `gatewayId`.

> Operasi ini menghapus resource. Pastikan `gatewayId` benar sebelum menjalankan request.

**Endpoint**

```http
DELETE /api/chirpstack/gateways/{gatewayId}
```

**Contoh request**

```bash
curl -X DELETE http://192.168.100.204:3001/api/chirpstack/gateways/aabbccddeeff0011
```

**Contoh respons sukses**

```json
{
  "success": true,
  "data": {
    "gatewayId": "aabbccddeeff0011",
    "message": "Gateway deleted"
  }
}
```

## 5. Application

### 5.1 List Application

Mengambil seluruh application yang tersedia.

**Endpoint**

```http
GET /api/chirpstack/applications
```

**Contoh request**

```bash
curl http://192.168.100.204:3001/api/chirpstack/applications
```

**Contoh respons sukses**

```json
{
  "success": true,
  "data": {
    "totalCount": 1,
    "result": [
      {
        "id": "90b6e803-efee-4ac5-ae90-6ae7f6eee950,
        "name": "EMS",
        "description": ""
      }
    ]
  }
}
```

## 6. Device

### 6.1 List Device dalam Application

Mengambil daftar device milik satu application.

**Endpoint**

```http
GET /api/chirpstack/devices
```

**Query parameter**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `applicationId` | UUID string | Ya | ID application pemilik device |

**Contoh request**

```bash
curl "http://192.168.100.204:3001/api/chirpstack/devices?applicationId=90b6e803-efee-4ac5-ae90-6ae7f6eee950
```

**Contoh respons sukses**

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
        "lastSeenAt": "2026-09-11T04:04:03.115Z"
      }
    ]
  }
}
```

### 6.2 Detail Device

Mengambil detail device berdasarkan `devEui`.

**Endpoint**

```http
GET /api/chirpstack/devices/{devEui}
```

**Path parameter**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `devEui` | string | DevEUI unik perangkat, 16 karakter heksadesimal |

**Contoh request**

```bash
curl http://192.168.100.204:3001/api/chirpstack/devices/08000000410000e4
```

### 6.3 Create Device

Mendaftarkan device baru ke application ChirpStack.

**Endpoint**

```http
POST /api/chirpstack/devices
```

**Request body**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `devEui` | string | Ya | DevEUI unik, 16 karakter heksadesimal |
| `name` | string | Ya | Nama device |
| `applicationId` | UUID string | Ya | Application tujuan |
| `deviceProfileId` | UUID string | Ya | Device profile yang sesuai perangkat |
| `description` | string | Tidak | Deskripsi atau lokasi device |
| `isDisabled` | boolean | Tidak | `true` menonaktifkan device; default disarankan `false` |

**Contoh request**

```bash
curl -X POST http://192.168.100.204:3001/api/chirpstack/devices \
  -H "Content-Type: application/json" \
  -d '{
    "devEui": "08000000410000ff",
    "name": "KwH Meter Gedung B",
    "applicationId": "90b6e803-efee-4ac5-ae90-6ae7f6eee950,
    "deviceProfileId": "eca3da95-323f-48b3-a92f-5a3ab618a56a",
    "description": "Meter lantai 2 gedung B",
    "isDisabled": false
  }'
```

**Contoh respons sukses**

```json
{
  "success": true,
  "data": {
    "devEui": "08000000410000ff",
    "message": "Device created"
  }
}
```

### 6.4 Update Device

Memperbarui data device berdasarkan `devEui`.

**Endpoint**

```http
PUT /api/chirpstack/devices/{devEui}
```

**Contoh request**

```bash
curl -X PUT http://192.168.100.204:3001/api/chirpstack/devices/08000000410000ff \
  -H "Content-Type: application/json" \
  -d '{
    "name": "KwH Meter Gedung B - Lt.2",
    "description": "Update lokasi perangkat"
  }'
```

**Contoh respons sukses**

```json
{
  "success": true,
  "data": {
    "devEui": "08000000410000ff",
    "message": "Device updated"
  }
}
```

### 6.5 Delete Device

Menghapus device berdasarkan `devEui`.

> Operasi ini menghapus device dari ChirpStack. Pastikan `devEui` benar sebelum menjalankan request.

**Endpoint**

```http
DELETE /api/chirpstack/devices/{devEui}
```

**Contoh request**

```bash
curl -X DELETE http://192.168.100.204:3001/api/chirpstack/devices/08000000410000ff
```

**Contoh respons sukses**

```json
{
  "success": true,
  "data": {
    "devEui": "08000000410000ff",
    "message": "Device deleted"
  }
}
```

---

# Bagian II — API Middleware kWh Meter

## 7. Telemetry/PING Device

Meminta perangkat mengirim uplink lalu mengembalikan telemetry terbaru. Endpoint dapat menunggu sampai batas `timeout`.

**Endpoint**

```http
POST /api/telemetry
```

**Request body**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `devEUI` | string | Ya | DevEUI perangkat target |
| `applicationId` | UUID string | Ya | Application perangkat |
| `timeout` | integer | Tidak | Waktu tunggu maksimum dalam milidetik |

> Penulisan field middleware memakai `devEUI`, sedangkan API CRUD ChirpStack memakai `devEui`. Gunakan kapitalisasi tepat.

**Contoh request**

```bash
curl -s -X POST http://192.168.100.204:3001/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "devEUI": "08000000410000e4",
    "applicationId": "90b6e803-efee-4ac5-ae90-6ae7f6eee950,
    "timeout": 120000
  }'
```

**Field respons penting**

| Field | Keterangan |
|---|---|
| `message` | Hasil operasi telemetry |
| `deviceName` | Nama device |
| `fPort` | LoRaWAN application port uplink |
| `fCnt` | Frame counter uplink |
| `time` | Waktu uplink |
| `dr` | Data rate LoRaWAN |
| `snr` | Signal-to-noise ratio |
| `gatewayId` | Gateway penerima uplink |
| `telemetry.relay` | Nilai relay: `0` atau `1` |
| `telemetry.relay_state` | Status relay: `OFF` atau `ON` |
| `telemetry.battery` | Level baterai |
| `telemetry.voltage` | Tegangan mentah; contoh `218700` setara `218.7 V` |
| `telemetry.current` | Arus mentah |
| `telemetry.meter_reading` | Pembacaan energi mentah dalam Wh berdasarkan decoder saat ini |
| `raw` | Payload dan metadata uplink lengkap |

## 8. Kontrol Relay

Mengubah relay perangkat. Middleware menunggu uplink, mengirim downlink, lalu menunggu konfirmasi state perangkat.

**Endpoint**

```http
POST /api/relay/wake
```

**Request body**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `devEUI` | string | Ya | DevEUI perangkat target |
| `applicationId` | UUID string | Ya | Application perangkat |
| `relay` | integer | Ya | `1` untuk ON/connect, `0` untuk OFF/disconnect |
| `wakeTimeout` | integer | Tidak | Batas tunggu wake uplink dalam milidetik |
| `relayTimeout` | integer | Tidak | Batas tunggu konfirmasi relay dalam milidetik |

### 8.1 Relay ON

> Relay ON dapat mengalirkan listrik ke beban. Pastikan perangkat dan instalasi aman sebelum menjalankan request.

```bash
curl -X POST http://192.168.100.204:3001/api/relay/wake \
  -H "Content-Type: application/json" \
  -d '{
    "devEUI": "08000000410000e4",
    "applicationId": "90b6e803-efee-4ac5-ae90-6ae7f6eee950,
    "relay": 1,
    "wakeTimeout": 60000,
    "relayTimeout": 30000
  }'
```

Respons sukses harus memuat indikator berikut:

```json
{
  "success": true,
  "message": "Relay ON (connect) confirmed by device state.",
  "data": {
    "relay": 1,
    "relayState": "ON",
    "valve": "open",
    "stateConfirmed": true,
    "commandPublished": true,
    "txAckReceived": true
  }
}
```

### 8.2 Relay OFF

```bash
curl -X POST http://192.168.100.204:3001/api/relay/wake \
  -H "Content-Type: application/json" \
  -d '{
    "devEUI": "08000000410000e4",
    "applicationId": "90b6e803-efee-4ac5-ae90-6ae7f6eee950,
    "relay": 0,
    "wakeTimeout": 60000,
    "relayTimeout": 30000
  }'
```

Konfirmasi sukses ditandai oleh:

```json
{
  "success": true,
  "message": "Relay OFF (disconnect) confirmed by device state.",
  "data": {
    "relay": 0,
    "relayState": "OFF",
    "valve": "close",
    "stateConfirmed": true,
    "commandPublished": true,
    "txAckReceived": true
  }
}
```

Jika respons `408`, state belum terkonfirmasi dalam batas waktu. Jangan menganggap relay gagal atau berhasil hanya dari timeout. Periksa telemetry terbaru sebelum mengulang command.

## 9. Topup Saldo

Mengirim perintah topup sebesar nilai `topup` ke perangkat.

**Endpoint**

```http
POST /api/topup
```

**Request body**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `devEUI` | string | Ya | DevEUI perangkat target |
| `applicationId` | UUID string | Ya | Application perangkat |
| `topup` | integer | Ya | Nilai topup yang dikirim |
| `fPort` | integer | Ya | LoRaWAN port downlink; contoh perangkat memakai `112` |

> Topup mengubah saldo perangkat nyata. Pastikan nilai, DevEUI, dan application benar sebelum mengirim request. Hindari retry otomatis karena dapat menyebabkan topup ganda.

**Contoh request**

```bash
curl -X POST http://192.168.100.204:3001/api/topup \
  -H "Content-Type: application/json" \
  -d '{
    "devEUI": "08000000410000e4",
    "applicationId": "90b6e803-efee-4ac5-ae90-6ae7f6eee950,
    "topup": 10000,
    "fPort": 112
  }'
```

Respons dapat berisi uplink perangkat dan metadata LoRaWAN. Respons `200` menunjukkan request diproses, tetapi saldo baru harus diverifikasi dari field saldo perangkat atau mekanisme pembacaan khusus jika tersedia.

## 10. Setting Interval

Mengatur interval laporan perangkat dalam detik.

**Endpoint**

```http
POST /api/interval
```

**Request body**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `devEUI` | string | Ya | DevEUI perangkat target |
| `applicationId` | UUID string | Ya | Application perangkat |
| `interval` | integer | Ya | Interval laporan dalam detik |

**Contoh request**

```bash
curl -X POST http://192.168.100.204:3001/api/interval \
  -H "Content-Type: application/json" \
  -d '{
    "devEUI": "08000000410000e4",
    "applicationId": "90b6e803-efee-4ac5-ae90-6ae7f6eee950,
    "interval": 300
  }'
```

**Contoh respons sukses**

```json
{
  "message": "Interval downlink transmitted",
  "devEUI": "08000000410000e4",
  "applicationId": "90b6e803-efee-4ac5-ae90-6ae7f6eee950,
  "intervalSeconds": 300,
  "payloadHex": "0000012c",
  "payloadBase64": "AAABLA==",
  "fPort": 113
}
```

Respons tersebut memastikan downlink ditransmisikan. Jika aplikasi membutuhkan kepastian konfigurasi sudah diterapkan, baca uplink status perangkat berikutnya dan periksa interval yang dilaporkan.

---

# Bagian III — Alur Penggunaan

## 11. Registrasi Gateway dan Device Baru

Urutan yang disarankan:

1. Buat gateway melalui `POST /api/chirpstack/gateways`.
2. Verifikasi gateway melalui `GET /api/chirpstack/gateways/{gatewayId}`.
3. Ambil application melalui `GET /api/chirpstack/applications`.
4. Pastikan `deviceProfileId` sesuai tipe perangkat.
5. Buat device melalui `POST /api/chirpstack/devices`.
6. Verifikasi device melalui `GET /api/chirpstack/devices/{devEui}`.
7. Lakukan provisioning key/activation pada ChirpStack jika dibutuhkan perangkat. Endpoint key tidak tercakup dalam dokumen ini.
8. Tunggu device mengirim uplink.
9. Panggil `POST /api/telemetry` untuk menguji komunikasi.

## 12. Operasional kWh Meter

Urutan pemeriksaan yang disarankan:

1. Pastikan device tersedia melalui endpoint detail device.
2. Jalankan telemetry/PING.
3. Periksa `lastSeenAt`, `gatewayId`, `snr`, dan battery.
4. Kirim pengaturan interval bila dibutuhkan.
5. Untuk relay, kirim ON atau OFF lalu pastikan `stateConfirmed: true`.
6. Untuk topup, catat ID perangkat, nilai topup, waktu request, dan respons guna mencegah duplikasi.

## 13. Troubleshooting

### `HTTP 400` dan JSON tidak valid

Penyebab umum:

- Quote JSON rusak di PowerShell.
- Koma atau kurung penutup hilang.
- Header `Content-Type: application/json` tidak dikirim.
- Kapitalisasi `devEUI` atau `devEui` salah.

Gunakan `Invoke-RestMethod` dengan `ConvertTo-Json` pada PowerShell.

### `HTTP 404 Resource not found`

Periksa:

- `gatewayId` atau `devEui` benar.
- Resource belum dihapus.
- Path endpoint benar.
- Application dan device berada pada tenant yang sesuai.

### `HTTP 408 Request Timeout`

Khusus operasi perangkat, timeout berarti konfirmasi belum diterima. Periksa:

- Device online dan mengirim uplink.
- Gateway terakhir aktif.
- `wakeTimeout` dan `relayTimeout` cukup.
- Jangkauan radio, RSSI, dan SNR.
- Downlink queue serta TX acknowledgement.

Jalankan telemetry sebelum mengulang perintah yang dapat mengubah state.

### `HTTP 500`

Periksa log middleware dan koneksi ke ChirpStack. Penyebab dapat mencakup token/API key ChirpStack, gRPC, konfigurasi tenant, atau error internal middleware.

## 14. Checklist Keamanan Operasional

- Jangan memakai ID contoh untuk sistem produksi tanpa verifikasi.
- Jangan menghapus gateway atau device aktif.
- Jangan menyalakan relay sebelum kondisi beban diperiksa.
- Jangan mengulang topup otomatis saat respons tidak jelas.
- Simpan credential ChirpStack di environment variable atau secret manager, bukan dokumen.
- Batasi akses API jaringan lokal memakai firewall dan autentikasi.
- Catat operasi mutasi: create, update, delete, relay, topup, dan interval.

## 15. Ringkasan Endpoint

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/api/chirpstack/gateways` | List gateway |
| `GET` | `/api/chirpstack/gateways/{gatewayId}` | Detail gateway |
| `POST` | `/api/chirpstack/gateways` | Create gateway |
| `PUT` | `/api/chirpstack/gateways/{gatewayId}` | Update gateway |
| `DELETE` | `/api/chirpstack/gateways/{gatewayId}` | Delete gateway |
| `GET` | `/api/chirpstack/applications` | List application |
| `GET` | `/api/chirpstack/devices` | List device dalam application |
| `GET` | `/api/chirpstack/devices/{devEui}` | Detail device |
| `POST` | `/api/chirpstack/devices` | Create device |
| `PUT` | `/api/chirpstack/devices/{devEui}` | Update device |
| `DELETE` | `/api/chirpstack/devices/{devEui}` | Delete device |
| `POST` | `/api/telemetry` | Ambil telemetry/PING |
| `POST` | `/api/relay/wake` | Kontrol relay ON/OFF |
| `POST` | `/api/topup` | Topup saldo |
| `POST` | `/api/interval` | Atur interval laporan |
