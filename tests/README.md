# Tests & Tools

Script uji manual untuk middleware (bukan unit test). Semua konfigurasi dibaca dari `.env` di root repo.

> **Peringatan:** script relay dengan `--run` mengirim perintah ON/OFF ke meter **fisik**. Jalankan tanpa `--run` (dry-run) dulu untuk cek target.

## Struktur

```
tests/
├── devices.json                # daftar kWh meter CL711K22 (devEUI + SN)
├── lib/relayCommon.js          # helper bersama test relay
├── relay_sequential.js         # relay bulk, satu per satu
├── relay_parallel.js           # relay bulk, serentak
├── chirpstack_grpc_gateway.js  # list / create gateway via gRPC
└── output/                     # hasil JSON (gitignored)
scripts/
└── tb_token.sh                 # ambil / refresh token ThingsBoard
```

## Environment

| Variabel | Dipakai oleh | Default |
|---|---|---|
| `MDW_URL` | relay test | `http://127.0.0.1:${PORT:-3001}` |
| `CHIRPSTACK_APPLICATION_ID` (atau `APP_ID`) | relay test | **wajib** |
| `FPORT` | relay test | `102` |
| `REQUEST_TIMEOUT_MS` | `relay_parallel.js` | `900000` |
| `TEST_OUTPUT_DIR` | relay test | `tests/output` |
| `CHIRPSTACK_HOST`, `CHIRPSTACK_API_KEY`, `CHIRPSTACK_TENANT_ID` | gRPC test | API key & tenant **wajib** |
| `TB_HOST`, `TB_USER`, `TB_PASS` | `tb_token.sh` | **wajib** |

## Relay bulk

Endpoint: `POST /api/relay`. Opsi: `--run`, `--stagger <ms>`, `--only <devEUI,...>`, `--fport <n>`, `--unconfirmed`.

```bash
# Berurutan
npm run test:relay:seq -- on                 # dry-run
npm run test:relay:seq -- off --run --stagger 2000

# Serentak
npm run test:relay:parallel -- on --run
npm run test:relay:parallel -- on --run --only 0800000041000612,080000004100064e
```

Status per meter: `200` CONFIRMED, `202` SENT/UNCONFIRMED, `408` TIMEOUT, lainnya ERROR. Hasil lengkap disimpan ke `tests/output/relay_bulk_<on|off>_<timestamp>.json`.

Daftar meter diubah di `tests/devices.json`.

## ChirpStack gRPC

```bash
node tests/chirpstack_grpc_gateway.js list
node tests/chirpstack_grpc_gateway.js create aabbccddeeff0011 "Gateway-Lab" -6.2 106.8 10
```

## ThingsBoard token

```bash
source scripts/tb_token.sh        # export $TB_TOKEN
./scripts/tb_token.sh refresh     # paksa refresh
```

Token disimpan di `~/.tb_token` dan `~/.tb_refresh_token` (mode 600).
