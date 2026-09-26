/*
 * ============================================================================
 *  VEHICLE TRACKER — ESP32 FIRMWARE
 * ============================================================================
 *  Features:
 *    - Live GPS tracking (lat/lng/speed/heading)
 *    - Theft detection (ignition on while locked)
 *    - Remote engine immobilizer (relay cuts starter circuit)
 *    - City geofence alerts (leaving home radius)
 *    - Speed alerts (over configurable limit)
 *    - Harsh braking / acceleration detection
 *    - Idle detection (engine on, not moving)
 *    - Offline buffer (up to 50 pings)
 *    - Heartbeat every 60s
 *    - Status LED + optional buzzer
 *
 *  Board: ESP32 DevKit v1
 *  Libraries: TinyGPSPlus, ArduinoJson (v6), WiFi, HTTPClient
 *
 *  ⚠️ RELAY WIRING (DO NOT GET THIS WRONG):
 *    COM → starter signal wire (car harness side)
 *    NC  → starter signal wire (solenoid side)
 *    Coil → GPIO 5 + GND
 *    NEVER cut ignition or fuel pump wires.
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPS++.h>
#include <ArduinoJson.h>

// ============================================================================
//                          CONFIGURATION
// ============================================================================

// Wi-Fi credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Your Vercel backend
const char* SERVER_BASE   = "https://vehicle-tracker-sfo1.vercel.app";
const char* DEVICE_ID     = "vehicle-001";   // MUST match deviceId in your DB
const char* DEVICE_SECRET = "YOUR_DEVICE_HMAC_SECRET"; // Same as server env

// Pins
#define GPS_RX_PIN    16
#define GPS_TX_PIN    17
#define IGNITION_PIN  4
#define RELAY_PIN     5
#define BUZZER_PIN    18
#define LED_PIN       2

// Timing (milliseconds)
const unsigned long GPS_SEND_INTERVAL     = 10000;   // 10s
const unsigned long COMMAND_POLL_INTERVAL = 15000;   // 15s
const unsigned long HEARTBEAT_INTERVAL    = 60000;   // 60s

// Alert thresholds
const float MAX_SPEED_KMH           = 120.0;  // Speed alert
const float HARSH_ACCEL_THRESHOLD   = 25.0;   // km/h change over 3s
const float HOME_RADIUS_METERS      = 15000;  // 15 km = home city
const unsigned long IDLE_TIMEOUT_MS = 600000; // 10 min idle

// Home coordinates (set to your home city center)
const double HOME_LAT = 24.8607;  // Karachi
const double HOME_LNG = 67.0011;

// ============================================================================
//                          GLOBALS
// ============================================================================

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

unsigned long lastGpsSend        = 0;
unsigned long lastCommandPoll    = 0;
unsigned long lastHeartbeat      = 0;
unsigned long lastMovementTime   = 0;
unsigned long lastSpeedCheckTime = 0;

bool  engineOn           = false;
bool  engineLocked       = false;
bool  lastIgnitionState  = false;
bool  sentTheftAlert     = false;
bool  sentGeofenceAlert  = false;
bool  sentSpeedAlert     = false;
bool  isOutsideHome      = false;

float lastSpeed         = 0;
float lastSpeedSample   = 0;

// Offline buffer (stores JSON strings when Wi-Fi is down)
#define MAX_BUFFER 50
String offlineBuffer[MAX_BUFFER];
int bufferCount = 0;

// ============================================================================
//                          SETUP
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== Vehicle Tracker Booting ===");

  pinMode(IGNITION_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);

  digitalWrite(RELAY_PIN, LOW);   // Unlocked by default
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_PIN, LOW);

  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("[GPS] Serial initialized");

  connectToWiFi();
  lastMovementTime = millis();

  Serial.println("=== Ready ===\n");
}

// ============================================================================
//                          MAIN LOOP
// ============================================================================

void loop() {
  // Feed GPS continuously
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  // Read ignition
  bool currentIgnition = digitalRead(IGNITION_PIN) == HIGH;
  if (currentIgnition != lastIgnitionState) {
    Serial.print("[IGNITION] State changed: ");
    Serial.println(currentIgnition ? "ON" : "OFF");
    lastIgnitionState = currentIgnition;
    if (currentIgnition) lastMovementTime = millis();
  }
  engineOn = currentIgnition;

  // --- Theft detection (priority) ---
  if (engineLocked && engineOn && !sentTheftAlert) {
    Serial.println("[ALERT] THEFT ATTEMPT — ignition on while locked!");
    triggerBuzzer();
    sendAlert("UNAUTHORIZED_START_ATTEMPT", "Someone tried to start the locked engine");
    sentTheftAlert = true;
  }
  if (!engineOn) sentTheftAlert = false;

  // --- Speed checks (every 3s) ---
  if (millis() - lastSpeedCheckTime > 3000) {
    checkSpeedAlerts();
    lastSpeedCheckTime = millis();
  }

  // --- Geofence check ---
  if (gps.location.isValid()) {
    checkGeofence();
  }

  // --- Idle detection ---
  if (engineOn && gps.location.isValid()) {
    if (gps.speed.kmph() > 3.0) {
      lastMovementTime = millis();
    } else if (millis() - lastMovementTime > IDLE_TIMEOUT_MS) {
      // Optional: send idle alert once per session
      // sendAlert("IDLE_TOO_LONG", "Engine idle for over 10 minutes");
      // lastMovementTime = millis(); // reset to avoid spam
    }
  }

  // --- Periodic GPS send ---
  if (millis() - lastGpsSend > GPS_SEND_INTERVAL) {
    lastGpsSend = millis();
    sendVehicleData();
  }

  // --- Command polling (lock/unlock from app) ---
  if (millis() - lastCommandPoll > COMMAND_POLL_INTERVAL) {
    lastCommandPoll = millis();
    checkLockCommand();
  }

  // --- Heartbeat ---
  if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL)    {
    lastHeartbeat = millis();
    sendHeartbeat();
  }

  // --- Flush offline buffer whenever Wi-Fi is up ---
  if (WiFi.status() == WL_CONNECTED && bufferCount > 0) {
    flushOfflineBuffer();
  }

  // --- Status LED ---
  updateLED();

  delay(50);
}

// ============================================================================
//                          WIFI
// ============================================================================

void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("[WiFi] Connecting to ");
  Serial.print(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected. IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[WiFi] FAILED — will retry");
  }
}

// ============================================================================
//                          SEND VEHICLE DATA
// ============================================================================

void sendVehicleData() {
  if (!gps.location.isValid()) {
    Serial.println("[GPS] Waiting for fix...");
    return;
  }

  StaticJsonDocument<512> doc;
  doc["deviceId"]          = DEVICE_ID;
  doc["lat"]               = gps.location.lat();
  doc["lng"]               = gps.location.lng();
  doc["speed"]             = gps.speed.kmph();
  doc["heading"]           = gps.course.deg();
  doc["altitude"]          = gps.altitude.meters();
  doc["satellites"]        = gps.satellites.value();
  doc["hdop"]              = gps.hdop.hdop();
  doc["ignition"]          = engineOn;
  doc["immobilizerLocked"] = engineLocked;
  doc["wifiRSSI"]          = WiFi.RSSI();
  doc["uptime"]            = millis();
  doc["timestamp"]         = millis();

  String payload;
  serializeJson(doc, payload);

  if (WiFi.status() != WL_CONNECTED) {
    bufferOffline(payload);
    return;
  }

  HTTPClient http;
  http.begin(String(SERVER_BASE) + "/api/device/data");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Device-Secret", DEVICE_SECRET);
  http.setTimeout(10000);

  int code = http.POST(payload);
  if (code > 0) {
    Serial.printf("[HTTP] POST %d\n", code);
    String resp = http.getString();
    if (resp.indexOf("\"alert\":true") > -1) {
      Serial.println("[SERVER] Alert acknowledged");
      triggerBuzzer();
    }
  } else {
    Serial.printf("[HTTP] POST failed: %d\n", code);
    bufferOffline(payload);
  }

  http.end();
}

// ============================================================================
//                          SEND ALERT
// ============================================================================

void sendAlert(const char* event, const char* message) {
  StaticJsonDocument<384> doc;
  doc["deviceId"]  = DEVICE_ID;
  doc["event"]     = event;
  doc["message"]   = message;
  doc["lat"]       = gps.location.isValid() ? gps.location.lat() : 0;
  doc["lng"]       = gps.location.isValid() ? gps.location.lng() : 0;
  doc["speed"]     = gps.speed.kmph();
  doc["timestamp"] = millis();

  String payload;
  serializeJson(doc, payload);

  if (WiFi.status() != WL_CONNECTED) {
    bufferOffline(payload);
    return;
  }

  HTTPClient http;
  http.begin(String(SERVER_BASE) + "/api/device/alert");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Device-Secret", DEVICE_SECRET);
  http.setTimeout(10000);

  int code = http.POST(payload);
  Serial.printf("[ALERT] %s → HTTP %d\n", event, code);
  http.end();
}

// ============================================================================
//                          COMMAND POLLING
// ============================================================================

void checkLockCommand() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
    return;
  }

  HTTPClient http;
  String url = String(SERVER_BASE) + "/api/device/data?deviceId=" + DEVICE_ID;
  http.begin(url);
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Device-Secret", DEVICE_SECRET);
  http.setTimeout(8000);

  int code = http.GET();
  if (code == 200) {
    String payload = http.getString();

    DynamicJsonDocument doc(512);
    if (!deserializeJson(doc, payload)) {
      bool shouldLock = doc["lock"] | false;

      if (shouldLock != engineLocked) {
        engineLocked = shouldLock;
        // HIGH = relay energized = starter circuit cut (NC relay)
        digitalWrite(RELAY_PIN, engineLocked ? HIGH : LOW);
        Serial.printf("[IMMOBILIZER] %s\n",
                      engineLocked ? "ENGINE LOCKED" : "ENGINE UNLOCKED");

        // Beep twice on unlock, once on lock
        beep(engineLocked ? 1 : 2);
      }
    }
  } else {
    Serial.printf("[COMMAND] Poll failed: %d\n", code);
  }

  http.end();
}

// ============================================================================
//                          HEARTBEAT
// ============================================================================

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  StaticJsonDocument<256> doc;
  doc["deviceId"]  = DEVICE_ID;
  doc["event"]     = "heartbeat";
  doc["wifiRSSI"]  = WiFi.RSSI();
  doc["uptime"]    = millis();
  doc["sats"]      = gps.satellites.value();
  doc["locked"]    = engineLocked;
  doc["buffered"]  = bufferCount;

  String payload;
  serializeJson(doc, payload);

  HTTPClient http;
  http.begin(String(SERVER_BASE) + "/api/device/heartbeat");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Device-Secret", DEVICE_SECRET);
  http.setTimeout(8000);
  http.POST(payload);
  http.end();
}

// ============================================================================
//                          GEOFENCE
// ============================================================================

void checkGeofence() {
  double dist = haversineMeters(
    gps.location.lat(), gps.location.lng(),
    HOME_LAT, HOME_LNG
  );

  bool outsideNow = dist > HOME_RADIUS_METERS;

  // Left home city
  if (outsideNow && !sentGeofenceAlert) {
    Serial.printf("[GEOFENCE] Vehicle left home area (%.1f km away)\n", dist / 1000.0);
    sendAlert("GEOFENCE_EXIT",
              String("Vehicle left home city — " + String(dist / 1000.0, 1) + " km away").c_str());
    sentGeofenceAlert = true;
  }

  // Returned home
  if (!outsideNow && sentGeofenceAlert) {
    Serial.println("[GEOFENCE] Vehicle returned home");
    sendAlert("GEOFENCE_ENTER", "Vehicle returned to home city");
    sentGeofenceAlert = false;
  }

  isOutsideHome = outsideNow;
}

double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
  const double R = 6371000.0;
  double dLat = radians(lat2 - lat1);
  double dLon = radians(lon2 - lon1);
  double a = sin(dLat / 2) * sin(dLat / 2) +
             cos(radians(lat1)) * cos(radians(lat2)) *
             sin(dLon / 2) * sin(dLon / 2);
  double c = 2 * atan2(sqrt(a), sqrt(1 - a));
  return R * c;
}

// ============================================================================
//                          SPEED ALERTS
// ============================================================================

void checkSpeedAlerts() {
  if (!gps.speed.isValid()) return;

  float currentSpeed = gps.speed.kmph();

  // Over speed limit
  if (currentSpeed > MAX_SPEED_KMH && !sentSpeedAlert) {
    Serial.printf("[SPEED] Over limit: %.1f km/h\n", currentSpeed);
    sendAlert("SPEEDING",
              String("Exceeded " + String(MAX_SPEED_KMH) + " km/h — now " +
                     String(currentSpeed, 0) + " km/h").c_str());
    sentSpeedAlert = true;
  }
  if (currentSpeed < MAX_SPEED_KMH - 10) sentSpeedAlert = false;

  // Harsh acceleration / braking
  float delta = abs(currentSpeed - lastSpeedSample);
  if (delta > HARSH_ACCEL_THRESHOLD && lastSpeedSample > 0) {
    const char* type = (currentSpeed > lastSpeedSample) ? "HARSH_ACCEL" : "HARSH_BRAKE";
    Serial.printf("[DRIVE] %s detected (%.1f km/h change)\n", type, delta);
    sendAlert(type,
              String("Sudden speed change: " + String(delta, 0) + " km/h").c_str());
  }

  lastSpeedSample = currentSpeed;
  lastSpeed = currentSpeed;
}

// ============================================================================
//                          OFFLINE BUFFER
// ============================================================================

void bufferOffline(const String& payload) {
  if (bufferCount >= MAX_BUFFER) {
    // Drop oldest
    for (int i = 0; i < MAX_BUFFER - 1; i++) offlineBuffer[i] = offlineBuffer[i + 1];
    bufferCount = MAX_BUFFER - 1;
  }
  offlineBuffer[bufferCount++] = payload;
  Serial.printf("[BUFFER] Stored offline (%d/%d)\n", bufferCount, MAX_BUFFER);
}

void flushOfflineBuffer() {
  Serial.printf("[BUFFER] Flushing %d items...\n", bufferCount);

  for (int i = 0; i < bufferCount; i++) {
    HTTPClient http;
    http.begin(String(SERVER_BASE) + "/api/device/data");
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Id", DEVICE_ID);
    http.addHeader("X-Device-Secret", DEVICE_SECRET);
    http.setTimeout(8000);

    int code = http.POST(offlineBuffer[i]);
    http.end();

    if (code < 200 || code >= 300) {
      Serial.println("[BUFFER] Flush aborted — keeping remaining items");
      // Shift remaining
      for (int j = 0; j < bufferCount - i; j++) {
        offlineBuffer[j] = offlineBuffer[i + j];
      }
      bufferCount -= i;
      return;
    }
  }
  bufferCount = 0;
  Serial.println("[BUFFER] Cleared");
}

// ============================================================================
//                          LED & BUZZER
// ============================================================================

void updateLED() {
  unsigned long t = millis();
  if (engineLocked) {
    // Blink fast when locked
    digitalWrite(LED_PIN, (t / 250) % 2);
  } else if (WiFi.status() != WL_CONNECTED) {
    // Slow blink when offline
    digitalWrite(LED_PIN, (t / 1000) % 2);
  } else {
    // Solid when all good
    digitalWrite(LED_PIN, HIGH);
  }
}

void triggerBuzzer() {
  for (int i = 0; i < 5; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(200);
    digitalWrite(BUZZER_PIN, LOW);
    delay(200);
  }
}

void beep(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(80);
    digitalWrite(BUZZER_PIN, LOW);
    delay(120);
  }
}