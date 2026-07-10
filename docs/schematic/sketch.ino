#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

const char* ssid     = "Wokwi-GUEST";
const char* password = "";

WebServer server(80);

#define NUM_JOINTS 7
const int servoPins[NUM_JOINTS] = {13, 12, 14, 27, 26, 25, 33};
Servo servos[NUM_JOINTS];

struct JointLimit { float lower; float upper; };
JointLimit jointLimits[NUM_JOINTS] = {
  {-3.1416, 3.1416},
  {-2.0944, 2.0944},
  {-2.6180, 2.6180},
  {-3.1416, 3.1416},
  {-2.0944, 2.0944},
  {-3.1416, 3.1416},
  {-2.0944, 2.0944}
};

#define DEBUG_SWEEP_MODE true

void moveJoint(int jointIndex, float angle_rad);

void debugSweepLoop() {
  static unsigned long lastMove = 0;
  static int step = 0;
  if (millis() - lastMove < 1500) return;
  lastMove = millis();

  int jointIndex = (step / 3) % NUM_JOINTS;
  int phase = step % 3;
  float lower = jointLimits[jointIndex].lower;
  float upper = jointLimits[jointIndex].upper;
  float angle = (phase == 0) ? lower : (phase == 1) ? (lower + upper) / 2.0 : upper;

  Serial.printf("[DEBUG SWEEP] joint %d -> %.3f rad\n", jointIndex, angle);
  moveJoint(jointIndex, angle);
  step++;
}

void addCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void handleOptions() {
  addCorsHeaders();
  server.send(204);
}

int angleToServoDeg(float angle_rad, float lower, float upper) {
  float angle_deg = (angle_rad - lower) / (upper - lower) * 180.0;
  return (int)constrain(angle_deg, 0, 180);
}

bool isWithinLimit(int jointIndex, float angle_rad) {
  if (jointIndex < 0 || jointIndex >= NUM_JOINTS) return false;
  return angle_rad >= jointLimits[jointIndex].lower &&
         angle_rad <= jointLimits[jointIndex].upper;
}

void moveJoint(int jointIndex, float angle_rad) {
  if (!isWithinLimit(jointIndex, angle_rad)) {
    Serial.printf("[SAFETY] Joint %d angle %.3f rejected (out of limit)\n",
                  jointIndex, angle_rad);
    return;
  }
  int deg = angleToServoDeg(angle_rad,
                            jointLimits[jointIndex].lower,
                            jointLimits[jointIndex].upper);
  servos[jointIndex].write(deg);
}

void handleRoot() {
  addCorsHeaders();
  server.send(200, "application/json",
    "{\"status\":\"ok\",\"device\":\"vantage-arm-esp32\",\"joints\":7}");
}

void handleHealth() {
  addCorsHeaders();
  StaticJsonDocument<256> doc;
  doc["wifi_connected"] = (WiFi.status() == WL_CONNECTED);
  doc["ip"] = WiFi.localIP().toString();
  String out;
  serializeJson(doc, out);
  server.send(200, "application/json", out);
}

void handleMove() {
  addCorsHeaders();

  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"no body\"}");
    return;
  }

  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, server.arg("plain"));
  if (err) {
    server.send(400, "application/json", "{\"error\":\"bad json\"}");
    return;
  }

  JsonArray joints = doc["joints"];
  if (joints.size() != NUM_JOINTS) {
    server.send(400, "application/json", "{\"error\":\"expected 7 joint angles\"}");
    return;
  }

  bool allValid = true;
  for (int i = 0; i < NUM_JOINTS; i++) {
    float angle = joints[i];
    if (!isWithinLimit(i, angle)) allValid = false;
  }

  if (!allValid) {
    server.send(422, "application/json", "{\"error\":\"one or more joints out of limit, motion rejected\"}");
    return;
  }

  for (int i = 0; i < NUM_JOINTS; i++) {
    moveJoint(i, joints[i]);
  }

  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

void setup() {
  Serial.begin(115200);

  for (int i = 0; i < NUM_JOINTS; i++) {
    servos[i].setPeriodHertz(50);
    servos[i].attach(servoPins[i], 500, 2500);
    servos[i].write(90);
  }

  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password, 6);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected: " + WiFi.localIP().toString());

  server.on("/", HTTP_GET, handleRoot);
  server.on("/health", HTTP_GET, handleHealth);
  server.on("/move", HTTP_POST, handleMove);
  server.on("/move", HTTP_OPTIONS, handleOptions);
  server.begin();
}

void loop() {
  server.handleClient();

#if DEBUG_SWEEP_MODE
  debugSweepLoop();
#endif
}