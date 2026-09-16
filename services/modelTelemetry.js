const mqtt = require("mqtt");
require("dotenv").config();

const options = {
  port: process.env.MQTT_PORT,
  host: process.env.MQTT_HOST,
  protocol: process.env.MQTT_PROTOCOL,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
};

/*
 * modelTelemetry — tarik data telemetry dari perangkat secara manual
 *
 * Flow:
 *  1. Subscribe topic event/up ChirpStack V4
 *  2. Kirim downlink confirmed (fPort 0) untuk pancing meter kirim uplink
 *  3. Tunggu uplink masuk → parse object → resolve
 *  4. Timeout jika tidak ada uplink dalam waktu yang ditentukan
 *
 * POST /api/telemetry
 * {
 *   "devEUI"        : "08000000410000e4",
 *   "applicationId" : "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0",
 *   "timeout"       : 30000   // opsional, default 30000 ms
 * }
 */
module.exports = {
  getTelemetry: (data) => {
    return new Promise((resolve, reject) => {
      if (!data.devEUI || !data.applicationId) {
        return reject({
          headers: { status: 400 },
          body: { message: "devEUI dan applicationId wajib diisi" },
        });
      }

      const devEui    = String(data.devEUI).toLowerCase().trim();
      const appId     = String(data.applicationId).trim();
      const timeoutMs = data.timeout ? Number(data.timeout) : 30000;

      const topicUp   = `application/${appId}/device/${devEui}/event/up`;
      const topicDown = `application/${appId}/device/${devEui}/command/down`;

      console.log("[Telemetry] DevEUI      :", devEui);
      console.log("[Telemetry] Topic Up    :", topicUp);
      console.log("[Telemetry] Topic Down  :", topicDown);
      console.log("[Telemetry] Timeout     :", timeoutMs, "ms");

      const client = mqtt.connect(options);

      let settled = false;
      let timer   = null;

      const finish = (err, result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        client.end();
        if (err) return reject(err);
        resolve(result);
      };

      client.once("error", (err) => {
        console.error("[Telemetry] MQTT error:", err.message);
        finish(
          { headers: { status: 500 }, body: { message: "MQTT connection error" } },
          null
        );
      });

      client.once("connect", () => {
        console.log("[Telemetry] MQTT connected");

        // 1. Subscribe uplink event topic dulu
        client.subscribe(topicUp, (err) => {
          if (err) {
            console.error("[Telemetry] Subscribe error:", err);
            return finish(
              { headers: { status: 500 }, body: { message: "Subscribe error" } },
              null
            );
          }

          console.log("[Telemetry] Subscribed to:", topicUp);

          // 2. Kirim downlink confirmed fPort 102 relay status query
          //    payload e1e600ff = relay OFF query (meter akan balas dengan status uplink)
          const pingPayload = JSON.stringify({
            devEui,
            confirmed: true,
            fPort: 102,
            data: Buffer.from("e1e600ff", "hex").toString("base64"),
          });

          client.publish(topicDown, pingPayload, { qos: 1 }, (publishErr) => {
            if (publishErr) {
              console.error("[Telemetry] Publish error:", publishErr);
              // Tidak langsung reject — tetap tunggu uplink yang mungkin masuk
              // karena meter Class C bisa saja kirim uplink periodic
            } else {
              console.log("[Telemetry] Ping downlink sent");
            }
          });

          // 3. Tunggu uplink masuk
          client.on("message", (topic, message) => {
            if (topic !== topicUp) return;

            let parsed = null;
            try {
              parsed = JSON.parse(message.toString());
            } catch (_) {
              parsed = message.toString();
            }

            console.log("[Telemetry] Uplink received");

            // Ekstrak field telemetry dari object codec ChirpStack
            const obj     = parsed?.object || {};
            const rxInfo  = parsed?.rxInfo?.[0] || {};
            const devInfo = parsed?.deviceInfo || {};

            finish(null, {
              headers: { status: 200 },
              body: {
                message: "Telemetry berhasil ditarik",
                devEUI: devEui,
                applicationId: appId,
                deviceName: devInfo.deviceName || null,
                fPort: parsed?.fPort || null,
                fCnt: parsed?.fCnt || null,
                time: parsed?.time || null,
                dr: parsed?.dr || null,
                snr: rxInfo.snr || null,
                gatewayId: rxInfo.gatewayId || null,
                telemetry: {
                  relay: obj.relay ?? null,
                  relay_state: obj.relay_state || null,
                  relay_status: obj.relay_status || null,
                  valve: obj.valve || null,
                  alarm: obj.alarm ?? null,
                  battery: obj.battery ?? null,
                  voltage: obj.voltage ?? null,
                  current: obj.current ?? null,
                  power_factor: obj.power_factor ?? null,
                  meter_reading: obj.meter_reading ?? null,
                  report_time: obj.report_time || null,
                },
                raw: parsed,
              },
            });
          });

          // 4. Timeout
          timer = setTimeout(() => {
            console.log("[Telemetry] Timeout — no uplink received");
            finish(
              {
                headers: { status: 408 },
                body: {
                  message: `Tidak ada uplink dari meter dalam ${timeoutMs} ms. Pastikan meter aktif dan interval sesuai.`,
                  devEUI: devEui,
                  applicationId: appId,
                },
              },
              null
            );
          }, timeoutMs);
        });
      });
    });
  },
};
