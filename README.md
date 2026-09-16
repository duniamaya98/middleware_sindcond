# Middleware SINDCOND

Middleware Node.js untuk integrasi aplikasi EMS/SINDCOND dengan ChirpStack v4, MQTT, Redis, dan database SQL. Layanan menyediakan REST API untuk pengelolaan gateway/perangkat ChirpStack, telemetry, downlink, serta kontrol relay CL711K22.

## Fitur

- REST API berbasis Express.
- Integrasi ChirpStack v4 melalui gRPC.
- Manajemen gateway dan perangkat ChirpStack.
- Antrean downlink perangkat.
- Pengambilan telemetry melalui MQTT.
- Kontrol relay CL711K22: hidup/mati, status, dan wake-up.
- Operasi perangkat: valve, brightness, top-up, interval, meter, UTC, dan pulse.
- Integrasi Redis dan database melalui Sequelize.

## Teknologi

- Node.js dan Express 4
- ChirpStack API v4 dan gRPC
- MQTT
- Redis
- Sequelize dengan MySQL/MariaDB
- Docker

## Persyaratan

- Node.js dan npm. Versi proyek lama memakai image Node.js 10; gunakan versi yang kompatibel dengan dependensi sebelum melakukan upgrade runtime.
- ChirpStack v4 yang dapat dijangkau melalui gRPC.
- Broker MQTT.
- Redis.
- MySQL atau MariaDB bila fitur database digunakan.

## Instalasi

1. Clone repository:

   ```bash
   git clone git@github.com:duniamaya98/middleware_sindcond.git
   cd middleware_sindcond
   ```

2. Instal dependensi:

   ```bash
   npm install
   ```

3. Buat konfigurasi lokal:

   ```bash
   cp .env.example .env
   ```

4. Isi `.env` sesuai lingkungan server.

5. Jalankan aplikasi:

   ```bash
   npm start
   ```

Port default aplikasi: `3001`. Ubah melalui `PORT`.

## Konfigurasi Lingkungan

### Aplikasi

| Variabel | Keterangan |
|---|---|
| `PORT` | Port HTTP middleware. Default `3001`. |
| `UPSTREAM_BASE_URL` | Base URL layanan upstream bila digunakan. |

### ChirpStack gRPC

| Variabel | Keterangan |
|---|---|
| `CHIRPSTACK_HOST` | Alamat gRPC ChirpStack, contoh `localhost:8080`. |
| `CHIRPSTACK_API_KEY` | API key ChirpStack. |
| `CHIRPSTACK_TENANT_ID` | ID tenant ChirpStack. |

Koneksi gRPC saat ini memakai `createInsecure()`. Gunakan hanya pada localhost atau jaringan privat tepercaya. Tambahkan TLS sebelum mengirim trafik melalui jaringan publik.

### MQTT

| Variabel | Keterangan |
|---|---|
| `MQTT_PROTOCOL` | Protokol broker, misalnya `mqtt` atau `mqtts`. |
| `MQTT_HOST` | Host broker MQTT. |
| `MQTT_PORT` | Port broker MQTT. |
| `MQTT_USERNAME` | Username MQTT. |
| `MQTT_PASSWORD` | Password MQTT. |
| `MQTT_REJECT_UNAUTHORIZED` | Validasi sertifikat TLS. |
| `CHIRPSTACK_MQTT_*` | Konfigurasi broker khusus integrasi ChirpStack bila berbeda. |

### Database

Konfigurasi development memakai variabel berakhiran `_DEV`; production memakai `_PROD`.

| Variabel | Keterangan |
|---|---|
| `USERNAME_DEV`, `USERNAME_PROD` | Username database. |
| `PASSWORD_DEV`, `PASSWORD_PROD` | Password database. |
| `DATABASE_DEV`, `DATABASE_PROD` | Nama database. |
| `HOST_DEV`, `HOST_PROD` | Host database. |
| `DIALECT_DEV`, `DIALECT_PROD` | Dialect Sequelize, biasanya `mysql`. |
| `DBPORT_DEV`, `DBPORT_PROD` | Port database pada template konfigurasi. |

> Catatan: `config/config.js` saat ini membaca `DBPORT`. Samakan konfigurasi kode dan `.env` sebelum menjalankan migrasi Sequelize.

### Redis dan Relay

