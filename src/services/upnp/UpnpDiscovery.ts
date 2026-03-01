/**
 * Dino Music App - UPNP Discovery
 * SSDP device discovery using UDP multicast
 */

import dgram from 'react-native-udp';
import { XMLParser } from 'fast-xml-parser';
import { RemoteDevice } from '../../stores/remotePlaybackStore';

const SSDP_ADDRESS = '239.255.255.250';
const SSDP_PORT = 1900;
const parser = new XMLParser({ removeNSPrefix: true });

function createMSearchPacket(): string {
  return (
    'M-SEARCH * HTTP/1.1\r\n' +
    `HOST: ${SSDP_ADDRESS}:${SSDP_PORT}\r\n` +
    'MAN: "ssdp:discover"\r\n' +
    'MX: 3\r\n' +
    'ST: urn:schemas-upnp-org:device:MediaRenderer:1\r\n' +
    '\r\n'
  );
}

interface DeviceInfo {
  ip: string;
  port: number;
  location: string;
}

function parseSsdpResponse(response: Buffer): DeviceInfo | null {
  const responseStr = response.toString();
  const locationMatch = responseStr.match(/LOCATION:\s*(.+)/i);
  if (!locationMatch) return null;

  const location = locationMatch[1].trim();
  const urlMatch = location.match(/http:\/\/([^:]+):(\d+)/);
  if (!urlMatch) return null;

  return {
    ip: urlMatch[1],
    port: parseInt(urlMatch[2], 10),
    location,
  };
}

async function fetchDeviceDescription(deviceInfo: DeviceInfo): Promise<RemoteDevice | null> {
  try {
    const response = await fetch(deviceInfo.location);
    if (!response.ok) return null;

    const xml = parser.parse(await response.text());
    const device = xml?.root?.device;

    const serviceList = device?.serviceList?.service;
    const services = Array.isArray(serviceList) ? serviceList : serviceList ? [serviceList] : [];

    const avTransportService = services.find(
      (s: any) => s.serviceType === 'urn:schemas-upnp-org:service:AVTransport:1'
    );

    return {
      id: device?.UDN || `uuid:${deviceInfo.ip}:${deviceInfo.port}`,
      name: device?.friendlyName || `Device at ${deviceInfo.ip}`,
      type: 'upnp',
      host: deviceInfo.ip,
      port: deviceInfo.port,
      serviceUrl: `http://${deviceInfo.ip}:${deviceInfo.port}`,
      controlUrl: avTransportService?.controlURL || '/upnp/control/rendertransport1',
      manufacturer: device?.manufacturer || 'Unknown',
    };
  } catch (error) {
    console.error('[UPNP] Fetch device description error:', error);
    return null;
  }
}

export function discoverUpnpDevices(
  timeout: number = 5000,
  onDeviceFound?: (device: RemoteDevice) => void
): Promise<RemoteDevice[]> {
  return new Promise((resolve, reject) => {
    if (!dgram?.createSocket) {
      reject(new Error('react-native-udp not available'));
      return;
    }

    const devices = new Map<string, RemoteDevice>();
    const socket = dgram.createSocket({ type: 'udp4', reusePort: true });

    socket.on('message', async (msg: Buffer) => {
      const deviceInfo = parseSsdpResponse(msg);
      if (!deviceInfo || devices.has(deviceInfo.location)) return;

      const device = await fetchDeviceDescription(deviceInfo);
      if (device) {
        devices.set(deviceInfo.location, device);
        onDeviceFound?.(device);
      }
    });

    socket.on('error', (err: Error) => {
      console.error('[UPNP] Socket error:', err);
      socket.close();
      reject(err);
    });

    socket.on('listening', () => {
      const packet = createMSearchPacket();
      socket.send(packet, 0, packet.length, SSDP_PORT, SSDP_ADDRESS, (err?: Error) => {
        if (err) {
          socket.close();
          reject(err);
        }
      });

      setTimeout(() => {
        socket.close();
        resolve(Array.from(devices.values()));
      }, timeout);
    });

    try {
      socket.bind();
    } catch (error) {
      reject(error);
    }
  });
}
