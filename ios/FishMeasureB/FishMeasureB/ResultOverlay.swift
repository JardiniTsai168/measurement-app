//
//  ResultOverlay.swift
//  FishMeasureB
//

import SwiftUI

struct ResultOverlay: View {
    let result: FishMeasurement
    var onSave: () -> Void
    var onReset: () -> Void
    
    var body: some View {
        VStack {
            Spacer()
            
            VStack(spacing: 16) {
                // Length display
                VStack(spacing: 4) {
                    Text(result.formattedLength)
                        .font(.system(size: 56, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)
                    
                    Label(result.accuracyLevel.label, systemImage: "chart.bar")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Divider()
                
                // Info grid
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    InfoItem(icon: "calendar", label: "時間", value: dateString)
                    InfoItem(icon: "location.fill", label: "位置", value: locationString)
                    if let weather = result.weather {
                        if let temp = weather.temperature {
                            InfoItem(icon: "thermometer", label: "氣溫", value: String(format: "%.1f°C", temp))
                        }
                        if let wind = weather.windSpeed {
                            InfoItem(icon: "wind", label: "風速", value: String(format: "%.1f m/s", wind))
                        }
                    }
                }
                
                // Action buttons
                HStack(spacing: 12) {
                    Button(action: onReset) {
                        Label("重新量測", systemImage: "arrow.counterclockwise")
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color.gray)
                            .cornerRadius(12)
                    }
                    
                    Button(action: onSave) {
                        Label("儲存記錄", systemImage: "square.and.arrow.down")
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color.green)
                            .cornerRadius(12)
                    }
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color(.systemBackground))
                    .shadow(radius: 10)
            )
            .padding()
        }
        .background(Color.black.opacity(0.4))
        .edgesIgnoringSafeArea(.all)
    }
    
    private var dateString: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        formatter.locale = Locale(identifier: "zh_TW")
        return formatter.string(from: result.timestamp)
    }
    
    private var locationString: String {
        guard let loc = result.location else { return "未取得" }
        return String(format: "%.4f, %.4f", loc.latitude, loc.longitude)
    }
}

struct InfoItem: View {
    let icon: String
    let label: String
    let value: String
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(.accentColor)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
    }
}
