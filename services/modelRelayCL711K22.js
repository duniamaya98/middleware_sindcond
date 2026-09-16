const mqtt = require("mqtt");

/*
|--------------------------------------------------------------------------
| CL711K22 Relay Model
|--------------------------------------------------------------------------
|
| Reverse-engineered legacy Sindcon / LoRa Server command mapping:
|
|   Relay ON / connect:
|     FPort     : 111
|     Payload   : 0x01
|     Base64    : AQ==
|     Confirmed : false
|     Expected  : valve = "open"
|
|   Relay OFF / disconnect:
|     FPort     : 111
|     Payload   : 0x00
|     Base64    : AA==
|     Confirmed : false
|     Expected  : valve = "close"
|
| IMPORTANT:
|   FPort 102 + E1E6... is no longer used for relay control.
|   Final state is verified from the next uplink state, not LoRaWAN ACK.
|--------------------------------------------------------------------------
*/

const RELAY_FPORT = 111;
const RELAY_CONFIRMED = false;
const DEFAULT_TIMEOUT_MS = 30000;

function response(status, message, data = null) {
  return {
    headers: {
      status,
    },
    body: {
      success: status >= 200 && status < 300,
      message,
      data,
    },
  };
}

function apiError(status, message, details = null) {
  return {
    headers: {
      status,
    },
    body: {
      success: false,
      message,
      details,
    },
  };
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function normalizeDevEUI(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const devEUI = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-f]/g, "");

  if (!/^[0-9a-f]{16}$/.test(devEUI)) {
    return null;
  }

  return devEUI;
}

function normalizeApplicationId(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const applicationId = String(value).trim();

  if (
    !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      applicationId
    )
  ) {
    return null;
  }

  return applicationId.toLowerCase();
}

function getMqttConfig() {
  const protocol =
    process.env.MQTT_PROTOCOL ||
    process.env.CHIRPSTACK_MQTT_PROTOCOL ||
    "mqtt";

  const host =
    process.env.MQTT_HOST ||
    process.env.CHIRPSTACK_MQTT_HOST ||
    "127.0.0.1";

  const port = Number(
    process.env.MQTT_PORT ||
      process.env.CHIRPSTACK_MQTT_PORT ||
      (protocol === "mqtts" ? 8883 : 1883)
  );

  const username =
    process.env.MQTT_USERNAME ||
    process.env.CHIRPSTACK_MQTT_USERNAME ||
    undefined;

  const password =
    process.env.MQTT_PASSWORD ||
    process.env.CHIRPSTACK_MQTT_PASSWORD ||
    undefined;

  const rejectUnauthorized = parseBoolean(
    process.env.MQTT_REJECT_UNAUTHORIZED ??
      process.env.CHIRPSTACK_MQTT_REJECT_UNAUTHORIZED,
    true
  );

  return {
    protocol,
    host,
    port,
    username,
    password,
    rejectUnauthorized,
  };
}

function createMqttClient() {
  const config = getMqttConfig();

  const url = `${config.protocol}://${config.host}:${config.port}`;

  const options = {
    clean: true,
    reconnectPeriod: 0,
    connectTimeout: 10000,
    clientId: `cl711k22-relay-${process.pid}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2, 10)}`,
  };

  if (config.username) {
    options.username = config.username;
  }

  if (config.password) {
    options.password = config.password;
  }

  if (config.protocol === "mqtts") {
    options.rejectUnauthorized = config.rejectUnauthorized;
  }

  return mqtt.connect(url, options);
}

