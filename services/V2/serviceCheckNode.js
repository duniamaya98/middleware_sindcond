const mqtt = require("../../config/mqtt");

/*
 * SvcCheckNode — cek apakah perangkat aktif (ada uplink masuk)
 *
 * Cara pakai:
 *   POST /api/check/node
 *   {
 *     "devEUI": "08000000410000e4",
 *     "applicationId": "4360bdb1-6cdd-4d38-b92a-ea6020ebbea0",
 *     "timeout": 30000   // opsional, default 30000 ms
 *   }
 *
 * Topic V4 ChirpStack:
 *   application/{applicationId}/device/{devEui}/event/up
 */
module.exports = {
  SvcCheckNode: (data) => {
    return new Promise((resolve, reject) => {
      try {
        if (!data.devEUI || !data.applicationId) {
          return reject({
            status: 400,
            message: "devEUI dan applicationId wajib diisi",
          });
        }

        const devEui = String(data.devEUI).toLowerCase().trim();
        const appId  = String(data.applicationId).trim();
        const timeoutMs = data.timeout ? Number(data.timeout) : 30000;

        // ChirpStack V4 uplink event topic
        const topic = `application/${appId}/device/${devEui}/event/up`;

        console.log("[CheckNode] Subscribe topic:", topic);

        let settled = false;
        let timer   = null;

        const finish = (err, result) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          mqtt.removeListener("message", onMessage);
          mqtt.unsubscribe(topic);
          if (err) return reject(err);
          resolve(result);
        };

        const onMessage = (incomingTopic, message) => {
          if (incomingTopic === topic) {
            let parsed = null;
            try { parsed = JSON.parse(message.toString()); } catch (_) {}
            console.log("[CheckNode] Uplink received:", incomingTopic);
            finish(null, {
              status: 200,
              online: true,
              devEUI: devEui,
              applicationId: appId,
              topic: incomingTopic,
              data: parsed || message.toString(),
            });
          }
        };

        mqtt.subscribe(topic, (err) => {
          if (err) {
            console.log("[CheckNode] Subscribe error:", err);
            return finish({ status: 500, message: "Subscribe error: " + JSON.stringify(err) });
          }

          mqtt.on("message", onMessage);

          timer = setTimeout(() => {
            console.log("[CheckNode] Timeout — no uplink from", devEui);
            finish(null, {
              status: 200,
              online: false,
              devEUI: devEui,
              applicationId: appId,
              topic,
              message: `No uplink received within ${timeoutMs} ms`,
            });
          }, timeoutMs);
        });
      } catch (error) {
        console.log("[CheckNode] Error:", error);
        reject({ status: 500, message: error.message });
      }
    });
  },
};
