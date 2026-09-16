/**
 * ChirpStack V4 gRPC Client
 * Wrapper sederhana — expose method-method umum sebagai fungsi async
 * sehingga controller bisa pakai await tanpa urusan gRPC langsung.
 */

const grpc = require("@grpc/grpc-js");
const {
  GatewayServiceClient,
} = require("@chirpstack/chirpstack-api/api/gateway_grpc_pb");
const {
  DeviceServiceClient,
} = require("@chirpstack/chirpstack-api/api/device_grpc_pb");
const {
  ApplicationServiceClient,
} = require("@chirpstack/chirpstack-api/api/application_grpc_pb");
const {
  Gateway,
  CreateGatewayRequest,
  GetGatewayRequest,
  UpdateGatewayRequest,
  DeleteGatewayRequest,
  ListGatewaysRequest,
  EnqueueDeviceQueueItemRequest,
  DeviceQueueItem,
  GetDeviceQueueItemsRequest,
  FlushDeviceQueueRequest,
} = require("@chirpstack/chirpstack-api/api/gateway_pb");
const {
  GetDeviceRequest,
  ListDevicesRequest,
  CreateDeviceRequest,
  UpdateDeviceRequest,
  DeleteDeviceRequest,
  Device,
} = require("@chirpstack/chirpstack-api/api/device_pb");
const {
  GetApplicationRequest,
  ListApplicationsRequest,
  CreateApplicationRequest,
  DeleteApplicationRequest,
  Application,
} = require("@chirpstack/chirpstack-api/api/application_pb");
const {
  Location,
} = require("@chirpstack/chirpstack-api/common/common_pb");

const HOST = process.env.CHIRPSTACK_HOST || "localhost:8080";
const API_KEY = process.env.CHIRPSTACK_API_KEY || "";
const TENANT_ID = process.env.CHIRPSTACK_TENANT_ID || "";

// Buat metadata dari API key
function makeMetadata() {
  const meta = new grpc.Metadata();
  meta.set("authorization", `Bearer ${API_KEY}`);
  return meta;
}

// Buat credentials insecure (localhost tidak pakai TLS)
const creds = grpc.credentials.createInsecure();

// Client instances (reuse)
const gatewayClient = new GatewayServiceClient(HOST, creds);
const deviceClient = new DeviceServiceClient(HOST, creds);
const appClient = new ApplicationServiceClient(HOST, creds);