function buildRelayPayload(relay) {
  const value = Number(relay);

  if (value === 1) {
    const buffer = Buffer.from([0x01]);

    return {
      relay: 1,
      label: "ON (connect)",
      expectedValve: "open",
      expectedRelayState: "ON",
      fPort: RELAY_FPORT,
      confirmed: RELAY_CONFIRMED,
      hex: buffer.toString("hex").toUpperCase(),
      base64: buffer.toString("base64"),
      buffer,
    };
  }

  if (value === 0) {
    const buffer = Buffer.from([0x00]);

    return {
      relay: 0,
      label: "OFF (disconnect)",
      expectedValve: "close",
      expectedRelayState: "OFF",
      fPort: RELAY_FPORT,
      confirmed: RELAY_CONFIRMED,
      hex: buffer.toString("hex").toUpperCase(),
      base64: buffer.toString("base64"),
      buffer,
    };
  }

  throw new Error("relay hanya boleh bernilai 0 atau 1");
}

function safeJsonParse(payload) {
  try {
    return JSON.parse(payload.toString("utf8"));
  } catch (error) {
    return null;
  }
}

function getDecodedObject(event) {
  if (!event || typeof event !== "object") {
    return null;
  }

  if (event.object && typeof event.object === "object") {
    return event.object;
  }

  if (event.data && typeof event.data === "object") {
    return event.data;
  }

  return null;
}

function getValveState(event) {
  const object = getDecodedObject(event);

  if (!object) {
    return null;
  }

  if (typeof object.valve === "string") {
    const valve = object.valve.trim().toLowerCase();

    if (valve === "open" || valve === "close") {
      return valve;
    }
  }

  if (typeof object.relay_state === "string") {
    const relayState = object.relay_state.trim().toUpperCase();

    if (relayState === "ON") {
      return "open";
    }

    if (relayState === "OFF") {
      return "close";
    }
  }

  if (object.relay !== undefined && object.relay !== null) {
    const relay = Number(object.relay);

    if (relay === 1) {
      return "open";
    }

    if (relay === 0) {
      return "close";
    }
  }

  return null;
}

function getBatteryState(event) {
  const object = getDecodedObject(event);

  if (!object || object.battery === undefined || object.battery === null) {
    return null;
  }

  const battery = Number(object.battery);

  return Number.isFinite(battery) ? battery : null;
}

function getCurrentState(event) {
  const object = getDecodedObject(event);

  if (!object) {
    return null;
  }

  if (object.current_a !== undefined && object.current_a !== null) {
    const currentA = Number(object.current_a);

    if (Number.isFinite(currentA)) {
      return {
        raw: object.current ?? null,
        ampere: currentA,
      };
    }
  }

  if (object.current !== undefined && object.current !== null) {
    const raw = Number(object.current);

    if (Number.isFinite(raw)) {
      return {
        raw,
        ampere: raw / 1000,
      };
    }
  }

  return null;
}

function isEventAfterCommand(event, commandPublishedAtMs) {
  if (!event || !event.time) {
    return true;
  }

  const eventMs = Date.parse(event.time);

  if (!Number.isFinite(eventMs)) {
    return true;
  }

  return eventMs >= commandPublishedAtMs - 2000;
}

function subscribeAsync(client, topics) {
  return new Promise((resolve, reject) => {
    client.subscribe(topics, { qos: 0 }, (error, granted) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(granted);
    });
  });
}

