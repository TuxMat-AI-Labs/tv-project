/**
 * Samsung MDC (Multiple Display Control) wire format.
 *
 * Why this exists: the office panels are QM55C commercial signage. Their
 * misbehaviour is invisible to the browser — a display can report a viewport
 * identical to a healthy one and still crop its output, because the scaling
 * happens below the web layer. MDC is the only channel that can see the panel's
 * own configuration, so it is the only way to compare a broken panel against a
 * working one and find what actually differs.
 *
 * Transport: TCP port 1515 on the panel (or RS-232C). This runs from a machine
 * on the office LAN — NOT from the deployed app, which has no route to them.
 *
 * ── Packet format ─────────────────────────────────────────────────────────
 *
 *   request   0xAA | command | displayId | dataLen | data… | checksum
 *   response  0xAA |   0xFF  | displayId | dataLen | ack | rCommand | data… | checksum
 *
 *   checksum = (sum of every byte EXCEPT the 0xAA header) & 0xFF
 *   ack      = 'A' (0x41) acknowledged, 'N' (0x4E) negative
 *
 * ── A deliberate limitation ───────────────────────────────────────────────
 *
 * Command codes and response layouts vary between Samsung model families, and
 * the exact byte order of a Status reply on the QMC series is not something to
 * take on faith. So: only codes that are stable across the published MDC
 * specs are named here, every reply keeps its RAW bytes alongside any
 * interpretation, and the CLI can send an arbitrary command so an unknown one
 * can be probed without editing this file.
 *
 * Same principle as the viewport telemetry in display-health.md — store what
 * the device actually said, and treat the interpretation as a guess that a
 * human can overrule.
 */

/** Setting key holding the most recent panel dump (see /hub/troubleshoot). */
export const MDC_REPORT_KEY = "mdc:last-report";

export const MDC_PORT = 1515;
export const HEADER = 0xaa;
export const ACK = 0x41; // 'A'
export const NAK = 0x4e; // 'N'

/**
 * Broadcast id. Individual panels are usually 0 or 1 unless someone set them;
 * 0xFE addresses "any", which is what you want when probing an unknown wall.
 */
export const BROADCAST_ID = 0xfe;

/** Commands stable across the published MDC specs. */
export const CMD = {
  /** Power/volume/input/etc. in one reply. Layout differs by family — see note. */
  STATUS: 0x00,
  /** Panel diagonal in inches. Useful purely as a "is this really MDC?" probe. */
  SCREEN_SIZE: 0x0b,
  /** 0x00 off, 0x01 on. */
  POWER: 0x11,
  /** Current input source. */
  INPUT_SOURCE: 0x14,
} as const;

export function checksum(bytes: number[]): number {
  return bytes.reduce((sum, b) => sum + b, 0) & 0xff;
}

/** A command packet. `data` empty = a GET; non-empty = a SET. */
export function buildPacket(command: number, displayId: number, data: number[] = []): Buffer {
  const body = [command, displayId, data.length, ...data];
  return Buffer.from([HEADER, ...body, checksum(body)]);
}

export type MdcResponse = {
  displayId: number;
  /** True when the panel acknowledged; false is an explicit refusal, not a timeout. */
  ack: boolean;
  /** The command being answered. */
  command: number;
  /** Payload bytes, interpretation deliberately left to the caller. */
  data: number[];
  /** Whole frame as hex, so nothing is lost to a wrong guess about layout. */
  raw: string;
};

export class MdcParseError extends Error {}

export function parseResponse(buf: Buffer): MdcResponse {
  if (buf.length < 7) throw new MdcParseError(`short frame (${buf.length} bytes): ${buf.toString("hex")}`);
  if (buf[0] !== HEADER) throw new MdcParseError(`bad header 0x${buf[0].toString(16)}`);

  const dataLen = buf[3];
  const end = 4 + dataLen;
  if (buf.length < end + 1) {
    throw new MdcParseError(`truncated: says ${dataLen} data bytes, frame is ${buf.length}`);
  }

  const body = Array.from(buf.subarray(1, end));
  const expected = checksum(body);
  const actual = buf[end];
  if (expected !== actual) {
    throw new MdcParseError(
      `checksum mismatch (got 0x${actual.toString(16)}, expected 0x${expected.toString(16)}): ${buf.toString("hex")}`
    );
  }

  const ackByte = buf[4];
  return {
    displayId: buf[2],
    ack: ackByte === ACK,
    command: buf[5],
    data: Array.from(buf.subarray(6, end)),
    raw: buf.subarray(0, end + 1).toString("hex"),
  };
}

/**
 * Best-effort reading of a Status reply.
 *
 * Every field is optional and the raw bytes always travel with it: this layout
 * is the common one, but it is NOT confirmed for the QMC series, and a wrong
 * guess presented confidently is exactly how the last three weeks were lost.
 * Treat anything here as a hint to check on the panel, never as fact.
 */
export function interpretStatus(data: number[]): Record<string, number | undefined> {
  return {
    power: data[0],
    volume: data[1],
    mute: data[2],
    input: data[3],
    aspect: data[4],
  };
}