// Helper: wrap gRPC callback menjadi Promise
function call(client, method, request) {
  return new Promise((resolve, reject) => {
    client[method](request, makeMetadata(), (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

// ─────────────────────────────────────────
// GATEWAY
// ─────────────────────────────────────────

/**
 * List semua gateway dalam tenant
 * @param {number} limit
 * @param {number} offset
 */
async function listGateways(limit = 100, offset = 0) {
  const req = new ListGatewaysRequest();
  req.setTenantId(TENANT_ID);
  req.setLimit(limit);
  req.setOffset(offset);
  const res = await call(gatewayClient, "list", req);
  return {
    totalCount: res.getTotalCount(),
    result: res.getResultList().map((gw) => ({
      gatewayId: gw.getGatewayId(),
      name: gw.getName(),
      description: gw.getDescription(),
      lastSeenAt: gw.getLastSeenAt()?.toDate() || null,
      state: gw.getState(),
    })),
  };
}

/**
 * Get detail satu gateway
 * @param {string} gatewayId  — 16 char hex
 */
async function getGateway(gatewayId) {
  const req = new GetGatewayRequest();
  req.setGatewayId(gatewayId);
  const res = await call(gatewayClient, "get", req);
  const gw = res.getGateway();
  const loc = gw.getLocation();
  return {
    gatewayId: gw.getGatewayId(),
    name: gw.getName(),
    description: gw.getDescription(),
    tenantId: gw.getTenantId(),
    statsInterval: gw.getStatsInterval(),
    downlinkPriority: gw.getDownlinkPriority(),
    location: loc
      ? { latitude: loc.getLatitude(), longitude: loc.getLongitude(), altitude: loc.getAltitude() }
      : null,
    createdAt: res.getCreatedAt()?.toDate() || null,
    updatedAt: res.getUpdatedAt()?.toDate() || null,
    lastSeenAt: res.getLastSeenAt()?.toDate() || null,
  };
}

/**
 * Tambah gateway baru
 * @param {object} data  — { gatewayId, name, description, latitude, longitude, altitude, statsInterval }
 */
async function createGateway(data) {
  const gw = new Gateway();
  gw.setGatewayId(data.gatewayId);
  gw.setName(data.name);
  gw.setDescription(data.description || "");
  gw.setTenantId(TENANT_ID);
  gw.setStatsInterval(data.statsInterval || 30);
  gw.setDownlinkPriority(data.downlinkPriority !== undefined ? data.downlinkPriority : 1);

  if (data.latitude != null && data.longitude != null) {
    const loc = new Location();
    loc.setLatitude(data.latitude);
    loc.setLongitude(data.longitude);
    loc.setAltitude(data.altitude || 0);
    gw.setLocation(loc);
  }

  const req = new CreateGatewayRequest();
  req.setGateway(gw);
  await call(gatewayClient, "create", req);
  return { gatewayId: data.gatewayId, message: "Gateway created" };
}

/**
 * Update gateway
 * @param {string} gatewayId
 * @param {object} data  — { name, description, latitude, longitude, altitude, statsInterval }
 */
async function updateGateway(gatewayId, data) {
  // Ambil data existing agar field yang tidak dikirim tidak hilang
  const existing = await getGateway(gatewayId);

  const gw = new Gateway();
  gw.setGatewayId(gatewayId);
  gw.setName(data.name || existing.name);
  gw.setDescription(data.description !== undefined ? data.description : existing.description);
  gw.setTenantId(TENANT_ID);
  gw.setStatsInterval(data.statsInterval || existing.statsInterval || 30);
  gw.setDownlinkPriority(data.downlinkPriority !== undefined ? data.downlinkPriority : (existing.downlinkPriority || 1));

  const lat = data.latitude !== undefined ? data.latitude : existing.location?.latitude;
  const lng = data.longitude !== undefined ? data.longitude : existing.location?.longitude;
  const alt = data.altitude !== undefined ? data.altitude : (existing.location?.altitude || 0);

  if (lat != null && lng != null) {
    const loc = new Location();
    loc.setLatitude(lat);
    loc.setLongitude(lng);
    loc.setAltitude(alt);
    gw.setLocation(loc);
  }

  const req = new UpdateGatewayRequest();
  req.setGateway(gw);
  await call(gatewayClient, "update", req);
  return { gatewayId, message: "Gateway updated" };
}

/**
 * Hapus gateway
 * @param {string} gatewayId
 */
async function deleteGateway(gatewayId) {
  const req = new DeleteGatewayRequest();
  req.setGatewayId(gatewayId);
  await call(gatewayClient, "delete", req);
  return { gatewayId, message: "Gateway deleted" };
}

// ─────────────────────────────────────────
// DEVICE
// ─────────────────────────────────────────

/**
 * List device dalam application
 * @param {string} applicationId
 * @param {number} limit
 */
async function listDevices(applicationId, limit = 100) {
  const req = new ListDevicesRequest();
  req.setApplicationId(applicationId);
  req.setLimit(limit);
  const res = await call(deviceClient, "list", req);
  return {
    totalCount: res.getTotalCount(),
    result: res.getResultList().map((d) => ({
      devEui: d.getDevEui(),
      name: d.getName(),
      deviceProfileId: d.getDeviceProfileId(),
      lastSeenAt: d.getLastSeenAt()?.toDate() || null,
    })),
  };
}

/**
 * Get detail satu device
 * @param {string} devEui  — 16 char hex
 */
async function getDevice(devEui) {
  const req = new GetDeviceRequest();
  req.setDevEui(devEui);
  const res = await call(deviceClient, "get", req);
  const dev = res.getDevice();
  return {
    devEui: dev.getDevEui(),
    name: dev.getName(),
    description: dev.getDescription(),
    applicationId: dev.getApplicationId(),
    deviceProfileId: dev.getDeviceProfileId(),
    isDisabled: dev.getIsDisabled(),
    createdAt: res.getCreatedAt()?.toDate() || null,
    updatedAt: res.getUpdatedAt()?.toDate() || null,
    lastSeenAt: res.getLastSeenAt()?.toDate() || null,
  };
}

/**
 * Get downlink queue device
 * @param {string} devEui
 */
async function getDeviceQueue(devEui) {
  const { GetDeviceQueueItemsRequest } = require("@chirpstack/chirpstack-api/api/device_pb");
  const req = new GetDeviceQueueItemsRequest();
  req.setDevEui(devEui);
  const res = await call(deviceClient, "getQueue", req);
  return {
    totalCount: res.getTotalCount(),
    result: res.getResultList().map((item) => ({
      id: item.getId(),
      fPort: item.getFPort(),
      data: Buffer.from(item.getData()).toString("base64"),
      confirmed: item.getConfirmed(),
    })),
  };
}

/**
 * Enqueue downlink ke device
 * @param {string} devEui
 * @param {object} data  — { fPort, data (base64 string), confirmed }
 */
async function enqueueDownlink(devEui, data) {
  const {
    EnqueueDeviceQueueItemRequest,
    DeviceQueueItem,
  } = require("@chirpstack/chirpstack-api/api/device_pb");

  const item = new DeviceQueueItem();
  item.setDevEui(devEui);
  item.setFPort(data.fPort);
  item.setData(Buffer.from(data.data, "base64"));
  item.setConfirmed(data.confirmed || false);

  const req = new EnqueueDeviceQueueItemRequest();
  req.setQueueItem(item);
  const res = await call(deviceClient, "enqueue", req);
  return { id: res.getId(), message: "Downlink enqueued" };
}

/**
 * Flush downlink queue device
 * @param {string} devEui
 */
async function flushDeviceQueue(devEui) {
  const { FlushDeviceQueueRequest } = require("@chirpstack/chirpstack-api/api/device_pb");
  const req = new FlushDeviceQueueRequest();
  req.setDevEui(devEui);
  await call(deviceClient, "flushQueue", req);
  return { devEui, message: "Queue flushed" };
}

/**
 * Tambah device baru
 * @param {object} data - { devEui, name, description, applicationId, deviceProfileId, isDisabled }
 */
async function createDevice(data) {
  const dev = new Device();
  dev.setDevEui(data.devEui);
  dev.setName(data.name);
  dev.setDescription(data.description || "");
  dev.setApplicationId(data.applicationId);
  dev.setDeviceProfileId(data.deviceProfileId);
  dev.setIsDisabled(data.isDisabled || false);

  const req = new CreateDeviceRequest();
  req.setDevice(dev);
  await call(deviceClient, "create", req);
  return { devEui: data.devEui, message: "Device created" };
}

/**
 * Update device
 * @param {string} devEui
 * @param {object} data - { name, description, deviceProfileId, isDisabled }
 */
async function updateDevice(devEui, data) {
  // Ambil data existing dulu untuk isi field yang tidak diubah
  const existing = await getDevice(devEui);

  const dev = new Device();
  dev.setDevEui(devEui);
  dev.setName(data.name || existing.name);
  dev.setDescription(data.description !== undefined ? data.description : existing.description);
  dev.setApplicationId(existing.applicationId);
  dev.setDeviceProfileId(data.deviceProfileId || existing.deviceProfileId);
  dev.setIsDisabled(data.isDisabled !== undefined ? data.isDisabled : existing.isDisabled);

  const req = new UpdateDeviceRequest();
  req.setDevice(dev);
  await call(deviceClient, "update", req);
  return { devEui, message: "Device updated" };
}

/**
 * Hapus device
 * @param {string} devEui
 */
async function deleteDevice(devEui) {
  const req = new DeleteDeviceRequest();
  req.setDevEui(devEui);
  await call(deviceClient, "delete", req);
  return { devEui, message: "Device deleted" };
}

// ─────────────────────────────────────────
// APPLICATION
// ─────────────────────────────────────────

/**
 * List semua application dalam tenant
 * @param {number} limit
 */
async function listApplications(limit = 100) {
  const req = new ListApplicationsRequest();
  req.setTenantId(TENANT_ID);
  req.setLimit(limit);
  const res = await call(appClient, "list", req);
  return {
    totalCount: res.getTotalCount(),
    result: res.getResultList().map((app) => ({
      id: app.getId(),
      name: app.getName(),
      description: app.getDescription(),
    })),
  };
}

/**
 * Get detail satu application
 * @param {string} applicationId
 */
async function getApplication(applicationId) {
  const req = new GetApplicationRequest();
  req.setId(applicationId);
  const res = await call(appClient, "get", req);
  const app = res.getApplication();
  return {
    id: app.getId(),
    name: app.getName(),
    description: app.getDescription(),
    tenantId: app.getTenantId(),
  };
}

module.exports = {
  // gateway
  listGateways,
  getGateway,
  createGateway,
  updateGateway,
  deleteGateway,
  // device
  listDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  getDeviceQueue,
  enqueueDownlink,
  flushDeviceQueue,
  // application
  listApplications,
  getApplication,
};