function publishAsync(client, topic, payload) {
  return new Promise((resolve, reject) => {
    client.publish(topic, payload, { qos: 0, retain: false }, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function endClient(client) {
  try {
    client.end(true);
  } catch (error) {
    // Ignore cleanup errors.
  }
}

async function controlRelay(params = {}) {
  const devEUI = normalizeDevEUI(params.devEUI || params.devEui);
  const applicationId = normalizeApplicationId(params.applicationId);

  if (!devEUI) {
    return apiError(
      400,
      "devEUI tidak valid. Gunakan 16 karakter hexadecimal.",
      {
        devEUI: params.devEUI || params.devEui || null,
      }
    );
  }

  if (!applicationId) {
    return apiError(400, "applicationId tidak valid.", {
      applicationId: params.applicationId || null,
    });
  }

  let command;

  try {
    command = buildRelayPayload(params.relay);
  } catch (error) {
    return apiError(400, error.message);
  }

  const requestedTimeout = Number(
    params.timeoutMs ||
      params.timeout ||
      process.env.RELAY_TIMEOUT_MS ||
      DEFAULT_TIMEOUT_MS
  );

  const timeoutMs =
    Number.isFinite(requestedTimeout) && requestedTimeout >= 5000
      ? Math.floor(requestedTimeout)
      : DEFAULT_TIMEOUT_MS;

  const commandTopic =
    `application/${applicationId}/device/${devEUI}/command/down`;

  const txAckTopic =
    `application/${applicationId}/device/${devEUI}/event/txack`;

  const uplinkTopic =
    `application/${applicationId}/device/${devEUI}/event/up`;

  const mqttClient = createMqttClient();

  return new Promise((resolve) => {
    let settled = false;
    let commandPublished = false;
    let commandPublishedAtMs = null;
    let txAck = null;
    let lastUplink = null;
    let lastValve = null;

    const finish = (result) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      mqttClient.removeAllListeners();
      endClient(mqttClient);
      resolve(result);
    };

    const timer = setTimeout(() => {
      const diagnostic = {
        devEUI,
        applicationId,
        relayRequested: command.relay,
        relayRequestedState: command.expectedRelayState,
        expectedValve: command.expectedValve,

        fPort: command.fPort,
        confirmed: command.confirmed,
        payloadHex: command.hex,
        payloadBase64: command.base64,

        commandPublished,
        txAckReceived: Boolean(txAck),
        txAck,

        stateConfirmed: false,
        lastValve,
        lastUplink,
      };

      if (txAck) {
        finish(
          response(
            202,
            `Downlink relay ${command.label} sudah ditransmisikan, tetapi state perangkat belum terkonfirmasi dari uplink.`,
            diagnostic
          )
        );
        return;
      }

      if (commandPublished) {
        finish(
          response(
            202,
            `Command relay ${command.label} sudah dipublish ke ChirpStack, tetapi txack / state perangkat belum diterima.`,
            diagnostic
          )
        );
        return;
      }

      finish(
        apiError(504, "Timeout sebelum command relay dapat dikonfirmasi.", diagnostic)
      );
    }, timeoutMs);

    mqttClient.on("error", (error) => {
      finish(
        apiError(502, "MQTT error saat mengontrol relay.", {
          error: error.message,
          devEUI,
          applicationId,
        })
      );
    });

    mqttClient.on("message", (topic, payload) => {
      const event = safeJsonParse(payload);

      if (!event) {
        return;
      }

      if (topic === txAckTopic) {
        if (!commandPublished) {
          return;
        }

        txAck = {
          time: event.time || null,
          gatewayId: event.gatewayId || null,
          fCntDown:
            event.fCntDown !== undefined ? event.fCntDown : null,
          queueItemId: event.queueItemId || null,
          txInfo: event.txInfo || null,
        };

        return;
      }

      if (topic !== uplinkTopic || !commandPublished) {
        return;
      }

      if (!isEventAfterCommand(event, commandPublishedAtMs)) {
        return;
      }

      const actualValve = getValveState(event);

      lastUplink = event;
      lastValve = actualValve;

      if (!actualValve) {
        return;
      }

      if (actualValve !== command.expectedValve) {
        return;
      }

      const object = getDecodedObject(event);
      const battery = getBatteryState(event);
      const current = getCurrentState(event);

      finish(
        response(
          200,
          `Relay ${command.label} confirmed by device state.`,
          {
            devEUI,
            applicationId,

            relay: command.relay,
            relayState: command.expectedRelayState,
            valve: actualValve,
            stateConfirmed: true,

            fPort: command.fPort,
            confirmed: command.confirmed,
            payloadHex: command.hex,
            payloadBase64: command.base64,

            commandPublished: true,
            txAckReceived: Boolean(txAck),
            txAck,

            battery,
            current,
            alarm:
              object && object.alarm !== undefined
                ? object.alarm
                : null,

            uplink: event,
          }
        )
      );
    });

    mqttClient.on("connect", async () => {
      try {
        await subscribeAsync(mqttClient, [txAckTopic, uplinkTopic]);

        const downlink = {
          devEui: devEUI,
          confirmed: false,
          fPort: RELAY_FPORT,
          data: command.base64,
        };

        commandPublishedAtMs = Date.now();

        await publishAsync(
          mqttClient,
          commandTopic,
          JSON.stringify(downlink)
        );

        commandPublished = true;
      } catch (error) {
        finish(
          apiError(502, "Gagal subscribe/publish MQTT command relay.", {
            error: error.message,
            devEUI,
            applicationId,
          })
        );
      }
    });
  });
}

async function getRelayStatus(params = {}) {
  const devEUI = normalizeDevEUI(params.devEUI || params.devEui);
  const applicationId = normalizeApplicationId(params.applicationId);

  if (!devEUI) {
    return apiError(
      400,
      "devEUI tidak valid. Gunakan 16 karakter hexadecimal."
    );
  }

  if (!applicationId) {
    return apiError(400, "applicationId tidak valid.");
  }

  const requestedTimeout = Number(
    params.timeoutMs ||
      params.timeout ||
      process.env.RELAY_STATUS_TIMEOUT_MS ||
      15000
  );

  const timeoutMs =
    Number.isFinite(requestedTimeout) && requestedTimeout >= 3000
      ? Math.floor(requestedTimeout)
      : 15000;

  const uplinkTopic =
    `application/${applicationId}/device/${devEUI}/event/up`;

  const mqttClient = createMqttClient();

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      mqttClient.removeAllListeners();
      endClient(mqttClient);
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish(
        response(
          202,
          "Belum ada uplink terbaru untuk menentukan status relay.",
          {
            devEUI,
            applicationId,
            stateConfirmed: false,
          }
        )
      );
    }, timeoutMs);

    mqttClient.on("error", (error) => {
      finish(
        apiError(502, "MQTT error saat membaca status relay.", {
          error: error.message,
          devEUI,
          applicationId,
        })
      );
    });

    mqttClient.on("message", (topic, payload) => {
      if (topic !== uplinkTopic) {
        return;
      }

      const event = safeJsonParse(payload);

      if (!event) {
        return;
      }

      const valve = getValveState(event);

      if (!valve) {
        return;
      }

      const object = getDecodedObject(event);
      const relay = valve === "open" ? 1 : 0;
      const relayState = valve === "open" ? "ON" : "OFF";

      finish(
        response(200, "Relay state received from device uplink.", {
          devEUI,
          applicationId,

          relay,
          relayState,
          valve,
          stateConfirmed: true,

          battery: getBatteryState(event),
          current: getCurrentState(event),
          alarm:
            object && object.alarm !== undefined
              ? object.alarm
              : null,

          uplink: event,
        })
      );
    });

    mqttClient.on("connect", async () => {
      try {
        await subscribeAsync(mqttClient, uplinkTopic);
      } catch (error) {
        finish(
          apiError(502, "Gagal subscribe MQTT status relay.", {
            error: error.message,
            devEUI,
            applicationId,
          })
        );
      }
    });
  });
}