| Variabel | Keterangan |
|---|---|
| `REDIS_HOST` | Host Redis. |
| `REDIS_PORT` | Port Redis. |
| `RELAY_TIMEOUT_MS` | Timeout operasi relay. |
| `RELAY_STATUS_TIMEOUT_MS` | Timeout pembacaan status relay. |

Jangan commit `.env`. Repository hanya menyimpan `.env.example` tanpa nilai rahasia.

## Endpoint Utama

Semua endpoint berikut memakai prefix `/api`.

### ChirpStack

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/chirpstack/gateways` | Daftar gateway. |
| `GET` | `/chirpstack/gateways/:gatewayId` | Detail gateway. |
| `POST` | `/chirpstack/gateways` | Tambah gateway. |
| `PUT` | `/chirpstack/gateways/:gatewayId` | Ubah gateway. |
| `DELETE` | `/chirpstack/gateways/:gatewayId` | Hapus gateway. |
| `GET` | `/chirpstack/devices` | Daftar perangkat. |
| `POST` | `/chirpstack/devices` | Tambah perangkat. |
| `GET` | `/chirpstack/devices/:devEui` | Detail perangkat. |
| `PUT` | `/chirpstack/devices/:devEui` | Ubah perangkat. |
| `DELETE` | `/chirpstack/devices/:devEui` | Hapus perangkat. |
| `GET` | `/chirpstack/devices/:devEui/queue` | Lihat antrean downlink. |
| `POST` | `/chirpstack/devices/:devEui/queue` | Tambah downlink. |
| `DELETE` | `/chirpstack/devices/:devEui/queue` | Kosongkan antrean downlink. |
| `GET` | `/chirpstack/applications` | Daftar aplikasi. |
| `GET` | `/chirpstack/applications/:applicationId` | Detail aplikasi. |

### Telemetry dan Relay

| Method | Endpoint | Fungsi |
|---|---|---|
| `POST` | `/telemetry` | Ambil telemetry perangkat. |
| `POST` | `/relay` | Kendalikan relay CL711K22. |
| `POST` | `/relay/status` | Ambil status relay. |
| `POST` | `/relay/wake` | Bangunkan relay. |

### Downlink dan Operasi Perangkat

| Method | Endpoint |
|---|---|
| `POST` | `/valve` |
| `POST` | `/brightness/:value/:devEui/:type` |
| `POST` | `/topup` |
| `POST` | `/interval` |
| `POST` | `/setmeter` |
| `POST` | `/utc` |
| `POST` | `/pulse` |
| `POST` | `/gateway` |
| `POST` | `/nodes` |
| `POST` | `/check` |
| `POST` | `/subscribe` |
| `POST` | `/check/node` |

Dokumentasi request dan response lengkap:

- [`docs/API_Guide.md`](docs/API_Guide.md)
- [`docs/api-reference.md`](docs/api-reference.md)
- [`docs/chirpstack-api.md`](docs/chirpstack-api.md)

## Docker

Build image:

```bash
docker build -t middleware-sindcond .
```

Jalankan container dengan file konfigurasi lokal:

```bash
docker run --rm --env-file .env -p 3001:8081 middleware-sindcond
```

`Dockerfile` membuka port `8081`, sedangkan aplikasi memakai `PORT` atau default `3001`. Atur `PORT=8081` di `.env` untuk contoh perintah tersebut, atau sesuaikan pemetaan port.

## Struktur Proyek

```text
controllers/   Handler HTTP
services/      Logika ChirpStack, MQTT, telemetry, relay, dan downlink
config/        Konfigurasi database, MQTT, Redis, dan HTTP client
routes/        Definisi endpoint Express
models/        Model Sequelize
migrations/    Migrasi database
docs/          Dokumentasi API
bin/www        Entry point HTTP server
```

## Keamanan

- Jangan simpan API key, password, token, atau private key dalam Git.
- Rotasi kredensial yang pernah terpapar.
- Gunakan `mqtts` dan gRPC TLS untuk koneksi lintas jaringan tepercaya.
- Batasi akses ChirpStack, MQTT, Redis, dan database memakai firewall.
- Gunakan akun database dengan hak minimum.

## Lisensi

Lisensi belum ditentukan. Tambahkan file `LICENSE` sebelum distribusi publik atau penggunaan ulang oleh pihak lain.
