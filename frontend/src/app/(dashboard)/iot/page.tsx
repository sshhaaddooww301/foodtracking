"use client";
import React, { useEffect, useState } from "react";
import {
  Cpu,
  Radio,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  Thermometer,
  Droplets,
  Battery,
  MapPin,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { iotApi } from "@/services/api";
import { IoTReading, IoTDevice } from "@/types";
import { Button, Card, Select } from "@/components/ui/primitives";

export default function IoTTelemetryPage() {
  const [readings, setReadings] = useState<IoTReading[]>([]);
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("IOT-MUM-001");
  const [simulationMode, setSimulationMode] = useState("NORMAL");
  const [durationSec, setDurationSec] = useState(30);
  const [injecting, setInjecting] = useState(false);
  const [lastInjectedMsg, setLastInjectedMsg] = useState<string | null>(null);

  const fetchReadings = async () => {
    try {
      const [rRes, dRes] = await Promise.all([
        iotApi.getReadings({ size: 15 }).catch(() => null),
        iotApi.getDevices().catch(() => null),
      ]);
      if (rRes?.data?.items) setReadings(rRes.data.items);
      if (dRes?.data?.items) setDevices(dRes.data.items);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchReadings();
    const interval = setInterval(fetchReadings, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleInjectMode = async () => {
    setInjecting(true);
    setLastInjectedMsg(null);
    try {
      const res = await iotApi.controlSimulator({
        device_id: selectedDevice,
        mode: simulationMode,
        duration_seconds: durationSec,
      });
      setLastInjectedMsg(
        `Simulator updated: ${selectedDevice} switched to ${simulationMode} for ${durationSec}s!`
      );
      setTimeout(fetchReadings, 1500);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to command IoT Simulator");
    } finally {
      setInjecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Cpu className="w-6 h-6 text-navy-900" />
            IoT Telemetry & Anomaly Simulation Deck
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cryptographically signed sensor streams, HMAC verification, replay defense, and breach injection
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
          Telemetry Engine Running
        </div>
      </div>

      {/* Simulator Control Panel */}
      <Card className="p-5 border-l-4 border-l-navy-900">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-navy-900" />
            <h2 className="text-sm font-bold text-foreground">
              Hardware / Simulator Control Console
            </h2>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Inject sensor failures to trigger fraud engines in real-time
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-muted-foreground font-medium mb-1">Target Device</label>
            <Select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="text-xs"
            >
              <option value="IOT-MUM-001">IOT-MUM-001 (Mumbai Cold Store)</option>
              <option value="IOT-DEL-001">IOT-DEL-001 (Delhi Distribution)</option>
              <option value="IOT-BLR-001">IOT-BLR-001 (Bengaluru Reefer)</option>
            </Select>
          </div>

          <div>
            <label className="block text-muted-foreground font-medium mb-1">Simulation Mode</label>
            <Select
              value={simulationMode}
              onChange={(e) => setSimulationMode(e.target.value)}
              className="text-xs font-semibold"
            >
              <option value="NORMAL">NORMAL (Compliant 2°C - 8°C)</option>
              <option value="COLD_CHAIN_BREACH">COLD_CHAIN_BREACH (+24°C Spike)</option>
              <option value="GPS_ANOMALY">GPS_ANOMALY (Route Deviation)</option>
              <option value="SENSOR_TAMPERING">SENSOR_TAMPERING (Signature Invalid)</option>
              <option value="REPLAY_ATTACK">REPLAY_ATTACK (Duplicate Nonce)</option>
              <option value="DEVICE_OFFLINE">DEVICE_OFFLINE (Dropout)</option>
            </Select>
          </div>

          <div>
            <label className="block text-muted-foreground font-medium mb-1">Duration</label>
            <Select
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value))}
              className="text-xs"
            >
              <option value={15}>15 Seconds</option>
              <option value={30}>30 Seconds</option>
              <option value={60}>60 Seconds</option>
              <option value={120}>2 Minutes</option>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="primary"
              size="md"
              className="w-full text-xs gap-1.5"
              isLoading={injecting}
              onClick={handleInjectMode}
            >
              <Play className="w-3.5 h-3.5" />
              Inject Anomaly
            </Button>
          </div>
        </div>

        {lastInjectedMsg && (
          <div className="mt-3 p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            ✅ {lastInjectedMsg}
          </div>
        )}
      </Card>

      {/* Telemetry Stream Table */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Live Telemetric Stream</h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
              polling: 4s
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            {readings.length} latest packets
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Device ID</th>
                <th className="py-3 px-4">Temperature</th>
                <th className="py-3 px-4">Humidity</th>
                <th className="py-3 px-4">Battery & GPS</th>
                <th className="py-3 px-4">HMAC Signature</th>
                <th className="py-3 px-4">Anomaly Flag</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {readings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground font-sans">
                    Waiting for IoT telemetry packets from simulator...
                  </td>
                </tr>
              ) : (
                readings.map((r) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-muted/30 transition-colors ${
                      r.is_anomaly ? "bg-red-500/5 dark:bg-red-950/20" : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-foreground font-sans">
                      {r.device_id}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold ${
                          r.temperature > 8.0 || r.temperature < 2.0
                            ? "text-red-600 dark:text-red-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {r.temperature.toFixed(1)}°C
                      </span>
                    </td>
                    <td className="py-3 px-4 text-foreground">
                      {r.humidity.toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-[11px]">
                      <div>🔋 {r.battery.toFixed(0)}%</div>
                      <div>📍 {r.latitude.toFixed(3)}, {r.longitude.toFixed(3)}</div>
                    </td>
                    <td className="py-3 px-4">
                      {r.signature_valid ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-sans">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          VERIFIED
                        </span>
                      ) : (
                        <span className="text-[10px] text-red-600 dark:text-red-400 flex items-center gap-1 font-sans">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          INVALID SIGNATURE
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {r.is_anomaly ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-500 font-sans">
                          BREACH DETECTED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-sans">
                          NOMINAL
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground text-[11px]">
                      {new Date(r.reading_timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