/*
|--------------------------------------------------------------------------
| wakeAndControlRelay
|--------------------------------------------------------------------------
|
| Gabungan wake-up telemetry + relay control dalam satu koneksi MQTT.
|
| Flow:
|   Phase 1 — WAKE UP
|     - Subscribe event/up + event/txack
|     - Kirim relay status query (fPort 111, payload relay OFF / read)
|       untuk pancing meter mengirim uplink (membangunkan meter dari sleep)
|     - Tunggu uplink masuk sebagai tanda meter aktif
|
|   Phase 2 — RELAY COMMAND
|     - Setelah uplink wake diterima, langsung kirim relay ON/OFF
|       pada koneksi MQTT yang sama (tidak buat koneksi baru)
|     - Tunggu konfirmasi valve state dari uplink berikutnya
|
| POST /api/relay/wake
| {
|   "devEUI"        : "08000000410000e4",
|   "applicationId" : "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0",
|   "relay"         : 1,           // 1 = ON, 0 = OFF
|   "wakeTimeout"   : 30000,       // opsional, default 30000 ms
|   "relayTimeout"  : 30000        // opsional, default 30000 ms
| }
|
*/
async function wakeAndControlRelay(params = {}) {
  const devEUI = normalizeDevEUI(params.devEUI || params.devEui);
  const applicationId = normalizeApplicationId(params.applicationId);

  if (!devEUI) {
    return apiError(400, "devEUI tidak valid. Gunakan 16 karakter hexadecimal.");
  }

  if (!applicationId) {
    return apiError(400, "applicationId tidak valid.");
  }

  let command;
  try {
    command = buildRelayPayload(params.relay);
  } catch (error) {
    return apiError(400, error.message);
  }

  const wakeTimeoutMs = (() => {
    const v = Number(params.wakeTimeout || params.wakeTimeoutMs || DEFAULT_TIMEOUT_MS);
    return Number.isFinite(v) && v >= 5000 ? Math.floor(v) : DEFAULT_TIMEOUT_MS;
  })();

  const relayTimeoutMs = (() => {
    const v = Number(params.relayTimeout || params.relayTimeoutMs || DEFAULT_TIMEOUT_MS);
    return Number.isFinite(v) && v >= 5000 ? Math.floor(v) : DEFAULT_TIMEOUT_MS;
  })();

  const commandTopic  = `application/${applicationId}/device/${devEUI}/command/down`;
  const txAckTopic    = `application/${applicationId}/device/${devEUI}/event/txack`;
  const uplinkTopic   = `application/${applicationId}/device/${devEUI}/event/up`;

  // Payload wake-up: relay status query (fPort 111, payload OFF / read)
  // Ini sama dengan relay OFF payload — meter akan balas uplink status tanpa mengubah state relay
  const wakePayload = buildRelayPayload(params.relay === 0 ? 1 : 0);
  const wakeDownlink = JSON.stringify({
    devEui: devEUI,
    confirmed: false,
    fPort: RELAY_FPORT,
    data: wakePayload.base64,
  });

  const mqttClient = createMqttClient();

  return new Promise((resolve) => {
    let settled        = false;
    let phase          = "wake";   // "wake" | "relay"
    let wakeUplink     = null;
    let wakePublishedAtMs = null;

    let commandPublished    = false;
    let commandPublishedAtMs = null;
    let txAck               = null;
    let lastUplink          = null;
    let lastValve           = null;

    let wakeTimer  = null;
    let relayTimer = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(wakeTimer);
      clearTimeout(relayTimer);
      mqttClient.removeAllListeners();
      endClient(mqttClient);
      resolve(result);
    };

    // ── Phase 2: kirim relay command setelah meter bangun ──
    const startRelayPhase = async () => {
      phase = "relay";
      commandPublishedAtMs = Date.now();

      const downlink = JSON.stringify({
        devEui: devEUI,
        confirmed: false,
        fPort: RELAY_FPORT,
        data: command.base64,
      });

      relayTimer = setTimeout(() => {
        const diagnostic = {
          devEUI, applicationId,
          wakeUplink,
          relayRequested: command.relay,
          expectedValve: command.expectedValve,
          fPort: command.fPort,
          payloadHex: command.hex,
          payloadBase64: command.base64,
          commandPublished,
          txAckReceived: Boolean(txAck),
          txAck,
          stateConfirmed: false,
          lastValve,
          lastUplink,
        };

        if (txAck) {
          return finish(response(202,
            `Wake berhasil. Downlink relay ${command.label} ditransmisikan, state belum terkonfirmasi.`,
            diagnostic
          ));
        }

        finish(response(202,
          `Wake berhasil. Command relay ${command.label} dipublish, txack/state belum diterima.`,
          diagnostic
        ));
      }, relayTimeoutMs);

      try {
        await publishAsync(mqttClient, commandTopic, downlink);
        commandPublished = true;
        console.log(`[WakeRelay] Phase 2 — Relay ${command.label} command sent`);
      } catch (error) {
        finish(apiError(502, "Gagal publish relay command setelah wake.", {
          error: error.message, devEUI, applicationId,
        }));
      }
    };

    // ── Phase 1: wake timeout ──
    wakeTimer = setTimeout(() => {
      finish(apiError(408,
        `Meter tidak merespons wake-up dalam ${wakeTimeoutMs} ms. Pastikan meter aktif dan terhubung ke gateway.`,
        { devEUI, applicationId, phase: "wake", wakeTimeoutMs }
      ));
    }, wakeTimeoutMs);

    // ── Message handler ──
    mqttClient.on("message", async (topic, payload) => {
      const event = safeJsonParse(payload);
      if (!event) return;

      // txAck: simpan untuk diagnostik
      if (topic === txAckTopic) {
        if (commandPublished) {
          txAck = {
            time: event.time || null,
            gatewayId: event.gatewayId || null,
            fCntDown: event.fCntDown !== undefined ? event.fCntDown : null,
            queueItemId: event.queueItemId || null,
          };
        }
        return;
      }

      if (topic !== uplinkTopic) return;

      // ── Phase 1: uplink wake diterima ──
      if (phase === "wake") {
        if (!wakePublishedAtMs || !isEventAfterCommand(event, wakePublishedAtMs)) {
          return;
        }

        wakeUplink = event;
        const wakeValve = getValveState(event);
        const wakeObject = getDecodedObject(event);

        console.log(`[WakeRelay] Phase 1 — Wake uplink received, valve: ${wakeValve}, alarm: ${wakeObject?.alarm}`);

        clearTimeout(wakeTimer);
        await startRelayPhase();
        return;
      }

      // ── Phase 2: uplink konfirmasi relay ──
      if (phase === "relay") {
        if (!commandPublished) return;
        if (!isEventAfterCommand(event, commandPublishedAtMs)) return;

        const actualValve = getValveState(event);
        lastUplink = event;
        lastValve  = actualValve;

        if (!actualValve) return;
        if (actualValve !== command.expectedValve) return;

        const object  = getDecodedObject(event);
        const battery = getBatteryState(event);
        const current = getCurrentState(event);

        finish(response(200, `Relay ${command.label} confirmed by device state.`, {
          devEUI, applicationId,
          wakeUplink,
          relay: command.relay,
          relayState: command.expectedRelayState,
          valve: actualValve,
          stateConfirmed: true,
          fPort: command.fPort,
          payloadHex: command.hex,
          payloadBase64: command.base64,
          commandPublished: true,
          txAckReceived: Boolean(txAck),
          txAck,
          battery,
          current,
          alarm: object?.alarm ?? null,
          uplink: event,
        }));
      }
    });

    mqttClient.on("error", (error) => {
      finish(apiError(502, "MQTT error saat wake+relay.", {
        error: error.message, devEUI, applicationId,
      }));
    });

    mqttClient.on("connect", async () => {
      try {
        await subscribeAsync(mqttClient, [txAckTopic, uplinkTopic]);

        wakePublishedAtMs = Date.now();
        await publishAsync(mqttClient, commandTopic, wakeDownlink);

        console.log(`[WakeRelay] Phase 1 — Wake payload sent (${wakePayload.hex}), waiting uplink...`);
      } catch (error) {
        finish(apiError(502, "Gagal subscribe/publish wake payload.", {
          error: error.message, devEUI, applicationId,
        }));
      }
    });
  });
}

module.exports = {
  controlRelay,
  getRelayStatus,
  wakeAndControlRelay,

  buildRelayPayload,
  getValveState,

  RELAY_FPORT,
  RELAY_CONFIRMED,
};