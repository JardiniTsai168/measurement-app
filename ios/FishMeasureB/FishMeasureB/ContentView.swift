//
//  ContentView.swift
//  FishMeasureB
//

import SwiftUI

struct ContentView: View {
    @StateObject private var measurementManager = MeasurementManager()
    @StateObject private var locationManager = LocationManager()
    private let weatherService = WeatherService()
    
    @State private var isPlaneReady = false
    @State private var instructionText = "移動手機側測地面..."
    @State private var showResult = false
    @State private var measurementResult: FishMeasurement?
    @State private var showHistory = false
    @State private var shouldResetAR = false
    
    // Storage
    @State private var measurements: [FishMeasurement] = []
    
    var body: some View {
        NavigationView {
            ZStack {
                // AR Camera
                ARMeasurementView(
                    measurementManager: measurementManager,
                    isPlaneReady: $isPlaneReady,
                    instructionText: $instructionText,
                    showResult: $showResult,
                    measurementResult: $measurementResult,
                    shouldResetAR: $shouldResetAR,
                    locationManager: locationManager,
                    weatherService: weatherService
                )
                .edgesIgnoringSafeArea(.all)
                
                // UI Overlay
                VStack {
                    topBar
                    Spacer()
                    bottomPanel
                }
                
                // Instruction Toast
                if !instructionText.isEmpty {
                    VStack {
                        Text(instructionText)
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding()
                            .background(Color.black.opacity(0.7))
                            .cornerRadius(12)
                            .padding(.top, 100)
                        Spacer()
                    }
                }
                
                // Result Modal
                if showResult, let result = measurementResult {
                    ResultOverlay(result: result, onSave: {
                        saveMeasurement(result)
                    }, onReset: {
                        resetMeasurement()
                    })
                    .transition(.move(edge: .bottom))
                }
            }
            .navigationBarHidden(true)
        }
        .onAppear {
            locationManager.requestPermission()
            loadHistory()
        }
    }
    
    private var topBar: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Label("裝置: \(DeviceCapability.shared.depthCapability.description)", systemImage: "cpu")
                    .font(.caption)
                    .foregroundColor(.white)
                if isPlaneReady {
                    Label("平面已側測", systemImage: "checkmark.circle.fill")
                        .font(.caption)
                        .foregroundColor(.green)
                } else {
                    Label("側測平面中...", systemImage: "arrow.triangle.2.circlepath")
                        .font(.caption)
                        .foregroundColor(.yellow)
                }
            }
            Spacer()
            Button(action: { showHistory = true }) {
                Image(systemName: "list.bullet.rectangle")
                    .font(.title2)
                    .foregroundColor(.white)
                    .padding(8)
                    .background(Color.black.opacity(0.5))
                    .clipShape(Circle())
            }
            .sheet(isPresented: $showHistory) {
                HistoryView(measurements: measurements, onDelete: deleteMeasurement)
            }
        }
        .padding()
        .background(
            LinearGradient(
                gradient: Gradient(colors: [Color.black.opacity(0.6), Color.clear]),
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }
    
    private var bottomPanel: some View {
        VStack(spacing: 12) {
            HStack(spacing: 20) {
                // Head marker status
                StatusPill(
                    label: "頭",
                    isActive: measurementManager.isHeadPlaced,
                    color: .red
                )
                
                // Tail marker status
                StatusPill(
                    label: "尾",
                    isActive: measurementManager.isTailPlaced,
                    color: .blue
                )
                
                if measurementManager.canMeasure {
                    Text(measurementManager.distanceMeters > 0 ?
                         String(format: "%.1f cm", measurementManager.distanceMeters * 100) :
                         "--")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundColor(.yellow)
                        .shadow(radius: 4)
                }
            }
            
            if measurementManager.isTailPlaced {
                Button(action: resetMeasurement) {
                    Label("重新量測", systemImage: "arrow.counterclockwise")
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.blue)
                        .cornerRadius(12)
                }
                .padding(.horizontal)
            }
        }
        .padding()
        .background(
            LinearGradient(
                gradient: Gradient(colors: [Color.clear, Color.black.opacity(0.7)]),
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }
    
    private func resetMeasurement() {
        measurementManager.reset()
        showResult = false
        measurementResult = nil
        instructionText = "移動手機側測地面..."
        isPlaneReady = false
    }
    
    private func saveMeasurement(_ result: FishMeasurement) {
        measurements.insert(result, at: 0)
        saveHistory()
        // Optionally fetch weather after save if not already
        if result.weather == nil, let coord = result.location {
            weatherService.fetchWeather(for: coord) { weather in
                // Weather fetched asynchronously; updating measurement would require recreating the struct
                // This can be implemented later if needed
            }
        }
    }
    
    private func loadHistory() {
        if let data = UserDefaults.standard.data(forKey: "fish_measurements"),
           let saved = try? JSONDecoder().decode([FishMeasurement].self, from: data) {
            measurements = saved
        }
    }
    
    private func saveHistory() {
        if let data = try? JSONEncoder().encode(measurements) {
            UserDefaults.standard.set(data, forKey: "fish_measurements")
        }
    }
    
    private func deleteMeasurement(at offsets: IndexSet) {
        measurements.remove(atOffsets: offsets)
        saveHistory()
    }
}

struct StatusPill: View {
    let label: String
    let isActive: Bool
    let color: Color
    
    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(isActive ? color : Color.gray)
                .frame(width: 10, height: 10)
            Text(label)
                .font(.caption)
                .foregroundColor(isActive ? .white : .gray)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color.black.opacity(0.5))
        .cornerRadius(20)
    }
}
