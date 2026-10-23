/*
 * CodeCraft ↔ ESP32 over Bluetooth LE (Nordic UART Service)
 *
 * In CodeCraft:
 *   button1.onClick(async () => { await ble.connect('CodeCraft'); });
 *   button2.onClick(() => { ble.send('ON'); });
 *   button3.onClick(() => { ble.send('OFF'); });
 *   ble.onMessage((text) => { label1.text = 'บอร์ดส่งมา: ' + text; });
 *
 * Board: any ESP32 (Arduino core 3.x). LED on GPIO 2 (built-in on most boards).
 * Every 2 seconds the board sends the number of seconds since start.
 */
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SERVICE_UUID "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define RX_UUID      "6e400002-b5a3-f393-e0a9-e50e24dcca9e"  // app → board (write)
#define TX_UUID      "6e400003-b5a3-f393-e0a9-e50e24dcca9e"  // board → app (notify)
#define LED_PIN 2

BLECharacteristic *txChar;
bool connected = false;

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *server) override { connected = true; }
  void onDisconnect(BLEServer *server) override {
    connected = false;
    server->getAdvertising()->start();  // let the app reconnect
  }
};

class RxCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    String text = c->getValue();
    text.trim();
    if (text == "ON") digitalWrite(LED_PIN, HIGH);
    if (text == "OFF") digitalWrite(LED_PIN, LOW);
    Serial.println("from app: " + text);
  }
};

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

  BLEDevice::init("CodeCraft-ESP32");
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService *service = server->createService(SERVICE_UUID);
  txChar = service->createCharacteristic(TX_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  txChar->addDescriptor(new BLE2902());
  BLECharacteristic *rxChar = service->createCharacteristic(
      RX_UUID, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  rxChar->setCallbacks(new RxCallbacks());
  service->start();

  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->start();
  Serial.println("Waiting for CodeCraft…");
}

void loop() {
  if (connected) {
    String message = String(millis() / 1000) + "\n";
    txChar->setValue(message.c_str());
    txChar->notify();
  }
  delay(2000);
}
