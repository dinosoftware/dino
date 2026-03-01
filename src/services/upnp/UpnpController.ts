/**
 * Dino Music App - UPNP Controller
 * Core UPNP control logic (SOAP requests, state polling)
 */

import { XMLParser } from 'fast-xml-parser';
import { RemoteDevice } from '../../stores/remotePlaybackStore';

const parser = new XMLParser({ removeNSPrefix: true });

const STATE_VALUES: Record<string, string> = {
  PLAYING: 'playing',
  PAUSED_PLAYBACK: 'paused',
  STOPPED: 'stopped',
  TRANSITIONING: 'buffering',
  NO_MEDIA_PRESENT: 'stopped',
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr || timeStr === 'NOT_IMPLEMENTED') return 0;
  const parts = timeStr.split(':');
  if (parts.length !== 3) return 0;
  return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
}

interface SoapRequestResult {
  success: boolean;
  data?: any;
  error?: any;
}

async function sendSoapRequest(
  device: RemoteDevice,
  action: string,
  params: Record<string, string>,
  serviceType: string = 'AVTransport'
): Promise<SoapRequestResult> {
  const defaultUrls: Record<string, string> = {
    AVTransport: '/AVTransport/control',
    RenderingControl: '/RenderingControl/control',
  };

  const controlUrl = device.controlUrl || defaultUrls[serviceType];
  const url = `${device.serviceUrl}${controlUrl}`;

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"
            s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:${action} xmlns:u="urn:schemas-upnp-org:service:${serviceType}:1">
      ${Object.entries(params)
        .map(([k, v]) => `<${k}>${escapeXml(v)}</${k}>`)
        .join('\n')}
    </u:${action}>
  </s:Body>
</s:Envelope>`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset="utf-8"',
        SOAPAction: `"urn:schemas-upnp-org:service:${serviceType}:1#${action}"`,
      },
      body: soapEnvelope,
    });

    const text = await response.text();
    return { success: response.ok, data: parser.parse(text) };
  } catch (error) {
    console.error('[UPNP] SOAP request failed:', error);
    return { success: false, error };
  }
}

function createDIDL(
  metadata: { title: string; artist: string; album: string; coverUrl?: string },
  streamUrl: string
): string {
  const { title = 'Unknown', artist = 'Unknown', album = 'Unknown', coverUrl = '' } = metadata;
  return escapeXml(`<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/">
  <item id="1" parentID="0" restricted="1">
    <dc:title>${title}</dc:title>
    <upnp:artist>${artist}</upnp:artist>
    <upnp:album>${album}</upnp:album>
    ${coverUrl ? `<upnp:albumArtURI>${coverUrl}</upnp:albumArtURI>` : ''}
    <upnp:class>object.item.audioItem.musicTrack</upnp:class>
    <res protocolInfo="http-get:*:audio/mpeg:*">${streamUrl}</res>
  </item>
</DIDL-Lite>`);
}

class UpnpController {
  async load(
    device: RemoteDevice,
    url: string,
    metadata: { title: string; artist: string; album: string; coverUrl?: string }
  ): Promise<boolean> {
    const didl = createDIDL(metadata, url);
    console.log('[UpnpController] Loading URL:', url, 'on device:', device.name);
    const result = await sendSoapRequest(device, 'SetAVTransportURI', {
      InstanceID: '0',
      CurrentURI: url,
      CurrentURIMetaData: didl,
    });
    console.log('[UpnpController] SetAVTransportURI result:', result.success);
    return result.success;
  }

  async play(device: RemoteDevice): Promise<boolean> {
    const result = await sendSoapRequest(device, 'Play', {
      InstanceID: '0',
      Speed: '1',
    });
    return result.success;
  }

  async pause(device: RemoteDevice): Promise<boolean> {
    const result = await sendSoapRequest(device, 'Pause', {
      InstanceID: '0',
    });
    return result.success;
  }

  async stop(device: RemoteDevice): Promise<boolean> {
    const result = await sendSoapRequest(device, 'Stop', {
      InstanceID: '0',
    });
    return result.success;
  }

  async seek(device: RemoteDevice, position: number): Promise<boolean> {
    const result = await sendSoapRequest(device, 'Seek', {
      InstanceID: '0',
      Unit: 'REL_TIME',
      Target: formatTime(position),
    });
    return result.success;
  }

  async setVolume(device: RemoteDevice, volume: number): Promise<boolean> {
    const result = await sendSoapRequest(
      device,
      'SetVolume',
      {
        InstanceID: '0',
        Channel: 'Master',
        DesiredVolume: Math.round(volume).toString(),
      },
      'RenderingControl'
    );
    return result.success;
  }

  async getVolume(device: RemoteDevice): Promise<number> {
    const result = await sendSoapRequest(
      device,
      'GetVolume',
      {
        InstanceID: '0',
        Channel: 'Master',
      },
      'RenderingControl'
    );
    const volume = result.data?.Envelope?.Body?.GetVolumeResponse?.CurrentVolume;
    return volume ? parseInt(volume, 10) / 100 : 1;
  }

  async getState(device: RemoteDevice): Promise<string> {
    const result = await sendSoapRequest(device, 'GetTransportInfo', {
      InstanceID: '0',
    });
    const state = result.data?.Envelope?.Body?.GetTransportInfoResponse?.CurrentTransportState;
    return STATE_VALUES[state] || 'stopped';
  }

  async getPosition(device: RemoteDevice): Promise<{ position: number; duration: number }> {
    const result = await sendSoapRequest(device, 'GetPositionInfo', {
      InstanceID: '0',
    });

    const body = result.data?.Envelope?.Body?.GetPositionInfoResponse;
    return {
      position: parseTimeToSeconds(body?.RelTime),
      duration: parseTimeToSeconds(body?.TrackDuration),
    };
  }
}

export const upnpController = new UpnpController();
