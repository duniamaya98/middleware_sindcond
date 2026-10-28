#!/usr/bin/env node
/**
 * Test ChirpStack V4 gRPC API — list / create gateway.
 * Kredensial WAJIB dari .env: CHIRPSTACK_HOST, CHIRPSTACK_API_KEY, CHIRPSTACK_TENANT_ID.
 *
 * Pemakaian (dari root repo):
 *   node tests/chirpstack_grpc_gateway.js list
 *   node tests/chirpstack_grpc_gateway.js create <gatewayEUI16hex> [nama] [lat] [lon] [alt]
 */
"use strict";

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const grpc = require("@grpc/grpc-js");
const { GatewayServiceClient } = require("@chirpstack/chirpstack-api/api/gateway_grpc_pb");
const {
  CreateGatewayRequest,
  ListGatewaysRequest,
  Gateway,
} = require("@chirpstack/chirpstack-api/api/gateway_pb");
const { Location } = require("@chirpstack/chirpstack-api/common/common_pb");

const HOST = (process.env.CHIRPSTACK_HOST || "localhost:8080").trim();
const API_KEY = (process.env.CHIRPSTACK_API_KEY || "").trim();
const TENANT_ID = (process.env.CHIRPSTACK_TENANT_ID || "").trim();

function usage() {
  console.log(
    "Pemakaian:\n" +
      "  node tests/chirpstack_grpc_gateway.js list\n" +
      "  node tests/chirpstack_grpc_gateway.js create <gatewayEUI16hex> [nama] [lat] [lon] [alt]"
  );
}

const [cmd, gatewayId, name, lat, lon, alt] = process.argv.slice(2);

if (!["list", "create"].includes(cmd)) {
  usage();
  process.exit(1);
}
if (!API_KEY || !TENANT_ID) {
  console.error("CHIRPSTACK_API_KEY dan CHIRPSTACK_TENANT_ID wajib di-set di .env / environment.");
  process.exit(1);
}
if (cmd === "create" && !/^[0-9a-fA-F]{16}$/.test(gatewayId || "")) {
  console.error("Gateway EUI harus 16 karakter hex (8 byte).");
  usage();
  process.exit(1);
}

const metadata = new grpc.Metadata();
metadata.set("authorization", `Bearer ${API_KEY}`);

// Insecure — dipakai untuk ChirpStack di localhost / jaringan internal
const client = new GatewayServiceClient(HOST, grpc.credentials.createInsecure());

function listGateways(title) {
  return new Promise((resolve) => {
    console.log(`=== ${title} ===`);
    const req = new ListGatewaysRequest();
    req.setTenantId(TENANT_ID);
    req.setLimit(100);

    client.list(req, metadata, (err, response) => {
      if (err) {
        console.error("ERROR List Gateways:", err.message);
        process.exitCode = 1;
      } else {
        console.log("Total gateways:", response.getTotalCount());
        response.getResultList().forEach((gw) => {
          console.log(
            " -",
            gw.getGatewayId(),
            "|",
            gw.getName(),
            "| last seen:",
            gw.getLastSeenAt()?.toDate() || "never"
          );
        });
      }
      console.log("");
      resolve();
    });
  });
}

function createGateway() {
  return new Promise((resolve) => {
    console.log("=== Create Gateway ===");
    const gateway = new Gateway();
    gateway.setGatewayId(gatewayId.toLowerCase());
    gateway.setName(name || `Gateway-${gatewayId.toLowerCase()}`);
    gateway.setDescription("Gateway ditambahkan via gRPC API test");
    gateway.setTenantId(TENANT_ID);
    gateway.setStatsInterval(30);

    if (lat !== undefined && lon !== undefined) {
      const location = new Location();
      location.setLatitude(Number(lat));
      location.setLongitude(Number(lon));
      location.setAltitude(Number(alt || 0));
      gateway.setLocation(location);
    }

    const req = new CreateGatewayRequest();
    req.setGateway(gateway);

    client.create(req, metadata, (err) => {
      if (err) {
        console.error("ERROR Create Gateway:", err.message);
        process.exitCode = 1;
      } else {
        console.log("Gateway berhasil dibuat:");
        console.log(" Gateway ID :", gateway.getGatewayId());
        console.log(" Name       :", gateway.getName());
        console.log(" Tenant ID  :", gateway.getTenantId());
      }
      console.log("");
      resolve();
    });
  });
}

(async () => {
  if (cmd === "list") {
    await listGateways("List Gateways");
  } else {
    await listGateways("List Gateways (sebelum)");
    await createGateway();
    await listGateways("List Gateways (sesudah)");
  }
  client.close();
})();
