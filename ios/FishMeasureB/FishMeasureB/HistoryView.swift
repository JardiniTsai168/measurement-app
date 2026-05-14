//
//  HistoryView.swift
//  FishMeasureB
//

import SwiftUI

struct HistoryView: View {
    @State var measurements: [FishMeasurement]
    let onDelete: (IndexSet) -> Void
    
    var body: some View {
        NavigationView {
            List {
                ForEach(measurements) { measurement in
                    HistoryRow(measurement: measurement)
                }
                .onDelete(perform: onDelete)
            }
            .listStyle(.plain)
            .navigationTitle("量測歷史")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("關閉") {
                        // Dismiss handled by sheet
                    }
                }
            }
        }
    }
}

struct HistoryRow: View {
    let measurement: FishMeasurement
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(measurement.formattedLength)
                    .font(.title2.bold())
                Spacer()
                Text(measurement.accuracyLevel.label)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.gray.opacity(0.2))
                    .cornerRadius(8)
            }
            
            HStack {
                Label(dateString, systemImage: "calendar")
                Spacer()
                if let weather = measurement.weather,
                   let temp = weather.temperature {
                    Label(String(format: "%.1f°C", temp), systemImage: "thermometer")
                }
            }
            .font(.caption)
            .foregroundColor(.secondary)
            
            if let loc = measurement.location {
                Text(String(format: "%.5f, %.5f", loc.latitude, loc.longitude))
                    .font(.caption2)
                    .foregroundColor(.gray)
            }
        }
        .padding(.vertical, 4)
    }
    
    private var dateString: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        formatter.locale = Locale(identifier: "zh_TW")
        return formatter.string(from: measurement.timestamp)
    }
}
