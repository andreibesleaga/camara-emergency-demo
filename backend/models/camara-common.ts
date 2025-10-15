/**
 * CAMARA Common Data Types
 * 
 * Implementation based on CAMARA_common.yaml
 * Reference: https://github.com/camaraproject/Commonalities/blob/main/artifacts/CAMARA_common.yaml
 * Version: 0.6
 */

/**
 * Correlation id for the different services
 * Pattern: ^[a-zA-Z0-9-_:;.\/<>{}]{0,256}$
 */
export type XCorrelator = string;

/**
 * A public identifier addressing a telephone subscription.
 * In mobile networks it corresponds to the MSISDN.
 * Must be formatted in international format (E.164), prefixed with '+'.
 * Pattern: ^\+[1-9][0-9]{4,14}$
 */
export type PhoneNumber = string;

/**
 * A public identifier addressing a subscription in a mobile network.
 * In 3GPP terminology, it corresponds to the GPSI formatted with
 * the External Identifier ({Local Identifier}@{Domain Identifier}).
 */
export type NetworkAccessIdentifier = string;

/**
 * A single IPv4 address with no subnet mask
 */
export type SingleIpv4Addr = string;

/**
 * TCP or UDP port number (0-65535)
 */
export type Port = number;

/**
 * The device should be identified by either the public (observed) IP address
 * and port as seen by the application server, or the private (local) and any
 * public (observed) IP addresses in use by the device.
 */
export interface DeviceIpv4Addr {
  publicAddress: SingleIpv4Addr;
  privateAddress?: SingleIpv4Addr;
  publicPort?: Port;
}

/**
 * IPv6 address - the device should be identified by the observed IPv6 address,
 * or by any single IPv6 address from within the subnet allocated to the device.
 */
export type DeviceIpv6Address = string;

/**
 * End-user equipment able to connect to a mobile network.
 * Examples of devices include smartphones or IoT sensors/actuators.
 * 
 * The developer can choose to provide these device identifiers:
 * - ipv4Address
 * - ipv6Address
 * - phoneNumber
 * - networkAccessIdentifier
 * 
 * NOTE: the network operator might support only a subset of these options.
 * The API invoker can provide multiple identifiers to be compatible across
 * different network operators. In this case the identifiers MUST belong to
 * the same device.
 */
export interface Device {
  phoneNumber?: PhoneNumber;
  networkAccessIdentifier?: NetworkAccessIdentifier;
  ipv4Address?: DeviceIpv4Addr;
  ipv6Address?: DeviceIpv6Address;
}

/**
 * An identifier for the end-user equipment that the response refers to.
 * This is a Device with exactly one identifier (maxProperties: 1).
 */
export type DeviceResponse = Device;

/**
 * Latitude component of a location (-90 to 90)
 */
export type Latitude = number;

/**
 * Longitude component of a location (-180 to 180)
 */
export type Longitude = number;

/**
 * Coordinates (latitude, longitude) defining a location in a map
 */
export interface Point {
  latitude: Latitude;
  longitude: Longitude;
}

/**
 * List of points defining a polygon (3-15 points)
 */
export type PointList = Point[];

/**
 * Type of area
 */
export enum AreaType {
  CIRCLE = 'CIRCLE',
  POLYGON = 'POLYGON',
}

/**
 * Base schema for all areas
 */
export interface Area {
  areaType: AreaType;
}

/**
 * Circular area
 */
export interface Circle extends Area {
  areaType: AreaType.CIRCLE;
  /** Coordinates defining the center of the circle */
  center: Point;
  /** Distance from the center in meters (minimum: 1) */
  radius: number;
}

/**
 * Polygonal area. The Polygon should be a simple polygon,
 * i.e. should not intersect itself.
 */
export interface Polygon extends Area {
  areaType: AreaType.POLYGON;
  /** List of points defining the polygon boundary (3-15 points) */
  boundary: PointList;
}

/**
 * Time period with start and optional end date
 */
export interface TimePeriod {
  /** Start of the time period (RFC 3339 format with timezone) */
  startDate: string;
  /** End of the time period (RFC 3339 format with timezone). If not included, period has no ending date. */
  endDate?: string;
}

/**
 * CAMARA standard error information
 */
export interface ErrorInfo {
  /** HTTP response status code */
  status: number;
  /** A human-readable code to describe the error */
  code: string;
  /** A human-readable description of what the event represents */
  message: string;
}

/**
 * Validation helper: checks if a string is a valid PhoneNumber
 */
export function isValidPhoneNumber(value: string): boolean {
  return /^\+[1-9][0-9]{4,14}$/.test(value);
}

/**
 * Validation helper: checks if a string is a valid IPv4 address
 */
export function isValidIpv4(value: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value) && 
         value.split('.').every(octet => parseInt(octet, 10) <= 255);
}

/**
 * Validation helper: checks if a string is a valid IPv6 address
 */
export function isValidIpv6(value: string): boolean {
  return /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/.test(value);
}

/**
 * Validation helper: checks if a Device has at least one identifier
 */
export function isValidDevice(device: Device): boolean {
  return !!(
    device.phoneNumber ||
    device.networkAccessIdentifier ||
    device.ipv4Address ||
    device.ipv6Address
  );
}

/**
 * Validation helper: checks if a Point is valid
 */
export function isValidPoint(point: Point): boolean {
  return (
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

/**
 * Validation helper: checks if a Polygon is valid
 */
export function isValidPolygon(polygon: Polygon): boolean {
  return (
    polygon.areaType === AreaType.POLYGON &&
    polygon.boundary.length >= 3 &&
    polygon.boundary.length <= 15 &&
    polygon.boundary.every(isValidPoint)
  );
}
